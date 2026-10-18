import { randomBytes } from 'node:crypto';
import * as http from 'node:http';
import * as https from 'node:https';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/**
 * Client for the Task API of the sandbox service (`/v1/code/...`). It is a
 * copy of `CodeSandboxClient` in the sandbox service SDK. Production uses the
 * SDK.
 */

/** The largest RPC result body that the service accepts. */
export const RPC_RESULT_MAX_BYTES = 1024 * 1024 * 1024;

export class TaskApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		/** True if the worker had the task when the request failed. */
		readonly accepted = false,
	) {
		super(message);
		this.name = 'TaskApiError';
	}
}

export interface CreateCodeSandboxOptions {
	runtime: string;
	slots: number;
	taskMemoryMb: number;
	spareWorkers: boolean;
	reuseWorkers: boolean;
	labels?: Record<string, string>;
}

export interface CodeSandbox {
	id: string;
	runtime: string;
	runtimeVersion: string;
	slots: number;
	state: string;
	/** Worker processes started since the sandbox started (GET only). */
	workersStarted?: number;
	/** Resource use of the sandbox container since its start (GET only). */
	cpuUsageUsec?: number;
	memoryPeakBytes?: number;
	memoryCurrentBytes?: number;
	uptimeMs?: number;
	/** The sandbox service gave a ready sandbox from its warm pool. */
	pooled?: boolean;
	timings?: {
		create: number;
		runnerCreate?: number;
		daemonReady?: number;
		spareReady?: number;
		/** Time to take the sandbox from the warm pool (pooled only). */
		claim?: number;
	};
}

export interface CodeTaskSpec {
	taskId: string;
	timeoutMs: number;
	inlineResultMaxBytes: number;
}

export interface CodeTaskInput {
	path: string;
	content: Buffer | string | (() => Promise<Readable>);
}

export interface CodeTaskOutput {
	path: string;
	size: number;
}

export interface DaemonTimings {
	slotWait?: number;
	inputWrite?: number;
	handoff?: number;
	run?: number;
	outputMove?: number;
	spareHit?: boolean;
	inputBytes?: number;
	outputBytes?: number;
	leftoverFiles?: number;
	workerTasks?: number;
	worker?: {
		read?: number;
		build?: number;
		run?: number;
		write?: number;
		binaryReads?: number;
		rpcCount?: number;
		/** Time spent in RPC calls in the worker, in ms. */
		rpcMs?: number;
	};
}

export interface CodeTaskDoneEvent {
	type: 'done';
	result: unknown;
	outputs?: CodeTaskOutput[];
	timings?: DaemonTimings;
}

export type CodeTaskErrorCode =
	| 'user_error'
	| 'timeout'
	| 'cancelled'
	| 'oom'
	| 'crashed'
	| 'invalid';

export interface CodeTaskErrorEvent {
	type: 'error';
	code: CodeTaskErrorCode;
	message: string;
	userError?: unknown;
	timings?: DaemonTimings;
}

/** An RPC call of the task. The task stream is the scope of the call. */
export interface CodeTaskRpcEvent {
	type: 'rpc';
	callId: string;
	name: string;
	params: unknown[];
}

export type CodeTaskEvent =
	| { type: 'accepted'; taskId: string; slot: number }
	| { type: 'stdout'; data: string }
	| { type: 'stderr'; data: string }
	| CodeTaskRpcEvent
	| CodeTaskDoneEvent
	| CodeTaskErrorEvent;

export type RpcReply = { ok: true; data: unknown } | { ok: false; error: unknown };

export class TaskApiClient {
	private readonly base: URL;

	private readonly agent: http.Agent;

	constructor(
		baseUrl: string,
		private readonly apiKey: string,
	) {
		if (!baseUrl) throw new Error('N8N_SANDBOX_SERVICE_URL is not set');
		this.base = new URL(baseUrl.replace(/\/+$/, '') + '/');
		this.agent =
			this.base.protocol === 'https:'
				? new https.Agent({ keepAlive: true, maxSockets: 512 })
				: new http.Agent({ keepAlive: true, maxSockets: 512 });
	}

	async createSandbox(opts: CreateCodeSandboxOptions): Promise<CodeSandbox> {
		return await this.json<CodeSandbox>('POST', 'v1/code/sandboxes', opts);
	}

