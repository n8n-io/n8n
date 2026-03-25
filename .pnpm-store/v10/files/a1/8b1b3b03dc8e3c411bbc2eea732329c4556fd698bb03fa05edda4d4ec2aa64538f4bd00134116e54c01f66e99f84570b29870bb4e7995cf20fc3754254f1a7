import { ToolCall, ToolMessage } from "../messages/tool.cjs";
import { InferInteropZodInput, InferInteropZodOutput, InteropZodObject, InteropZodType, ZodObjectV3, ZodObjectV4, ZodStringV3, ZodStringV4 } from "../utils/types/zod.cjs";
import { CallbackManagerForToolRun } from "../callbacks/manager.cjs";
import { RunnableConfig } from "../runnables/types.cjs";
import { RunnableFunc, RunnableToolLike } from "../runnables/base.cjs";
import { JsonSchema7Type } from "../utils/zod-to-json-schema/parseTypes.cjs";
import { BaseLangChain } from "../language_models/base.cjs";
import { ToolInputParsingException } from "./utils.cjs";
import { BaseDynamicToolInput, ContentAndArtifact, DynamicStructuredToolInput, DynamicToolInput, InferToolEventFromFunc, InferToolOutputFromFunc, ResponseFormat, StringInputToolSchema, StructuredToolCallInput, StructuredToolInterface, StructuredToolParams, ToolEventType, ToolInputSchemaBase, ToolInputSchemaInputType, ToolInputSchemaOutputType, ToolInterface, ToolOutputType, ToolParams, ToolReturnType, ToolRunnableConfig, ToolRuntime, isLangChainTool, isRunnableToolLike, isStructuredTool, isStructuredToolParams } from "./types.cjs";
import { z } from "zod/v3";

//#region src/tools/index.d.ts
/**
 * Base class for Tools that accept input of any shape defined by a Zod schema.
 */
declare abstract class StructuredTool<SchemaT = ToolInputSchemaBase, SchemaOutputT = ToolInputSchemaOutputType<SchemaT>, SchemaInputT = ToolInputSchemaInputType<SchemaT>, ToolOutputT = ToolOutputType, ToolEventT = ToolEventType> extends BaseLangChain<StructuredToolCallInput<SchemaT, SchemaInputT>, ToolOutputT | ToolMessage> implements StructuredToolInterface<SchemaT, SchemaInputT, ToolOutputT> {
  abstract name: string;
  abstract description: string;
  abstract schema: SchemaT;
  /**
   * Optional provider-specific extra fields for the tool.
   *
   * This is used to pass provider-specific configuration that doesn't fit into
   * standard tool fields.
   */
  extras?: Record<string, unknown>;
  /**
   * Whether to return the tool's output directly.
   *
   * Setting this to true means that after the tool is called,
   * an agent should stop looping.
   */
  returnDirect: boolean;
  verboseParsingErrors: boolean;
  get lc_namespace(): string[];
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
  constructor(fields?: ToolParams);
  protected abstract _call(arg: SchemaOutputT, runManager?: CallbackManagerForToolRun, parentConfig?: ToolRunnableConfig): Promise<ToolOutputT> | AsyncGenerator<ToolEventT, ToolOutputT>;
  /**
   * Invokes the tool with the provided input and configuration.
   * @param input The input for the tool.
   * @param config Optional configuration for the tool.
   * @returns A Promise that resolves with the tool's output.
   */
  invoke<TInput extends StructuredToolCallInput<SchemaT, SchemaInputT>, TConfig extends ToolRunnableConfig | undefined>(input: TInput, config?: TConfig): Promise<ToolReturnType<TInput, TConfig, ToolOutputT>>;
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
}
/**
 * Base class for Tools that accept input as a string.
 */
