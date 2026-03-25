import { MiddlewareError, MultipleStructuredOutputsError, MultipleToolsBoundError, StructuredOutputParsingError, ToolInvocationError } from "./errors.cjs";
import { JsonSchemaFormat, ProviderStrategy, ResponseFormat, ResponseFormatUndefined, ToolStrategy, TypedToolStrategy, providerStrategy, toolStrategy } from "./responses.cjs";
import { JumpToTarget } from "./constants.cjs";
import { Runtime as Runtime$1 } from "./runtime.cjs";
import { ModelRequest } from "./nodes/types.cjs";
import { AfterAgentHook, AfterModelHook, AgentMiddleware, AnyAnnotationRoot, BeforeAgentHook, BeforeModelHook, DefaultMiddlewareTypeConfig, InferChannelType, InferContextInput, InferMergedInputState, InferMergedState, InferMiddlewareContext, InferMiddlewareContextInput, InferMiddlewareContextInputs, InferMiddlewareContextSchema, InferMiddlewareContexts, InferMiddlewareFullContext, InferMiddlewareInputState, InferMiddlewareInputStates, InferMiddlewareSchema, InferMiddlewareState, InferMiddlewareStates, InferMiddlewareToolsFromConfig, InferMiddlewareType, InferSchemaInput, InferSchemaUpdateType, InferSchemaValue, InferSchemaValueType, MIDDLEWARE_BRAND, MiddlewareResult, MiddlewareTypeConfig, NormalizedSchemaInput, NormalizedSchemaUpdate, ResolveMiddlewareTypeConfig, ToAnnotationRoot, ToolCallHandler, ToolCallRequest, WrapModelCallHandler, WrapModelCallHook, WrapToolCallHook } from "./middleware/types.cjs";
import { AgentTypeConfig, BuiltInState, CombineTools, CreateAgentParams, DefaultAgentTypeConfig, ExecutedToolCall, ExtractZodArrayTypes, InferAgentContext, InferAgentContextSchema, InferAgentMiddleware, InferAgentResponse, InferAgentState, InferAgentStateSchema, InferAgentTools, InferAgentType, InferMiddlewareTools, InferMiddlewareToolsArray, Interrupt, JumpTo, N, ResolveAgentTypeConfig, ToolCall, ToolResult, ToolsToMessageToolSet, UserInput, WithStateGraphNodes } from "./types.cjs";
import { ReactAgent } from "./ReactAgent.cjs";
import { createMiddleware } from "./middleware.cjs";
import { FakeToolCallingModel } from "./tests/utils.cjs";
import { ClientTool, ServerTool } from "@langchain/core/tools";
import { InteropZodObject, InteropZodType } from "@langchain/core/utils/types";
import { StateDefinitionInit } from "@langchain/langgraph";

