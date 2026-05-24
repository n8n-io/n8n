import type { Tool } from '@langchain/core/tools';

export interface ExecutionContext {
	sessionId: string;
	messageId?: string;
}

export interface ExecutionStrategy {
	executeTool(
		tool: Tool,
		args: Record<string, unknown>,
		context: ExecutionContext,
	): Promise<unknown>;
}
