import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';

import type { BuiltTool, InterruptibleToolContext, ToolContext } from '../types';
import { AgentEvent } from '../types/runtime/event';
import type { AgentMessage } from '../types/sdk/message';
import type { ToolDescriptor } from '../types/sdk/tool-descriptor';
import type { JSONObject, JSONValue } from '../types/utils/json';
import { isZodSchema, zodToJsonSchema } from '../utils/zod';

const APPROVAL_SUSPEND_SCHEMA = z.object({
	type: z.literal('approval'),
	toolName: z.string(),
	displayName: z.string().optional(),
	args: z.unknown(),
});

const APPROVAL_RESUME_SCHEMA = z.object({
	approved: z.boolean(),
});

const APPROVAL_GATE_CONTINUATION_SCHEMA = z
	.object({
		__n8nApprovalGate: z.literal(true),
		approvalBinding: z.string().optional(),
	})
	.strict();

const APPROVAL_GATE_CONTINUATION = {
	__n8nApprovalGate: true,
} satisfies z.infer<typeof APPROVAL_GATE_CONTINUATION_SCHEMA>;

const jsonValueSchema: z.ZodType<JSONValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(jsonValueSchema),
		z.record(z.string(), z.union([jsonValueSchema, z.undefined()])),
	]),
);

const APPROVAL_BOUND_INNER_CONTINUATION_SCHEMA = z
	.object({
		__n8nApprovalBoundInnerTool: z.literal(true),
		approvalBinding: z.string(),
		continuation: jsonValueSchema.optional(),
	})
	.strict();

type ZodOrJsonSchema = z.ZodType | JSONSchema7;

type OutputType<TOutput> = TOutput extends z.ZodType ? z.infer<TOutput> : unknown;

export interface ApprovalConfig {
	requireApproval?: boolean;
	needsApprovalFn?: (args: unknown) => Promise<boolean> | boolean;
}

function emitToolExecutionStart(
	tool: BuiltTool,
	input: unknown,
	ctx: InterruptibleToolContext,
): void {
	if (!ctx.toolCallId) return;
	ctx.emitEvent?.({
		type: AgentEvent.ToolExecutionStart,
		toolCallId: ctx.toolCallId,
		toolName: tool.name,
		args: input,
	});
}

export function getToolApprovalDisplayName(tool: BuiltTool): string | undefined {
	const metadata = tool.metadata;
	const displayName = metadata?.displayName ?? metadata?.workflowName;
	return typeof displayName === 'string' && displayName.length > 0 ? displayName : undefined;
}

function combineInterruptSchemas(
	approvalSchema: z.ZodType,
	innerSchema: BuiltTool['suspendSchema'],
): z.ZodType | JSONSchema7 {
	if (innerSchema === undefined) return approvalSchema;
	if (isZodSchema(innerSchema)) return z.union([innerSchema, approvalSchema]);

	const approvalJsonSchema = zodToJsonSchema(approvalSchema);
	return approvalJsonSchema ? { anyOf: [approvalJsonSchema, innerSchema] } : innerSchema;
}

function isApprovalGateContinuation(value: unknown): boolean {
	return APPROVAL_GATE_CONTINUATION_SCHEMA.safeParse(value).success;
}

function approvalGateContinuation(
	approvalBinding?: string,
): z.infer<typeof APPROVAL_GATE_CONTINUATION_SCHEMA> {
	return approvalBinding === undefined
		? APPROVAL_GATE_CONTINUATION
		: { ...APPROVAL_GATE_CONTINUATION, approvalBinding };
}

function getApprovalBinding(value: unknown): string | undefined {
	const parsed = APPROVAL_GATE_CONTINUATION_SCHEMA.safeParse(value);
	return parsed.success ? parsed.data.approvalBinding : undefined;
}

function hasApprovalBoundInnerContinuationMarker(value: unknown): boolean {
	return (
		typeof value === 'object' &&
		value !== null &&
		Object.prototype.hasOwnProperty.call(value, '__n8nApprovalBoundInnerTool')
	);
}

