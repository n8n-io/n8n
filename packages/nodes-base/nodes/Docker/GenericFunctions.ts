import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Readable } from 'stream';

export interface EnvironmentVariable {
	name: string;
	value: string;
}

export interface ContainerFile {
	path: string;
	fileName: string;
	mimeType?: string;
	size: number;
	content: Buffer;
}

export interface ContainerRunRequest {
	image: string;
	command?: string;
	args: string[];
	env: EnvironmentVariable[];
	files: ContainerFile[];
	timeoutSeconds: number;
}

export interface ContainerRunResult {
	jobId: string;
	image: string;
	cmd: string[] | null;
	envNames: string[];
	files: Array<{ path: string; size: number }>;
	pulledImage: boolean;
	exitCode: number;
	success: boolean;
	timedOut: boolean;
	killed: boolean;
	executionTimeMs: number;
	stdout: string;
	stderr: string;
}

/** One NDJSON line of the Jobs API event stream (contract v1). */
interface JobEvent {
	seq?: number;
	type: string;
	data?: string;
	code?: string;
	exit_code?: number;
	success?: boolean;
	execution_time_ms?: number;
	timed_out?: boolean;
	killed?: boolean;
}

/** `GET /jobs/{id}` response (contract v1). */
interface JobRecord {
	id: string;
	status: 'staging' | 'running' | 'exited' | 'error';
	exit_code: number | null;
	timed_out: boolean;
	error: string | null;
	started_at: number | null;
	finished_at: number | null;
}

interface JobState {
	lastSeq: number;
	terminal: 'none' | 'exit' | 'error';
	errorMessage?: string;
	pulledImage: boolean;
	exitCode: number;
	success: boolean;
	timedOut: boolean;
	killed: boolean;
	executionTimeMs: number;
	stdout: string;
	stderr: string;
}

interface SandboxContext {
	baseUrl: string;
	headers: Record<string, string>;
	jobId: string;
	timeoutMs: number;
	abortSignal?: AbortSignal;
}

const FILE_PATH_PATTERN = /^[A-Za-z0-9._/-]+$/;
const MAX_OUTPUT_SIZE = 10 * 1024 * 1024;
const HTTP_TIMEOUT_MARGIN_MS = 30_000;
const RESUME_MAX_ATTEMPTS = 5;
const RESUME_DELAY_MS = 1000;
const RECORD_POLL_DELAY_MS = 2000;

/**
 * Validates a job file path per contract v1: relative, `^[A-Za-z0-9._/-]+$`,
 * no leading `/`, no `..` segments. The file appears at `/n8n/<path>`.
 */
export const isValidJobFilePath = (path: string): boolean =>
	FILE_PATH_PATTERN.test(path) && !path.startsWith('/') && !path.split('/').includes('..');

const appendCapped = (current: string, data: string): string =>
	(current + data).slice(-MAX_OUTPUT_SIZE);

const splitLines = (buffered: string): { lines: string[]; rest: string } => {
	const parts = buffered.split('\n');
	return { lines: parts.slice(0, -1), rest: parts[parts.length - 1] ?? '' };
};

const parseEvent = (line: string): JobEvent | undefined => {
	try {
		const parsed: unknown = JSON.parse(line);
		if (typeof parsed === 'object' && parsed !== null && 'type' in parsed) {
			return parsed as JobEvent;
		}
	} catch {
		// Malformed line: skip it, per the "ignore what you don't recognize" rule
	}
	return undefined;
};

const initialJobState = (): JobState => ({
	lastSeq: -1,
	terminal: 'none',
	pulledImage: false,
	exitCode: -1,
	success: false,
	timedOut: false,
	killed: false,
	executionTimeMs: 0,
	stdout: '',
	stderr: '',
});

