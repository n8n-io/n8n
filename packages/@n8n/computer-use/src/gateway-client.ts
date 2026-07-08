import { EventSource } from 'eventsource';
import * as os from 'node:os';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { GatewayConfig } from './config';
import type { GatewaySession } from './gateway-session';
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
import { BrowserModule } from './tools/browser';
import { filesystemReadTools, filesystemWriteTools } from './tools/filesystem';
import { MouseKeyboardModule } from './tools/mouse-keyboard';
import { ScreenshotModule } from './tools/screenshot';
import { ShellModule } from './tools/shell';
import {
	type AffectedResource,
	type CallToolResult,
	type ConfirmResourceAccess,
	type CreateCredentialPayload,
	type McpTool,
	type ResourceDecision,
	type ToolDefinition,
	type ToolModule,
	GATEWAY_CONFIRMATION_REQUIRED_PREFIX,
	INSTANCE_RESOURCE_DECISION_KEYS,
} from './tools/types';
import { formatErrorResult } from './tools/utils';

const MAX_RECONNECT_DELAY_MS = 30_000;
const MAX_AUTH_RETRIES = 5;

/** Thrown when the gateway rejects our pairing token with 401/403. */
export class GatewayAuthError extends Error {
	constructor(
		readonly status: number,
		readonly body: string,
	) {
		super(`Gateway rejected token: ${status} ${body}`);
		this.name = 'GatewayAuthError';
	}
}

/** Tag tool definitions with a category annotation (mutates in place for efficiency). */
function tagCategory(defs: ToolDefinition[], category: string): ToolDefinition[] {
	for (const def of defs) {
		def.annotations = { ...def.annotations, category };
	}
	return defs;
}

export interface GatewayClientOptions {
	url: string;
	apiKey: string;
	/** Non-permission config (browser, shell, logLevel, etc.) */
	config: GatewayConfig;
	/** Permissions + dir + session rules for this connection. */
	session: GatewaySession;
	confirmResourceAccess: ConfirmResourceAccess;
	/** Called when the client gives up reconnecting after persistent auth failures. */
	onPersistentFailure?: () => void;
	/** Called after disconnect() has finished tearing down the client. */
	onDisconnected?: () => void;
}

interface FilesystemRequestEvent {
	type: 'filesystem-request';
	payload: {
		requestId: string;
		toolCall: { name: string; arguments: Record<string, unknown> };
	};
}

interface GatewayDisconnectEvent {
	type: 'gateway-disconnect';
}

/**
 * Client that connects to the n8n gateway via SSE and
 * handles tool requests by executing MCP tool calls locally.
 */
export class GatewayClient {
	private eventSource: EventSource | null = null;

	private reconnectDelay = 1000;

	private shouldReconnect = true;

	private disconnected = false;

	/** Consecutive auth failures during reconnection attempts. */
	private authRetryCount = 0;

	/** Session key issued by the server after pairing token is consumed. */
	private sessionKey: string | null = null;

	private allDefinitions: ToolDefinition[] | null = null;

	private activeToolCategories: Array<{ name: string; enabled: boolean; writeAccess?: boolean }> =
		[];

	private definitionMap: Map<string, ToolDefinition> = new Map();

	private readonly modules: ToolModule[] = [
		ShellModule,
		ScreenshotModule,
		MouseKeyboardModule,
		BrowserModule,
	];

	/** Teardowns for modules that hold resources; collected as modules activate. */
	private teardowns: Array<() => Promise<void>> = [];

	/** Diagnostics for permitted-but-unavailable modules; surfaced after connect. */
	private disabledModuleReports: Array<{ name: string; reason: string; hint?: string }> = [];

	/** Get all registered tool definitions (populated after start). */
	get tools(): ToolDefinition[] {
		return this.allDefinitions ?? [];
	}

	/** Resolved per-category enabled state (populated after start). */
	get toolCategories(): Array<{ name: string; enabled: boolean; writeAccess?: boolean }> {
		return this.activeToolCategories;
	}

	/** Permitted modules that couldn't activate, with why + how to fix (after start). */
	get disabledModules(): Array<{ name: string; reason: string; hint?: string }> {
		return this.disabledModuleReports;
	}

	constructor(private readonly options: GatewayClientOptions) {}