function parseApprovalBoundInnerContinuation(
	value: unknown,
	toolName: string,
): z.infer<typeof APPROVAL_BOUND_INNER_CONTINUATION_SCHEMA> | undefined {
	if (!hasApprovalBoundInnerContinuationMarker(value)) return undefined;
	const parsed = APPROVAL_BOUND_INNER_CONTINUATION_SCHEMA.safeParse(value);
	if (!parsed.success) {
		throw new Error(`Tool "${toolName}" approval is no longer valid`);
	}
	return parsed.data;
}

function approvalBoundInnerContinuation(
	approvalBinding: string,
	continuation?: JSONValue,
): z.infer<typeof APPROVAL_BOUND_INNER_CONTINUATION_SCHEMA> {
	return {
		__n8nApprovalBoundInnerTool: true,
		approvalBinding,
		...(continuation === undefined ? {} : { continuation }),
	};
}

function bindInnerToolContext(
	ctx: InterruptibleToolContext,
	approvalBinding: string | undefined,
	defaultResumeSchema: BuiltTool['resumeSchema'],
): InterruptibleToolContext {
	return {
		...ctx,
		...(approvalBinding === undefined ? {} : { approvalBinding }),
		suspend: async (payload, options) =>
			await ctx.suspend(payload, {
				...options,
				continuation:
					approvalBinding === undefined
						? options?.continuation
						: approvalBoundInnerContinuation(approvalBinding, options?.continuation),
				resumeSchema: options?.resumeSchema ?? defaultResumeSchema,
			}),
	};
}

/**
 * Wrap a BuiltTool with an approval gate that suspends before execution and
 * waits for human confirmation. Used by Tool.build() (when .requireApproval()
 * or .needsApprovalFn() is set) and per-tool JSON config reconstruction.
 *
 * The wrapped tool has suspendSchema/resumeSchema set, making it an
 * interruptible tool that uses the existing suspend/resume mechanism.
 * A tool-specific preparation hook may validate dynamic input before suspension.
 */

