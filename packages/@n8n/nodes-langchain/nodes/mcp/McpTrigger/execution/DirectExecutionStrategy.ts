import type { Tool } from '@langchain/core/tools';

import type { ExecutionContext, ExecutionStrategy } from './ExecutionStrategy';

export class DirectExecutionStrategy implements ExecutionStrategy {
	async executeTool(
		tool: Tool,
		args: Record<string, unknown>,
		_context: ExecutionContext,
	): Promise<unknown> {
		return await tool.invoke(args);
	}
}