	/** Session key when the server has upgraded the pairing token; otherwise the original token. */
	private get apiKey(): string {
		return this.sessionKey ?? this.options.apiKey;
	}

	private get dir(): string {
		return this.options.session.dir;
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
		await this.runTeardowns();
	}

	/**
	 * Tear down the client. Idempotent: safe to call multiple times.
	 *
	 * @param options.notifyServer Whether to POST the disconnect notification to
	 *   the backend. Skip when the backend initiated the disconnect (e.g. via an
	 *   SSE `gateway-disconnect` event) — no need to tell it what it told us.
	 */
	async disconnect(options: { notifyServer?: boolean } = {}): Promise<void> {
		if (this.disconnected) return;
		this.disconnected = true;
		this.shouldReconnect = false;
		this.options.session.clearSession();

		const notifyServer = options.notifyServer ?? true;
		if (notifyServer) {
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
		} else {
			printDisconnected();
		}

		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
		}
		await this.runTeardowns();

		this.options.onDisconnected?.();
	}

	/** Run and clear pending module teardowns. Idempotent. */
	private async runTeardowns(): Promise<void> {
		const teardowns = this.teardowns;
		this.teardowns = [];
		const results = await Promise.allSettled(teardowns.map(async (teardown) => await teardown()));
		for (const result of results) {
			if (result.status === 'rejected') {
				logger.error('Module teardown failed', {
					error: result.reason instanceof Error ? result.reason.message : String(result.reason),
				});
			}
		}
	}

	private async getAllDefinitions(): Promise<ToolDefinition[]> {
		if (this.allDefinitions) return this.allDefinitions;

		const { config, session } = this.options;
		const defs: ToolDefinition[] = [];
		const categories: Array<{ name: string; enabled: boolean; writeAccess?: boolean }> = [];

		// Filesystem
		const fsReadEnabled = session.getGroupMode('filesystemRead') !== 'deny';
		const fsWriteEnabled = session.getGroupMode('filesystemWrite') !== 'deny';
		if (fsReadEnabled) {
			defs.push(...tagCategory(filesystemReadTools, 'filesystem'));
		}
		if (fsWriteEnabled) {
			defs.push(...tagCategory(filesystemWriteTools, 'filesystem'));
		}
		categories.push({
			name: 'filesystem',
			enabled: fsReadEnabled || fsWriteEnabled,
			writeAccess: fsWriteEnabled,
		});

		for (const module of this.modules) {
			if (session.getGroupMode(module.permissionGroup) === 'deny') {
				logger.debug('Module denied by permission, skipping', { module: module.name });
				categories.push({ name: module.category, enabled: false });
				continue;
			}

			const activation = await module.activate({ config, dir: session.dir });
			if (!activation.supported) {
				logger.debug('Module disabled', {
					module: module.name,
					reason: activation.reason,
					...(activation.hint ? { hint: activation.hint } : {}),
				});
				this.disabledModuleReports.push({
					name: module.name,
					reason: activation.reason,
					...(activation.hint ? { hint: activation.hint } : {}),
				});
				categories.push({ name: module.category, enabled: false });
				continue;
			}

			defs.push(...tagCategory(activation.tools, module.category));
			if (activation.shutdown) this.teardowns.push(activation.shutdown);
			categories.push({ name: module.category, enabled: true });
		}

		for (const def of defs) {
			logger.debug('Registered tool', { name: def.name, description: def.description });
		}
		this.allDefinitions = defs;
		this.activeToolCategories = categories;
		this.definitionMap = new Map(defs.map((d) => [d.name, d]));
		return defs;
	}

	private async uploadCapabilities(): Promise<void> {
		const defs = await this.getAllDefinitions();
		const tools: McpTool[] = defs.map((d) => ({
			name: d.name,
			description: d.description,
			inputSchema: zodToJsonSchema(d.inputSchema) as McpTool['inputSchema'],
			...(d.annotations ? { annotations: d.annotations } : {}),
		}));
		const url = `${this.options.url}/rest/instance-ai/gateway/init`;
		const headers = new Headers();
		headers.set('Content-Type', 'application/json');
		headers.set('X-Gateway-Key', this.apiKey);
		const response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				rootPath: this.dir,
				tools,
				hostIdentifier: `${os.userInfo().username}@${os.hostname()}`,
				toolCategories: this.activeToolCategories,
			}),
		});

		if (!response.ok) {
			const text = await response.text();
			if (response.status === 401 || response.status === 403) {
				throw new GatewayAuthError(response.status, text);
			}
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
		const url = `${this.options.url}/rest/instance-ai/gateway/events`;

		logger.debug('Connecting to gateway', { keyPrefix: this.apiKey.slice(0, 8) });
		const apiKey = this.apiKey;
		this.eventSource = new EventSource(url, {
			fetch: async (input, init) => {
				const headers = new Headers(init?.headers);
				headers.set('X-Gateway-Key', apiKey);
				return await fetch(input, { ...init, headers });
			},
		});

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

			const isAuthError = String(statusCode) === '401' || String(statusCode) === '403';

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

			if (isGatewayDisconnectEvent(parsed)) {
				// Server told us to disconnect — skip the POST-back, it would be circular.
				await this.disconnect({ notifyServer: false });
				return;
			}

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

		// Strip _confirmation from args before schema validation — the agent must
		// never be able to inject a decision directly into tool arguments.
		const { _confirmation, ...cleanArgs } = args;
		const decision =
			typeof _confirmation === 'string' ? (_confirmation as ResourceDecision) : undefined;

		const typedArgs: unknown = def.inputSchema.parse(cleanArgs);
		const session = this.options.session;
		const instanceUrl = this.options.url;
		const gatewayKey = this.apiKey;
		const context = {
			dir: this.dir,
			secretsBuffer: {
				capture: (k: string, f: string, v: string) => session.captureSecret(k, f, v),
				getFields: (k: string) => session.getSecretFields(k),
				clear: (k: string) => session.clearSecrets(k),
			},
			createCredential: async (payload: CreateCredentialPayload) => {
				const url = `${instanceUrl}/rest/instance-ai/gateway/credentials`;
				const headers = new Headers();
				headers.set('Content-Type', 'application/json');
				headers.set('X-Gateway-Key', gatewayKey);
				const res = await fetch(url, {
					method: 'POST',
					headers,
					body: JSON.stringify(payload),
				});
				if (!res.ok) {
					const text = await res.text();
					throw new Error(`Credential creation failed: ${res.status} ${text}`);
				}
				const body = (await res.json()) as { data: { credentialId: string } };
				return { credentialId: body.data.credentialId };
			},
		};

		const resources = await def.getAffectedResources(typedArgs, context);
		await this.checkPermissions(resources, decision);

		return await def.execute(typedArgs, context);
	}

	private async checkPermissions(
		resources: AffectedResource[],
		decision?: ResourceDecision,
	): Promise<void> {
		const { session, confirmResourceAccess, config } = this.options;

		for (const resource of resources) {
			const rule = session.check(resource.toolGroup, resource.resource);

			if (rule === 'deny') {
				throw new Error(
					`User permanently denied access to ${resource.toolGroup}: ${resource.resource}`,
				);
			}

			if (rule === 'allow') continue;

			let resolvedDecision: ResourceDecision;

			if (decision && config.permissionConfirmation === 'instance') {
				resolvedDecision = decision;
			} else if (config.permissionConfirmation === 'instance') {
				throw new Error(
					`${GATEWAY_CONFIRMATION_REQUIRED_PREFIX}${JSON.stringify({
						toolGroup: resource.toolGroup,
						resource: resource.resource,
						description: resource.description,
						options: INSTANCE_RESOURCE_DECISION_KEYS,
					})}`,
				);
			} else {
				resolvedDecision = await confirmResourceAccess(resource);
			}

			switch (resolvedDecision) {
				case 'allowOnce':
					break;
				case 'allowForSession':
					session.allowForSession(resource.toolGroup, resource.resource);
					break;
				case 'alwaysAllow':
					session.alwaysAllow(resource.toolGroup, resource.resource);
					break;
				case 'alwaysDeny':
					session.alwaysDeny(resource.toolGroup, resource.resource);
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

function isGatewayDisconnectEvent(data: unknown): data is GatewayDisconnectEvent {
	if (typeof data !== 'object' || data === null) return false;
	return (data as Record<string, unknown>).type === 'gateway-disconnect';
}

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