const reduceEvent = (state: JobState, event: JobEvent): JobState => {
	const next: JobState = {
		...state,
		lastSeq: typeof event.seq === 'number' ? Math.max(state.lastSeq, event.seq) : state.lastSeq,
	};
	switch (event.type) {
		case 'pulling':
			return { ...next, pulledImage: true };
		case 'stdout':
			return { ...next, stdout: appendCapped(state.stdout, event.data ?? '') };
		case 'stderr':
			return { ...next, stderr: appendCapped(state.stderr, event.data ?? '') };
		case 'exit':
			return {
				...next,
				terminal: 'exit',
				exitCode: event.exit_code ?? -1,
				success: event.success ?? false,
				timedOut: event.timed_out ?? false,
				killed: event.killed ?? false,
				executionTimeMs: event.execution_time_ms ?? 0,
			};
		case 'error':
			return {
				...next,
				terminal: 'error',
				errorMessage: [event.code, event.data].filter(Boolean).join(': '),
			};
		default:
			// Contract v1: clients MUST ignore event types they don't recognize
			return next;
	}
};

const reduceLine = (state: JobState, line: string): JobState => {
	const event = parseEvent(line.trim());
	if (event === undefined) {
		return state;
	}
	return reduceEvent(state, event);
};

/** Terminal outcome recovered from the job record when the stream is unrecoverable. */
const stateFromRecord = (state: JobState, record: JobRecord): JobState => {
	if (record.status === 'error') {
		return { ...state, terminal: 'error', errorMessage: record.error ?? undefined };
	}
	const exitCode = record.exit_code ?? -1;
	const executionTimeMs =
		record.started_at !== null && record.finished_at !== null
			? (record.finished_at - record.started_at) * 1000
			: state.executionTimeMs;
	return {
		...state,
		terminal: 'exit',
		exitCode,
		success: exitCode === 0 && !record.timed_out,
		timedOut: record.timed_out,
		executionTimeMs,
	};
};

/**
 * Folds the NDJSON event stream into a JobState. A dropped connection is not
 * an error: the state consumed so far is returned (terminal stays 'none') and
 * the caller resumes from `state.lastSeq`. Cancellation is rethrown.
 */
const consumeStream = async (
	stream: Readable,
	initial: JobState,
	abortSignal?: AbortSignal,
): Promise<JobState> => {
	let state = initial;
	let rest = '';
	try {
		for await (const chunk of stream) {
			const split = splitLines(rest + String(chunk));
			rest = split.rest;
			state = split.lines.reduce(reduceLine, state);
			if (state.terminal !== 'none') {
				return state;
			}
		}
		return reduceLine(state, rest);
	} catch (error) {
		if (abortSignal?.aborted === true) {
			throw error;
		}
		return state;
	}
};

function getSandboxConfig(this: IExecuteFunctions): { baseUrl: string; apiKey: string } {
	const { n8nSandboxServiceUrl, n8nSandboxServiceApiKey } = Container.get(GlobalConfig).instanceAi;
	if (n8nSandboxServiceUrl === '') {
		this.logger.error('Docker node: sandbox service is not configured', {
			envVars: ['N8N_SANDBOX_SERVICE_URL', 'N8N_SANDBOX_SERVICE_API_KEY'],
		});
		throw new NodeOperationError(this.getNode(), 'The sandbox service is not configured', {
			description:
				'Set the N8N_SANDBOX_SERVICE_URL and N8N_SANDBOX_SERVICE_API_KEY environment variables',
		});
	}
	return {
		baseUrl: n8nSandboxServiceUrl.replace(/\/+$/, ''),
		apiKey: n8nSandboxServiceApiKey,
	};
}

/**
 * Polls `GET /jobs/{id}` until the job reaches a terminal status. Fallback for
 * when the event stream cannot be resumed (`410 gone`, attempts exhausted):
 * the outcome is still recovered, only untransmitted output chunks are lost.
 */
