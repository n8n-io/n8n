import type { FileContent } from '@mastra/core/workspace';
import { z } from 'zod';

/** Error payload returned by the sandbox service. */
export interface N8nSandboxServiceErrorPayload {
	error: string;
	code: number;
}

export class N8nSandboxServiceError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code?: number,
	) {
		super(message);
		this.name = 'N8nSandboxServiceError';
	}
}

/** Sandbox metadata exposed by the service API. */
export interface N8nSandboxRecord {
	id: string;
	status: string;
	provider: string;
	imageId: string;
	createdAt: number;
	lastActiveAt: number;
}

/** Directory entry returned by the service file listing API. */
export interface N8nSandboxFileEntry {
	name: string;
	size: number;
	isDir: boolean;
	type: 'file' | 'directory';
	modTime: string;
}

/** File stat payload mapped into Mastra-friendly shape. */
export interface N8nSandboxFileStat {
	name: string;
	path: string;
	type: 'file' | 'directory';
	size: number;
	createdAt: string;
	modifiedAt: string;
}

/** Aggregated result of an execute-to-completion shell command. */
export interface N8nSandboxExecResult {
	exitCode: number;
	stdout: string;
	stderr: string;
	executionTimeMs: number;
	timedOut: boolean;
	killed: boolean;
	success: boolean;
}

// ── Exec event schemas (streamed NDJSON from `/exec`) ────────────────────────

const execEventStdoutSchema = z.object({ type: z.literal('stdout'), data: z.string() });
const execEventStderrSchema = z.object({ type: z.literal('stderr'), data: z.string() });
const execEventExitSchema = z.object({
	type: z.literal('exit'),
	exit_code: z.number(),
	success: z.boolean(),
	execution_time_ms: z.number(),
	timed_out: z.boolean(),
	killed: z.boolean(),
});
const execEventErrorSchema = z.object({ type: z.literal('error'), error: z.string() });

const execEventSchema = z.discriminatedUnion('type', [
	execEventStdoutSchema,
	execEventStderrSchema,
	execEventExitSchema,
	execEventErrorSchema,
]);

type ExecEvent = z.infer<typeof execEventSchema>;

// ── Service response schemas ─────────────────────────────────────────────────

const createSandboxResponseSchema = z.object({
	id: z.string(),
	status: z.string(),
	provider: z.string(),
	image_id: z.string().optional(),
	created_at: z.number(),
	last_active_at: z.number(),
});

type CreateSandboxResponse = z.infer<typeof createSandboxResponseSchema>;

const fileEntryResponseSchema = z.object({
	name: z.string(),
	size: z.number(),
	is_dir: z.boolean(),
	type: z.enum(['file', 'directory']),
	mod_time: z.string(),
});

type FileEntryResponse = z.infer<typeof fileEntryResponseSchema>;

const fileStatResponseSchema = z.object({
	name: z.string(),
	path: z.string(),
	type: z.enum(['file', 'directory']),
	size: z.number(),
	created_at: z.string(),
	modified_at: z.string(),
});

type FileStatResponse = z.infer<typeof fileStatResponseSchema>;

/** Client configuration for talking to the sandbox service. */
export interface N8nSandboxClientOptions {
	apiKey?: string;
	baseUrl?: string;
}

/** Fluent builder for constructing Dockerfile instructions sent at sandbox creation. */
export class DockerfileStepsBuilder {
	private readonly steps: string[] = [];

	/** Append one or more RUN instructions. */
	run(command: string | string[]): this {
		const commands = Array.isArray(command) ? command : [command];
		for (const cmd of commands) {
			this.steps.push(`RUN ${cmd}`);
		}
		return this;
	}

	build(): string[] {
		return [...this.steps];
	}
}

/** Options used when creating a sandbox instance. */
interface CreateSandboxOptions {
	dockerfile?: DockerfileStepsBuilder;
}

/** Command execution request sent to `/exec`. */
interface N8nSandboxExecRequest {
	command: string;
	env?: Record<string, string | undefined>;
	workdir?: string;
	timeoutMs?: number;
	abortSignal?: AbortSignal;
	onStdout?: (data: string) => void;
	onStderr?: (data: string) => void;
}

/** Exit metadata captured from the final `/exec` event. */
interface ExecExitMeta {
	exitCode: number;
	executionTimeMs: number;
	timedOut: boolean;
	killed: boolean;
	success: boolean;
}

function normalizeBaseUrl(baseUrl?: string): string {
	return (baseUrl ?? '').replace(/\/+$/, '');
}

function mapSandboxRecord(payload: CreateSandboxResponse): N8nSandboxRecord {
	return {
		id: payload.id,
		status: payload.status,
		provider: payload.provider,
		imageId: payload.image_id ?? '',
		createdAt: payload.created_at,
		lastActiveAt: payload.last_active_at,
	};
}

function asBuffer(content: FileContent): Buffer {
	return typeof content === 'string' ? Buffer.from(content, 'utf-8') : Buffer.from(content);
}

