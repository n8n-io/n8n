import { mkdir, readFile, readdir, rm } from 'fs/promises';
import { jsonParse } from 'n8n-workflow';
import { join, resolve } from 'path';

export interface WebhookRecord {
	type: 'webhook';
	timestamp: number;
	platform: string;
	method: string;
	url: string;
	headers: Record<string, string>;
	body: string;
}

export interface ApiCallRecord {
	type: 'api-call';
	timestamp: number;
	platform: string;
	method: string;
	args: unknown[];
	response?: unknown;
	error?: string;
}

export interface FetchRecord {
	type: 'fetch';
	timestamp: number;
	method: string;
	url: string;
	durationMs: number;
	requestHeaders?: Record<string, string>;
	requestBody?: string;
	responseHeaders?: Record<string, string>;
	responseBody?: string;
	status?: number;
	error?: string;
}

export type ChannelIntegrationRecord = WebhookRecord | ApiCallRecord | FetchRecord;

const SENSITIVE_HEADERS = new Set([
	'authorization',
	'cookie',
	'set-cookie',
	'x-api-key',
	'x-auth-token',
	'x-access-token',
	'x-refresh-token',
	'x-csrf-token',
	'x-xsrf-token',
	'x-slack-signature',
	'x-telegram-bot-api-secret-token',
]);

const DEFAULT_FETCH_URL_PATTERNS = [
	/\.slack\.com/i,
	/api\.telegram\.org/i,
	/api\.linear\.app/i,
	/linear\.app/i,
];

const SANITIZED_N8N_HOST = 'https://n8n.host.com';

function sanitizeHeaderValue(key: string, value: string): string {
	const normalizedKey = key.toLowerCase();
	if (!SENSITIVE_HEADERS.has(normalizedKey)) return value;
	return '[REDACTED]';
}

function sanitizeWebhookHeaderValue(key: string, value: string): string {
	const normalizedKey = key.toLowerCase();
	if (normalizedKey === 'x-forwarded-for') {
		return '111.111.111.111';
	}
	if (normalizedKey === 'host' || normalizedKey === 'x-forwarded-host') {
		return SANITIZED_N8N_HOST;
	}
	return sanitizeHeaderValue(key, value);
}

function sanitizeUrl(url: string): string {
	if (url.includes('api.telegram.org')) {
		return url.replace(/(.+api\.telegram\.org\/bot)(\d+:\S+)(\/.+)/, '$1123456789:abcdefghijkl$3');
	}
	return url;
}

function sanitizeWebhookUrl(url: string): string {
	try {
		const parsed = new URL(url);
		return `${SANITIZED_N8N_HOST}${parsed.pathname}${parsed.search}${parsed.hash}`;
	} catch {
		return url;
	}
}

function sanitizeHeaders(
	headers: Headers | Record<string, string> | undefined,
	sanitizeValue: (key: string, value: string) => string = sanitizeHeaderValue,
) {
	if (!headers) return undefined;

	const sanitized: Record<string, string> = {};
	if (headers instanceof Headers) {
		headers.forEach((value, key) => {
			sanitized[key] = sanitizeValue(key, value);
		});
		return sanitized;
	}

	for (const [key, value] of Object.entries(headers)) {
		sanitized[key] = sanitizeValue(key, value);
	}
	return sanitized;
}

function sanitizeRecord(record: ChannelIntegrationRecord): ChannelIntegrationRecord {
	if (record.type === 'webhook') {
		return {
			...record,
			url: sanitizeWebhookUrl(record.url),
			headers: sanitizeHeaders(record.headers, sanitizeWebhookHeaderValue) ?? {},
		};
	}

	if (record.type === 'fetch') {
		return {
			...record,
			url: sanitizeUrl(record.url),
			requestHeaders: sanitizeHeaders(record.requestHeaders),
			responseHeaders: sanitizeHeaders(record.responseHeaders),
		};
	}

	if (record.type === 'api-call') {
		return {
			...record,
			response: sanitizeApiCallResponse(record.response),
		};
	}

	throw new Error('Unsupported channel integration record type');
}

