import type { Tool as AiSdkTool } from 'ai';
import { z } from 'zod';

import { loadAi } from './lazy-ai';
import { isCancellation } from '../sdk/cancellation';
import {
	type BuiltProviderTool,
	type BuiltTool,
	type BuiltTelemetry,
	type InterruptibleToolContext,
	type ToolExecutionContext,
	type ToolContext,
} from '../types';
import { fixSchema } from '../utils/json-schema';
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

export interface SuspendedToolResult {
	readonly [SUSPEND_BRAND]: true;
	payload: unknown;
}

/** Type guard: returns true when a tool's return value is a suspend signal. */
export function isSuspendedToolResult(value: unknown): value is SuspendedToolResult {
	return typeof value === 'object' && value !== null && SUSPEND_BRAND in value;
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
			const ai = loadAi();
			if (isZodSchema(t.inputSchema)) {
				result[t.name] = ai.tool({
					description: t.description,
					inputSchema: t.inputSchema,
					providerOptions: t.providerOptions,
				});
			} else {
				result[t.name] = ai.tool({
					description: t.description,
					inputSchema: ai.jsonSchema(fixSchema(t.inputSchema)),
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
	toolCallId?: string,
	executionContext: ToolExecutionContext = {},
): Promise<unknown> {
	if (!builtTool.handler) {
		throw new Error(`No handler found for tool "${builtTool.name}"`);
	}

	if (builtTool.suspendSchema) {
		const isCancelled = isCancellation(resumeData);
		const ctx: InterruptibleToolContext = {
			suspend: async (payload: unknown): Promise<never> => {
				return await Promise.resolve({ [SUSPEND_BRAND]: true, payload } as never);
			},
			resumeData: isCancelled ? undefined : resumeData,
			cancellation: isCancelled ? { message: resumeData.message } : undefined,
			parentTelemetry,
			toolCallId,
			runId: executionContext.runId,
			persistence: executionContext.persistence,
			emitEvent: executionContext.emitEvent,
			abortSignal: executionContext.abortSignal,
			executionCounter: executionContext.executionCounter,
		};
		return await builtTool.handler(args, ctx);
	}

	const ctx: ToolContext = {
		parentTelemetry,
		toolCallId,
		runId: executionContext.runId,
		persistence: executionContext.persistence,
		emitEvent: executionContext.emitEvent,
		abortSignal: executionContext.abortSignal,
		executionCounter: executionContext.executionCounter,
	};
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
