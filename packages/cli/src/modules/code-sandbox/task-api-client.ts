import { randomBytes } from 'node:crypto';
import * as http from 'node:http';
import * as https from 'node:https';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import WebSocket from 'ws';

/**
 * Client for the Task API of the sandbox service (`/v1/code/...`). It is a
 * copy of `CodeSandboxClient` in the sandbox service SDK, with `ws` for the
 * channel. Production uses the SDK.
 */

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

export type CodeTaskEvent =
	| { type: 'accepted'; taskId: string; slot: number }
	| { type: 'stdout'; data: string }
	| { type: 'stderr'; data: string }
	| CodeTaskDoneEvent
	| CodeTaskErrorEvent;

export interface RpcCallFrame {
	type: 'rpc:call';
	taskId: string;
	callId: string;
	name: string;
	params: unknown[];
}

export type RpcReply = { ok: true; data: unknown } | { ok: false; error: unknown };

export interface ChannelHandlers {
	onCall: (call: RpcCallFrame) => Promise<RpcReply>;
	onClose: (reason: string) => void;
}

export interface OpenChannel {
	ws: WebSocket;
	runtimeVersion: string;
}

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
	 * resolves with the terminal event.
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

	/** Opens the RPC channel and waits for `channel:ready`. */
	async openChannel(sandboxId: string, handlers: ChannelHandlers): Promise<OpenChannel> {
		const url = new URL(`v1/code/sandboxes/${sandboxId}/channel`, this.base);
		url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
		const ws = new WebSocket(url, {
			headers: this.apiKey ? { 'X-Api-Key': this.apiKey } : {},
			perMessageDeflate: false,
			maxPayload: 1024 * 1024 * 1024,
		});
		return await new Promise<OpenChannel>((resolve, reject) => {
			let ready = false;
			ws.on('message', (raw) => {
				let frame: { type?: string; runtimeVersion?: string };
				try {
					frame = JSON.parse(raw.toString()) as typeof frame;
				} catch {
					return;
				}
				if (frame.type === 'channel:ready' && !ready) {
					ready = true;
					resolve({ ws, runtimeVersion: frame.runtimeVersion ?? '' });
					return;
				}
				if (frame.type === 'rpc:call') {
					const call = frame as RpcCallFrame;
					void handlers
						.onCall({ ...call, params: Array.isArray(call.params) ? call.params : [] })
						.catch((e: unknown): RpcReply => ({ ok: false, error: { message: String(e) } }))
						.then((reply) => {
							if (ws.readyState !== WebSocket.OPEN) return;
							ws.send(
								JSON.stringify({
									type: 'rpc:result',
									taskId: call.taskId,
									callId: call.callId,
									...reply,
								}),
							);
						});
				}
			});
			ws.on('unexpected-response', (_req, res) => {
				reject(new TaskApiError(`channel upgrade refused: ${res.statusCode}`, res.statusCode ?? 0));
			});
			ws.on('error', (e) => {
				if (!ready) reject(new TaskApiError(`channel error: ${e.message}`, 0));
			});
			ws.on('close', (code, reason) => {
				if (!ready) reject(new TaskApiError(`channel closed before ready: ${code}`, 0));
				else handlers.onClose(`${code} ${reason.toString()}`);
			});
		});
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

/** Parses an NDJSON stream. Lines have no size limit. */
export async function* readNdjson<T>(stream: AsyncIterable<Buffer | string>): AsyncGenerator<T> {
	const decoder = new TextDecoder('utf-8');
	let pending = '';
	for await (const chunk of stream) {
		pending += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
		let nl = pending.indexOf('\n');
		while (nl !== -1) {
			const line = pending.slice(0, nl).trim();
			pending = pending.slice(nl + 1);
			if (line) yield JSON.parse(line) as T;
			nl = pending.indexOf('\n');
		}
	}
	pending += decoder.decode();
	if (pending.trim()) yield JSON.parse(pending.trim()) as T;
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
