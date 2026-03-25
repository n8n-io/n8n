import { MessageContent } from "../messages/base.cjs";
import { DirectToolOutput, ToolCall, ToolMessage } from "../messages/tool.cjs";
import { InferInteropZodInput, InferInteropZodOutput, InteropZodObject, InteropZodType } from "../utils/types/zod.cjs";
import { CallbackManagerForToolRun } from "../callbacks/manager.cjs";
import { RunnableConfig, RunnableInterface } from "../runnables/types.cjs";
import { RunnableToolLike } from "../runnables/base.cjs";
import { JsonSchema7Type } from "../utils/zod-to-json-schema/parseTypes.cjs";
import { BaseLangChainParams, ToolDefinition } from "../language_models/base.cjs";
import { BaseStore } from "../stores.cjs";
import { z } from "zod/v3";

//#region src/tools/types.d.ts
type ResponseFormat = "content" | "content_and_artifact" | string;
type ToolOutputType = any;
type ToolEventType = unknown;
type InferToolEventFromFunc<F> = F extends ((...args: any[]) => AsyncGenerator<infer Y, any, any>) ? Y : ToolEventType;
type InferToolOutputFromFunc<F> = F extends ((...args: any[]) => AsyncGenerator<any, infer R, any>) ? R : F extends ((...args: any[]) => Promise<infer R>) ? R : F extends ((...args: any[]) => infer R) ? R : ToolOutputType;
type ContentAndArtifact = [MessageContent, any];
/**
 * Conditional type that determines the return type of the {@link StructuredTool.invoke} method.
 * - If the input is a ToolCall, it returns a ToolMessage
 * - If the config is a runnable config and contains a toolCall property, it returns a ToolMessage
 * - Otherwise, it returns the original output type
 */
type ToolReturnType<TInput, TConfig, TOutput> = TOutput extends DirectToolOutput ? TOutput : TConfig extends {
  toolCall: {
    id: string;
  };
} ? ToolMessage : TConfig extends {
  toolCall: {
    id: undefined;
  };
} ? TOutput : TConfig extends {
  toolCall: {
    id?: string;
  };
} ? TOutput | ToolMessage : TInput extends ToolCall ? ToolMessage : TOutput;
/**
 * Base type that establishes the types of input schemas that can be used for LangChain tool
 * definitions.
 */
type ToolInputSchemaBase = z.ZodTypeAny | JsonSchema7Type;
/**
 * Parameters for the Tool classes.
 */
interface ToolParams extends BaseLangChainParams {
  /**
   * The tool response format.
   *
   * If "content" then the output of the tool is interpreted as the contents of a
   * ToolMessage. If "content_and_artifact" then the output is expected to be a
   * two-tuple corresponding to the (content, artifact) of a ToolMessage.
   *
   * @default "content"
   */
  responseFormat?: ResponseFormat;
  /**
   * Default config object for the tool runnable.
   */
  defaultConfig?: ToolRunnableConfig;
  /**
   * Whether to show full details in the thrown parsing errors.
   *
   * @default false
   */
  verboseParsingErrors?: boolean;
  /**
   * Metadata for the tool.
   */
  metadata?: Record<string, unknown>;
  /**
   * Optional provider-specific extra fields for the tool.
   *
   * This is used to pass provider-specific configuration that doesn't fit into
   * standard tool fields.
   */
  extras?: Record<string, unknown>;
}
type ToolRunnableConfig<ConfigurableFieldType extends Record<string, any> = Record<string, any>, ContextSchema = any> = RunnableConfig<ConfigurableFieldType> & {
  toolCall?: ToolCall;
  context?: ContextSchema;
};
/**
 * Schema for defining tools.
 *
 * @version 0.2.19
 */
interface StructuredToolParams extends Pick<StructuredToolInterface, "name" | "schema" | "extras"> {
  /**
   * An optional description of the tool to pass to the model.
   */
  description?: string;
}
/**
 * Utility type that resolves the output type of a tool input schema.
 *
 * Input & Output types are a concept used with Zod schema, as Zod allows for transforms to occur
 * during parsing. When using JSONSchema, input and output types are the same.
 *
 * The input type for a given schema should match the structure of the arguments that the LLM
 * generates as part of its {@link ToolCall}. The output type will be the type that results from
 * applying any transforms defined in your schema. If there are no transforms, the input and output
 * types will be the same.
 */
