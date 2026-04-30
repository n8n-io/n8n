import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';

import type { BuiltTool, InterruptibleToolContext, ToolContext } from '../types';
import type { AgentMessage } from '../types/sdk/message';
import type { ToolDescriptor } from '../types/sdk/tool-descriptor';
import type { JSONObject } from '../types/utils/json';
import { isZodSchema, zodToJsonSchema } from '../utils/zod';

const APPROVAL_SUSPEND_SCHEMA = z.object({
	type: z.literal('approval'),
	toolName: z.string(),
	args: z.unknown(),
});

const APPROVAL_RESUME_SCHEMA = z.object({
	approved: z.boolean(),
});

type ZodOrJsonSchema = z.ZodType | JSONSchema7;

type OutputType<TOutput> = TOutput extends z.ZodType ? z.infer<TOutput> : unknown;

export interface ApprovalConfig {
	requireApproval?: boolean;
	needsApprovalFn?: (args: unknown) => Promise<boolean> | boolean;
}

/**
 * Wrap a BuiltTool with an approval gate that suspends before execution and
 * waits for human confirmation. Used by Tool.build() (when .requireApproval()
 * or .needsApprovalFn() is set) and by Agent.build() (for global approval).
 *
 * The wrapped tool has suspendSchema/resumeSchema set, making it an
 * interruptible tool that uses the existing suspend/resume mechanism.
 * No validation is done here — all schema validation happens in the runtime.
 */

export function wrapToolForApproval(tool: BuiltTool, config: ApprovalConfig): BuiltTool {
	const originalHandler = tool.handler!;

	return {
		...tool,
		withDefaultApproval: true,
		suspendSchema: APPROVAL_SUSPEND_SCHEMA,
		resumeSchema: APPROVAL_RESUME_SCHEMA,
		handler: async (input, ctx) => {
			// This handler is always called with InterruptibleToolContext because
			// wrapToolForApproval adds suspendSchema/resumeSchema.
			const interruptCtx = ctx as InterruptibleToolContext;
			if (interruptCtx.resumeData === undefined) {
				let needs = config.requireApproval ?? false;
				if (!needs && config.needsApprovalFn) {
					needs = await config.needsApprovalFn(input);
				}
				if (needs) {
					return await interruptCtx.suspend({ type: 'approval', toolName: tool.name, args: input });
				}
				return await originalHandler(input, {
					parentTelemetry: interruptCtx.parentTelemetry,
				} as ToolContext);
			}

			const { approved } = interruptCtx.resumeData as z.infer<typeof APPROVAL_RESUME_SCHEMA>;
			if (!approved) {
				return { declined: true, message: `Tool "${tool.name}" was not approved` };
			}
			return await originalHandler(input, {
				parentTelemetry: interruptCtx.parentTelemetry,
			} as ToolContext);
		},
	};
}

type HandlerContext<S, R> = S extends z.ZodType
	? R extends z.ZodType
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
	TInput extends ZodOrJsonSchema = z.ZodTypeAny,
	TOutput extends ZodOrJsonSchema = z.ZodTypeAny,
	TSuspend extends ZodOrJsonSchema | undefined = undefined,
	TResume extends ZodOrJsonSchema | undefined = undefined,
