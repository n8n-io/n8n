import { EventSource } from 'eventsource';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { GatewayConfig } from './config';
import {
	logger,
	printAuthFailure,
	printDisconnected,
	printReconnecting,
	printReinitFailed,
	printReinitializing,
	printToolCall,
	printToolResult,
} from './logger';
import type { SettingsStore } from './settings-store';
import type { BrowserModule } from './tools/browser';
import { filesystemReadTools, filesystemWriteTools } from './tools/filesystem';
import { MouseKeyboardModule } from './tools/mouse-keyboard';
import { ScreenshotModule } from './tools/screenshot';
import { ShellModule } from './tools/shell';
import type {
	AffectedResource,
	CallToolResult,
	ConfirmResourceAccess,
	McpTool,
	ToolDefinition,
} from './tools/types';
import { formatErrorResult } from './tools/utils';

const MAX_RECONNECT_DELAY_MS = 30_000;
const MAX_AUTH_RETRIES = 5;

export interface GatewayClientOptions {
	url: string;
	apiKey: string;
	config: GatewayConfig;
	settingsStore: SettingsStore;
	confirmResourceAccess: ConfirmResourceAccess;
	/** Called when the client gives up reconnecting after persistent auth failures. */
	onPersistentFailure?: () => void;
}

interface FilesystemRequestEvent {
	type: 'filesystem-request';
	payload: {
		requestId: string;
		toolCall: { name: string; arguments: Record<string, unknown> };
	};
}

/**
 * Client that connects to the n8n gateway via SSE and
 * handles tool requests by executing MCP tool calls locally.
 */
export class GatewayClient {
	private eventSource: EventSource | null = null;

	private reconnectDelay = 1000;

	private shouldReconnect = true;

	/** Consecutive auth failures during reconnection attempts. */
	private authRetryCount = 0;

	/** Session key issued by the server after pairing token is consumed. */
	private sessionKey: string | null = null;

	private allDefinitions: ToolDefinition[] | null = null;

	private definitionMap: Map<string, ToolDefinition> = new Map();

	private browserModule: BrowserModule | null = null;

	/** Get all registered tool definitions (populated after start). */
	get tools(): ToolDefinition[] {
		return this.allDefinitions ?? [];
	}

	constructor(private readonly options: GatewayClientOptions) {}

	/** Return the active API key — session key if available, otherwise the original key. */
	private get apiKey(): string {
		return this.sessionKey ?? this.options.apiKey;
	}

	private get dir(): string {
		return this.options.config.filesystem.dir;
	}

	/** Start the client: upload capabilities, connect SSE, handle requests. */
	async start(): Promise<void> {
		await this.uploadCapabilities();
		this.connectSSE();
	}