type ToolInputSchemaOutputType<T> = T extends InteropZodType ? InferInteropZodOutput<T> : T extends JsonSchema7Type ? unknown : never;
/**
 * Utility type that resolves the input type of a tool input schema.
 *
 * Input & Output types are a concept used with Zod schema, as Zod allows for transforms to occur
 * during parsing. When using JSONSchema, input and output types are the same.
 *
 * The input type for a given schema should match the structure of the arguments that the LLM
 * generates as part of its {@link ToolCall}. The output type will be the type that results from
 * applying any transforms defined in your schema. If there are no transforms, the input and output
 * types will be the same.
 */
type ToolInputSchemaInputType<T> = T extends InteropZodType ? InferInteropZodInput<T> : T extends JsonSchema7Type ? unknown : never;
/**
 * Defines the type that will be passed into a tool handler function as a result of a tool call.
 *
 * @param SchemaT - The type of the tool input schema. Usually you don't need to specify this.
 * @param SchemaInputT - The TypeScript type representing the structure of the tool arguments generated by the LLM. Useful for type checking tool handler functions when using JSONSchema.
 */
type StructuredToolCallInput<SchemaT = ToolInputSchemaBase, SchemaInputT = ToolInputSchemaInputType<SchemaT>> = (ToolInputSchemaOutputType<SchemaT> extends string ? string : never) | SchemaInputT | ToolCall;
/**
 * An input schema type for tools that accept a single string input.
 *
 * This schema defines a tool that takes an optional string parameter named "input".
 * It uses Zod's effects to transform the input and strip any extra properties.
 *
 * This is primarily used for creating simple string-based tools where the LLM
 * only needs to provide a single text value as input to the tool.
 */
type StringInputToolSchema = z.ZodType<string | undefined, z.ZodTypeDef, any>;
/**
 * Interface that defines the shape of a LangChain structured tool.
 *
 * A structured tool is a tool that uses a schema to define the structure of the arguments that the
 * LLM generates as part of its {@link ToolCall}.
 *
 * @param SchemaT - The type of the tool input schema. Usually you don't need to specify this.
 * @param SchemaInputT - The TypeScript type representing the structure of the tool arguments generated by the LLM. Useful for type checking tool handler functions when using JSONSchema.
 */
interface StructuredToolInterface<SchemaT = ToolInputSchemaBase, SchemaInputT = ToolInputSchemaInputType<SchemaT>, ToolOutputT = ToolOutputType> extends RunnableInterface<StructuredToolCallInput<SchemaT, SchemaInputT>, ToolOutputT | ToolMessage> {
  lc_namespace: string[];
  /**
   * A Zod schema representing the parameters of the tool.
   */
  schema: SchemaT;
  /**
   * Invokes the tool with the provided argument and configuration.
   * @param arg The input argument for the tool.
   * @param configArg Optional configuration for the tool call.
   * @returns A Promise that resolves with the tool's output.
   */
  invoke<TArg extends StructuredToolCallInput<SchemaT, SchemaInputT>, TConfig extends ToolRunnableConfig | undefined>(arg: TArg, configArg?: TConfig): Promise<ToolReturnType<TArg, TConfig, ToolOutputT>>;
  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.3.0.
   *
   * Calls the tool with the provided argument, configuration, and tags. It
   * parses the input according to the schema, handles any errors, and
   * manages callbacks.
   * @param arg The input argument for the tool.
   * @param configArg Optional configuration or callbacks for the tool.
   * @param tags Optional tags for the tool.
   * @returns A Promise that resolves with a string.
   */
  call<TArg extends StructuredToolCallInput<SchemaT, SchemaInputT>, TConfig extends ToolRunnableConfig | undefined>(arg: TArg, configArg?: TConfig, /** @deprecated */

  tags?: string[]): Promise<ToolReturnType<TArg, TConfig, ToolOutputT>>;
  /**
   * The name of the tool.
   */
  name: string;
  /**
   * A description of the tool.
   */
  description: string;
  /**
   * Whether to return the tool's output directly.
   *
   * Setting this to true means that after the tool is called,
   * an agent should stop looping.
   */
  returnDirect: boolean;
  /**
   * Optional provider-specific extra fields for the tool.
   *
   * This is used to pass provider-specific configuration that doesn't fit into
   * standard tool fields.
   */
  extras?: Record<string, unknown>;
}
/**
 * A special interface for tools that accept a string input, usually defined with the {@link Tool} class.
 *
 * @param SchemaT - The type of the tool input schema. Usually you don't need to specify this.
 * @param SchemaInputT - The TypeScript type representing the structure of the tool arguments generated by the LLM. Useful for type checking tool handler functions when using JSONSchema.
 */
