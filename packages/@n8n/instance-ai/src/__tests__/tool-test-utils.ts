import type { BuiltTool, InterruptibleToolContext, ToolContext } from '@n8n/agents';

interface LegacyExecutableTool<TOutput = Record<string, unknown>> {
	execute(input: unknown, context?: unknown): Promise<TOutput> | TOutput;
	name?: string;
	id?: string;
}

interface LegacyToolContext {
	agent?: {
		resumeData?: unknown;
		suspend?: (payload: unknown) => unknown;
	};
}

function isLegacyToolContext(value: unknown): value is LegacyToolContext {
	return typeof value === 'object' && value !== null && 'agent' in value;
}

function toNativeContext(context?: unknown): ToolContext | InterruptibleToolContext {
	if (!context) return {};
	if (!isLegacyToolContext(context)) return context as ToolContext | InterruptibleToolContext;

	return {
		resumeData: context.agent?.resumeData,
		suspend: (async (payload: unknown) => {
			await context.agent?.suspend?.(payload);
			return undefined as never;
		}) as InterruptibleToolContext['suspend'],
	};
}

export async function executeTool<TOutput = unknown>(
	tool: LegacyExecutableTool<TOutput>,
	input: unknown,
	context?: unknown,
): Promise<TOutput>;
export async function executeTool<TOutput = Record<string, unknown>>(
	tool: BuiltTool,
	input: unknown,
	context?: unknown,
): Promise<TOutput>;
export async function executeTool<TOutput = Record<string, unknown>>(
	tool: BuiltTool | LegacyExecutableTool<TOutput>,
	input: unknown,
	context?: unknown,
): Promise<TOutput> {
	if ('handler' in tool && tool.handler) {
		return (await tool.handler(input, toNativeContext(context))) as TOutput;
	}

	if ('execute' in tool && typeof tool.execute === 'function') {
		return await tool.execute(input, context);
	}

	throw new Error(`Tool "${getToolName(tool)}" has no handler`);
}

function getToolName(tool: BuiltTool | LegacyExecutableTool<unknown>): string {
	if ('name' in tool && tool.name) return tool.name;
	if ('id' in tool && tool.id) return tool.id;
	return 'unknown';
}