	/** Stop the client and close the SSE connection. */
	async stop(): Promise<void> {
		this.shouldReconnect = false;
		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
		}
		if (this.browserModule) await this.browserModule.shutdown();
	}

	/** Notify the server we're disconnecting, then close the SSE connection. */
	async disconnect(): Promise<void> {
		this.shouldReconnect = false;
		this.options.settingsStore.clearSessionRules();

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
				printDisconnected();
			} else {
				logger.error('Gateway disconnect failed', { status: response.status });
			}
		} catch (error) {
			logger.error('Gateway disconnect error', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
		}
		if (this.browserModule) await this.browserModule.shutdown();
	}

	private async getAllDefinitions(): Promise<ToolDefinition[]> {
		if (this.allDefinitions) return this.allDefinitions;

		const { config, settingsStore } = this.options;
		const defs: ToolDefinition[] = [];

		// Filesystem
		if (settingsStore.getGroupMode('filesystemRead') !== 'deny') {
			defs.push(...filesystemReadTools);
		}
		if (settingsStore.getGroupMode('filesystemWrite') !== 'deny') {
			defs.push(...filesystemWriteTools);
		}

		// Computer use modules — check permission mode and platform support
		const computerModules: Array<{
			name: string;
			enabled: boolean;
			module: { isSupported(): boolean | Promise<boolean>; definitions: ToolDefinition[] };
		}> = [
			{
				name: 'Shell',
				enabled: settingsStore.getGroupMode('shell') !== 'deny',
				module: ShellModule,
			},
			{
				name: 'Screenshot',
				enabled: settingsStore.getGroupMode('computer') !== 'deny',
				module: ScreenshotModule,
			},
			{
				name: 'MouseKeyboard',
				enabled: settingsStore.getGroupMode('computer') !== 'deny',
				module: MouseKeyboardModule,
			},
		];

		for (const { name, enabled, module } of computerModules) {
			if (!enabled) {
				logger.debug('Module denied by permission, skipping', { module: name });
				continue;
			}
			if (await module.isSupported()) {
				defs.push(...module.definitions);
			} else {
				logger.debug('Module not supported on this platform, skipping', { module: name });
			}
		}

		// Browser
		if (settingsStore.getGroupMode('browser') !== 'deny') {
			const { BrowserModule: BrowserModuleClass } = await import('./tools/browser');
			this.browserModule = await BrowserModuleClass.create(config.browser);
			if (this.browserModule) {
				defs.push(...this.browserModule.definitions);
			} else {
				logger.debug('Module not supported on this platform, skipping', {
					module: 'Browser',
				});
			}
		} else {
			logger.debug('Module denied by permission, skipping', { module: 'Browser' });
		}

		for (const def of defs) {
			logger.debug('Registered tool', { name: def.name, description: def.description });
		}
		this.allDefinitions = defs;
		this.definitionMap = new Map(defs.map((d) => [d.name, d]));
		return defs;
	}

	private async uploadCapabilities(): Promise<void> {
		const defs = await this.getAllDefinitions();
		const tools: McpTool[] = defs.map((d) => ({
			name: d.name,
			description: d.description,
			inputSchema: zodToJsonSchema(d.inputSchema) as McpTool['inputSchema'],
		}));
		const url = `${this.options.url}/rest/instance-ai/gateway/init`;
		const headers = new Headers();
		headers.set('Content-Type', 'application/json');
		headers.set('X-Gateway-Key', this.apiKey);
		const response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify({ rootPath: this.dir, tools }),
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
			logger.debug('Pairing token consumed, switched to session key');
		}

		logger.debug('Capabilities uploaded', { toolCount: tools.length });
	}

	private connectSSE(): void {
		const url = `${this.options.url}/rest/instance-ai/gateway/events?apiKey=${encodeURIComponent(this.apiKey)}`;

		logger.debug('Connecting to gateway', { keyPrefix: this.apiKey.slice(0, 8) });
		this.eventSource = new EventSource(url);

		this.eventSource.onopen = () => {
			logger.debug('Connected to gateway SSE');
			this.reconnectDelay = 1000;
			this.authRetryCount = 0;
		};

		this.eventSource.onmessage = (event: MessageEvent) => {
			logger.debug('SSE message received', { data: String(event.data) });
			void this.handleMessage(event);
		};

		this.eventSource.onerror = (event: unknown) => {
			if (!this.shouldReconnect) return;

			// The eventsource package exposes status/message on the error event
			const eventObj = event as Record<string, string | undefined> | null;
			const statusCode = eventObj?.status ?? eventObj?.code ?? '';
			const errorMessage = eventObj?.message ?? '';
			printReconnecting(errorMessage || undefined);

			if (this.eventSource) {
				this.eventSource.close();
				this.eventSource = null;
			}

			const isAuthError = String(statusCode) === '403' || String(statusCode) === '500';

			setTimeout(() => {
				if (!this.shouldReconnect) return;
				if (isAuthError) {
					void this.reInitialize();
				} else {
					this.connectSSE();
				}
			}, this.reconnectDelay);

			// Exponential backoff: 1s → 2s → 4s → 8s → ... → 30s max
			this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
		};
	}

	/** Re-initialize the gateway connection (re-upload capabilities + reconnect SSE). */
	private async reInitialize(): Promise<void> {
		this.authRetryCount++;
		if (this.authRetryCount >= MAX_AUTH_RETRIES) {
			printAuthFailure();
			this.shouldReconnect = false;
			this.options.onPersistentFailure?.();
			return;
		}

		try {
			printReinitializing();
			await this.uploadCapabilities();
			this.reconnectDelay = 1000;
			this.authRetryCount = 0;
			this.connectSSE();
		} catch (error) {
			printReinitFailed(error instanceof Error ? error.message : String(error));
			setTimeout(() => {
				if (this.shouldReconnect) void this.reInitialize();
			}, this.reconnectDelay);
			this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
		}
	}

	private async handleMessage(event: MessageEvent): Promise<void> {
		try {
			const parsed: unknown = JSON.parse(String(event.data));
			if (!isFilesystemRequestEvent(parsed)) return;

			const { requestId, toolCall } = parsed.payload;
			printToolCall(toolCall.name, toolCall.arguments);
			const start = Date.now();

			try {
				const result = await this.dispatchToolCall(toolCall.name, toolCall.arguments);
				printToolResult(toolCall.name, Date.now() - start);
				await this.postResponse(requestId, result);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				printToolResult(toolCall.name, Date.now() - start, message);
				await this.postResponse(requestId, formatErrorResult(message));
			}
		} catch {
			// Malformed message — skip
		}
	}

	private async dispatchToolCall(
		name: string,
		args: Record<string, unknown>,
	): Promise<CallToolResult> {
		await this.getAllDefinitions();
		const def = this.definitionMap.get(name);
		if (!def) throw new Error(`Unknown tool: ${name}`);
		const typedArgs: unknown = def.inputSchema.parse(args);
		const context = { dir: this.dir };

		const resources = await def.getAffectedResources(typedArgs, context);
		await this.checkPermissions(resources);

		return await def.execute(typedArgs, context);
	}

	private async checkPermissions(resources: AffectedResource[]): Promise<void> {
		const { settingsStore, confirmResourceAccess } = this.options;

		for (const resource of resources) {
			const rule = settingsStore.check(resource.toolGroup, resource.resource);

			if (rule === 'deny') {
				throw new Error(`User denied access to ${resource.toolGroup}: ${resource.resource}`);
			}

			if (rule === 'allow') continue;

			const decision = await confirmResourceAccess(resource);

			switch (decision) {
				case 'allowOnce':
					break;
				case 'allowForSession':
					settingsStore.allowForSession(resource.toolGroup, resource.resource);
					break;
				case 'alwaysAllow':
					settingsStore.alwaysAllow(resource.toolGroup, resource.resource);
					break;
				case 'alwaysDeny':
					settingsStore.alwaysDeny(resource.toolGroup, resource.resource);
					throw new Error(
						`User permanently denied access to ${resource.toolGroup}: ${resource.resource}`,
					);
				default:
				case 'denyOnce':
					throw new Error(`User denied access to ${resource.toolGroup}: ${resource.resource}`);
			}
		}
	}

	private async postResponse(requestId: string, result: CallToolResult): Promise<void> {
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
				logger.error('Failed to post response', { requestId, status: response.status });
			}
		} catch (fetchError) {
			logger.error('Failed to post response', {
				requestId,
				error: fetchError instanceof Error ? fetchError.message : String(fetchError),
			});
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
