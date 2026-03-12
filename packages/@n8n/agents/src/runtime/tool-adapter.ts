import { tool, type Tool as AiSdkTool } from 'ai';

import type { BuiltTool, InterruptibleToolContext, ToolContext } from '../types';

/**
 * Branded symbol used to tag the return value of `ctx.suspend(payload)`.
 * The agent runtime checks for this brand on the tool's return value
 * instead of catching a thrown error.
 */
const SUSPEND_BRAND = Symbol('SuspendBrand');

export interface SuspendedToolResult {
	readonly [SUSPEND_BRAND]: true;
	readonly payload: unknown;
}

/** Type guard: returns true when a tool's return value is a suspend signal. */
export function isSuspendedToolResult(value: unknown): value is SuspendedToolResult {
	return typeof value === 'object' && value !== null && SUSPEND_BRAND in value;
}

/**
 * Convert an array of BuiltTools into a Record of AI SDK tool definitions.
 * Tools are created WITHOUT execute — the agent loop handles execution manually.
 */
export function toAiSdkTools(tools?: BuiltTool[]): Record<string, AiSdkTool> {
	if (!tools || tools.length === 0) return {};

	const result: Record<string, AiSdkTool> = {};
	for (const t of tools) {
		if (!t.inputSchema) continue;
		result[t.name] = tool({
			description: t.description,
			inputSchema: t.inputSchema,
		});
	}
	return result;
}

/**
 * Execute a tool call by finding its handler and running it.
 * For tools with suspend/resume schemas, passes an InterruptibleToolContext
 * that lets the handler call `suspend(payload)`.
 */
export async function executeTool(
	toolName: string,
	args: unknown,
	toolMap: Map<string, BuiltTool>,
	resumeData?: unknown,
): Promise<unknown> {
	const builtTool = toolMap.get(toolName);
	if (!builtTool?.handler) {
		throw new Error(`No handler found for tool "${toolName}"`);
	}

	if (builtTool.suspendSchema) {
		const ctx: InterruptibleToolContext = {
			suspend: async (payload: unknown): Promise<never> => {
				return await Promise.resolve({ [SUSPEND_BRAND]: true, payload } as never);
			},
			resumeData,
		};
		return await builtTool.handler(args, ctx);
	}

	const ctx: ToolContext = {} as ToolContext;
	return await builtTool.handler(args, ctx);
}

/**
 * Check if a tool has suspend/resume schemas (i.e. is interruptible).
 */
export function isInterruptible(toolName: string, toolMap: Map<string, BuiltTool>): boolean {
	const builtTool = toolMap.get(toolName);
	return !!builtTool?.suspendSchema;
}

/** Build a Map from tool name to BuiltTool for quick lookups. */
export function buildToolMap(tools?: BuiltTool[]): Map<string, BuiltTool> {
	const map = new Map<string, BuiltTool>();
	if (tools) {
		for (const t of tools) {
			map.set(t.name, t);
		}
	}
	return map;
}
