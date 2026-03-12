import type { z } from 'zod';

import type { AgentMessage } from '../message';

export type ToolContext = Record<string, never>;

export interface InterruptibleToolContext<S = unknown, R = unknown> {
	/**
	 * Suspend execution and send a payload to the consumer.
	 * Must be used with `return await` — the branded return type signals
	 * the execution engine to halt. Code after `return await ctx.suspend()` is unreachable.
	 */
	suspend: (payload: S) => Promise<never>;
	/** Data from the consumer after resume. Undefined on first invocation. */
	resumeData: R | undefined;
}

export interface BuiltTool {
	readonly name: string;
	readonly description: string;
	readonly suspendSchema?: z.ZodType;
	readonly resumeSchema?: z.ZodType;
	readonly toMessage?: (output: unknown) => AgentMessage | undefined;
	readonly handler?: (
		input: unknown,
		ctx: ToolContext | InterruptibleToolContext,
	) => Promise<unknown>;
	readonly inputSchema?: z.ZodType;
	readonly outputSchema?: z.ZodType;
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
	inputSchema?: z.ZodType;
}
