import { SandboxClient, SandboxServiceError } from '@n8n/sandbox-client';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { ContainerRunRequest, ContainerRunResult, ContainerUrlFile } from './SandboxContract';
import {
	MAX_OUTPUT_SIZE,
	buildCmd,
	describeFiles,
	describePayload,
	getSandboxConfig,
	truncateForLog,
} from './SandboxContract';

const describeSdkError = (error: unknown): string => {
	if (error instanceof SandboxServiceError) {
		const code = error.code === undefined ? '' : `, code ${error.code}`;
		return `${error.message} (status ${error.status}${code})`;
	}
	return ensureError(error).message;
};

const parseErrorBody = (body: string): { message?: string; code?: string } => {
	try {
		const parsed: unknown = JSON.parse(body);
		if (typeof parsed === 'object' && parsed !== null) {
			return {
				message: 'error' in parsed && typeof parsed.error === 'string' ? parsed.error : undefined,
				code: 'code' in parsed && typeof parsed.code === 'string' ? parsed.code : undefined,
			};
		}
	} catch {
		// Not JSON: fall through to the generic message
	}
	return {};
};

/**
 * `POST /jobs/{id}/files/fetch` (contract v1.1). The vendored
 * `@n8n/sandbox-client@0.1.0` predates this endpoint, so it is called
 * directly until the SDK ships `stageJobFileFromURL`.
 */
const stageJobFileFromUrl = async (
	baseUrl: string,
	apiKey: string,
	jobId: string,
	file: ContainerUrlFile,
	abortSignal?: AbortSignal,
): Promise<void> => {
	const response = await fetch(`${baseUrl}/jobs/${jobId}/files/fetch`, {
		method: 'POST',
		headers: {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'content-type': 'application/json',
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'x-api-key': apiKey,
		},
		body: JSON.stringify({ path: file.path, url: file.url }),
		signal: abortSignal,
	});
	if (!response.ok) {
		const { message, code } = parseErrorBody(await response.text());
		throw new SandboxServiceError(
			message ?? `Sandbox service request failed with status ${response.status}`,
			response.status,
			code,
		);
	}
};

/**
 * Logs the call and its payload, and converts any failure into a serializable
 * NodeOperationError with the given fixed message. Cancellation is rethrown.
 */
const sdkCall = async <T>(
	context: IExecuteFunctions,
	label: string,
	payload: unknown,
	errorMessage: string,
	call: () => Promise<T>,
	abortSignal?: AbortSignal,
): Promise<T> => {
	context.logger.info(`Docker node: → ${label} ${describePayload(payload)}`);
	try {
		const result = await call();
		context.logger.info(`Docker node: ← ${label} ${describePayload(result)}`);
		return result;
	} catch (error) {
		context.logger.error('Docker node: sandbox SDK call failed', {
			call: label,
			error: describeSdkError(error),
		});
		if (abortSignal?.aborted === true) {
			throw error;
		}
		throw new NodeOperationError(context.getNode(), errorMessage, {
			description: `${label} failed: ${describeSdkError(error)}`,
		});
	}
};

/**
 * Runs a container as a one-shot job on the DinD sandbox service and resolves
 * with its outcome (exit code, stdout/stderr, timings). Implementation built
 * on `@n8n/sandbox-client`, which handles retries and resumes interrupted
 * event streams (`GET /jobs/{id}/events?after=<seq>`) internally.
 *
 * Same Jobs API contract v1 flow as the httpRequest implementation: create
 * job → stage files → start → delete. The job is deleted in all cases,
 * including cancellation; deletion kills the container if it is still running.
 */
export async function runContainerViaSdk(
	this: IExecuteFunctions,
	request: ContainerRunRequest,
): Promise<ContainerRunResult> {
	const { baseUrl, apiKey } = getSandboxConfig.call(this);
	const client = new SandboxClient({ baseUrl, apiKey: apiKey === '' ? undefined : apiKey });
	const abortSignal = this.getExecutionCancelSignal();
	const timeoutMs = request.timeoutSeconds * 1000;
	const cmd = buildCmd(request);
	const spec = {
		image: request.image,
		...(cmd.length > 0 ? { cmd } : {}),
		env: Object.fromEntries(request.env.map(({ name, value }) => [name, value])),
		timeoutMs,
	};

	this.logger.info('Docker node: creating sandbox job', {
		image: request.image,
		cmd,
		envNames: request.env.map(({ name }) => name),
		fileCount: request.files.length,
		timeoutMs,
	});

	const job = await sdkCall(
		this,
		'createJob',
		spec,
		'The sandbox API request failed',
		async () => await client.createJob(spec),
		abortSignal,
	);
	this.logger.info('Docker node: sandbox job created', { jobId: job.id, image: request.image });

	try {
		for (const file of request.files) {
			if (file.source === 'url') {
				this.logger.info('Docker node: staging input file from URL', {
					jobId: job.id,
					path: file.path,
					url: file.url,
				});
				await sdkCall(
					this,
					`stageJobFileFromURL ${file.path}`,
					{ path: file.path, url: file.url },
					'The sandbox API request failed',
					async () => await stageJobFileFromUrl(baseUrl, apiKey, job.id, file, abortSignal),
					abortSignal,
				);
				continue;
			}
			this.logger.info('Docker node: staging input file', {
				jobId: job.id,
				path: file.path,
				size: file.size,
				mimeType: file.mimeType,
			});
			await sdkCall(
				this,
				`stageJobFile ${file.path}`,
				file.content,
				'The sandbox API request failed',
				async () => await client.stageJobFile(job.id, file.path, file.content),
				abortSignal,
			);
		}

		const result = await sdkCall(
			this,
			'startJob',
			{ jobId: job.id },
			'The sandbox failed to run the container',
			async () =>
				await client.startJob(job.id, {
					abortSignal,
					onStdout: (data) => {
						this.logger.info(`Docker node: ← stdout ${truncateForLog(data)}`);
					},
					onStderr: (data) => {
						this.logger.info(`Docker node: ← stderr ${truncateForLog(data)}`);
					},
				}),
			abortSignal,
		);

		this.logger.info('Docker node: sandbox job finished', {
			jobId: job.id,
			exitCode: result.exitCode,
			success: result.success,
			timedOut: result.timedOut,
			killed: result.killed,
			executionTimeMs: result.executionTimeMs,
			stdoutBytes: result.stdout.length,
			stderrBytes: result.stderr.length,
		});
		if (result.stderr !== '' && result.success) {
			this.logger.warn('Docker node: container wrote to stderr despite exiting successfully', {
				jobId: job.id,
				stderrBytes: result.stderr.length,
			});
		}

		return {
			jobId: job.id,
			image: request.image,
			cmd: cmd.length > 0 ? cmd : null,
			envNames: request.env.map(({ name }) => name),
			files: describeFiles(request.files),
			// The SDK does not surface 'pulling' events, so this is unknown
			pulledImage: false,
			exitCode: result.exitCode,
			success: result.success,
			timedOut: result.timedOut,
			killed: result.killed,
			executionTimeMs: result.executionTimeMs,
			stdout: result.stdout.slice(-MAX_OUTPUT_SIZE),
			stderr: result.stderr.slice(-MAX_OUTPUT_SIZE),
		};
	} finally {
		try {
			// Cleanup must also run when the execution is cancelled
			await client.deleteJob(job.id);
			this.logger.info('Docker node: sandbox job deleted', { jobId: job.id });
		} catch {
			this.logger.warn('Docker node: failed to delete sandbox job', { jobId: job.id });
		}
	}
}