declare abstract class Tool<ToolOutputT = ToolOutputType, ToolEventT = ToolEventType> extends StructuredTool<StringInputToolSchema, ToolInputSchemaOutputType<StringInputToolSchema>, ToolInputSchemaInputType<StringInputToolSchema>, ToolOutputT, ToolEventT> implements ToolInterface<StringInputToolSchema, ToolInputSchemaInputType<StringInputToolSchema>, ToolOutputT> {
  schema: z.ZodEffects<z.ZodObject<{
    input: z.ZodOptional<z.ZodString>;
  }, "strip", z.ZodTypeAny, {
    input?: string | undefined;
  }, {
    input?: string | undefined;
  }>, string | undefined, {
    input?: string | undefined;
  }>;
  constructor(fields?: ToolParams);
  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.3.0.
   *
   * Calls the tool with the provided argument and callbacks. It handles
   * string inputs specifically.
   * @param arg The input argument for the tool, which can be a string, undefined, or an input of the tool's schema.
   * @param callbacks Optional callbacks for the tool.
   * @returns A Promise that resolves with a string.
   */
  call<TArg extends string | undefined | z.input<this["schema"]> | ToolCall, TConfig extends ToolRunnableConfig | undefined>(arg: TArg, callbacks?: TConfig): Promise<ToolReturnType<NonNullable<TArg>, TConfig, ToolOutputT>>;
}
/**
 * A tool that can be created dynamically from a function, name, and description.
 */
declare class DynamicTool<ToolOutputT = ToolOutputType, ToolEventT = ToolEventType> extends Tool<ToolOutputT, ToolEventT> {
  static lc_name(): string;
  name: string;
  description: string;
  func: DynamicToolInput<ToolOutputT, ToolEventT>["func"];
  constructor(fields: DynamicToolInput<ToolOutputT, ToolEventT>);
  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.3.0.
   */
  call<TArg extends string | undefined | z.input<this["schema"]> | ToolCall, TConfig extends ToolRunnableConfig | undefined>(arg: TArg, configArg?: TConfig): Promise<ToolReturnType<NonNullable<TArg>, TConfig, ToolOutputT>>;
  /** @ignore */
  _call(input: string, runManager?: CallbackManagerForToolRun, parentConfig?: ToolRunnableConfig): Promise<ToolOutputT> | AsyncGenerator<ToolEventT, ToolOutputT>;
}
/**
 * A tool that can be created dynamically from a function, name, and
 * description, designed to work with structured data. It extends the
 * StructuredTool class and overrides the _call method to execute the
 * provided function when the tool is called.
 *
 * Schema can be passed as Zod or JSON schema. The tool will not validate
 * input if JSON schema is passed.
 *
 * @template SchemaT The input schema type for the tool (Zod schema or JSON schema). Defaults to `ToolInputSchemaBase`.
 * @template SchemaOutputT The output type derived from the schema after parsing/validation. Defaults to `ToolInputSchemaOutputType<SchemaT>`.
 * @template SchemaInputT The input type derived from the schema before parsing. Defaults to `ToolInputSchemaInputType<SchemaT>`.
 * @template ToolOutputT The return type of the tool's function. Defaults to `ToolOutputType`.
 * @template NameT The literal type of the tool name (for discriminated union support). Defaults to `string`.
 */