export function wrapToolForApproval(tool: BuiltTool, config: ApprovalConfig): BuiltTool {
	const originalHandler = tool.handler!;
	const originalOnCancellation = tool.onCancellation;
	const hasConditionalApproval = config.needsApprovalFn !== undefined;
	const onCancellation: BuiltTool['onCancellation'] =
		originalOnCancellation === undefined
			? undefined
			: async (input, ctx) => {
					if (isApprovalGateContinuation(ctx.continuation)) return;
					const boundInnerContinuation = parseApprovalBoundInnerContinuation(
						ctx.continuation,
						tool.name,
					);
					await originalOnCancellation(
						input,
						boundInnerContinuation === undefined
							? ctx
							: {
									...ctx,
									approvalBinding: boundInnerContinuation.approvalBinding,
									continuation: boundInnerContinuation.continuation,
								},
					);
				};

	return {
		...tool,
		onCancellation,
		approval: {
			required: config.requireApproval === true,
			...(hasConditionalApproval ? { conditional: true } : {}),
		},
		suspendSchema: combineInterruptSchemas(APPROVAL_SUSPEND_SCHEMA, tool.suspendSchema),
		resumeSchema: combineInterruptSchemas(APPROVAL_RESUME_SCHEMA, tool.resumeSchema),
		async handler(this: BuiltTool | undefined, input, ctx) {
			const currentTool = this ?? tool;
			const prepareApproval = currentTool.prepareApproval;
			// This handler is always called with InterruptibleToolContext because
			// wrapToolForApproval adds suspendSchema/resumeSchema.
			const interruptCtx = ctx as InterruptibleToolContext;
			const boundInnerContinuation = parseApprovalBoundInnerContinuation(
				interruptCtx.continuation,
				currentTool.name,
			);
			const resumingInnerTool =
				tool.suspendSchema !== undefined &&
				interruptCtx.suspendPayload !== undefined &&
				!isApprovalGateContinuation(interruptCtx.continuation);
			if (resumingInnerTool) {
				if (boundInnerContinuation === undefined) {
					if (prepareApproval !== undefined && config.requireApproval === true) {
						throw new Error(`Tool "${currentTool.name}" approval is no longer valid`);
					}
					return await originalHandler(input, interruptCtx);
				}
				if (prepareApproval === undefined) {
					throw new Error(`Tool "${currentTool.name}" approval is no longer valid`);
				}
				return await originalHandler(
					input,
					bindInnerToolContext(
						{
							...interruptCtx,
							continuation: boundInnerContinuation.continuation,
						},
						boundInnerContinuation.approvalBinding,
						tool.resumeSchema,
					),
				);
			}
			if (boundInnerContinuation !== undefined) {
				throw new Error(`Tool "${currentTool.name}" approval is no longer valid`);
			}
			if (interruptCtx.resumeData === undefined) {
				let needs = config.requireApproval ?? false;
				if (!needs && config.needsApprovalFn) {
					needs = await config.needsApprovalFn(input);
				}
				if (needs) {
					const approvalBinding = await prepareApproval?.(input);
					const displayName = getToolApprovalDisplayName(currentTool);
					return await interruptCtx.suspend(
						{
							type: 'approval',
							toolName: currentTool.name,
							...(displayName ? { displayName } : {}),
							args: input,
						},
						{
							resumeSchema: APPROVAL_RESUME_SCHEMA,
							continuation: approvalGateContinuation(approvalBinding),
						},
					);
				}
				if (hasConditionalApproval) {
					emitToolExecutionStart(currentTool, input, interruptCtx);
				}
				return await originalHandler(input, interruptCtx as ToolContext);
			}

			const { approved } = interruptCtx.resumeData as z.infer<typeof APPROVAL_RESUME_SCHEMA>;
			if (!approved) {
				return { declined: true, message: `Tool "${currentTool.name}" was not approved` };
			}
			const approvalBinding = prepareApproval
				? getApprovalBinding(interruptCtx.continuation)
				: undefined;
			if (prepareApproval && approvalBinding === undefined) {
				throw new Error(`Tool "${currentTool.name}" approval is no longer valid`);
			}
			const approvedContext =
				approvalBinding === undefined ? interruptCtx : { ...interruptCtx, approvalBinding };
			if (tool.suspendSchema === undefined) {
				return await originalHandler(input, approvedContext as ToolContext);
			}
			const initialInnerContext = bindInnerToolContext(
				{
					...approvedContext,
					resumeData: undefined,
					suspendPayload: undefined,
					continuation: undefined,
					resumeSchema: undefined,
				},
				approvalBinding,
				tool.resumeSchema,
			);
			return await originalHandler(input, initialInnerContext);
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

	private handleCancellationValue?: boolean;

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

	/**
	 * Opt in to handle cancellations in the tool handler (`ctx.cancellation`).
	 * By default, the runtime bypasses the handler and injects the steering message directly.
	 */
	handleCancellation(): this {
		this.handleCancellationValue = true;
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
			handleCancellation: this.handleCancellationValue,
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

const MAX_TOOL_NAME_LENGTH = 64;

/**
 * Coerce an arbitrary string into a provider-safe tool name
 * (`[a-zA-Z0-9_-]`, max 64 chars — OpenAI's limit). Mirrors
 * `nodeNameToToolName` in `n8n-workflow`; keep the two in sync — the SDK
 * deliberately has no dependency on that package.
 */
export function sanitizeToolName(name: string): string {
	let toolName = name.replace(/[^a-zA-Z0-9_-]+/g, '_');
	if (toolName.length > MAX_TOOL_NAME_LENGTH) {
		toolName = toolName.slice(0, MAX_TOOL_NAME_LENGTH).replace(/[_-]+$/, '');
	}
	return toolName;
}