/** Yields parsed objects from an NDJSON ReadableStream, one per line. */
async function* readNdjsonStream<T>(
	stream: ReadableStream<Uint8Array>,
	parse: (line: string) => T,
): AsyncGenerator<T> {
	const decoder = new TextDecoder();
	let pending = '';

	for await (const chunk of stream) {
		pending += decoder.decode(chunk, { stream: true });
		let newlineIndex = pending.indexOf('\n');
		while (newlineIndex !== -1) {
			const line = pending.slice(0, newlineIndex).trim();
			pending = pending.slice(newlineIndex + 1);
			if (line.length > 0) {
				yield parse(line);
			}
			newlineIndex = pending.indexOf('\n');
		}
	}

	// Flush any remaining partial line
	pending += decoder.decode();
	const last = pending.trim();
	if (last.length > 0) {
		yield parse(last);
	}
}

function parseExecEvent(line: string): ExecEvent {
	try {
		const json: unknown = JSON.parse(line);
		return execEventSchema.parse(json);
	} catch {
		return { type: 'error', error: 'Invalid exec event payload' };
	}
}

/**
 * Thin HTTP client for the n8n sandbox service.
 *
 * It handles sandbox lifecycle, file operations, streamed command execution,
 * and lazy image instantiation for builder prewarming.
 */
export class N8nSandboxClient {
	private readonly baseUrl: string;

	constructor(private readonly options: N8nSandboxClientOptions) {
		this.baseUrl = normalizeBaseUrl(options.baseUrl);
	}

	async createSandbox(options: CreateSandboxOptions = {}): Promise<N8nSandboxRecord> {
		const body: Record<string, unknown> = {};

		const steps = options.dockerfile?.build();
		if (steps?.length) {
			body.dockerfile_steps = steps;
		}

		return mapSandboxRecord(
			await this.requestJson<CreateSandboxResponse>('POST', '/sandboxes', {
				body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
			}),
		);
	}

	async getSandbox(id: string): Promise<N8nSandboxRecord> {
		return mapSandboxRecord(
			await this.requestJson<CreateSandboxResponse>('GET', `/sandboxes/${id}`),
		);
	}

	async deleteSandbox(id: string): Promise<void> {
		await this.expectSuccess(this.request('DELETE', `/sandboxes/${id}`));
	}

	async deleteImage(id: string): Promise<void> {
		await this.expectSuccess(this.request('DELETE', `/images/${id}`));
	}

