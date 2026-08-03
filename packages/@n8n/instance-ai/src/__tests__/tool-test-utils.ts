import type { BuiltTool, InterruptibleToolContext, ToolContext } from '@n8n/agents';

export async function executeTool<TOutput = Record<string, unknown>>(
	tool: BuiltTool,
	input: unknown,
	context: unknown = {},
): Promise<TOutput> {
	if (tool.handler) {
		return (await tool.handler(
			input,
			context as ToolContext | InterruptibleToolContext,
		)) as TOutput;
	}

	throw new Error(`Tool "${tool.name}" has no handler`);
}