	async getSandbox(id: string): Promise<CodeSandbox> {
		return await this.json<CodeSandbox>('GET', `v1/code/sandboxes/${id}`);
	}

	async deleteSandbox(id: string): Promise<void> {
		try {
			await this.json('DELETE', `v1/code/sandboxes/${id}`);
		} catch (e) {
			if (e instanceof TaskApiError && e.status === 404) return;
			throw e;
		}
	}

	/**
	 * Runs a task. Streams the inputs. Calls `onEvent` for each event and
	 * resolves with the terminal event. `onEvent` must not block: answer `rpc`
	 * events in the background with `postRpcResult`.
	 */
	async runTask(
		sandboxId: string,
		spec: CodeTaskSpec,
		inputs: CodeTaskInput[],
		onEvent: (event: CodeTaskEvent) => void,
		signal: AbortSignal,
	): Promise<CodeTaskDoneEvent | CodeTaskErrorEvent> {
		const boundary = '----n8ncode' + randomBytes(12).toString('hex');
		let accepted = false;
		let res: http.IncomingMessage;
		try {
			res = await this.request(
				'POST',
				`v1/code/sandboxes/${sandboxId}/tasks`,
				{ 'Content-Type': `multipart/form-data; boundary=${boundary}` },
				Readable.from(multipartBody(boundary, spec, inputs)),
				signal,
			);
		} catch (e) {
			throw new TaskApiError(`task request failed: ${(e as Error).message}`, 0, false);
		}
		if (res.statusCode !== 200) throw await errorFromResponse(res);
		let terminal: CodeTaskDoneEvent | CodeTaskErrorEvent | undefined;
		try {
			for await (const ev of readNdjson<CodeTaskEvent>(res)) {
				if (ev.type === 'accepted') accepted = true;
				if (ev.type === 'rpc' && !Array.isArray(ev.params)) ev.params = [];
				onEvent(ev);
				if (ev.type === 'done' || ev.type === 'error') terminal = ev;
			}
		} catch (e) {
			throw new TaskApiError(`task stream failed: ${(e as Error).message}`, 0, accepted);
		}
		if (!terminal) {
			throw new TaskApiError('task stream ended without a terminal event', 0, accepted);
		}
		return terminal;
	}

	async getOutput(sandboxId: string, taskId: string, path: string): Promise<Readable> {
		const enc = path.split('/').map(encodeURIComponent).join('/');
		const res = await this.request(
			'GET',
			`v1/code/sandboxes/${sandboxId}/tasks/${taskId}/outputs/${enc}`,
			{},
			undefined,
		);
		if (res.statusCode !== 200) throw await errorFromResponse(res);
		return res;
	}

	async deleteTask(sandboxId: string, taskId: string): Promise<void> {
		await this.json('DELETE', `v1/code/sandboxes/${sandboxId}/tasks/${taskId}`);
	}

	/**
	 * Sends the reply to an RPC call of a running task. A reply larger than
	 * RPC_RESULT_MAX_BYTES is replaced with an error reply. A 404 (the task or
	 * the call is no longer open) counts as success.
	 */
	async postRpcResult(
		sandboxId: string,
		taskId: string,
		callId: string,
		reply: RpcReply,
	): Promise<void> {
		const errorReply = (message: string) =>
			Buffer.from(JSON.stringify({ ok: false, error: { message } }));
		let payload: Buffer;
		try {
			payload = Buffer.from(JSON.stringify(reply));
		} catch (e) {
			// A value that JSON cannot encode (BigInt, a cycle), or a string that
			// is too large for V8.
			payload = errorReply(`RPC result cannot be serialized: ${(e as Error).message}`);
		}
		if (payload.length > RPC_RESULT_MAX_BYTES) payload = errorReply('RPC result too large');
		let res: http.IncomingMessage;
		let text: string;
		try {
			res = await this.request(
				'POST',
				`v1/code/sandboxes/${sandboxId}/tasks/${encodeURIComponent(taskId)}/rpc/${encodeURIComponent(callId)}`,
				{ 'Content-Type': 'application/json', 'Content-Length': String(payload.length) },
				Readable.from([payload]),
			);
			text = await readAll(res);
		} catch (e) {
			// Status 0: a transport error.
			throw new TaskApiError(`rpc result request failed: ${(e as Error).message}`, 0);
		}
		const status = res.statusCode ?? 0;
		if (status === 404 || (status >= 200 && status < 300)) return;
		throw errorFromText(status, text);
	}