//#region src/agents/index.d.ts
/**
 * Creates a production-ready ReAct (Reasoning + Acting) agent that combines language models with tools
 * and middleware to create systems that can reason about tasks, decide which tools to use, and iteratively
 * work towards solutions.
 *
 * The agent follows the ReAct pattern, interleaving reasoning steps with tool calls to iteratively
 * work towards solutions. It can handle multiple tool calls in sequence or parallel, maintain state
 * across interactions, and provide auditable decision processes.
 *
 * ## Core Components
 *
 * ### Model
 * The reasoning engine can be specified as:
 * - **String identifier**: `"openai:gpt-4o"` for simple setup
 * - **Model instance**: Configured model object for full control
 * - **Dynamic function**: Select models at runtime based on state
 *
 * ### Tools
 * Tools give agents the ability to take actions:
 * - Pass an array of tools created with the `tool` function
 * - Or provide a configured `ToolNode` for custom error handling
 *
 * ### Prompt
 * Shape how your agent approaches tasks:
 * - String for simple instructions
 * - SystemMessage for structured prompts
 * - Function for dynamic prompts based on state
 *
 * ### Middleware
 * Middleware allows you to extend the agent's behavior:
 * - Add pre/post-model processing for context injection or validation
 * - Add dynamic control flows, e.g. terminate invocation or retries
 * - Add human-in-the-loop capabilities
 * - Add tool calls to the agent
 * - Add tool results to the agent
 *
 * ## Advanced Features
 *
 * - **Structured Output**: Use `responseFormat` with a Zod schema to get typed responses
 * - **Memory**: Extend the state schema to remember information across interactions
 * - **Streaming**: Get real-time updates as the agent processes
 *
 * @param options - Configuration options for the agent
 * @param options.llm - The language model as an instance of a chat model
 * @param options.model - The language model as a string identifier, see more in {@link https://docs.langchain.com/oss/javascript/langchain/models#basic-usage | Models}.
 * @param options.tools - Array of tools or configured ToolNode
 * @param options.prompt - System instructions (string, SystemMessage, or function)
 * @param options.responseFormat - Zod schema for structured output
 * @param options.stateSchema - Custom state schema for memory
 * @param options.middleware - Array of middleware for extending agent behavior, see more in {@link https://docs.langchain.com/oss/javascript/langchain/middleware | Middleware}.
 *
 * @returns A ReactAgent instance with `invoke` and `stream` methods
 *
 * @example Basic agent with tools
 * ```ts
 * import { createAgent, tool } from "langchain";
 * import { z } from "zod";
 *
 * const search = tool(
 *   ({ query }) => `Results for: ${query}`,
 *   {
 *     name: "search",
 *     description: "Search for information",
 *     schema: z.object({
 *       query: z.string().describe("The search query"),
 *     })
 *   }
 * );
 *
 * const agent = createAgent({
 *   llm: "openai:gpt-4o",
 *   tools: [search],
 * });
 *
 * const result = await agent.invoke({
 *   messages: [{ role: "user", content: "Search for ReAct agents" }],
 * });
 * ```
 *
 * @example Structured output
 * ```ts
 * import { createAgent } from "langchain";
 * import { z } from "zod";
 *
 * const ContactInfo = z.object({
 *   name: z.string(),
 *   email: z.string(),
 *   phone: z.string(),
 * });
 *
 * const agent = createAgent({
 *   llm: "openai:gpt-4o",
 *   tools: [],
 *   responseFormat: ContactInfo,
 * });
 *
 * const result = await agent.invoke({
 *   messages: [{
 *     role: "user",
 *     content: "Extract: John Doe, john@example.com, (555) 123-4567"
 *   }],
 * });
 *
 * console.log(result.structuredResponse);
 * // { name: 'John Doe', email: 'john@example.com', phone: '(555) 123-4567' }
 * ```
 *
 * @example Streaming responses
 * ```ts
 * const stream = await agent.stream(
 *   { messages: [{ role: "user", content: "What's the weather?" }] },
 *   { streamMode: "values" }
 * );
 *
 * for await (const chunk of stream) {
 *   // ...
 * }
 * ```
 *
 * @example With StateSchema
 * ```ts
 * import { createAgent } from "langchain";
 * import { StateSchema, ReducedValue } from "@langchain/langgraph";
 * import { z } from "zod";
 *
 * const AgentState = new StateSchema({
 *   userId: z.string(),
 *   count: z.number().default(0),
 *   history: new ReducedValue(
 *     z.array(z.string()).default(() => []),
 *     { inputSchema: z.string(), reducer: (c, n) => [...c, n] }
 *   ),
 * });
 *
 * const agent = createAgent({
 *   model: "openai:gpt-4o",
 *   tools: [searchTool],
 *   stateSchema: AgentState,
 * });
 * ```
 */
