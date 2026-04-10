import { EventEmitter } from 'node:events';
import { nanoid } from 'nanoid';
import type {
	McpToolCallRequest,
	McpToolCallResult,
	McpTool,
	InstanceAiGatewayCapabilities,
	ToolCategory,
} from '@n8n/api-types';

const REQUEST_TIMEOUT_MS = 60_000; // 1 minute — tool calls like browser automation and shell execution can be long-running

// ── Internal types ───────────────────────────────────────────────────────────

interface PendingRequest {
	resolve: (result: McpToolCallResult) => void;
	reject: (error: Error) => void;
	timer: NodeJS.Timeout;
	toolCall: McpToolCallRequest;
}

export interface LocalGatewayEvent {
	type: 'filesystem-request';
	payload: {
		requestId: string;
		toolCall: McpToolCallRequest;
	};
}

/**
 * Singleton MCP gateway for a connected local client (e.g. the computer-use daemon).
 *
 * The client advertises its capabilities as `McpTool[]` on connect; all tool
 * calls are dispatched generically via the SSE channel. Tools are not limited
 * to filesystem operations — any capability the daemon exposes is supported.
 *
 * Protocol:
 * 1. Client connects via SSE to GET /instance-ai/gateway/events
 * 2. Client POSTs MCP tool definitions to /instance-ai/gateway/init
 * 3. callTool() → emits filesystem-request via SSE
 * 4. Client executes locally, POSTs MCP result to /instance-ai/gateway/response/:requestId
 * 5. resolveRequest() resolves the pending promise → caller gets McpToolCallResult
 *
 * Resource-access confirmations (GATEWAY_CONFIRMATION_REQUIRED) are handled at the
 * tool layer via Mastra's suspend()/resumeData mechanism — not here.
 */
export class LocalGateway {
	private readonly pendingRequests = new Map<string, PendingRequest>();

	private readonly emitter = new EventEmitter();

	private _connected = false;

	private _connectedAt: string | null = null;

	private _rootPath: string | null = null;

	private _hostIdentifier: string | null = null;

	private _toolCategories: ToolCategory[] = [];

	private _availableTools: McpTool[] = [];

	get isConnected(): boolean {
		return this._connected;
	}

	get connectedAt(): string | null {
		return this._connectedAt;
	}

	get rootPath(): string | null {
		return this._rootPath;
	}

	/** The MCP tools advertised by the client on connect. */
	getAvailableTools(): McpTool[] {
		return this._availableTools;
	}

	/** Return tools that belong to the given category (based on annotations.category). */
	getToolsByCategory(category: string): McpTool[] {
		return this._availableTools.filter((t) => t.annotations?.category === category);
	}

	/** Subscribe to outbound tool call events (consumed by the SSE endpoint). */
	onRequest(listener: (event: LocalGatewayEvent) => void): () => void {
		this.emitter.on('filesystem-request', listener);
		return () => this.emitter.off('filesystem-request', listener);
	}

	/** Called when the client uploads its MCP tool capabilities. */
	init(data: InstanceAiGatewayCapabilities): void {
		this._rootPath = data.rootPath;
		this._hostIdentifier = data.hostIdentifier ?? null;
		this._toolCategories = data.toolCategories ?? [];
		this._availableTools = data.tools;
		this._connected = true;
		this._connectedAt = new Date().toISOString();
	}

	/** Called when the client POSTs back an MCP result for a pending request. */
	resolveRequest(requestId: string, result?: McpToolCallResult, error?: string): boolean {
		const pending = this.pendingRequests.get(requestId);
		if (!pending) return false;

		clearTimeout(pending.timer);
		this.pendingRequests.delete(requestId);

		if (error) {
			pending.reject(new Error(error));
			return true;
		}

		// Resolve with the result as-is (including isError responses) so the tool
		// layer (create-tools-from-mcp-server.ts) can inspect GATEWAY_CONFIRMATION_REQUIRED
		// errors and handle them via Mastra suspend().
		pending.resolve(result ?? { content: [] });
		return true;
	}

	/** Mark the gateway as disconnected and reject all pending requests. */
	disconnect(): void {
		this._connected = false;
		this._connectedAt = null;
		this._rootPath = null;
		this._hostIdentifier = null;
		this._toolCategories = [];
		this._availableTools = [];

		for (const [id, pending] of this.pendingRequests) {
			clearTimeout(pending.timer);
			pending.reject(new Error('Local gateway disconnected'));
			this.pendingRequests.delete(id);
		}
	}

	/** Return connection status for the frontend. */
	getStatus(): {
		connected: boolean;
		connectedAt: string | null;
		directory: string | null;
		hostIdentifier: string | null;
		toolCategories: ToolCategory[];
	} {
		return {
			connected: this._connected,
			connectedAt: this._connectedAt,
			directory: this._rootPath,
			hostIdentifier: this._hostIdentifier,
			toolCategories: this._toolCategories,
		};
	}

	/**
	 * Dispatch an MCP tool call to the remote client and await its result.
	 * Throws if not connected or if the request times out.
	 */
	async callTool(toolCall: McpToolCallRequest): Promise<McpToolCallResult> {
		if (!this._connected) {
			throw new Error('Local gateway is not connected');
		}

		const requestId = `gw_${nanoid()}`;

		return await new Promise<McpToolCallResult>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pendingRequests.delete(requestId);
				reject(new Error(`Local gateway request timed out after ${REQUEST_TIMEOUT_MS}ms`));
			}, REQUEST_TIMEOUT_MS);

			this.pendingRequests.set(requestId, { resolve, reject, timer, toolCall });

			this.emitter.emit('filesystem-request', {
				type: 'filesystem-request',
				payload: { requestId, toolCall },
			} satisfies LocalGatewayEvent);
		});
	}
}
