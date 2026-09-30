import {
	isZodSchema,
	type BuiltTool,
	type InterruptibleToolContext,
	type ToolContext,
} from '@n8n/agents';
import type { SafeParseReturnType } from 'zod';

/**
 * Validate raw tool input against the tool's declared input schema, the way the
 * runtime does before it calls the handler. Use it to assert on input contracts
 * that `executeTool` bypasses.
 *
 * `BuiltTool.inputSchema` is a Zod schema or a raw JSON Schema (MCP tools), so
 * the Zod path is asserted rather than assumed.
 */
export function parseToolInput(
	tool: BuiltTool,
	input: unknown,
): SafeParseReturnType<unknown, unknown> {
	const { inputSchema } = tool;
	if (!isZodSchema(inputSchema)) {
		throw new Error(`Tool "${tool.name}" has no Zod input schema to validate against`);
	}
	return inputSchema.safeParse(input);
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