> {
	private name: string;

	private desc?: string;

	private inputSchema?: TInput;

	private outputSchema?: TOutput;

	private suspendSchemaValue?: TSuspend;

	private resumeSchemaValue?: TResume;

	private handlerFn?: (
		input: OutputType<TInput>,
		ctx: HandlerContext<TSuspend, TResume>,
	) => Promise<OutputType<TOutput>>;

	private toMessageFn?: (output: OutputType<TOutput>) => AgentMessage;

	private toModelOutputFn?: (output: OutputType<TOutput>) => unknown;

	private providerOptionsValue?: Record<string, JSONObject>;

	private requireApprovalValue?: boolean;

	private needsApprovalFnValue?: (args: unknown) => Promise<boolean> | boolean;

	private systemInstructionText?: string;

	constructor(name: string) {
		this.name = name;
	}

	/** Set the tool description. Required before building. */
	description(desc: string): this {
		this.desc = desc;
		return this;
	}

	/**
	 * Attach a behavioural directive to this tool. When the tool is registered
	 * with an agent, the runtime injects this text into the agent's system
	 * prompt under a `<built_in_rules>` block, where the LLM weighs it heavily
	 * for "should I call this tool?" decisions.
	 *
	 * Use sparingly — only for guidance the description alone doesn't reliably
	 * convey (e.g. "prefer this tool over plain text when X").
	 */
	systemInstruction(text: string): this {
		this.systemInstructionText = text;
		return this;
	}

	/** Set the input Zod schema. Required before building. */
	input<S extends ZodOrJsonSchema>(schema: S): Tool<S, TOutput, TSuspend, TResume> {
		const self = this as unknown as Tool<S, TOutput, TSuspend, TResume>;
		self.inputSchema = schema;
		return self;
	}

	/** Set the output Zod schema. Optional. */
	output<S extends ZodOrJsonSchema>(schema: S): Tool<TInput, S, TSuspend, TResume> {
		const self = this as unknown as Tool<TInput, S, TSuspend, TResume>;
		self.outputSchema = schema;
		return self;
	}

	/** Set the suspend payload schema. Must be paired with .resume(). */
	suspend<S extends ZodOrJsonSchema>(schema: S): Tool<TInput, TOutput, S, TResume> {
		const self = this as unknown as Tool<TInput, TOutput, S, TResume>;
		self.suspendSchemaValue = schema;
		return self;
	}

	/** Set the resume payload schema. Must be paired with .suspend(). */
	resume<R extends ZodOrJsonSchema>(schema: R): Tool<TInput, TOutput, TSuspend, R> {
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
			input: OutputType<TInput>,
			ctx: HandlerContext<TSuspend, TResume>,
		) => Promise<OutputType<TOutput>>,
	): this {
		this.handlerFn = fn;
		return this;
	}

	toMessage(toMessage: (output: OutputType<TOutput>) => AgentMessage): this {
		this.toMessageFn = toMessage;
		return this;
	}

	/**
	 * Transform the handler output before sending it to the LLM as a tool result.
	 * The raw output is stored in history; only the transformed version goes to the model.
	 *
	 * Useful for truncating large outputs, redacting sensitive data, or reformatting
	 * the result for better LLM comprehension.
	 */
	toModelOutput(fn: (output: OutputType<TOutput>) => unknown): this {
		this.toModelOutputFn = fn;
		return this;
	}

	/** Require human approval before this tool executes. Mutually exclusive with .suspend()/.resume(). */
	requireApproval(): this {
		this.requireApprovalValue = true;
		return this;
	}

	/** Conditionally require approval based on the tool's input. Mutually exclusive with .suspend()/.resume(). */
	needsApprovalFn(fn: (args: OutputType<TInput>) => Promise<boolean> | boolean): this {
		this.needsApprovalFnValue = fn as (args: unknown) => Promise<boolean> | boolean;
		return this;
	}

	/**
	 * Set provider-specific options forwarded to the AI SDK's `tool()` call.
	 * Keyed by provider name (e.g. `anthropic`, `openai`).
	 *
	 * Example: `.providerOptions({ anthropic: { eagerInputStreaming: true } })`
	 */
	providerOptions(options: Record<string, JSONObject>): this {
		this.providerOptionsValue = { ...this.providerOptionsValue, ...options };
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

		const hasApproval =
			(this.requireApprovalValue ?? false) || this.needsApprovalFnValue !== undefined;
		if (hasApproval && (hasSuspend || hasResume)) {
			throw new Error(
				`Tool "${this.name}" cannot use both approval (.requireApproval/.needsApprovalFn) and suspend/resume (.suspend/.resume)`,
			);
		}

		const built: BuiltTool = {
			name: this.name,
			description: this.desc,
			systemInstruction: this.systemInstructionText,
			suspendSchema: this.suspendSchemaValue,
			resumeSchema: this.resumeSchemaValue,
			toMessage: this.toMessageFn as (output: unknown) => AgentMessage | undefined,
			toModelOutput: this.toModelOutputFn as ((output: unknown) => unknown) | undefined,
			handler: this.handlerFn as (
				input: unknown,
				ctx: ToolContext | InterruptibleToolContext,
			) => Promise<unknown>,
			inputSchema: this.inputSchema,
			outputSchema: this.outputSchema,
			providerOptions: this.providerOptionsValue,
		};

		if (this.requireApprovalValue || this.needsApprovalFnValue) {
			return wrapToolForApproval(built, {
				requireApproval: this.requireApprovalValue,
				needsApprovalFn: this.needsApprovalFnValue,
			});
		}

		return built;
	}

	/**
	 * Return a lightweight JSON descriptor of this tool's metadata.
	 * Does NOT require .build() to be called first.
	 * Used by the JSON-config flow to store tool metadata without executing the handler.
	 */
	describe(): ToolDescriptor {
		if (!this.name) throw new Error('Tool name is required');
		if (!this.desc) throw new Error(`Tool "${this.name}" requires a description`);
		if (!this.inputSchema) throw new Error(`Tool "${this.name}" requires an input schema`);

		const inputSchema = isZodSchema(this.inputSchema)
			? zodToJsonSchema(this.inputSchema)
			: this.inputSchema;
		const outputSchema = this.outputSchema
			? isZodSchema(this.outputSchema)
				? zodToJsonSchema(this.outputSchema)
				: this.outputSchema
			: null;
		return {
			name: this.name,
			description: this.desc,
			systemInstruction: this.systemInstructionText ?? null,
			inputSchema: inputSchema as JSONSchema7,
			outputSchema: outputSchema as JSONSchema7,
			hasSuspend: this.suspendSchemaValue !== undefined,
			hasResume: this.resumeSchemaValue !== undefined,
			hasToMessage: this.toMessageFn !== undefined,
			requireApproval: this.requireApprovalValue ?? false,
			providerOptions: this.providerOptionsValue ?? null,
		};
	}
}