	async exec(id: string, request: N8nSandboxExecRequest): Promise<N8nSandboxExecResult> {
		const response = await this.request('POST', `/sandboxes/${id}/exec`, {
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				command: request.command,
				env: request.env,
				workdir: request.workdir,
				timeout_ms: request.timeoutMs,
			}),
			signal: request.abortSignal,
		});

		if (!response.ok) {
			throw await this.toError(response);
		}

		return await this.readExecResult(response, request);
	}

	async readFile(id: string, path: string): Promise<Buffer> {
		const response = await this.request('GET', `/sandboxes/${id}/files/content`, {
			query: { path },
		});
		if (!response.ok) {
			throw await this.toError(response);
		}

		return Buffer.from(await response.arrayBuffer());
	}

	async writeFile(id: string, path: string, content: FileContent, overwrite = true): Promise<void> {
		await this.expectSuccess(
			this.request('PUT', `/sandboxes/${id}/files`, {
				query: { path, overwrite: String(overwrite) },
				headers: { 'Content-Type': 'application/octet-stream' },
				body: asBuffer(content),
			}),
		);
	}

	async appendFile(id: string, path: string, content: FileContent): Promise<void> {
		await this.expectSuccess(
			this.request('POST', `/sandboxes/${id}/files`, {
				query: { path },
				headers: { 'Content-Type': 'application/octet-stream' },
				body: asBuffer(content),
			}),
		);
	}

	async deleteFile(
		id: string,
		path: string,
		options?: { recursive?: boolean; force?: boolean },
	): Promise<void> {
		await this.expectSuccess(
			this.request('DELETE', `/sandboxes/${id}/files`, {
				query: {
					path,
					recursive: String(options?.recursive ?? false),
					force: String(options?.force ?? false),
				},
			}),
		);
	}

	async copyFile(
		id: string,
		request: { src: string; dest: string; recursive?: boolean; overwrite?: boolean },
	): Promise<void> {
		await this.expectSuccess(
			this.request('POST', `/sandboxes/${id}/files/copy`, {
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					src: request.src,
					dest: request.dest,
					recursive: request.recursive ?? false,
					overwrite: request.overwrite ?? false,
				}),
			}),
		);
	}

	async moveFile(
		id: string,
		request: { src: string; dest: string; overwrite?: boolean },
	): Promise<void> {
		await this.expectSuccess(
			this.request('POST', `/sandboxes/${id}/files/move`, {
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					src: request.src,
					dest: request.dest,
					overwrite: request.overwrite ?? false,
				}),
			}),
		);
	}

	async mkdir(id: string, path: string, recursive = false): Promise<void> {
		await this.expectSuccess(
			this.request('POST', `/sandboxes/${id}/mkdir`, {
				query: { path, recursive: String(recursive) },
			}),
		);
	}

	async listFiles(
		id: string,
		request: { path?: string; recursive?: boolean; extension?: string } = {},
	): Promise<N8nSandboxFileEntry[]> {
		const payload = await this.requestJson<FileEntryResponse[]>('GET', `/sandboxes/${id}/files`, {
			query: {
				...(request.path ? { path: request.path } : {}),
				...(request.recursive !== undefined ? { recursive: String(request.recursive) } : {}),
				...(request.extension ? { extension: request.extension } : {}),
			},
		});

		return payload.map((entry) => ({
			name: entry.name,
			size: entry.size,
			isDir: entry.is_dir,
			type: entry.type,
			modTime: entry.mod_time,
		}));
	}

	async stat(id: string, path: string): Promise<N8nSandboxFileStat> {
		const payload = await this.requestJson<FileStatResponse>('GET', `/sandboxes/${id}/stat`, {
			query: { path },
		});

		return {
			name: payload.name,
			path: payload.path,
			type: payload.type,
			size: payload.size,
			createdAt: payload.created_at,
			modifiedAt: payload.modified_at,
		};
	}

	private async readExecResult(
		response: Response,
		request: Pick<N8nSandboxExecRequest, 'onStdout' | 'onStderr'>,
	): Promise<N8nSandboxExecResult> {
		if (!response.body) {
			throw new Error('Sandbox exec response body is not readable');
		}

		let stdout = '';
		let stderr = '';
		let exitMeta: ExecExitMeta | null = null;

		for await (const event of readNdjsonStream(response.body, parseExecEvent)) {
			switch (event.type) {
				case 'stdout':
					stdout += event.data;
					request.onStdout?.(event.data);
					break;
				case 'stderr':
					stderr += event.data;
					request.onStderr?.(event.data);
					break;
				case 'error':
					throw new Error(event.error);
				case 'exit':
					exitMeta = {
						exitCode: event.exit_code,
						executionTimeMs: event.execution_time_ms,
						timedOut: event.timed_out,
						killed: event.killed,
						success: event.success,
					};
					break;
			}
		}

		const finalExitMeta = this.requireExecExitMeta(exitMeta);
		return {
			exitCode: finalExitMeta.exitCode,
			stdout,
			stderr,
			executionTimeMs: finalExitMeta.executionTimeMs,
			timedOut: finalExitMeta.timedOut,
			killed: finalExitMeta.killed,
			success: finalExitMeta.success,
		};
	}

	private requireExecExitMeta(exitMeta: ExecExitMeta | null): ExecExitMeta {
		if (!exitMeta) {
			throw new Error('Sandbox exec stream ended without an exit event');
		}

		return exitMeta;
	}

	private async expectSuccess(responsePromise: Promise<Response>): Promise<void> {
		const response = await responsePromise;
		if (!response.ok) {
			throw await this.toError(response);
		}
	}

	private async requestJson<T>(
		method: string,
		path: string,
		options: {
			body?: string | Buffer;
			headers?: Record<string, string>;
			query?: Record<string, string>;
			signal?: AbortSignal;
		} = {},
	): Promise<T> {
		const response = await this.request(method, path, options);
		if (!response.ok) {
			throw await this.toError(response);
		}

		return (await response.json()) as T;
	}

	private async request(
		method: string,
		path: string,
		options: {
			body?: string | Buffer;
			headers?: Record<string, string>;
			query?: Record<string, string>;
			signal?: AbortSignal;
		} = {},
	): Promise<Response> {
		if (!this.baseUrl) {
			throw new Error('n8n sandbox service URL is not configured');
		}

		const url = new URL(`${this.baseUrl}${path}`);
		for (const [key, value] of Object.entries(options.query ?? {})) {
			url.searchParams.set(key, value);
		}

		const headers = new Headers(options.headers);
		if (this.options.apiKey) {
			headers.set('X-Api-Key', this.options.apiKey);
		}

		return await fetch(url, {
			method,
			headers,
			body: options.body,
			signal: options.signal,
		});
	}

	private async toError(response: Response): Promise<Error> {
		const contentType = response.headers.get('content-type') ?? '';
		if (contentType.includes('application/json')) {
			const payload = (await response.json()) as Partial<N8nSandboxServiceErrorPayload>;
			return new N8nSandboxServiceError(
				payload.error ?? `Sandbox service request failed with status ${response.status}`,
				response.status,
				payload.code,
			);
		}

		const text = await response.text();
		return new N8nSandboxServiceError(
			text || `Sandbox service request failed with status ${response.status}`,
			response.status,
		);
	}
}
