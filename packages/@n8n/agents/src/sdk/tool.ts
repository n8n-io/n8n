import { z } from 'zod';

import type { BuiltTool, InterruptibleToolContext, ToolContext } from '../types';
import type { AgentMessage } from '../types/sdk/message';
import type { JSONObject } from '../types/utils/json';

const APPROVAL_SUSPEND_SCHEMA = z.object({
	type: z.literal('approval'),
	toolName: z.string(),
	args: z.unknown(),
});

const APPROVAL_RESUME_SCHEMA = z.object({
	approved: z.boolean(),
});

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

type HandlerContext<S, R> = S extends z.ZodTypeAny
	? R extends z.ZodTypeAny
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
	TInput extends z.ZodTypeAny = z.ZodTypeAny,
	TOutput extends z.ZodTypeAny = z.ZodTypeAny,
	TSuspend extends z.ZodTypeAny | undefined = undefined,
	TResume extends z.ZodTypeAny | undefined = undefined,
> {
	private name: string;

	private desc?: string;

	private inputSchema?: TInput;

	private outputSchema?: TOutput;

	private suspendSchemaValue?: z.ZodTypeAny;

	private resumeSchemaValue?: z.ZodTypeAny;

	private handlerFn?: (
		input: z.infer<TInput>,
		ctx: HandlerContext<TSuspend, TResume>,
	) => Promise<z.infer<TOutput>>;

	private toMessageFn?: (output: z.infer<TOutput>) => AgentMessage;

	private toModelOutputFn?: (output: z.infer<TOutput>) => unknown;

	private providerOptionsValue?: Record<string, JSONObject>;

	private requireApprovalValue?: boolean;

	private needsApprovalFnValue?: (args: unknown) => Promise<boolean> | boolean;

	constructor(name: string) {
		this.name = name;
	}

	/** Set the tool description. Required before building. */
	description(desc: string): this {
		this.desc = desc;
		return this;
	}

	/** Set the input Zod schema. Required before building. */
	input<S extends z.ZodTypeAny>(schema: S): Tool<S, TOutput, TSuspend, TResume> {
		const self = this as unknown as Tool<S, TOutput, TSuspend, TResume>;
		self.inputSchema = schema;
		return self;
	}

	/** Set the output Zod schema. Optional. */
	output<S extends z.ZodTypeAny>(schema: S): Tool<TInput, S, TSuspend, TResume> {
		const self = this as unknown as Tool<TInput, S, TSuspend, TResume>;
		self.outputSchema = schema;
		return self;
	}

	/** Set the suspend payload schema. Must be paired with .resume(). */
	suspend<S extends z.ZodTypeAny>(schema: S): Tool<TInput, TOutput, S, TResume> {
		const self = this as unknown as Tool<TInput, TOutput, S, TResume>;
		self.suspendSchemaValue = schema;
		return self;
	}

	/** Set the resume payload schema. Must be paired with .suspend(). */
	resume<R extends z.ZodTypeAny>(schema: R): Tool<TInput, TOutput, TSuspend, R> {
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
	 * Transform the handler output before sending it to the LLM as a tool result.
	 * The raw output is stored in history; only the transformed version goes to the model.
	 *
	 * Useful for truncating large outputs, redacting sensitive data, or reformatting
	 * the result for better LLM comprehension.
	 */
	toModelOutput(fn: (output: z.infer<TOutput>) => unknown): this {
		this.toModelOutputFn = fn;
		return this;
	}

	/** Require human approval before this tool executes. Mutually exclusive with .suspend()/.resume(). */
	requireApproval(): this {
		this.requireApprovalValue = true;
		return this;
	}

	/** Conditionally require approval based on the tool's input. Mutually exclusive with .suspend()/.resume(). */
	needsApprovalFn(fn: (args: z.infer<TInput>) => Promise<boolean> | boolean): this {
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

		if (this.requireApprovalValue ?? this.needsApprovalFnValue) {
			return wrapToolForApproval(built, {
				requireApproval: this.requireApprovalValue,
				needsApprovalFn: this.needsApprovalFnValue,
			});
		}

		return built;
	}
}
