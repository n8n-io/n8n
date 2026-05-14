import { EventEmitter } from 'node:events';

import type {
	InstanceAiGatewayCapabilities,
	McpTool,
	McpToolCallRequest,
	McpToolCallResult,
	ToolCategory,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';

const REQUEST_TIMEOUT_MS = 60_000;

interface PendingRequest {
	resolve: (result: McpToolCallResult) => void;
	reject: (error: Error) => void;
	timer: NodeJS.Timeout;
	toolCall: McpToolCallRequest;
}

export interface LocalGatewayRequestEvent {
	type: 'filesystem-request';
	payload: {
		requestId: string;
		toolCall: McpToolCallRequest;
		previewOnly?: boolean;
	};
}

export interface LocalGatewayDisconnectEvent {
	type: 'gateway-disconnect';
}

export type LocalGatewayEvent = LocalGatewayRequestEvent | LocalGatewayDisconnectEvent;

/**
 * Per-user gateway connection to a local computer-use daemon.
 *
 * The event name stays `filesystem-request` for daemon compatibility, but the
 * payload is generic MCP-style tool execution.
 */
export class LocalGateway {
	private readonly pendingRequests = new Map<string, PendingRequest>();

	private readonly emitter = new EventEmitter();

	private connected = false;

	private connectedAtValue: string | null = null;

	private rootPathValue: string | null = null;

	private hostIdentifierValue: string | null = null;

	private toolCategoriesValue: ToolCategory[] = [];

	private availableToolsValue: McpTool[] = [];

	get isConnected(): boolean {
		return this.connected;
	}

	get connectedAt(): string | null {
		return this.connectedAtValue;
	}

	get rootPath(): string | null {
		return this.rootPathValue;
	}

	getAvailableTools(): McpTool[] {
		return this.availableToolsValue;
	}

	getToolsByCategory(category: string): McpTool[] {
		return this.availableToolsValue.filter((tool) => tool.annotations?.category === category);
	}

	onRequest(listener: (event: LocalGatewayRequestEvent) => void): () => void {
		this.emitter.on('filesystem-request', listener);
		return () => this.emitter.off('filesystem-request', listener);
	}

	onDisconnect(listener: (event: LocalGatewayDisconnectEvent) => void): () => void {
		this.emitter.on('gateway-disconnect', listener);
		return () => this.emitter.off('gateway-disconnect', listener);
	}

	init(data: InstanceAiGatewayCapabilities): void {
		this.rootPathValue = data.rootPath;
		this.hostIdentifierValue = data.hostIdentifier ?? null;
		this.toolCategoriesValue = data.toolCategories ?? [];
		this.availableToolsValue = data.tools;
		this.connected = true;
		this.connectedAtValue = new Date().toISOString();
	}

	resolveRequest(requestId: string, result?: McpToolCallResult, error?: string): boolean {
		const pending = this.pendingRequests.get(requestId);
		if (!pending) return false;

		clearTimeout(pending.timer);
		this.pendingRequests.delete(requestId);

		if (error) {
			pending.reject(new Error(error));
			return true;
		}

		pending.resolve(result ?? { content: [] });
		return true;
	}

	disconnect(): void {
		this.emitter.emit('gateway-disconnect', {
			type: 'gateway-disconnect',
		} satisfies LocalGatewayDisconnectEvent);

		this.connected = false;
		this.connectedAtValue = null;
		this.rootPathValue = null;
		this.hostIdentifierValue = null;
		this.toolCategoriesValue = [];
		this.availableToolsValue = [];

		for (const [id, pending] of this.pendingRequests) {
			clearTimeout(pending.timer);
			pending.reject(new Error('Local gateway disconnected'));
			this.pendingRequests.delete(id);
		}
	}

	getStatus(): {
		connected: boolean;
		connectedAt: string | null;
		directory: string | null;
		hostIdentifier: string | null;
		toolCategories: ToolCategory[];
		tools: McpTool[];
	} {
		return {
			connected: this.connected,
			connectedAt: this.connectedAtValue,
			directory: this.rootPathValue,
			hostIdentifier: this.hostIdentifierValue,
			toolCategories: this.toolCategoriesValue,
			tools: this.availableToolsValue,
		};
	}

	async callTool(toolCall: McpToolCallRequest): Promise<McpToolCallResult> {
		return await this.sendToolCall(toolCall);
	}

	async previewTool(toolCall: McpToolCallRequest): Promise<McpToolCallResult> {
		return await this.sendToolCall(toolCall, true);
	}

	private async sendToolCall(
		toolCall: McpToolCallRequest,
		previewOnly = false,
	): Promise<McpToolCallResult> {
		if (!this.connected) {
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
				payload: { requestId, toolCall, previewOnly },
			} satisfies LocalGatewayEvent);
		});
	}
}