function sanitizeApiCallResponse(response: unknown): unknown {
	if (!response || typeof response !== 'object') return response;
	if (response instanceof Response) return response;
	if (!('headers' in response) || !(response.headers instanceof Headers)) return response;

	return {
		...response,
		headers: sanitizeHeaders(response.headers),
	};
}

function sanitizeSessionId(value: string): string {
	return value.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function defaultSessionId(): string {
	const ref = process.env.N8N_AGENT_INTEGRATION_RECORDING_REF ?? 'local';
	return `session-${sanitizeSessionId(ref)}-${Date.now()}`;
}

function defaultRecordingDir(): string {
	return resolve(process.cwd(), '.agent-recordings', 'channel-integrations');
}

async function responseToRecordable(response: unknown): Promise<unknown> {
	if (response instanceof Response) {
		return {
			status: response.status,
			headers: response.headers,
			body: await response.clone().text(),
		};
	}
	return response;
}

function getRequestUrl(input: RequestInfo | URL): string {
	if (typeof input === 'string') return input;
	if (input instanceof URL) return input.href;
	return input.url;
}

function headersToRecord(headersInit?: HeadersInit): Record<string, string> | undefined {
	if (!headersInit) return undefined;
	if (headersInit instanceof Headers) {
		const headers: Record<string, string> = {};
		headersInit.forEach((value, key) => {
			headers[key] = value;
		});
		return headers;
	}
	if (Array.isArray(headersInit)) {
		const headers: Record<string, string> = {};
		for (const [key, value] of headersInit) {
			headers[key] = value;
		}
		return headers;
	}
	return headersInit;
}

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit): string {
	if (init?.method) return init.method;
	if (input instanceof Request) return input.method;
	return 'GET';
}

function getRequestHeaders(
	input: RequestInfo | URL,
	init?: RequestInit,
): Record<string, string> | undefined {
	return headersToRecord(init?.headers ?? (input instanceof Request ? input.headers : undefined));
}