interface ToolInterface<SchemaT = StringInputToolSchema, SchemaInputT = ToolInputSchemaInputType<SchemaT>, ToolOutputT = ToolOutputType> extends StructuredToolInterface<SchemaT, SchemaInputT, ToolOutputT> {
  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.3.0.
   *
   * Calls the tool with the provided argument and callbacks. It handles
   * string inputs specifically.
   * @param arg The input argument for the tool, which can be a string, undefined, or an input of the tool's schema.
   * @param callbacks Optional callbacks for the tool.
   * @returns A Promise that resolves with a string.
   */
  call<TArg extends StructuredToolCallInput<SchemaT, SchemaInputT>, TConfig extends ToolRunnableConfig | undefined>(arg: TArg, callbacks?: TConfig): Promise<ToolReturnType<NonNullable<TArg>, TConfig, ToolOutputT>>;
}
/**
 * Base interface for the input parameters of the {@link DynamicTool} and
 * {@link DynamicStructuredTool} classes.
 */
interface BaseDynamicToolInput extends ToolParams {
  name: string;
  description: string;
  /**
   * Whether to return the tool's output directly.
   *
   * Setting this to true means that after the tool is called,
   * an agent should stop looping.
   */
  returnDirect?: boolean;
}
/**
 * Interface for the input parameters of the DynamicTool class.
 *
 * @param ToolOutputT - The return type of the tool.
 * @param ToolEventT - The type of values yielded by the tool when using an async generator.
 */
interface DynamicToolInput<ToolOutputT = ToolOutputType, ToolEventT = ToolEventType> extends BaseDynamicToolInput {
  func: (input: string, runManager?: CallbackManagerForToolRun, config?: ToolRunnableConfig) => Promise<ToolOutputT> | AsyncGenerator<ToolEventT, ToolOutputT>;
}
/**
 * Interface for the input parameters of the DynamicStructuredTool class.
 *
 * @param SchemaT - The type of the tool input schema. Usually you don't need to specify this.
 * @param SchemaOutputT - The TypeScript type representing the result of applying the schema to the tool arguments. Useful for type checking tool handler functions when using JSONSchema.
 * @param ToolOutputT - The return type of the tool.
 * @param ToolEventT - The type of values yielded by the tool when using an async generator.
 */
interface DynamicStructuredToolInput<SchemaT = ToolInputSchemaBase, SchemaOutputT = ToolInputSchemaOutputType<SchemaT>, ToolOutputT = ToolOutputType, ToolEventT = ToolEventType> extends BaseDynamicToolInput {
  /**
   * Tool handler function - the function that will be called when the tool is invoked.
   *
   * @param input - The input to the tool.
   * @param runManager - The run manager for the tool.
   * @param config - The configuration for the tool.
   * @returns The result of the tool.
   */
  func: (input: SchemaOutputT, runManager?: CallbackManagerForToolRun, config?: RunnableConfig) => Promise<ToolOutputT> | AsyncGenerator<ToolEventT, ToolOutputT>;
  schema: SchemaT;
}
/**
 * Confirm whether the inputted tool is an instance of `StructuredToolInterface`.
 *
 * @param {StructuredToolInterface | JSONSchema | undefined} tool The tool to check if it is an instance of `StructuredToolInterface`.
 * @returns {tool is StructuredToolInterface} Whether the inputted tool is an instance of `StructuredToolInterface`.
 */
declare function isStructuredTool(tool?: StructuredToolInterface | ToolDefinition | JsonSchema7Type): tool is StructuredToolInterface;
/**
 * Confirm whether the inputted tool is an instance of `RunnableToolLike`.
 *
 * @param {unknown | undefined} tool The tool to check if it is an instance of `RunnableToolLike`.
 * @returns {tool is RunnableToolLike} Whether the inputted tool is an instance of `RunnableToolLike`.
 */
declare function isRunnableToolLike(tool?: unknown): tool is RunnableToolLike;
/**
 * Confirm whether or not the tool contains the necessary properties to be considered a `StructuredToolParams`.
 *
 * @param {unknown | undefined} tool The object to check if it is a `StructuredToolParams`.
 * @returns {tool is StructuredToolParams} Whether the inputted object is a `StructuredToolParams`.
 */
