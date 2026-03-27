import { tool, jsonSchema, type Tool as AiSdkTool } from 'ai';
import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';

import {
	type BuiltProviderTool,
	type BuiltTool,
	type BuiltTelemetry,
	type InterruptibleToolContext,
	type ToolContext,
} from '../types';
import type { SubAgentUsage } from '../types/sdk/agent';
import { isZodSchema } from '../utils/zod';

type AiSdkProviderTool = AiSdkTool & {
	type: 'provider';
};
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
	payload: unknown;
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
 * Convert an array of BuiltProviderTools into a Record of AI SDK provider-defined tool objects.
 * Provider tools are executed on the provider's infrastructure (e.g. Anthropic web search,
 * OpenAI code interpreter) — they are never executed locally by the agent loop.
 *
 * The cast to AiSdkTool is required because the AI SDK's ToolSet type demands `inputSchema`
 * on every entry, but provider-defined tools have no input schema (the provider handles it).
 * At runtime the AI SDK correctly recognises the `type: 'provider'` discriminant.
 */
export function toAiSdkProviderTools(tools?: BuiltProviderTool[]): Record<string, AiSdkTool> {
	if (!tools || tools.length === 0) return {};

	const result: Record<string, AiSdkTool> = {};
	for (const t of tools) {
		const providerTool: AiSdkProviderTool = {
			type: 'provider',
			id: t.name,
			args: t.args,
			inputSchema: t.inputSchema ?? z.any(),
		};
		result[t.name] = providerTool;
	}
	return result;
}

const fixSchema = (schema: JSONSchema7): JSONSchema7 => {
	// Ensure 'type: object' is present when properties are present (required by some providers):
	if (
		typeof schema === 'object' &&
		schema !== null &&
		'properties' in schema &&
		!('type' in schema)
	) {
		return { ...schema, type: 'object' as const };
	}
	return schema;
};

/**
 * Convert an array of BuiltTools into a Record of AI SDK tool definitions.
 * Tools are created WITHOUT execute — the agent loop handles execution manually.
 * Supports both Zod schemas (SDK-defined tools) and raw JSON Schema (MCP tools).
 */
export function toAiSdkTools(tools?: BuiltTool[]): Record<string, AiSdkTool> {
	if (!tools || tools.length === 0) return {};

	const result: Record<string, AiSdkTool> = {};
	for (const t of tools) {
		if (t.inputSchema) {
			if (isZodSchema(t.inputSchema)) {
				result[t.name] = tool({
					description: t.description,
					inputSchema: t.inputSchema,
					providerOptions: t.providerOptions,
				});
			} else {
				result[t.name] = tool({
					description: t.description,
					inputSchema: jsonSchema(fixSchema(t.inputSchema)),
					providerOptions: t.providerOptions,
				});
			}
		}
	}
	return result;
}

/**
 * Execute a tool call by finding its handler and running it.
 * For tools with suspend/resume schemas, passes an InterruptibleToolContext
 * that lets the handler call `suspend(payload)`.
 */
export async function executeTool(
	args: unknown,
	builtTool: BuiltTool,
	resumeData?: unknown,
	parentTelemetry?: BuiltTelemetry,
): Promise<unknown> {
	if (!builtTool.handler) {
		throw new Error(`No handler found for tool "${builtTool.name}"`);
	}

	if (builtTool.suspendSchema) {
		const ctx: InterruptibleToolContext = {
			suspend: async (payload: unknown): Promise<never> => {
				return await Promise.resolve({ [SUSPEND_BRAND]: true, payload } as never);
			},
			resumeData,
			parentTelemetry,
		};
		return await builtTool.handler(args, ctx);
	}

	const ctx: ToolContext = { parentTelemetry };
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
