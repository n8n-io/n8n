import type { JSONSchema7 } from 'json-schema';
import type { ZodType } from 'zod';

import type { AgentMessage } from './message';
import type { BuiltTelemetry } from '../telemetry';
import type { JSONObject } from '../utils/json';

export interface ToolContext {
	/** Telemetry config from the parent agent, for sub-agent propagation. */
	parentTelemetry?: BuiltTelemetry;
}

export interface InterruptibleToolContext<S = unknown, R = unknown> {
	/**
	 * Suspend execution and send a payload to the consumer.
	 * Must be used with `return await` — the branded return type signals
	 * the execution engine to halt. Code after `return await ctx.suspend()` is unreachable.
	 */
	suspend: (payload: S) => Promise<never>;
	/** Data from the consumer after resume. Undefined on first invocation. */
	resumeData: R | undefined;
	/** Telemetry config from the parent agent, for sub-agent propagation. */
	parentTelemetry?: BuiltTelemetry;
}

export interface BuiltTool {
	readonly name: string;
	readonly description: string;
	readonly suspendSchema?: ZodType;
	readonly resumeSchema?: ZodType;
	readonly withDefaultApproval?: boolean;
	readonly toMessage?: (output: unknown) => AgentMessage | undefined;
	/**
	 * Transform the handler output before sending it to the LLM as a tool result.
	 * The raw output is stored in history; only the transformed version goes to the model.
	 */
	readonly toModelOutput?: (output: unknown) => unknown;
	readonly handler?: (
		input: unknown,
		ctx: ToolContext | InterruptibleToolContext,
	) => Promise<unknown>;
	/**
	 * Input schema — either a Zod schema (SDK-defined tools) or a raw JSON Schema object
	 * (MCP tools). Use `isZodSchema()` to distinguish between the two at runtime.
	 */
	readonly inputSchema?: ZodType | JSONSchema7;
	readonly outputSchema?: ZodType;
	/** True for tools sourced from an MCP server. */
	readonly mcpTool?: boolean;
	/** Name of the MCP server this tool belongs to. Set when mcpTool is true. */
	readonly mcpServerName?: string;
	/**
	 * Provider-specific options forwarded to the AI SDK's `tool()` call.
	 * Keyed by provider name (e.g. `anthropic`, `openai`).
	 *
	 * Example: `{ anthropic: { eagerInputStreaming: true } }`
	 */
	readonly providerOptions?: Record<string, JSONObject>;
}

/**
 * A provider-defined tool (e.g. Anthropic web search, OpenAI code interpreter).
 *
 * `name` follows the AI SDK format `<provider-name>.<tool-name>`,
 * e.g. `'anthropic.web_search_20250305'` or `'openai.image_generation'`.
 * It is used as both the unique identifier and the key in the tools record
 * passed to `generateText` / `streamText`.
 */
export interface BuiltProviderTool {
	readonly name: `${string}.${string}`;
	readonly args: Record<string, unknown>;
	inputSchema?: ZodType;
}