async function getRequestBody(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<string | undefined> {
	if (typeof init?.body === 'string') return init.body;
	if (init?.body !== undefined) return undefined;
	if (!(input instanceof Request)) return undefined;

	return await input
		.clone()
		.text()
		.catch(() => undefined);
}

export class ChannelIntegrationRecorder {
	private readonly enabled: boolean;

	private readonly sessionId: string;

	private readonly recordingDir: string;

	private originalFetch: typeof globalThis.fetch | undefined;

	private fetchUrlPatterns = DEFAULT_FETCH_URL_PATTERNS;

	private readonly pendingRecords = new Set<Promise<void>>();

	constructor(options: { enabled?: boolean; sessionId?: string; recordingDir?: string } = {}) {
		this.enabled =
			options.enabled ?? process.env.N8N_AGENT_INTEGRATION_RECORDING_ENABLED === 'true';
		this.sessionId = sanitizeSessionId(
			options.sessionId ??
				process.env.N8N_AGENT_INTEGRATION_RECORDING_SESSION_ID ??
				defaultSessionId(),
		);
		this.recordingDir =
			options.recordingDir ??
			process.env.N8N_AGENT_INTEGRATION_RECORDING_DIR ??
			defaultRecordingDir();
	}

	get isEnabled(): boolean {
		return this.enabled;
	}

	get currentSessionId(): string {
		return this.sessionId;
	}

	get currentSessionPath(): string {
		return join(this.recordingDir, `${this.sessionId}.jsonl`);
	}

	async recordWebhook(platform: string, request: Request): Promise<void> {
		if (!this.enabled) return;

		await this.recordBestEffort(async () => {
			const headers: Record<string, string> = {};
			request.headers.forEach((value, key) => {
				headers[key] = value;
			});

			await this.appendRecord({
				type: 'webhook',
				timestamp: Date.now(),
				platform,
				method: request.method,
				url: request.url,
				headers,
				body: await request.clone().text(),
			});
		});
	}

	async recordApiCall(
		platform: string,
		method: string,
		args: unknown[],
		response?: unknown,
		error?: Error,
	): Promise<void> {
		if (!this.enabled) return;

		await this.recordBestEffort(async () => {
			await this.appendRecord({
				type: 'api-call',
				timestamp: Date.now(),
				platform,
				method,
				args,
				response: await responseToRecordable(response),
				...(error ? { error: error.message } : {}),
			});
		});
	}

	startFetchRecording(urlPatterns: RegExp[] = DEFAULT_FETCH_URL_PATTERNS): void {
		if (!this.enabled || this.originalFetch) return;

		this.fetchUrlPatterns = urlPatterns;
		this.originalFetch = globalThis.fetch;
		const originalFetch = this.originalFetch;

		globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			const url = getRequestUrl(input);
			const shouldRecord = this.fetchUrlPatterns.some((pattern) => pattern.test(url));
			if (!shouldRecord) return await originalFetch(input, init);

			const startTime = Date.now();
			const requestMethod = getRequestMethod(input, init);
			const requestHeaders = getRequestHeaders(input, init);
			const requestBody = await getRequestBody(input, init);
			let response: Response | undefined;
			let error: Error | undefined;

			try {
				response = await originalFetch(input, init);
				return response;
			} catch (caught) {
				error = caught instanceof Error ? caught : new Error(String(caught));
				throw caught;
			} finally {
				let responseHeaders: Record<string, string> | undefined;
				if (response) {
					responseHeaders = {};
					response.headers.forEach((value, key) => {
						responseHeaders![key] = value;
					});
				}
				const responseBody = response
					? await response
							.clone()
							.text()
							.catch(() => undefined)
					: undefined;
				const record: FetchRecord = {
					type: 'fetch',
					timestamp: Date.now(),
					method: requestMethod,
					url,
					durationMs: Date.now() - startTime,
					requestHeaders,
					requestBody,
					status: response?.status,
					responseHeaders,
					responseBody,
					...(error ? { error: error.message } : {}),
				};
				this.trackPendingRecord(this.appendRecord(record).catch(() => {}));
			}
		};
	}

	stopFetchRecording(): void {
		if (!this.originalFetch) return;

		globalThis.fetch = this.originalFetch;
		this.originalFetch = undefined;
	}

	async listSessions(): Promise<Array<{ sessionId: string; entries: number }>> {
		await mkdir(this.recordingDir, { recursive: true });
		const files = await readdir(this.recordingDir);
		const sessions = await Promise.all(
			files
				.filter((file) => file.endsWith('.jsonl'))
				.map(async (file) => {
					const contents = await readFile(join(this.recordingDir, file), 'utf8');
					return {
						sessionId: file.slice(0, -'.jsonl'.length),
						entries: contents.split('\n').filter(Boolean).length,
					};
				}),
		);
		return sessions.sort((a, b) => a.sessionId.localeCompare(b.sessionId));
	}

	async getRecords(sessionId = this.sessionId): Promise<ChannelIntegrationRecord[]> {
		await this.flush();
		const filePath = join(this.recordingDir, `${sanitizeSessionId(sessionId)}.jsonl`);
		const contents = await readFile(filePath, 'utf8');
		return contents
			.split('\n')
			.filter(Boolean)
			.map((line) => jsonParse<ChannelIntegrationRecord>(line));
	}

	async exportRecords(sessionId = this.sessionId): Promise<string> {
		return JSON.stringify(await this.getRecords(sessionId), null, 2);
	}

	async deleteSession(sessionId = this.sessionId): Promise<void> {
		await rm(join(this.recordingDir, `${sanitizeSessionId(sessionId)}.jsonl`), { force: true });
	}

	async flush(): Promise<void> {
		await Promise.all([...this.pendingRecords]);
	}

	private async appendRecord(record: ChannelIntegrationRecord): Promise<void> {
		await mkdir(this.recordingDir, { recursive: true });
		const { appendFile } = await import('fs/promises');
		await appendFile(
			this.currentSessionPath,
			`${JSON.stringify(sanitizeRecord(record))}\n`,
			'utf8',
		);
	}

	private async recordBestEffort(record: () => Promise<void>): Promise<void> {
		await record().catch(() => {});
	}

	private trackPendingRecord(record: Promise<void>): void {
		this.pendingRecords.add(record);
		void record.finally(() => this.pendingRecords.delete(record));
	}
}

export const channelIntegrationRecorder = new ChannelIntegrationRecorder();