declare function isStructuredToolParams(tool?: unknown): tool is StructuredToolParams;
/**
 * Whether or not the tool is one of StructuredTool, RunnableTool or StructuredToolParams.
 * It returns `is StructuredToolParams` since that is the most minimal interface of the three,
 * while still containing the necessary properties to be passed to a LLM for tool calling.
 *
 * @param {unknown | undefined} tool The tool to check if it is a LangChain tool.
 * @returns {tool is StructuredToolParams} Whether the inputted tool is a LangChain tool.
 */
declare function isLangChainTool(tool?: unknown): tool is StructuredToolParams;
/**
 * Runtime context automatically injected into tools.
 *
 * When a tool function has a parameter named `tool_runtime` with type hint
 * `ToolRuntime`, the tool execution system will automatically inject an instance
 * containing:
 *
 * - `state`: The current graph state
 * - `toolCallId`: The ID of the current tool call
 * - `config`: `RunnableConfig` for the current execution
 * - `context`: Runtime context
 * - `store`: `BaseStore` instance for persistent storage
 * - `writer`: Stream writer for streaming output
 *
 * No `Annotated` wrapper is needed - just use `runtime: ToolRuntime`
 * as a parameter.
 *
 * @example
 * ```typescript
 * import { tool, type ToolRuntime } from "@langchain/core/tools";
 * import { z } from "zod";
 *
 * const stateSchema = z.object({
 *   messages: z.array(z.any()),
 *   userId: z.string().optional(),
 * });
 *
 * const greet = tool(
 *   async ({ name }, runtime: ToolRuntime<typeof stateSchema>) => {
 *     // Access state
 *     const messages = runtime.state.messages;
 *
 *     // Access tool_call_id
 *     console.log(`Tool call ID: ${runtime.toolCallId}`);
 *
 *     // Access config
 *     console.log(`Run ID: ${runtime.config.runId}`);
 *
 *     // Access runtime context
 *     const userId = runtime.context?.userId;
 *
 *     // Access store
 *     await runtime.store?.mset([["key", "value"]]);
 *
 *     // Stream output
 *     runtime.writer?.("Processing...");
 *
 *     return `Hello! User ID: ${runtime.state.userId || "unknown"} ${name}`;
 *   },
 *   {
 *     name: "greet",
 *     description: "Use this to greet the user once you found their info.",
 *     schema: z.object({ name: z.string() }),
 *     stateSchema,
 *   }
 * );
 *
 * const agent = createAgent({
 *   model,
 *   tools: [greet],
 *   stateSchema,
 *   contextSchema,
 * });
 * ```
 *
 * @template StateT - The type of the state schema (inferred from stateSchema)
 * @template ContextT - The type of the context schema (inferred from contextSchema)
 */
type ToolRuntime<TState = unknown, TContext = unknown> = RunnableConfig & {
  /**
   * The current graph state.
   */
  state: TState extends InteropZodObject ? InferInteropZodOutput<TState> : TState extends Record<string, unknown> ? TState : unknown;
  /**
   * The ID of the current tool call.
   */
  toolCallId: string;
  /**
   * The current tool call.
   */
  toolCall?: ToolCall;
  /**
   * RunnableConfig for the current execution.
   */
  config: ToolRunnableConfig;
  /**
   * Runtime context (from langgraph `Runtime`).
   */
  context: TContext extends InteropZodObject ? InferInteropZodOutput<TContext> : TContext extends Record<string, unknown> ? TContext : unknown;
  /**
   * BaseStore instance for persistent storage (from langgraph `Runtime`).
   */
  store: BaseStore<string, unknown> | null;
  /**
   * Stream writer for streaming output (from langgraph `Runtime`).
   */
  writer: ((chunk: unknown) => void) | null;
};
//#endregion
export { BaseDynamicToolInput, ContentAndArtifact, DynamicStructuredToolInput, DynamicToolInput, InferToolEventFromFunc, InferToolOutputFromFunc, ResponseFormat, StringInputToolSchema, StructuredToolCallInput, StructuredToolInterface, StructuredToolParams, ToolEventType, ToolInputSchemaBase, ToolInputSchemaInputType, ToolInputSchemaOutputType, ToolInterface, ToolOutputType, ToolParams, ToolReturnType, ToolRunnableConfig, ToolRuntime, isLangChainTool, isRunnableToolLike, isStructuredTool, isStructuredToolParams };
//# sourceMappingURL=types.d.cts.map