import type { Tool as AiSdkTool } from 'ai';
import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
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

export const fixSchema = (schema: JSONSchema7): JSONSchema7 => {
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
 * Recursively prepare a JSON Schema for use as a *structured output* schema.
 *
 * Both Anthropic and OpenAI strict structured outputs reject any object schema
 * that does not explicitly set `additionalProperties: false`. Zod schemas get
 * this for free during conversion, but a raw JSON Schema (e.g. supplied by a
 * workflow node) usually omits it. We set it on every object that doesn't
 * specify it, and normalise objects that declare `properties` without a `type`
 * (mirrors {@link fixSchema}).
 *
 * Returns a deep copy — the input schema is never mutated.
 */
export function toStrictJsonSchema(schema: JSONSchema7): JSONSchema7 {
	const result = strictifyDefinition(schema);
	// The public entry point is only ever called with an object schema.
	return typeof result === 'object' ? result : schema;
}

function strictifyDefinition(schema: JSONSchema7Definition): JSONSchema7Definition {
	if (typeof schema !== 'object' || schema === null) return schema;

	const result: JSONSchema7 = { ...schema };

	// Normalise objects that list properties but omit the type (mirrors fixSchema).
	if (result.properties !== undefined && result.type === undefined) {
		result.type = 'object';
	}

	const isObjectSchema =
		result.type === 'object' ||
		(Array.isArray(result.type) && result.type.includes('object')) ||
		result.properties !== undefined;

	if (isObjectSchema && result.additionalProperties === undefined) {
		result.additionalProperties = false;
	}

	if (result.properties) {
		result.properties = mapDefinitions(result.properties);
	}
	if (result.$defs) {
		result.$defs = mapDefinitions(result.$defs);
	}
	if (result.definitions) {
		result.definitions = mapDefinitions(result.definitions);
	}
	if (result.items !== undefined) {
		result.items = Array.isArray(result.items)
			? result.items.map(strictifyDefinition)
			: strictifyDefinition(result.items);
	}
	if (typeof result.additionalProperties === 'object' && result.additionalProperties !== null) {
		result.additionalProperties = strictifyDefinition(result.additionalProperties);
	}
	for (const key of ['allOf', 'anyOf', 'oneOf'] as const) {
		const branch = result[key];
		if (Array.isArray(branch)) {
			result[key] = branch.map(strictifyDefinition);
		}
	}
	if (result.not !== undefined) {
		result.not = strictifyDefinition(result.not);
	}

	return result;
}

/**
 * Re-map a record of sub-schemas, strictifying each value. Uses
 * `Object.defineProperty` so a user-supplied property name like `__proto__`
 * becomes a normal own property instead of mutating the prototype chain.
 */
function mapDefinitions(
	record: Record<string, JSONSchema7Definition>,
): Record<string, JSONSchema7Definition> {
	const out: Record<string, JSONSchema7Definition> = {};
	for (const [key, value] of Object.entries(record)) {
		Object.defineProperty(out, key, {
			value: strictifyDefinition(value),
			enumerable: true,
			writable: true,
			configurable: true,
		});
	}
	return out;
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
