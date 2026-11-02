import { isRecord } from '@n8n/utils/is-record';
import type { Tool as AiSdkTool } from 'ai';
import { z } from 'zod';

import { isCancellation } from '../../sdk/cancellation';
import {
	type BuiltProviderTool,
	type BuiltTool,
	type BuiltTelemetry,
	type InterruptibleToolContext,
	type ToolSuspendOptions,
	type ToolExecutionContext,
	type ToolContext,
} from '../../types';
import type { JSONValue } from '../../types/utils/json';
import { fixSchema } from '../../utils/json-schema';
import { isZodSchema } from '../../utils/zod';
import { loadAi } from '../model/lazy-ai';
import { applyToolProviderOptionDefaults } from '../model/provider-quirks';

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
	resumeSchema?: ToolSuspendOptions['resumeSchema'];
	continuation?: JSONValue;
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
			isProviderExecuted: true,
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
			const providerOptions = applyToolProviderOptionDefaults(t.providerOptions);
			// Responses otherwise normalizes omitted strict schemas and makes optional MCP fields required.
			const strict = t.mcpTool ? false : undefined;
			if (isZodSchema(t.inputSchema)) {
				result[t.name] = ai.tool({
					description: t.description,
					inputSchema: t.inputSchema,
					providerOptions,
					strict,
				});
			} else {
				result[t.name] = ai.tool({
					description: t.description,
					inputSchema: ai.jsonSchema(fixSchema(t.inputSchema)),
					providerOptions,
					strict,
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

	const loadSkill = anchorSkillLoader(executionContext.loadSkill, toolCallId);
	if (builtTool.suspendSchema) {
		const isCancelled = isCancellation(resumeData);
		const ctx: InterruptibleToolContext = {
			suspend: createSuspendHandler(executionContext),
			resumeData: isCancelled ? undefined : resumeData,
			cancellation: isCancelled ? { message: resumeData.message } : undefined,
			...createToolContext(builtTool, executionContext, parentTelemetry, toolCallId, loadSkill),
			suspendPayload: executionContext.suspendPayload,
			continuation: executionContext.continuation,
			resumeSchema: executionContext.resumeSchema,
		};
		return await builtTool.handler(args, ctx);
	}

	const ctx = createToolContext(
		builtTool,
		executionContext,
		parentTelemetry,
		toolCallId,
		loadSkill,
	);
	return await builtTool.handler(args, ctx);
}

function anchorSkillLoader(
	loadSkill: ToolExecutionContext['loadSkill'],
	toolCallId: string | undefined,
): ToolExecutionContext['loadSkill'] {
	if (!loadSkill) return undefined;
	// Keep skill content on the tool result. An explicit anchor takes precedence.
	return async (skillId, anchor) =>
		await loadSkill(skillId, anchor ?? (toolCallId ? { toolCallId } : undefined));
}

function createToolContext(
	builtTool: BuiltTool,
	executionContext: ToolExecutionContext,
	parentTelemetry: BuiltTelemetry | undefined,
	toolCallId: string | undefined,
	loadSkill: ToolExecutionContext['loadSkill'],
): ToolContext {
	return {
		parentTelemetry,
		toolCallId,
		toolName: builtTool.name,
		runId: executionContext.runId,
		...(loadSkill ? { loadSkill } : {}),
		persistence: executionContext.persistence,
		emitEvent: executionContext.emitEvent,
		abortSignal: executionContext.abortSignal,
		executionCounter: executionContext.executionCounter,
		approvalContext: executionContext.approvalContext,
		onGuardrailNotice: executionContext.onGuardrailNotice,
	};
}

function createSuspendHandler(
	executionContext: ToolExecutionContext,
): InterruptibleToolContext['suspend'] {
	return async (payload: unknown, options?: ToolSuspendOptions): Promise<never> => {
		const resolvedOptions: ToolSuspendOptions = {
			continuation: executionContext.continuation,
			...options,
			resumeSchema: options?.resumeSchema ?? executionContext.resumeSchema,
		};
		await executionContext.onSuspend?.(payload, resolvedOptions);
		return await Promise.resolve({
			[SUSPEND_BRAND]: true,
			payload,
			...resolvedOptions,
		} as never);
	};
}

// A tool name cannot contain this character, so the key never shadows a real name.
const LEGACY_ACTION_KEY_SEPARATOR = '\u0000';

function legacyActionKey(toolName: string, action: string): string {
	return `${toolName}${LEGACY_ACTION_KEY_SEPARATOR}${action}`;
}

/** The call's `action` input. Persisted and repaired calls can carry the input as JSON text. */
export function callAction(input: unknown): string | undefined {
	let value = input;
	if (typeof value === 'string') {
		try {
			value = JSON.parse(value);
		} catch {
			return undefined;
		}
	}
	return isRecord(value) && typeof value.action === 'string' ? value.action : undefined;
}

/**
 * Build a Map from tool name to BuiltTool for quick lookups. Legacy names are
 * registered too, so persisted calls under a former name still resolve. A
 * current tool name always wins over a legacy name. Resolve calls through
 * `resolveToolForCall`, which also applies `legacyActions`.
 */
export function buildToolMap(tools?: BuiltTool[]): Map<string, BuiltTool> {
	const map = new Map<string, BuiltTool>();
	if (!tools) return map;
	for (const t of tools) {
		map.set(t.name, t);
	}
	for (const t of tools) {
		for (const legacyName of t.legacyNames ?? []) {
			if (!map.has(legacyName)) map.set(legacyName, t);
		}
	}
	for (const t of tools) {
		for (const [legacyName, actions] of Object.entries(t.legacyActions ?? {})) {
			if (map.get(legacyName)?.name === legacyName) continue;
			for (const action of actions) {
				const key = legacyActionKey(legacyName, action);
				if (!map.has(key)) map.set(key, t);
			}
		}
	}
	return map;
}

/**
 * The tool that runs a call. A call under a former name of a split tool
 * resolves by its `action` input to the tool that now owns that action.
 */
export function resolveToolForCall(
	toolMap: Map<string, BuiltTool>,
	toolName: string,
	input: unknown,
): BuiltTool | undefined {
	const action = callAction(input);
	const byAction =
		action === undefined ? undefined : toolMap.get(legacyActionKey(toolName, action));
	return byAction ?? toolMap.get(toolName);
}

/** Whether `tool` resolved from a former name through `legacyActions`, not `legacyNames`. */
export function isResolvedByLegacyAction(tool: BuiltTool, toolName: string): boolean {
	return tool.name !== toolName && tool.legacyActions?.[toolName] !== undefined;
}
