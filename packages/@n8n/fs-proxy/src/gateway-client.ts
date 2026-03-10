import { EventSource } from 'eventsource';

import { getFileTree, listFiles, readFile, searchFiles } from './local-reader';

const MAX_RECONNECT_DELAY_MS = 30_000;

interface GatewayClientOptions {
	url: string;
	apiKey: string;
	dir: string;
}

interface FilesystemRequestEvent {
	type: 'filesystem-request';
	payload: {
		requestId: string;
		toolCall: { name: string; arguments: Record<string, unknown> };
	};
}

interface McpToolCallResult {
	content: Array<{ type: 'text'; text: string }>;
	isError?: boolean;
}

interface McpTool {
	name: string;
	description?: string;
	inputSchema: {
		type: 'object';
		properties: Record<string, unknown>;
		required?: string[];
	};
}

const FILESYSTEM_MCP_TOOLS: McpTool[] = [
	{
		name: 'get_file_tree',
		description: 'Get an indented directory tree',
		inputSchema: {
			type: 'object',
			properties: {
				dirPath: {
					type: 'string',
					description: 'Directory path relative to root (use "." for root)',
				},
				maxDepth: { type: 'integer', description: 'Maximum depth to traverse (default: 2)' },
			},
			required: ['dirPath'],
		},
	},
	{
		name: 'list_files',
		description: 'List immediate children of a directory',
		inputSchema: {
			type: 'object',
			properties: {
				dirPath: { type: 'string', description: 'Directory path relative to root' },
				type: {
					type: 'string',
					enum: ['file', 'directory', 'all'],
					description: 'Filter by entry type (default: all)',
				},
				maxResults: { type: 'integer', description: 'Maximum number of results (default: 200)' },
			},
			required: ['dirPath'],
		},
	},
	{
		name: 'read_file',
		description: 'Read the contents of a file',
		inputSchema: {
			type: 'object',
			properties: {
				filePath: { type: 'string', description: 'File path relative to root' },
				startLine: { type: 'integer', description: 'Starting line number (1-based, default: 1)' },
				maxLines: { type: 'integer', description: 'Maximum number of lines (default: 200)' },
			},
			required: ['filePath'],
		},
	},
	{
		name: 'search_files',
		description: 'Search for text patterns across files using a regex query',
		inputSchema: {
			type: 'object',
			properties: {
				dirPath: { type: 'string', description: 'Directory to search in' },
				query: { type: 'string', description: 'Regular expression pattern to search for' },
				filePattern: {
					type: 'string',
					description: 'Glob pattern to filter files (e.g. "**/*.ts")',
				},
				ignoreCase: { type: 'boolean', description: 'Case-insensitive search (default: false)' },
				maxResults: { type: 'integer', description: 'Maximum number of results (default: 50)' },
			},
			required: ['dirPath', 'query'],
		},
	},
];

/**
 * Client that connects to the n8n filesystem gateway via SSE and
 * handles filesystem requests by executing MCP tool calls locally.
 */
export class GatewayClient {
	private eventSource: EventSource | null = null;

	private reconnectDelay = 1000;

	private shouldReconnect = true;

	/** Session key issued by the server after pairing token is consumed. */
	private sessionKey: string | null = null;

	constructor(private readonly options: GatewayClientOptions) {}

	/** Return the active API key — session key if available, otherwise the original key. */
	private get apiKey(): string {
		return this.sessionKey ?? this.options.apiKey;
	}

	/** Start the client: upload capabilities, connect SSE, handle requests. */
	async start(): Promise<void> {
		await this.uploadCapabilities();
		this.connectSSE();
	}