declare class DynamicStructuredTool<SchemaT = ToolInputSchemaBase, SchemaOutputT = ToolInputSchemaOutputType<SchemaT>, SchemaInputT = ToolInputSchemaInputType<SchemaT>, ToolOutputT = ToolOutputType, ToolEventT = ToolEventType, NameT extends string = string> extends StructuredTool<SchemaT, SchemaOutputT, SchemaInputT, ToolOutputT, ToolEventT> {
  static lc_name(): string;
  name: NameT;
  description: string;
  func: DynamicStructuredToolInput<SchemaT, SchemaOutputT, ToolOutputT, ToolEventT>["func"];
  schema: SchemaT;
  constructor(fields: DynamicStructuredToolInput<SchemaT, SchemaOutputT, ToolOutputT, ToolEventT> & {
    name: NameT;
  });
  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.3.0.
   */
  call<TArg extends StructuredToolCallInput<SchemaT, SchemaInputT>, TConfig extends ToolRunnableConfig | undefined>(arg: TArg, configArg?: TConfig, /** @deprecated */

  tags?: string[]): Promise<ToolReturnType<NonNullable<TArg>, TConfig, ToolOutputT>>;
  protected _call(arg: Parameters<DynamicStructuredToolInput<SchemaT, SchemaOutputT, ToolOutputT, ToolEventT>["func"]>[0], runManager?: CallbackManagerForToolRun, parentConfig?: RunnableConfig): Promise<ToolOutputT> | AsyncGenerator<ToolEventT, ToolOutputT>;
}
/**
 * Abstract base class for toolkits in LangChain. Toolkits are collections
 * of tools that agents can use. Subclasses must implement the `tools`
 * property to provide the specific tools for the toolkit.
 */
declare abstract class BaseToolkit {
  abstract tools: StructuredToolInterface[];
  getTools(): StructuredToolInterface[];
}
/**
 * Parameters for the tool function.
 * Schema can be provided as Zod or JSON schema.
 * Both schema types will be validated.
 * @template {ToolInputSchemaBase} RunInput The input schema for the tool.
 * @template {string} NameT The literal name type for discriminated union support.
 */
interface ToolWrapperParams<RunInput = ToolInputSchemaBase | undefined, NameT extends string = string> extends ToolParams {
  /**
   * The name of the tool. If using with an LLM, this
   * will be passed as the tool name.
   */
  name: NameT;
  /**
   * The description of the tool.
   * @default `${fields.name} tool`
   */
  description?: string;
  /**
   * The input schema for the tool. If using an LLM, this
   * will be passed as the tool schema to generate arguments
   * for.
   */
  schema?: RunInput;
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
   * Whether to return the tool's output directly.
   *
   * Setting this to true means that after the tool is called,
   * an agent should stop looping.
   */
  returnDirect?: boolean;
}
/**
 * Creates a new StructuredTool instance with the provided function, name, description, and schema.
 *
 * Schema can be provided as Zod or JSON schema, and both will be validated.
 *
 * @function
 * @template {ToolInputSchemaBase} SchemaT The input schema for the tool.
 * @template {ToolReturnType} ToolOutputT The output type of the tool.
 *
 * @param {RunnableFunc<z.output<SchemaT>, ToolOutputT>} func - The function to invoke when the tool is called.
 * @param {ToolWrapperParams<SchemaT>} fields - An object containing the following properties:
 * @param {string} fields.name The name of the tool.
 * @param {string | undefined} fields.description The description of the tool. Defaults to either the description on the Zod schema, or `${fields.name} tool`.
 * @param {z.AnyZodObject | z.ZodString | undefined} fields.schema The Zod schema defining the input for the tool. If undefined, it will default to a Zod string schema.
 *
 * @returns {DynamicStructuredTool<SchemaT>} A new StructuredTool instance.
 */
