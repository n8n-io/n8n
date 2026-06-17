import { v4 as uuid } from 'uuid';
import type { Logger } from 'n8n-workflow';

export interface PendingCall {
	id: string;
	toolName: string;
	args: Record<string, unknown>;
	resolve: (result: string) => void;
	reject: (error: Error) => void;
	timestamp: number;
	timeoutId: NodeJS.Timeout;
}

export interface ToolInvocationRequest {
	callId: string;
	toolName: string;
	args: Record<string, unknown>;
	sessionId?: string;
}

export interface ToolInvocationResponse {
	callId: string;
	success: boolean;
	result?: string;
	error?: string;
}

/**
 * Manages pending tool invocation requests in Queue Mode.
 *
 * In Queue Mode, workers cannot directly execute MCP tools because:
 * 1. Tool objects (LangChain Tool instances) cannot be JSON serialized
 * 2. MCP server connections exist only on the main instance
 * 3. The McpServerManager singleton is not shared across processes
 *
 * This manager provides an RPC-like mechanism where:
 * - Workers create pending calls and send requests to main instance
 * - Main instance executes tools via McpServerManager
 * - Results are sent back to workers
 * - Pending calls are resolved/rejected based on responses
 */
export class PendingCallsManager {
	private pendingCalls: Map<string, PendingCall> = new Map();
	private readonly defaultTimeout: number;
	private readonly logger: Logger;

	constructor(logger: Logger, timeoutMs: number = 30000) {
		this.logger = logger.scoped('pending-calls-manager');
		this.defaultTimeout = timeoutMs;
	}

	/**
	 * Creates a pending call and returns both the callId and a promise that resolves when the call completes.
	 *
	 * @param toolName Name of the tool to invoke
	 * @param args Arguments to pass to the tool
	 * @param sessionId Optional MCP session ID
	 * @returns Object containing callId and promise that resolves with the tool execution result
	 */
	createPendingCall(
		toolName: string,
		args: Record<string, unknown>,
		sessionId?: string,
	): { callId: string; promise: Promise<string> } {
		const callId = uuid();
		const timestamp = Date.now();

		const promise = new Promise<string>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				this.logger.error(`Tool invocation timeout for call ${callId} (tool: ${toolName})`);
				this.rejectCall(
					callId,
					new Error(`Tool invocation timeout after ${this.defaultTimeout}ms`),
				);
			}, this.defaultTimeout);

			const pendingCall: PendingCall = {
				id: callId,
				toolName,
				args,
				resolve,
				reject,
				timestamp,
				timeoutId,
			};

			this.pendingCalls.set(callId, pendingCall);

			this.logger.debug(`Created pending call ${callId} for tool ${toolName}`, {
				callId,
				toolName,
				sessionId,
			});
		});

		return { callId, promise };
	}

	/**
	 * Resolves a pending call with a successful result.
	 */
	resolveCall(callId: string, result: string): void {
		const pendingCall = this.pendingCalls.get(callId);

		if (!pendingCall) {
			this.logger.warn(`Attempted to resolve non-existent call ${callId}`);
			return;
		}

		clearTimeout(pendingCall.timeoutId);
		pendingCall.resolve(result);
		this.pendingCalls.delete(callId);

		const duration = Date.now() - pendingCall.timestamp;
		this.logger.debug(`Resolved pending call ${callId} after ${duration}ms`);
	}

	/**
	 * Rejects a pending call with an error.
	 */
	rejectCall(callId: string, error: Error): void {
		const pendingCall = this.pendingCalls.get(callId);

		if (!pendingCall) {
			this.logger.warn(`Attempted to reject non-existent call ${callId}`);
			return;
		}

		clearTimeout(pendingCall.timeoutId);
		pendingCall.reject(error);
		this.pendingCalls.delete(callId);

		this.logger.error(`Rejected pending call ${callId}`, { error: error.message });
	}

	/**
	 * Handles a tool invocation response from the main instance.
	 */
	handleResponse(response: ToolInvocationResponse): void {
		const { callId, success, result, error } = response;

		if (success && result !== undefined) {
			this.resolveCall(callId, result);
		} else {
			this.rejectCall(callId, new Error(error || 'Unknown error during tool invocation'));
		}
	}

	/**
	 * Gets the request data for a pending call to send to the main instance.
	 */
	getRequest(callId: string): ToolInvocationRequest | null {
		const pendingCall = this.pendingCalls.get(callId);

		if (!pendingCall) {
			return null;
		}

		return {
			callId,
			toolName: pendingCall.toolName,
			args: pendingCall.args,
		};
	}

	/**
	 * Gets the number of pending calls.
	 */
	getPendingCallsCount(): number {
		return this.pendingCalls.size;
	}

	/**
	 * Clears all pending calls (used during shutdown).
	 */
	clearAll(): void {
		for (const [callId, pendingCall] of this.pendingCalls.entries()) {
			clearTimeout(pendingCall.timeoutId);
			pendingCall.reject(new Error('Pending calls manager shutting down'));
		}
		this.pendingCalls.clear();
		this.logger.debug('Cleared all pending calls');
	}

	/**
	 * Cleans up expired pending calls (calls that have been pending too long).
	 * This is a safety mechanism in case timeout doesn't fire properly.
	 */
	cleanupExpired(maxAgeMs: number = 60000): void {
		const now = Date.now();
		const expiredCalls: string[] = [];

		for (const [callId, pendingCall] of this.pendingCalls.entries()) {
			if (now - pendingCall.timestamp > maxAgeMs) {
				expiredCalls.push(callId);
			}
		}

		for (const callId of expiredCalls) {
			this.rejectCall(callId, new Error('Pending call expired'));
		}

		if (expiredCalls.length > 0) {
			this.logger.warn(`Cleaned up ${expiredCalls.length} expired pending calls`);
		}
	}
}