	/** Stop the client and close the SSE connection. */
	stop(): void {
		this.shouldReconnect = false;
		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
		}
	}

	/** Notify the server we're disconnecting, then close the SSE connection. */
	async disconnect(): Promise<void> {
		this.shouldReconnect = false;
		// POST the disconnect notification BEFORE closing EventSource.
		// The EventSource keeps the Node.js event loop alive — if we close it
		// first, Node may exit before the fetch completes.
		try {
			const url = `${this.options.url}/rest/instance-ai/gateway/disconnect`;
			const headers = new Headers();
			headers.set('Content-Type', 'application/json');
			headers.set('X-Gateway-Key', this.apiKey);
			const response = await fetch(url, {
				method: 'POST',
				headers,
				body: '{}',
				signal: AbortSignal.timeout(3000),
			});
			if (response.ok) {
				console.log('Disconnected from gateway');
			} else {
				console.error(`Gateway disconnect failed: ${response.status}`);
			}
		} catch (error) {
			console.error(
				'Gateway disconnect error:',
				error instanceof Error ? error.message : String(error),
			);
		}
		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
		}
	}

	/**
	 * Returns the MCP tools this client exposes. Override in a subclass to
	 * provide tools from a locally running MCP server instead.
	 */
	protected getTools(): McpTool[] {
		return FILESYSTEM_MCP_TOOLS;
	}

	private async uploadCapabilities(): Promise<void> {
		const tools = this.getTools();
		const url = `${this.options.url}/rest/instance-ai/gateway/init`;
		const headers = new Headers();
		headers.set('Content-Type', 'application/json');
		headers.set('X-Gateway-Key', this.apiKey);
		const response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify({ rootPath: this.options.dir, tools }),
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`Failed to upload capabilities: ${response.status} ${text}`);
		}

		// If the server returned a session key, switch to it for all subsequent requests
		// n8n wraps controller responses in { data: ... }
		const body = (await response.json()) as { data: { ok: boolean; sessionKey?: string } };
		if (body.data.sessionKey) {
			this.sessionKey = body.data.sessionKey;
			console.log('Pairing token consumed — switched to session key');
		}

		console.log(`Capabilities uploaded (${tools.length} tools)`);
	}

	private connectSSE(): void {
		const url = `${this.options.url}/rest/instance-ai/gateway/events?apiKey=${encodeURIComponent(this.apiKey)}`;

		console.log(`Connecting to gateway... (key: ${this.apiKey.slice(0, 8)}...)`);
		this.eventSource = new EventSource(url);

		this.eventSource.onopen = () => {
			console.log('Connected to gateway SSE');
			this.reconnectDelay = 1000;
		};

		this.eventSource.onmessage = (event: MessageEvent) => {
			console.log('got message', event, event.data);
			void this.handleMessage(event);
		};

		this.eventSource.onerror = (event: unknown) => {
			if (!this.shouldReconnect) return;

			// The eventsource package exposes status/message on the error event
			const eventObj = event as Record<string, string | undefined> | null;
			const statusCode = eventObj?.status ?? eventObj?.code ?? '';
			const message = eventObj?.message ?? '';
			console.log(
				`Connection lost${statusCode ? ` (${statusCode})` : ''}${message ? `: ${message}` : ''}. Reconnecting in ${this.reconnectDelay / 1000}s...`,
			);

			if (this.eventSource) {
				this.eventSource.close();
				this.eventSource = null;
			}

			setTimeout(() => {
				if (this.shouldReconnect) {
					this.connectSSE();
				}
			}, this.reconnectDelay);

			// Exponential backoff: 1s → 2s → 4s → 8s → ... → 30s max
			this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
		};
	}

	private async handleMessage(event: MessageEvent): Promise<void> {
		try {
			const parsed: unknown = JSON.parse(String(event.data));
			if (!isFilesystemRequestEvent(parsed)) return;

			const { requestId, toolCall } = parsed.payload;
			console.log(`Request ${requestId}: ${toolCall.name}`);

			try {
				const result = await this.dispatchToolCall(toolCall.name, toolCall.arguments);
				await this.postResponse(requestId, result);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`Request ${requestId} failed: ${message}`);
				await this.postResponse(requestId, {
					content: [{ type: 'text', text: message }],
					isError: true,
				});
			}
		} catch {
			// Malformed message — skip
		}
	}

	private async dispatchToolCall(
		name: string,
		args: Record<string, unknown>,
	): Promise<McpToolCallResult> {
		const dir = this.options.dir;

		console.log('call tool', name, args);

		if (name === 'get_file_tree') {
			const dirPath = requireString(args, 'dirPath');
			const maxDepth = optionalInteger(args, 'maxDepth');
			const text = await getFileTree(dir, dirPath, { maxDepth });
			return { content: [{ type: 'text', text }] };
		}

		if (name === 'list_files') {
			const dirPath = requireString(args, 'dirPath');
			const type = optionalEnum(args, 'type', ['file', 'directory', 'all'] as const);
			const maxResults = optionalInteger(args, 'maxResults');
			const entries = await listFiles(dir, dirPath, { type, maxResults });
			return { content: [{ type: 'text', text: JSON.stringify(entries) }] };
		}

		if (name === 'read_file') {
			const filePath = requireString(args, 'filePath');
			const startLine = optionalInteger(args, 'startLine');
			const maxLines = optionalInteger(args, 'maxLines');
			const content = await readFile(dir, filePath, { startLine, maxLines });
			return { content: [{ type: 'text', text: JSON.stringify(content) }] };
		}

		if (name === 'search_files') {
			const dirPath = requireString(args, 'dirPath');
			const query = requireString(args, 'query');
			const filePattern = optionalString(args, 'filePattern');
			const ignoreCase = optionalBoolean(args, 'ignoreCase');
			const maxResults = optionalInteger(args, 'maxResults');
			const result = await searchFiles(dir, dirPath, {
				query,
				filePattern,
				ignoreCase,
				maxResults,
			});
			return { content: [{ type: 'text', text: JSON.stringify(result) }] };
		}

		throw new Error(`Unknown tool: ${name}`);
	}

	private async postResponse(requestId: string, result: McpToolCallResult): Promise<void> {
		const url = `${this.options.url}/rest/instance-ai/gateway/response/${requestId}`;
		try {
			const headers = new Headers();
			headers.set('Content-Type', 'application/json');
			headers.set('X-Gateway-Key', this.apiKey);
			const response = await fetch(url, {
				method: 'POST',
				headers,
				body: JSON.stringify({ result }),
			});

			if (!response.ok) {
				console.error(`Failed to post response for ${requestId}: ${response.status}`);
			}
		} catch (fetchError) {
			console.error(
				`Failed to post response for ${requestId}:`,
				fetchError instanceof Error ? fetchError.message : String(fetchError),
			);
		}
	}
}