async function pollJobRecord(
	this: IExecuteFunctions,
	ctx: SandboxContext,
	state: JobState,
): Promise<JobState> {
	const attempts = Math.ceil((ctx.timeoutMs + HTTP_TIMEOUT_MARGIN_MS) / RECORD_POLL_DELAY_MS);
	this.logger.info('Docker node: falling back to polling the job record', {
		jobId: ctx.jobId,
		lastSeq: state.lastSeq,
		maxAttempts: attempts,
	});
	for (let attempt = 0; attempt < attempts; attempt++) {
		const record = (await this.helpers.httpRequest({
			method: 'GET',
			url: `${ctx.baseUrl}/jobs/${ctx.jobId}`,
			headers: ctx.headers,
			json: true,
			abortSignal: ctx.abortSignal,
		})) as JobRecord;
		if (record.status === 'exited' || record.status === 'error') {
			this.logger.info('Docker node: job record reached a terminal status', {
				jobId: ctx.jobId,
				status: record.status,
				exitCode: record.exit_code,
				timedOut: record.timed_out,
			});
			return stateFromRecord(state, record);
		}
		await sleep(RECORD_POLL_DELAY_MS);
	}
	this.logger.error('Docker node: job never reached a terminal status', {
		jobId: ctx.jobId,
		attempts,
	});
	throw new NodeOperationError(this.getNode(), 'The sandbox job did not finish in time', {
		description: 'The job never reached a terminal status; it was cleaned up',
	});
}

/**
 * Starts the job and follows its event stream to a terminal event. Dropped
 * connections are resumed with `GET /jobs/{id}/events?after=<lastSeq>` (the
 * job keeps running server-side); a trimmed ring buffer (`410 gone`) or
 * exhausted resume attempts degrade to polling the job record.
 */
async function trackJob(this: IExecuteFunctions, ctx: SandboxContext): Promise<JobState> {
	this.logger.info('Docker node: starting sandbox job', { jobId: ctx.jobId });
	const startStream = (await this.helpers.httpRequest({
		method: 'POST',
		url: `${ctx.baseUrl}/jobs/${ctx.jobId}/start`,
		headers: ctx.headers,
		encoding: 'stream',
		abortSignal: ctx.abortSignal,
		timeout: ctx.timeoutMs + HTTP_TIMEOUT_MARGIN_MS,
	})) as Readable;

	let state = await consumeStream(startStream, initialJobState(), ctx.abortSignal);

	for (let attempt = 0; state.terminal === 'none' && attempt < RESUME_MAX_ATTEMPTS; attempt++) {
		this.logger.warn('Docker node: event stream interrupted, resuming', {
			jobId: ctx.jobId,
			lastSeq: state.lastSeq,
			attempt: attempt + 1,
			maxAttempts: RESUME_MAX_ATTEMPTS,
		});
		await sleep(RESUME_DELAY_MS);
		const response = (await this.helpers.httpRequest({
			method: 'GET',
			url: `${ctx.baseUrl}/jobs/${ctx.jobId}/events`,
			qs: { after: state.lastSeq, follow: 'true' },
			headers: ctx.headers,
			encoding: 'stream',
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
			abortSignal: ctx.abortSignal,
			timeout: ctx.timeoutMs + HTTP_TIMEOUT_MARGIN_MS,
		})) as { statusCode: number; body: Readable };
		if (response.statusCode === 410) {
			this.logger.warn('Docker node: event history was trimmed, output may be incomplete', {
				jobId: ctx.jobId,
				lastSeq: state.lastSeq,
			});
			return await pollJobRecord.call(this, ctx, state);
		}
		if (response.statusCode >= 400) {
			this.logger.warn('Docker node: resume request failed, retrying', {
				jobId: ctx.jobId,
				statusCode: response.statusCode,
				attempt: attempt + 1,
			});
			continue;
		}
		state = await consumeStream(response.body, state, ctx.abortSignal);
	}

	if (state.terminal === 'none') {
		this.logger.warn('Docker node: resume attempts exhausted without a terminal event', {
			jobId: ctx.jobId,
			lastSeq: state.lastSeq,
			maxAttempts: RESUME_MAX_ATTEMPTS,
		});
		return await pollJobRecord.call(this, ctx, state);
	}
	return state;
}

/**
 * Runs a container as a one-shot job on the DinD sandbox service and resolves
 * with its outcome (exit code, stdout/stderr, timings).
 *
 * Implements the Jobs API contract v1 (see the "Hackmation - DinD & Sandbox"
 * design page): create job → stage files → start (NDJSON event stream, with
 * resume-on-disconnect and job-record fallback) → delete. The job is deleted
 * in all cases, including cancellation; deletion kills the container if it is
 * still running.
 */