declare function createAgent<StructuredResponseFormat extends Record<string, any> = Record<string, any>, TStateSchema extends StateDefinitionInit | undefined = undefined, ContextSchema extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot, const TMiddleware extends readonly AgentMiddleware[] = readonly AgentMiddleware[], const TTools extends readonly (ClientTool | ServerTool)[] = readonly (ClientTool | ServerTool)[]>(params: CreateAgentParams<StructuredResponseFormat, TStateSchema, ContextSchema, InteropZodType<StructuredResponseFormat>> & {
  responseFormat: InteropZodType<StructuredResponseFormat>;
  middleware?: TMiddleware;
  tools?: TTools;
}): ReactAgent<AgentTypeConfig<StructuredResponseFormat, TStateSchema, ContextSchema, TMiddleware, CombineTools<TTools, TMiddleware>>>;
declare function createAgent<StructuredResponseFormat extends readonly InteropZodType<any>[], TStateSchema extends StateDefinitionInit | undefined = undefined, ContextSchema extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot, const TMiddleware extends readonly AgentMiddleware[] = readonly AgentMiddleware[], const TTools extends readonly (ClientTool | ServerTool)[] = readonly (ClientTool | ServerTool)[]>(params: CreateAgentParams<ExtractZodArrayTypes<StructuredResponseFormat> extends Record<string, any> ? ExtractZodArrayTypes<StructuredResponseFormat> : Record<string, any>, TStateSchema, ContextSchema, StructuredResponseFormat> & {
  responseFormat: StructuredResponseFormat;
  middleware?: TMiddleware;
  tools?: TTools;
}): ReactAgent<AgentTypeConfig<ExtractZodArrayTypes<StructuredResponseFormat> extends Record<string, any> ? ExtractZodArrayTypes<StructuredResponseFormat> : Record<string, any>, TStateSchema, ContextSchema, TMiddleware, CombineTools<TTools, TMiddleware>>>;
declare function createAgent<TStateSchema extends StateDefinitionInit | undefined = undefined, ContextSchema extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot, const TMiddleware extends readonly AgentMiddleware[] = readonly AgentMiddleware[], const TTools extends readonly (ClientTool | ServerTool)[] = readonly (ClientTool | ServerTool)[]>(params: CreateAgentParams<Record<string, unknown>, TStateSchema, ContextSchema, JsonSchemaFormat> & {
  responseFormat: JsonSchemaFormat;
  middleware?: TMiddleware;
  tools?: TTools;
}): ReactAgent<AgentTypeConfig<Record<string, unknown>, TStateSchema, ContextSchema, TMiddleware, CombineTools<TTools, TMiddleware>>>;
declare function createAgent<TStateSchema extends StateDefinitionInit | undefined = undefined, ContextSchema extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot, const TMiddleware extends readonly AgentMiddleware[] = readonly AgentMiddleware[], const TTools extends readonly (ClientTool | ServerTool)[] = readonly (ClientTool | ServerTool)[]>(params: CreateAgentParams<Record<string, unknown>, TStateSchema, ContextSchema, JsonSchemaFormat[]> & {
  responseFormat: JsonSchemaFormat[];
  middleware?: TMiddleware;
  tools?: TTools;
}): ReactAgent<AgentTypeConfig<Record<string, unknown>, TStateSchema, ContextSchema, TMiddleware, CombineTools<TTools, TMiddleware>>>;
declare function createAgent<TStateSchema extends StateDefinitionInit | undefined = undefined, ContextSchema extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot, const TMiddleware extends readonly AgentMiddleware[] = readonly AgentMiddleware[], const TTools extends readonly (ClientTool | ServerTool)[] = readonly (ClientTool | ServerTool)[]>(params: CreateAgentParams<Record<string, unknown>, TStateSchema, ContextSchema, JsonSchemaFormat | JsonSchemaFormat[]> & {
  responseFormat: JsonSchemaFormat | JsonSchemaFormat[];
  middleware?: TMiddleware;
  tools?: TTools;
}): ReactAgent<AgentTypeConfig<Record<string, unknown>, TStateSchema, ContextSchema, TMiddleware, CombineTools<TTools, TMiddleware>>>;
declare function createAgent<StructuredResponseFormat extends Record<string, any> = Record<string, any>, TStateSchema extends StateDefinitionInit | undefined = undefined, ContextSchema extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot, const TMiddleware extends readonly AgentMiddleware[] = readonly AgentMiddleware[], const TTools extends readonly (ClientTool | ServerTool)[] = readonly (ClientTool | ServerTool)[]>(params: CreateAgentParams<StructuredResponseFormat, TStateSchema, ContextSchema, TypedToolStrategy<StructuredResponseFormat>> & {
  responseFormat: TypedToolStrategy<StructuredResponseFormat>;
  middleware?: TMiddleware;
  tools?: TTools;
}): ReactAgent<AgentTypeConfig<StructuredResponseFormat, TStateSchema, ContextSchema, TMiddleware, CombineTools<TTools, TMiddleware>>>;
declare function createAgent<StructuredResponseFormat extends Record<string, any> = Record<string, any>, TStateSchema extends StateDefinitionInit | undefined = undefined, ContextSchema extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot, const TMiddleware extends readonly AgentMiddleware[] = readonly AgentMiddleware[], const TTools extends readonly (ClientTool | ServerTool)[] = readonly (ClientTool | ServerTool)[]>(params: CreateAgentParams<StructuredResponseFormat, TStateSchema, ContextSchema, ToolStrategy<StructuredResponseFormat>> & {
  responseFormat: ToolStrategy<StructuredResponseFormat>;
  middleware?: TMiddleware;
  tools?: TTools;
}): ReactAgent<AgentTypeConfig<StructuredResponseFormat, TStateSchema, ContextSchema, TMiddleware, CombineTools<TTools, TMiddleware>>>;
declare function createAgent<StructuredResponseFormat extends Record<string, any> = Record<string, any>, TStateSchema extends StateDefinitionInit | undefined = undefined, ContextSchema extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot, const TMiddleware extends readonly AgentMiddleware[] = readonly AgentMiddleware[], const TTools extends readonly (ClientTool | ServerTool)[] = readonly (ClientTool | ServerTool)[]>(params: CreateAgentParams<StructuredResponseFormat, TStateSchema, ContextSchema, ProviderStrategy<StructuredResponseFormat>> & {
  responseFormat: ProviderStrategy<StructuredResponseFormat>;
  middleware?: TMiddleware;
  tools?: TTools;
}): ReactAgent<AgentTypeConfig<StructuredResponseFormat, TStateSchema, ContextSchema, TMiddleware, CombineTools<TTools, TMiddleware>>>;
declare function createAgent<TStateSchema extends StateDefinitionInit | undefined = undefined, ContextSchema extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot, const TMiddleware extends readonly AgentMiddleware[] = readonly AgentMiddleware[], const TTools extends readonly (ClientTool | ServerTool)[] = readonly (ClientTool | ServerTool)[]>(params: Omit<CreateAgentParams<ResponseFormatUndefined, TStateSchema, ContextSchema, never>, "responseFormat"> & {
  middleware?: TMiddleware;
  tools?: TTools;
}): ReactAgent<AgentTypeConfig<ResponseFormatUndefined, TStateSchema, ContextSchema, TMiddleware, CombineTools<TTools, TMiddleware>>>;
declare function createAgent<TStateSchema extends StateDefinitionInit | undefined = undefined, ContextSchema extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot, const TMiddleware extends readonly AgentMiddleware[] = readonly AgentMiddleware[], const TTools extends readonly (ClientTool | ServerTool)[] = readonly (ClientTool | ServerTool)[]>(params: Omit<CreateAgentParams<ResponseFormatUndefined, TStateSchema, ContextSchema, never>, "responseFormat"> & {
  responseFormat?: undefined;
  middleware?: TMiddleware;
  tools?: TTools;
}): ReactAgent<AgentTypeConfig<ResponseFormatUndefined, TStateSchema, ContextSchema, TMiddleware, CombineTools<TTools, TMiddleware>>>;
declare function createAgent<StructuredResponseFormat extends Record<string, any> = Record<string, any>, TStateSchema extends StateDefinitionInit | undefined = undefined, ContextSchema extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot, const TMiddleware extends readonly AgentMiddleware[] = readonly AgentMiddleware[], const TTools extends readonly (ClientTool | ServerTool)[] = readonly (ClientTool | ServerTool)[]>(params: CreateAgentParams<StructuredResponseFormat, TStateSchema, ContextSchema, ResponseFormat> & {
  responseFormat: ResponseFormat;
  middleware?: TMiddleware;
  tools?: TTools;
}): ReactAgent<AgentTypeConfig<StructuredResponseFormat, TStateSchema, ContextSchema, TMiddleware, CombineTools<TTools, TMiddleware>>>;
//#endregion
export { createAgent };
//# sourceMappingURL=index.d.cts.map