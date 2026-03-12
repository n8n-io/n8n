import { tool, type Tool as AiSdkTool } from 'ai';

import type { BuiltTool, InterruptibleToolContext, ToolContext } from '../types';
import type { SubAgentUsage } from '../types/agent';

/**
 * Branded symbol used to tag the return value of `ctx.suspend(payload)`.
 * The agent runtime checks for this brand on the tool's return value
 * instead of catching a thrown error.
 */
const SUSPEND_BRAND = Symbol('SuspendBrand');

/**
 * Branded symbol used to tag tool results from agent-as-tool calls.
 * Carries sub-agent usage so the parent runtime can aggregate costs
 * without any external state (WeakMap, mutable tool fields, etc.).
 */
const AGENT_TOOL_BRAND = Symbol('AgentToolBrand');

export interface SuspendedToolResult {
	readonly [SUSPEND_BRAND]: true;
	readonly payload: unknown;
}

/** Type guard: returns true when a tool's return value is a suspend signal. */
export function isSuspendedToolResult(value: unknown): value is SuspendedToolResult {
	return typeof value === 'object' && value !== null && SUSPEND_BRAND in value;
}

export interface AgentToolResult {
	readonly [AGENT_TOOL_BRAND]: true;
	/** The actual tool output (passed back to the LLM). */
	readonly output: unknown;
	/** Sub-agent usage entries to aggregate into the parent's result. */
	readonly subAgentUsage: SubAgentUsage[];
}

/** Type guard: returns true when a tool result carries sub-agent usage. */
export function isAgentToolResult(value: unknown): value is AgentToolResult {
	return typeof value === 'object' && value !== null && AGENT_TOOL_BRAND in value;
}

/**
 * Create a branded agent-tool result that carries sub-agent usage alongside the output.
 * The output properties are spread onto the object so it remains a valid tool output
 * even when accessed directly (e.g. in tests). The runtime detects the brand via
 * isAgentToolResult() and extracts the sub-agent usage.
 * Typed as `never` so `return createAgentToolResult(...)` satisfies any handler return type
 * (same pattern as ctx.suspend).
 */
export function createAgentToolResult(output: unknown, subAgentUsage: SubAgentUsage[]): never {
	const base = typeof output === 'object' && output !== null ? output : {};
	return { ...base, [AGENT_TOOL_BRAND]: true, output, subAgentUsage } as never;
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