declare function tool<SchemaT extends ZodStringV3, ToolOutputT = ToolOutputType, FuncT extends RunnableFunc<InferInteropZodOutput<SchemaT>, ToolOutputT, ToolRunnableConfig> = RunnableFunc<InferInteropZodOutput<SchemaT>, ToolOutputT, ToolRunnableConfig>>(func: FuncT, fields: ToolWrapperParams<SchemaT>): DynamicTool<InferToolOutputFromFunc<FuncT>, InferToolEventFromFunc<FuncT>>;
declare function tool<SchemaT extends ZodStringV4, ToolOutputT = ToolOutputType, FuncT extends RunnableFunc<InferInteropZodOutput<SchemaT>, ToolOutputT, ToolRunnableConfig> = RunnableFunc<InferInteropZodOutput<SchemaT>, ToolOutputT, ToolRunnableConfig>>(func: FuncT, fields: ToolWrapperParams<SchemaT>): DynamicTool<InferToolOutputFromFunc<FuncT>, InferToolEventFromFunc<FuncT>>;
declare function tool<SchemaT extends ZodObjectV3, NameT extends string, SchemaOutputT = InferInteropZodOutput<SchemaT>, SchemaInputT = InferInteropZodInput<SchemaT>, ToolOutputT = ToolOutputType, FuncT extends RunnableFunc<SchemaOutputT, ToolOutputT, ToolRunnableConfig> = RunnableFunc<SchemaOutputT, ToolOutputT, ToolRunnableConfig>>(func: FuncT, fields: ToolWrapperParams<SchemaT, NameT>): DynamicStructuredTool<SchemaT, SchemaOutputT, SchemaInputT, InferToolOutputFromFunc<FuncT>, InferToolEventFromFunc<FuncT>, NameT>;
declare function tool<SchemaT extends ZodObjectV4, NameT extends string, SchemaOutputT = InferInteropZodOutput<SchemaT>, SchemaInputT = InferInteropZodInput<SchemaT>, ToolOutputT = ToolOutputType, FuncT extends RunnableFunc<SchemaOutputT, ToolOutputT, ToolRunnableConfig> = RunnableFunc<SchemaOutputT, ToolOutputT, ToolRunnableConfig>>(func: FuncT, fields: ToolWrapperParams<SchemaT, NameT>): DynamicStructuredTool<SchemaT, SchemaOutputT, SchemaInputT, InferToolOutputFromFunc<FuncT>, InferToolEventFromFunc<FuncT>, NameT>;
declare function tool<SchemaT extends JsonSchema7Type, NameT extends string, SchemaOutputT = ToolInputSchemaOutputType<SchemaT>, SchemaInputT = ToolInputSchemaInputType<SchemaT>, ToolOutputT = ToolOutputType, FuncT extends RunnableFunc<Parameters<DynamicStructuredToolInput<SchemaT>["func"]>[0], ToolOutputT, ToolRunnableConfig> = RunnableFunc<Parameters<DynamicStructuredToolInput<SchemaT>["func"]>[0], ToolOutputT, ToolRunnableConfig>>(func: FuncT, fields: ToolWrapperParams<SchemaT, NameT>): DynamicStructuredTool<SchemaT, SchemaOutputT, SchemaInputT, InferToolOutputFromFunc<FuncT>, InferToolEventFromFunc<FuncT>, NameT>;
declare function tool<SchemaT extends InteropZodObject | InteropZodType<string> | JsonSchema7Type = InteropZodObject, NameT extends string = string, SchemaOutputT = ToolInputSchemaOutputType<SchemaT>, SchemaInputT = ToolInputSchemaInputType<SchemaT>, ToolOutputT = ToolOutputType, FuncT extends RunnableFunc<SchemaOutputT, ToolOutputT, ToolRunnableConfig> = RunnableFunc<SchemaOutputT, ToolOutputT, ToolRunnableConfig>>(func: FuncT, fields: ToolWrapperParams<SchemaT, NameT>): DynamicStructuredTool<SchemaT, SchemaOutputT, SchemaInputT, InferToolOutputFromFunc<FuncT>, InferToolEventFromFunc<FuncT>, NameT> | DynamicTool<InferToolOutputFromFunc<FuncT>, InferToolEventFromFunc<FuncT>>;
declare function tool<SchemaT extends ZodStringV3, ToolOutputT = ToolOutputType, TState = unknown, TContext = unknown>(func: (input: InferInteropZodOutput<SchemaT>, runtime: ToolRuntime<TState, TContext>) => ToolOutputT | Promise<ToolOutputT>, fields: ToolWrapperParams<SchemaT>): DynamicTool<ToolOutputT>;
declare function tool<SchemaT extends ZodStringV4, ToolOutputT = ToolOutputType, TState = unknown, TContext = unknown>(func: (input: InferInteropZodOutput<SchemaT>, runtime: ToolRuntime<TState, TContext>) => ToolOutputT | Promise<ToolOutputT>, fields: ToolWrapperParams<SchemaT>): DynamicTool<ToolOutputT>;
declare function tool<SchemaT extends ZodObjectV3, NameT extends string, SchemaOutputT = InferInteropZodOutput<SchemaT>, SchemaInputT = InferInteropZodInput<SchemaT>, ToolOutputT = ToolOutputType, TState = unknown, TContext = unknown>(func: (input: SchemaOutputT, runtime: ToolRuntime<TState, TContext>) => ToolOutputT | Promise<ToolOutputT>, fields: ToolWrapperParams<SchemaT, NameT>): DynamicStructuredTool<SchemaT, SchemaOutputT, SchemaInputT, ToolOutputT, ToolEventType, NameT>;
declare function tool<SchemaT extends ZodObjectV4, NameT extends string, SchemaOutputT = InferInteropZodOutput<SchemaT>, SchemaInputT = InferInteropZodInput<SchemaT>, ToolOutputT = ToolOutputType, TState = unknown, TContext = unknown>(func: (input: SchemaOutputT, runtime: ToolRuntime<TState, TContext>) => ToolOutputT | Promise<ToolOutputT>, fields: ToolWrapperParams<SchemaT, NameT>): DynamicStructuredTool<SchemaT, SchemaOutputT, SchemaInputT, ToolOutputT, ToolEventType, NameT>;
declare function tool<SchemaT extends JsonSchema7Type, NameT extends string, SchemaOutputT = ToolInputSchemaOutputType<SchemaT>, SchemaInputT = ToolInputSchemaInputType<SchemaT>, ToolOutputT = ToolOutputType, TState = unknown, TContext = unknown>(func: (input: Parameters<DynamicStructuredToolInput<SchemaT>["func"]>[0], runtime: ToolRuntime<TState, TContext>) => ToolOutputT | Promise<ToolOutputT>, fields: ToolWrapperParams<SchemaT, NameT>): DynamicStructuredTool<SchemaT, SchemaOutputT, SchemaInputT, ToolOutputT, ToolEventType, NameT>;
declare function tool<SchemaT extends InteropZodObject | InteropZodType<string> | JsonSchema7Type = InteropZodObject, NameT extends string = string, SchemaOutputT = ToolInputSchemaOutputType<SchemaT>, SchemaInputT = ToolInputSchemaInputType<SchemaT>, ToolOutputT = ToolOutputType, TState = unknown, TContext = unknown>(func: (input: SchemaOutputT, runtime: ToolRuntime<TState, TContext>) => ToolOutputT | Promise<ToolOutputT>, fields: ToolWrapperParams<SchemaT, NameT>): DynamicStructuredTool<SchemaT, SchemaOutputT, SchemaInputT, ToolOutputT, ToolEventType, NameT> | DynamicTool<ToolOutputT>;
type ServerTool = Record<string, unknown>;
type ClientTool = StructuredToolInterface | DynamicTool | RunnableToolLike;
//#endregion
export { type BaseDynamicToolInput, BaseToolkit, ClientTool, type ContentAndArtifact, DynamicStructuredTool, type DynamicStructuredToolInput, DynamicTool, type DynamicToolInput, type ResponseFormat, ServerTool, StructuredTool, type StructuredToolCallInput, type StructuredToolInterface, type StructuredToolParams, Tool, ToolInputParsingException, type ToolInterface, type ToolParams, type ToolReturnType, type ToolRunnableConfig, type ToolRuntime, type ToolInputSchemaBase as ToolSchemaBase, isLangChainTool, isRunnableToolLike, isStructuredTool, isStructuredToolParams, tool };
//# sourceMappingURL=index.d.cts.map