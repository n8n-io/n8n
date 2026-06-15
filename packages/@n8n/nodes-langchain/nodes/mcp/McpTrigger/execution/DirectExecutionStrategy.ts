import type { Tool } from '@langchain/core/tools';

/**
 * Direct execution strategy for MCP tools in monolithic/single-instance mode.
 *
 * In this mode, tools are executed directly in the same process where they are defined.
 * This is the traditional approach that works when all nodes run in the same Node.js process.
 */
export class DirectExecutionStrategy {
	/**
	 * Executes a tool directly by calling its invoke method.
	 * This works because the Tool object with its methods is available in memory.
	 */
	async executeTool(tool: Tool, args: Record<string, unknown>): Promise<string> {
		const result = await tool.invoke(args);

		if (typeof result === 'object') {
			return JSON.stringify(result);
		}
		if (typeof result === 'string') {
			return result;
		}
		return String(result);
	}

	/**
	 * Returns the tools as-is since they can be used directly in this execution mode.
	 */
	prepareTools(tools: Tool[]): Tool[] {
		return tools;
	}

	/**
	 * No cleanup needed for direct execution.
	 */
	async cleanup(): Promise<void> {
		// No-op for direct execution
	}
}