export async function runContainer(
	this: IExecuteFunctions,
	request: ContainerRunRequest,
): Promise<ContainerRunResult> {
	const { baseUrl, apiKey } = getSandboxConfig.call(this);
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const headers = { 'x-api-key': apiKey };
	const abortSignal = this.getExecutionCancelSignal();
	const timeoutMs = request.timeoutSeconds * 1000;

	// Docker semantics: cmd overrides the image CMD and is passed to the
	// image's own entrypoint. A command-less argv list is therefore valid.
	const cmd = [...(request.command === undefined ? [] : [request.command]), ...request.args];

	this.logger.info('Docker node: creating sandbox job', {
		image: request.image,
		cmd,
		envNames: request.env.map(({ name }) => name),
		fileCount: request.files.length,
		timeoutMs,
	});

	const job = (await this.helpers.httpRequest({
		method: 'POST',
		url: `${baseUrl}/jobs`,
		headers,
		body: {
			image: request.image,
			...(cmd.length > 0 ? { cmd } : {}),
			env: Object.fromEntries(request.env.map(({ name, value }) => [name, value])),
			timeout_ms: timeoutMs,
		},
		json: true,
		abortSignal,
	})) as { id: string };

	const ctx: SandboxContext = { baseUrl, headers, jobId: job.id, timeoutMs, abortSignal };
	this.logger.info('Docker node: sandbox job created', { jobId: job.id, image: request.image });

	try {
		for (const file of request.files) {
			this.logger.info('Docker node: staging input file', {
				jobId: job.id,
				path: file.path,
				size: file.size,
				mimeType: file.mimeType,
			});
			await this.helpers.httpRequest({
				method: 'PUT',
				url: `${baseUrl}/jobs/${job.id}/files`,
				qs: { path: file.path },
				// eslint-disable-next-line @typescript-eslint/naming-convention
				headers: { ...headers, 'content-type': 'application/octet-stream' },
				body: file.content,
				abortSignal,
			});
		}

		const state = await trackJob.call(this, ctx);

		if (state.terminal === 'error') {
			this.logger.error('Docker node: sandbox failed to run the container', {
				jobId: job.id,
				image: request.image,
				errorMessage: state.errorMessage,
			});
			throw new NodeOperationError(this.getNode(), 'The sandbox failed to run the container', {
				description: state.errorMessage,
			});
		}

		this.logger.info('Docker node: sandbox job finished', {
			jobId: job.id,
			exitCode: state.exitCode,
			success: state.success,
			timedOut: state.timedOut,
			killed: state.killed,
			executionTimeMs: state.executionTimeMs,
			pulledImage: state.pulledImage,
			stdoutBytes: state.stdout.length,
			stderrBytes: state.stderr.length,
		});
		if (state.stderr !== '' && state.success) {
			this.logger.warn('Docker node: container wrote to stderr despite exiting successfully', {
				jobId: job.id,
				stderrBytes: state.stderr.length,
			});
		}

		return {
			jobId: job.id,
			image: request.image,
			cmd: cmd.length > 0 ? cmd : null,
			envNames: request.env.map(({ name }) => name),
			files: request.files.map(({ path, size }) => ({ path, size })),
			pulledImage: state.pulledImage,
			exitCode: state.exitCode,
			success: state.success,
			timedOut: state.timedOut,
			killed: state.killed,
			executionTimeMs: state.executionTimeMs,
			stdout: state.stdout,
			stderr: state.stderr,
		};
	} finally {
		try {
			// No abortSignal: cleanup must also run when the execution is cancelled
			await this.helpers.httpRequest({
				method: 'DELETE',
				url: `${baseUrl}/jobs/${job.id}`,
				headers,
			});
			this.logger.info('Docker node: sandbox job deleted', { jobId: job.id });
		} catch {
			this.logger.warn('Docker node: failed to delete sandbox job', { jobId: job.id });
		}
	}
}
