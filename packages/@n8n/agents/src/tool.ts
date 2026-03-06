import { createTool } from '@mastra/core/tools';
import type { z } from 'zod';

import type { Message, MessageContent } from './message';
import { toMastraContent } from './runtime/message-adapter';
import type { BuiltTool, ToolContext } from './types';

type ZodObjectSchema = z.ZodObject<z.ZodRawShape>;

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
 */
export class Tool<
	TInput extends ZodObjectSchema = ZodObjectSchema,
	TOutput extends ZodObjectSchema = ZodObjectSchema,
> {
	private name: string;

	private desc?: string;

	private inputSchema?: TInput;

	private outputSchema?: TOutput;

	private handlerFn?: (input: z.infer<TInput>, ctx: ToolContext) => Promise<z.infer<TOutput>>;

	private approval?: boolean | ((input: z.infer<TInput>) => boolean | Promise<boolean>);

	// TODO: allow returning an array of messages
	private toMessageFn?: (output: z.infer<TOutput>) => Message;

	private toModelOutputFn?: (output: z.infer<TOutput>) => MessageContent[];
	private persistResults = false;

	constructor(name: string) {
		this.name = name;
	}

	/** Set the tool description. Required before building. */
	description(desc: string): this {
		this.desc = desc;
		return this;
	}

	/** Set the input Zod schema. Required before building. */
	input<S extends ZodObjectSchema>(schema: S): Tool<S, TOutput> {
		const self = this as unknown as Tool<S, TOutput>;
		self.inputSchema = schema;
		return self;
	}

	/** Set the output Zod schema. Optional. */
	output<S extends ZodObjectSchema>(schema: S): Tool<TInput, S> {
		const self = this as unknown as Tool<TInput, S>;
		self.outputSchema = schema;
		return self;
	}

	/**
	 * Set the handler function that executes when the tool is called.
	 * Required before building.
	 */
	handler(fn: (input: z.infer<TInput>, ctx: ToolContext) => Promise<z.infer<TOutput>>): this {
		this.handlerFn = fn;
		return this;
	}

	/**
	 * Mark this tool as requiring approval before execution.
	 *
	 * - Call with no arguments to always require approval.
	 * - Call with a predicate to conditionally require approval based on input.
	 */
	requiresApproval(predicate?: (input: z.infer<TInput>) => boolean | Promise<boolean>): this {
		this.approval = predicate ?? true;
		return this;
	}

	toMessage(toMessage: (output: z.infer<TOutput>) => Message): this {
		this.toMessageFn = toMessage;
		return this;
	}

	toModelOutput(toModelOutput: (output: z.infer<TOutput>) => MessageContent[]): this {
		this.toModelOutputFn = toModelOutput;
		return this;
	}

	/**
	 * Store this tool's results in conversation memory so the LLM can
	 * reference them in future turns. Without this, tool results are only
	 * available in the turn they were generated.
	 *
	 * Requires the agent to have `.memory()` configured.
	 */
	storeResults(): this {
		this.persistResults = true;
		return this;
	}

	/**
	 * Validate configuration and produce a `BuiltTool`.
	 *
	 * @throws if name, description, input schema, or handler is missing.
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

		const handler = this.handlerFn;

		const needsApproval = this.approval !== undefined && this.approval !== false;

		const toMessage = this.toMessageFn
			? (output: unknown): Message | undefined => {
					// mastra generates an additional tool call result
					// skip it, because it's not a real tool output
					const isDummyToolOutput =
						typeof output === 'object' &&
						output !== null &&
						'providerExecuted' in output &&
						'toolName' in output &&
						Object.keys(output).length === 2;
					if (isDummyToolOutput) {
						return undefined;
					}
					return this.toMessageFn!(output as z.infer<TOutput>);
				}
			: undefined;

		const toModelOutput = this.toModelOutputFn
			? (output: unknown): Record<string, unknown> | undefined => {
					const content = this.toModelOutputFn!(output as z.infer<TOutput>);
					const mastraContent = toMastraContent(content);
					return {
						type: 'content',
						value: mastraContent,
					};
				}
			: undefined;

		const mastraTool = createTool({
			id: this.name,
			description: this.desc,
			inputSchema: this.inputSchema,
			outputSchema: this.outputSchema,
			...(toModelOutput ? { toModelOutput } : {}),
			...(needsApproval ? { requireApproval: true } : {}),
			execute: async (inputData, _context) => {
				const toolCtx: ToolContext = {
					// eslint-disable-next-line @typescript-eslint/require-await
					pause: async (_options) => {
						throw new Error('pause() is not yet supported');
					},
				};
				return await handler(inputData, toolCtx);
			},
		});

		return {
			name: this.name,
			description: this.desc,
			_mastraTool: mastraTool,
			_approval: this.approval as BuiltTool['_approval'],
			_toMessage: toMessage,
			_storeResults: this.persistResults || undefined,
		};
	}
}
