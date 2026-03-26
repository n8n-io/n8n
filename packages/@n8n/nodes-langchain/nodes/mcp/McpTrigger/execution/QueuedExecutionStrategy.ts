import type { Tool } from '@langchain/core/tools';

import type { ExecutionContext, ExecutionStrategy } from './ExecutionStrategy';
import type { PendingCallsManager } from './PendingCallsManager';

const DEFAULT_TIMEOUT_MS = 120000;

export class QueuedExecutionStrategy implements ExecutionStrategy {
	constructor(
		private pendingCalls: PendingCallsManager,
		private timeoutMs: number = DEFAULT_TIMEOUT_MS,
	) {}

	async executeTool(
		tool: Tool,
		args: Record<string, unknown>,
		context: ExecutionContext,
	): Promise<unknown> {
		const callId = `${context.sessionId}_${context.messageId ?? 'default'}`;

		return await this.pendingCalls.waitForResult(callId, tool.name, args, this.timeoutMs);
	}

	resolveToolCall(callId: string, result: unknown): boolean {
		return this.pendingCalls.resolve(callId, result);
	}

	rejectToolCall(callId: string, error: Error): boolean {
		return this.pendingCalls.reject(callId, error);
	}

	getPendingCallsManager(): PendingCallsManager {
		return this.pendingCalls;
	}
}
