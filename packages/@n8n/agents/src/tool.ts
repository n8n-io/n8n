import type { z } from 'zod';

import type { AgentMessage } from './message';
import type { BuiltTool, InterruptibleToolContext, ToolContext } from './types';

type ZodObjectSchema = z.ZodObject<z.ZodRawShape>;

type HandlerContext<S, R> = S extends ZodObjectSchema
	? R extends ZodObjectSchema
		? InterruptibleToolContext<z.infer<S>, z.infer<R>>
		: ToolContext
	: ToolContext;

/**
 * Builder for creating type-safe tool definitions.
 *
 * Usage:
 * ```typescript
 * const tool = new Tool('search')
 *   .description('Search the web')
 *   .input(z.object({ query: z.string() }))
 *   .output(z.object({ result: z.string() }))
 *   .handler(async ({ query }) => ({ result: `found: ${query}` }))
 *   .build();
 * ```
 *
 * @template TInput - Zod schema type for the tool's input
 * @template TOutput - Zod schema type for the tool's output
 * @template TSuspend - Zod schema type for the suspend payload
 * @template TResume - Zod schema type for the resume payload
 */
export class Tool<
	TInput extends ZodObjectSchema = ZodObjectSchema,
	TOutput extends ZodObjectSchema = ZodObjectSchema,
	TSuspend extends ZodObjectSchema | undefined = undefined,
	TResume extends ZodObjectSchema | undefined = undefined,
> {
	private name: string;

	private desc?: string;

	private inputSchema?: TInput;

	private outputSchema?: TOutput;

	private suspendSchemaValue?: ZodObjectSchema;

	private resumeSchemaValue?: ZodObjectSchema;

	private handlerFn?: (
		input: z.infer<TInput>,
		ctx: HandlerContext<TSuspend, TResume>,
	) => Promise<z.infer<TOutput>>;

	private toMessageFn?: (output: z.infer<TOutput>) => AgentMessage;

	constructor(name: string) {
		this.name = name;
	}

	/** Set the tool description. Required before building. */
	description(desc: string): this {
		this.desc = desc;
		return this;
	}

	/** Set the input Zod schema. Required before building. */
	input<S extends ZodObjectSchema>(schema: S): Tool<S, TOutput, TSuspend, TResume> {
		const self = this as unknown as Tool<S, TOutput, TSuspend, TResume>;
		self.inputSchema = schema;
		return self;
	}

	/** Set the output Zod schema. Optional. */
	output<S extends ZodObjectSchema>(schema: S): Tool<TInput, S, TSuspend, TResume> {
		const self = this as unknown as Tool<TInput, S, TSuspend, TResume>;
		self.outputSchema = schema;
		return self;
	}

	/** Set the suspend payload schema. Must be paired with .resume(). */
	suspend<S extends ZodObjectSchema>(schema: S): Tool<TInput, TOutput, S, TResume> {
		const self = this as unknown as Tool<TInput, TOutput, S, TResume>;
		self.suspendSchemaValue = schema;
		return self;
	}

	/** Set the resume payload schema. Must be paired with .suspend(). */
	resume<R extends ZodObjectSchema>(schema: R): Tool<TInput, TOutput, TSuspend, R> {
		const self = this as unknown as Tool<TInput, TOutput, TSuspend, R>;
		self.resumeSchemaValue = schema;
		return self;
	}

	/**
	 * Set the handler function that executes when the tool is called.
	 * Required before building.
	 */
	handler(
		fn: (
			input: z.infer<TInput>,
			ctx: HandlerContext<TSuspend, TResume>,
		) => Promise<z.infer<TOutput>>,
	): this {
		this.handlerFn = fn;
		return this;
	}

	toMessage(toMessage: (output: z.infer<TOutput>) => AgentMessage): this {
		this.toMessageFn = toMessage;
		return this;
	}

	/**
	 * Validate configuration and produce a `BuiltTool`.
	 *
	 * @throws if name, description, input schema, or handler is missing.
	 * @throws if suspend is declared without resume or vice versa.
	 */
	build(): BuiltTool {
		if (!this.name) {
			throw new Error('Tool name is required');
		}
		if (!this.desc) {
			throw new Error(`Tool "${this.name}" requires a description`);
		}
		if (!this.inputSchema) {
			throw new Error(`Tool "${this.name}" requires an input schema`);
		}
		if (!this.handlerFn) {
			throw new Error(`Tool "${this.name}" requires a handler`);
		}

		const hasSuspend = this.suspendSchemaValue !== undefined;
		const hasResume = this.resumeSchemaValue !== undefined;

		if (hasSuspend && !hasResume) {
			throw new Error(`Tool "${this.name}" has .suspend() but missing .resume()`);
		}
		if (hasResume && !hasSuspend) {
			throw new Error(`Tool "${this.name}" has .resume() but missing .suspend()`);
		}

		return {
			name: this.name,
			description: this.desc,
			suspendSchema: this.suspendSchemaValue,
			resumeSchema: this.resumeSchemaValue,
			toMessage: this.toMessageFn as (output: unknown) => AgentMessage | undefined,
			handler: this.handlerFn as (
				input: unknown,
				ctx: ToolContext | InterruptibleToolContext,
			) => Promise<unknown>,
			inputSchema: this.inputSchema,
			outputSchema: this.outputSchema,
		};
	}
}