	private async json<T>(method: string, path: string, body?: unknown): Promise<T> {
		const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
		const res = await this.request(
			method,
			path,
			payload
				? { 'Content-Type': 'application/json', 'Content-Length': String(payload.length) }
				: {},
			payload ? Readable.from([payload]) : undefined,
		);
		const text = await readAll(res);
		if ((res.statusCode ?? 0) >= 300) throw errorFromText(res.statusCode ?? 0, text);
		return (text ? JSON.parse(text) : undefined) as T;
	}

	private async request(
		method: string,
		path: string,
		headers: Record<string, string>,
		body: Readable | undefined,
		signal?: AbortSignal,
	): Promise<http.IncomingMessage> {
		const url = new URL(path, this.base);
		const mod = url.protocol === 'https:' ? https : http;
		const allHeaders: Record<string, string> = { ...headers };
		if (this.apiKey) allHeaders['X-Api-Key'] = this.apiKey;
		return await new Promise((resolve, reject) => {
			const req = mod.request(
				url,
				{ method, headers: allHeaders, agent: this.agent, signal },
				resolve,
			);
			req.on('error', reject);
			if (body) pipeline(body, req).catch(reject);
			else req.end();
		});
	}
}

async function* multipartBody(
	boundary: string,
	spec: CodeTaskSpec,
	inputs: CodeTaskInput[],
): AsyncGenerator<Buffer> {
	yield Buffer.from(
		`--${boundary}\r\nContent-Disposition: form-data; name="spec"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(spec)}\r\n`,
	);
	for (const input of inputs) {
		const name = input.path.replace(/["\\\r\n]/g, '_');
		yield Buffer.from(
			`--${boundary}\r\nContent-Disposition: form-data; name="input"; filename="${name}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
		);
		if (typeof input.content === 'string') {
			yield Buffer.from(input.content);
		} else if (Buffer.isBuffer(input.content)) {
			yield input.content;
		} else {
			const stream = await input.content();
			for await (const chunk of stream) {
				yield Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
			}
		}
		yield Buffer.from('\r\n');
	}
	yield Buffer.from(`--${boundary}--\r\n`);
}

/**
 * The longest NDJSON line that readNdjson accepts, in characters. A worker
 * control line is at most 64 MiB, and an 'rpc' event carries one.
 */
export const NDJSON_MAX_LINE_CHARS = 128 * 1024 * 1024;

/**
 * Parses an NDJSON stream. The time is linear in the stream size, also for
 * long lines: each chunk is searched once.
 */
export async function* readNdjson<T>(
	stream: AsyncIterable<Buffer | string>,
	maxLineChars = NDJSON_MAX_LINE_CHARS,
): AsyncGenerator<T> {
	const decoder = new TextDecoder('utf-8');
	let parts: string[] = [];
	let partsLength = 0;
	const take = (last: string): string => {
		parts.push(last);
		const line = parts.join('');
		parts = [];
		partsLength = 0;
		return line.trim();
	};
	for await (const chunk of stream) {
		const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
		let start = 0;
		let nl = text.indexOf('\n');
		while (nl !== -1) {
			if (partsLength + nl - start > maxLineChars) throw new Error('NDJSON line too long');
			const line = take(text.slice(start, nl));
			if (line) yield JSON.parse(line) as T;
			start = nl + 1;
			nl = text.indexOf('\n', start);
		}
		if (start < text.length) {
			partsLength += text.length - start;
			if (partsLength > maxLineChars) throw new Error('NDJSON line too long');
			parts.push(text.slice(start));
		}
	}
	const line = take(decoder.decode());
	if (line) yield JSON.parse(line) as T;
}

export async function readAll(stream: AsyncIterable<Buffer | string>): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
	return Buffer.concat(chunks).toString('utf-8');
}

async function errorFromResponse(res: http.IncomingMessage): Promise<TaskApiError> {
	return errorFromText(res.statusCode ?? 0, await readAll(res));
}

function errorFromText(status: number, text: string): TaskApiError {
	let message = text;
	try {
		const parsed = JSON.parse(text) as { error?: string };
		if (parsed.error) message = parsed.error;
	} catch {
		// Not JSON.
	}
	return new TaskApiError(message || `HTTP ${status}`, status);
}