// ── Type guard ──────────────────────────────────────────────────────────────

function isFilesystemRequestEvent(data: unknown): data is FilesystemRequestEvent {
	if (typeof data !== 'object' || data === null) return false;
	const d = data as Record<string, unknown>;
	if (d.type !== 'filesystem-request') return false;
	if (typeof d.payload !== 'object' || d.payload === null) return false;
	const p = d.payload as Record<string, unknown>;
	if (typeof p.requestId !== 'string') return false;
	if (typeof p.toolCall !== 'object' || p.toolCall === null) return false;
	const tc = p.toolCall as Record<string, unknown>;
	return typeof tc.name === 'string' && typeof tc.arguments === 'object' && tc.arguments !== null;
}

// ── Argument extraction helpers ─────────────────────────────────────────────

function requireString(args: Record<string, unknown>, key: string): string {
	const val = args[key];
	if (typeof val !== 'string') throw new Error(`Missing required string argument: ${key}`);
	return val;
}

function optionalString(args: Record<string, unknown>, key: string): string | undefined {
	const val = args[key];
	if (val === undefined || val === null) return undefined;
	if (typeof val !== 'string') throw new Error(`Argument ${key} must be a string`);
	return val;
}

function optionalInteger(args: Record<string, unknown>, key: string): number | undefined {
	const val = args[key];
	if (val === undefined || val === null) return undefined;
	if (typeof val !== 'number') throw new Error(`Argument ${key} must be a number`);
	return Math.floor(val);
}

function optionalBoolean(args: Record<string, unknown>, key: string): boolean | undefined {
	const val = args[key];
	if (val === undefined || val === null) return undefined;
	if (typeof val !== 'boolean') throw new Error(`Argument ${key} must be a boolean`);
	return val;
}

function optionalEnum<T extends string>(
	args: Record<string, unknown>,
	key: string,
	allowed: readonly T[],
): T | undefined {
	const val = args[key];
	if (val === undefined || val === null) return undefined;
	if (typeof val !== 'string') throw new Error(`Argument ${key} must be a string`);
	if (!(allowed as readonly string[]).includes(val)) {
		throw new Error(`Argument ${key} must be one of: ${allowed.join(', ')}`);
	}
	return val as T;
}
