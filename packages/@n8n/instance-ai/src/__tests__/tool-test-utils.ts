import type { BuiltTool, InterruptibleToolContext, ToolContext } from '@n8n/agents';
import type { SafeParseReturnType, ZodType } from 'zod';

/**
 * Validate raw tool input against the tool's declared input schema, the way the
 * runtime does before it calls the handler. Use it to assert on input contracts
 * that `executeTool` bypasses.
 */
export function parseToolInput(
	tool: BuiltTool,
	input: unknown,
): SafeParseReturnType<unknown, unknown> {
	if (!tool.inputSchema) throw new Error(`Tool "${tool.name}" has no input schema`);
	return (tool.inputSchema as ZodType).safeParse(input);
}

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
