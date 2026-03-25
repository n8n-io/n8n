import { JsonSchemaFormat, ProviderStrategy, ResponseFormat, ResponseFormatUndefined, ToolStrategy, TypedToolStrategy } from "./responses.js";
import { JumpToTarget } from "./constants.js";
import { AgentMiddleware, AnyAnnotationRoot, InferMiddlewareContexts, InferMiddlewareStates, InferSchemaInput, InferSchemaValue } from "./middleware/types.js";
import { BaseMessage, MessageStructure, MessageToolDefinition, SystemMessage } from "@langchain/core/messages";
import { ClientTool, DynamicStructuredTool, ServerTool, StructuredToolInterface } from "@langchain/core/tools";
import { END, START, StateDefinitionInit, StateGraph } from "@langchain/langgraph";
import { InteropZodObject, InteropZodType } from "@langchain/core/utils/types";
import { BaseCheckpointSaver, BaseStore } from "@langchain/langgraph-checkpoint";
import { LanguageModelLike } from "@langchain/core/language_models/base";
import { Messages } from "@langchain/langgraph/";

//#region src/agents/types.d.ts
/**
 * Type bag that encapsulates all agent type parameters.
 *
 * This interface bundles all the generic type parameters used throughout the agent system
 * into a single configuration object. This pattern simplifies type signatures and makes
 * it easier to add new type parameters without changing multiple function signatures.
 *
 * @typeParam TResponse - The structured response type when using `responseFormat`.
 *   Defaults to `Record<string, any>`. Set to `ResponseFormatUndefined` when no
 *   response format is configured.
 *
 * @typeParam TState - The custom state schema type. Can be an `AnnotationRoot`,
 *   `InteropZodObject`, or `undefined`. The state persists across agent invocations
 *   when using a checkpointer.
 *
 * @typeParam TContext - The context schema type. Context is read-only and not
 *   persisted between invocations. Defaults to `AnyAnnotationRoot`.
 *
 * @typeParam TMiddleware - The middleware array type. Must be a readonly array
 *   of `AgentMiddleware` instances.
 *
 * @typeParam TTools - The combined tools type from both `createAgent` tools parameter
 *   and middleware tools. This is a readonly array of `ClientTool | ServerTool`.
 *
 * @example
 * ```typescript
 * // Define a type configuration
 * type MyAgentTypes = AgentTypeConfig<
 *   { name: string; email: string },  // Response type
 *   typeof MyStateSchema,              // State schema
 *   typeof MyContextSchema,            // Context schema
 *   typeof myMiddleware,               // Middleware array
 *   typeof myTools                     // Tools array
 * >;
 *
 * // Use with ReactAgent
 * const agent: ReactAgent<MyAgentTypes> = createAgent({ ... });
 * ```
 */
interface AgentTypeConfig<TResponse extends Record<string, any> | ResponseFormatUndefined = Record<string, any> | ResponseFormatUndefined, TState extends StateDefinitionInit | undefined = StateDefinitionInit | undefined, TContext extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot | InteropZodObject, TMiddleware extends readonly AgentMiddleware[] = readonly AgentMiddleware[], TTools extends readonly (ClientTool | ServerTool)[] = readonly (ClientTool | ServerTool)[]> {
  /** The structured response type when using `responseFormat` */
  Response: TResponse;
  /** The custom state schema type */
  State: TState;
  /** The context schema type */
  Context: TContext;
  /** The middleware array type */
  Middleware: TMiddleware;
  /** The combined tools type from agent and middleware */
  Tools: TTools;
}
/**
 * Default type configuration for agents.
 * Used when no explicit type parameters are provided.
 */
interface DefaultAgentTypeConfig extends AgentTypeConfig {
  Response: Record<string, any>;
  State: undefined;
  Context: AnyAnnotationRoot;
  Middleware: readonly AgentMiddleware[];
  Tools: readonly (ClientTool | ServerTool)[];
}
/**
 * Helper type to infer tools from a single middleware instance.
 * Extracts the TTools type parameter from AgentMiddleware.
 */
type InferMiddlewareTools<T extends AgentMiddleware> = T extends AgentMiddleware<any, any, any, infer TTools> ? TTools extends readonly (ClientTool | ServerTool)[] ? TTools : readonly [] : readonly [];
/**
 * Helper type to infer and merge tools from an array of middleware.
 * Recursively extracts tools from each middleware and combines them into a single tuple.
 */
type InferMiddlewareToolsArray<T extends readonly AgentMiddleware[]> = T extends readonly [] ? readonly [] : T extends readonly [infer First, ...infer Rest] ? First extends AgentMiddleware ? Rest extends readonly AgentMiddleware[] ? readonly [...InferMiddlewareTools<First>, ...InferMiddlewareToolsArray<Rest>] : InferMiddlewareTools<First> : readonly [] : readonly [];
/**
 * Helper type to combine agent tools with middleware tools into a single readonly array.
 */
type CombineTools<TAgentTools extends readonly (ClientTool | ServerTool)[], TMiddleware extends readonly AgentMiddleware[]> = readonly [...TAgentTools, ...InferMiddlewareToolsArray<TMiddleware>];
/**
 * Helper type to extract the tool name, input type, and output type from a tool.
 * Converts a single tool to a MessageToolDefinition entry.
 */
type ExtractToolDefinition<T> = T extends DynamicStructuredTool<infer _SchemaT, infer _SchemaOutputT, infer SchemaInputT, infer ToolOutputT, infer _NameT> ? MessageToolDefinition<SchemaInputT, ToolOutputT> : T extends StructuredToolInterface<infer _SchemaT, infer SchemaInputT, infer ToolOutputT> ? MessageToolDefinition<SchemaInputT, ToolOutputT> : MessageToolDefinition;
/**
 * Helper type to convert an array of tools (ClientTool | ServerTool)[] to a MessageToolSet.
 * This maps each tool's name (as a literal type) to its MessageToolDefinition containing
 * the input and output types.
 *
 * @example
 * ```typescript
 * const myTool = tool(async (input: { a: number }) => 42, {
 *   name: "myTool",
 *   schema: z.object({ a: z.number() })
 * });
 *
 * // Results in: { myTool: MessageToolDefinition<{ a: number }, number> }
 * type ToolSet = ToolsToMessageToolSet<readonly [typeof myTool]>;
 * ```
 */
type ToolsToMessageToolSet<T extends readonly (ClientTool | ServerTool)[]> = { [K in T[number] as K extends {
  name: infer N extends string;
} ? N : never]: ExtractToolDefinition<K> };
/**
 * Helper type to resolve an AgentTypeConfig from either:
 * - An AgentTypeConfig directly
 * - A ReactAgent instance (using `typeof agent`)
 *
 * @example
 * ```typescript
 * const agent = createAgent({ ... });
 *
 * // From ReactAgent instance
 * type Types = ResolveAgentTypeConfig<typeof agent>;
 *
 * // From AgentTypeConfig directly
 * type Types2 = ResolveAgentTypeConfig<AgentTypeConfig<...>>;
 * ```
 */
type ResolveAgentTypeConfig<T> = T extends {
  "~agentTypes": infer Types;
} ? Types extends AgentTypeConfig ? Types : never : T extends AgentTypeConfig ? T : never;
/**
 * Helper type to extract any property from an AgentTypeConfig or ReactAgent.
 *
 * @typeParam T - The AgentTypeConfig or ReactAgent to extract from
 * @typeParam K - The property key to extract ("Response" | "State" | "Context" | "Middleware" | "Tools")
 *
 * @example
 * ```typescript
 * const agent = createAgent({ tools: [myTool], ... });
 *
 * // Extract from agent instance
 * type Tools = InferAgentType<typeof agent, "Tools">;
 *
 * // Extract from type config
 * type Response = InferAgentType<MyTypeConfig, "Response">;
 * ```
 */
type InferAgentType<T, K extends keyof AgentTypeConfig> = ResolveAgentTypeConfig<T>[K];
/**
 * Shorthand helper to extract the Response type from an AgentTypeConfig or ReactAgent.
 *
 * @example
 * ```typescript
 * const agent = createAgent({ responseFormat: z.object({ name: z.string() }), ... });
 * type Response = InferAgentResponse<typeof agent>;  // { name: string }
 * ```
 */
type InferAgentResponse<T> = InferAgentType<T, "Response">;
/**
 * Shorthand helper to extract the raw State schema type from an AgentTypeConfig or ReactAgent.
 * This returns just the `stateSchema` type passed to `createAgent`, not merged with middleware.
 *
 * For the complete merged state (what `invoke` returns), use {@link InferAgentState}.
 *
 * @example
 * ```typescript
 * const agent = createAgent({ stateSchema: mySchema, ... });
 * type Schema = InferAgentStateSchema<typeof agent>;
 * ```
 */
type InferAgentStateSchema<T> = InferAgentType<T, "State">;
/**
 * Helper type to infer the full merged state from an agent, including:
 * - The agent's own state schema (if provided via `stateSchema`)
 * - All middleware states
 *
 * This matches the state type returned by `invoke` and used throughout the agent.
 *
 * @example
 * ```typescript
 * const middleware = createMiddleware({
 *   name: "counter",
 *   stateSchema: z.object({ count: z.number() }),
 * });
 *
 * const agent = createAgent({
 *   model: "gpt-4",
 *   tools: [],
 *   stateSchema: z.object({ userId: z.string() }),
 *   middleware: [middleware],
 * });
 *
 * type State = InferAgentState<typeof agent>;
 * // { userId: string; count: number }
 * ```
 */
type InferAgentState<T> = InferSchemaValue<InferAgentType<T, "State">> & InferMiddlewareStates<InferAgentType<T, "Middleware">>;
/**
 * Shorthand helper to extract the raw Context schema type from an AgentTypeConfig or ReactAgent.
 * This returns just the `contextSchema` type passed to `createAgent`, not merged with middleware.
 *
 * For the complete merged context (agent context + middleware contexts), use {@link InferAgentContext}.
 *
 * @example
 * ```typescript
 * const agent = createAgent({ contextSchema: myContextSchema, ... });
 * type Schema = InferAgentContextSchema<typeof agent>;
 * ```
 */
type InferAgentContextSchema<T> = InferAgentType<T, "Context">;
/**
 * Helper type to infer the full merged context from an agent, including:
 * - The agent's own context schema (if provided via `contextSchema`)
 * - All middleware context schemas
 *
 * This matches the context type available throughout the agent runtime.
 *
 * @example
 * ```typescript
 * const middleware = createMiddleware({
 *   name: "auth",
 *   contextSchema: z.object({ userId: z.string() }),
 * });
 *
 * const agent = createAgent({
 *   model: "gpt-4",
 *   tools: [],
 *   contextSchema: z.object({ sessionId: z.string() }),
 *   middleware: [middleware],
 * });
 *
 * type Context = InferAgentContext<typeof agent>;
 * // { sessionId: string; userId: string }
 * ```
 */
type InferAgentContext<T> = InferSchemaValue<InferAgentType<T, "Context">> & InferMiddlewareContexts<InferAgentType<T, "Middleware">>;
/**
 * Shorthand helper to extract the Middleware type from an AgentTypeConfig or ReactAgent.
 *
 * @example
 * ```typescript
 * const agent = createAgent({ middleware: [authMiddleware, loggingMiddleware], ... });
 * type Middleware = InferAgentMiddleware<typeof agent>;
 * ```
 */
type InferAgentMiddleware<T> = InferAgentType<T, "Middleware">;
/**
 * Shorthand helper to extract the Tools type from an AgentTypeConfig or ReactAgent.
 *
 * @example
 * ```typescript
 * const agent = createAgent({ tools: [searchTool, calculatorTool], ... });
 * type Tools = InferAgentTools<typeof agent>;  // readonly [typeof searchTool, typeof calculatorTool]
 * ```
 */
type InferAgentTools<T> = InferAgentType<T, "Tools">;
type N = typeof START | "model_request" | "tools";
/**
 * Represents information about an interrupt.
 */
interface Interrupt<TValue = unknown> {
  /**
   * The ID of the interrupt.
   */
  id: string;
  /**
   * The requests for human input.
   */
  value: TValue;
}
interface BuiltInState<TMessageStructure extends MessageStructure = MessageStructure> {
  messages: BaseMessage<TMessageStructure>[];
  __interrupt__?: Interrupt[];
  /**
   * Optional property to control routing after afterModel middleware execution.
   * When set by middleware, the agent will jump to the specified node instead of
   * following normal routing logic. The property is automatically cleared after use.
   *
   * - "model_request": Jump back to the model for another LLM call
   * - "tools": Jump to tool execution (requires tools to be available)
   */
  jumpTo?: JumpToTarget;
}
/**
 * Base input type for `.invoke` and `.stream` methods.
 */
type UserInput<TStateSchema extends StateDefinitionInit | undefined = undefined> = InferSchemaInput<TStateSchema> & {
  messages: Messages;
};
/**
 * Information about a tool call that has been executed.
 */
interface ToolCall$1 {
  /**
   * The ID of the tool call.
   */
  id: string;
  /**
   * The name of the tool that was called.
   */
  name: string;
  /**
   * The arguments that were passed to the tool.
   */
  args: Record<string, any>;
  /**
   * The result of the tool call.
   */
  result?: unknown;
  /**
   * An optional error message if the tool call failed.
   */
  error?: string;
}
/**
 * Information about a tool result from a tool execution.
 */
interface ToolResult {
  /**
   * The ID of the tool call.
   */
  id: string;
  /**
   * The result of the tool call.
   */
  result: any;
  /**
   * An optional error message if the tool call failed.
   */
  error?: string;
}
/**
 * jump targets (internal)
 */
type JumpTo = "model_request" | "tools" | typeof END;
/**
 * Information about a tool call that has been executed.
 */
interface ExecutedToolCall {
  /**
   * The name of the tool that was called.
   */
  name: string;
  /**
   * The arguments that were passed to the tool.
   */
  args: Record<string, unknown>;
  /**
   * The ID of the tool call.
   */
  tool_id: string;
  /**
   * The result of the tool call (if available).
   */
  result?: unknown;
}
type CreateAgentParams<StructuredResponseType extends Record<string, any> = Record<string, any>, TStateSchema extends StateDefinitionInit | undefined = undefined, ContextSchema extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot, ResponseFormatType = InteropZodType<StructuredResponseType> | InteropZodType<unknown>[] | JsonSchemaFormat | JsonSchemaFormat[] | ResponseFormat | TypedToolStrategy<StructuredResponseType> | ToolStrategy<StructuredResponseType> | ProviderStrategy<StructuredResponseType> | ResponseFormatUndefined> = {
  /**
   * Defines a model to use for the agent. You can either pass in an instance of a LangChain chat model
   * or a string. If a string is provided the agent initializes a ChatModel based on the provided model name and provider.
   * It supports various model providers and allows for runtime configuration of model parameters.
   *
   * @uses {@link initChatModel}
   * @example
   * ```ts
   * const agent = createAgent({
   *   model: "anthropic:claude-3-7-sonnet-latest",
   *   // ...
   * });
   * ```
   *
   * @example
   * ```ts
   * import { ChatOpenAI } from "@langchain/openai";
   * const agent = createAgent({
   *   model: new ChatOpenAI({ model: "gpt-4o" }),
   *   // ...
   * });
   * ```
   */
  model: string | LanguageModelLike;
  /**
   * A list of tools or a ToolNode.
   *
   * @example
   * ```ts
   * import { tool } from "langchain";
   *
   * const weatherTool = tool(() => "Sunny!", {
   *   name: "get_weather",
   *   description: "Get the weather for a location",
   *   schema: z.object({
   *     location: z.string().describe("The location to get weather for"),
   *   }),
   * });
   *
   * const agent = createAgent({
   *   tools: [weatherTool],
   *   // ...
   * });
   * ```
   */
  tools?: (ServerTool | ClientTool)[];
  /**
   * An optional system message for the model.
   *
   * **Use a `string`** for simple, static system prompts. This is the most common use case
   * and works well with template literals for dynamic content. When a string is provided,
   * it's converted to a single text block internally.
   *
   * **Use a `SystemMessage`** when you need advanced features that require structured content:
   * - **Anthropic cache control**: Use `SystemMessage` with array content to enable per-block
   *   cache control settings (e.g., `cache_control: { type: "ephemeral" }`). This allows you
   *   to have different cache settings for different parts of your system prompt.
   * - **Multiple content blocks**: When you need multiple text blocks with different metadata
   *   or formatting requirements.
   * - **Integration with existing code**: When working with code that already produces
   *   `SystemMessage` instances.
   *
   * @example Using a string (recommended for most cases)
   * ```ts
   * const agent = createAgent({
   *   model: "anthropic:claude-sonnet-4-5",
   *   systemPrompt: "You are a helpful assistant.",
   *   // ...
   * });
   * ```
   *
   * @example Using a string with template literals
   * ```ts
   * const userRole = "premium";
   * const agent = createAgent({
   *   model: "anthropic:claude-sonnet-4-5",
   *   systemPrompt: `You are a helpful assistant for ${userRole} users.`,
   *   // ...
   * });
   * ```
   *
   * @example Using SystemMessage with cache control (Anthropic)
   * ```ts
   * import { SystemMessage } from "@langchain/core/messages";
   *
   * const agent = createAgent({
   *   model: "anthropic:claude-sonnet-4-5",
   *   systemPrompt: new SystemMessage({
   *     content: [
   *       {
   *         type: "text",
   *         text: "You are a helpful assistant.",
   *       },
   *       {
   *         type: "text",
   *         text: "Today's date is 2024-06-01.",
   *         cache_control: { type: "ephemeral" },
   *       },
   *     ],
   *   }),
   *   // ...
   * });
   * ```
   *
   * @example Using SystemMessage (simple)
   * ```ts
   * import { SystemMessage } from "@langchain/core/messages";
   *
   * const agent = createAgent({
   *   model: "anthropic:claude-sonnet-4-5",
   *   systemPrompt: new SystemMessage("You are a helpful assistant."),
   *   // ...
   * });
   * ```
   */
  systemPrompt?: string | SystemMessage;
  /**
   * An optional schema for the agent state. It allows you to define custom state properties that persist
   * across agent invocations and can be accessed in hooks, middleware, and throughout the agent's execution.
   * The state is persisted when using a checkpointer and can be updated by middleware or during execution.
   *
   * As opposed to the context (defined in `contextSchema`), the state is persisted between agent invocations
   * when using a checkpointer, making it suitable for maintaining conversation history, user preferences,
   * or any other data that should persist across multiple interactions.
   *
   * @example
   * ```ts
   * import { z } from "zod";
   * import { createAgent } from "@langchain/langgraph";
   *
   * const agent = createAgent({
   *   model: "openai:gpt-4o",
   *   tools: [getWeather],
   *   stateSchema: z.object({
   *     userPreferences: z.object({
   *       temperatureUnit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
   *       location: z.string().optional(),
   *     }).optional(),
   *     conversationCount: z.number().default(0),
   *   }),
   *   prompt: (state, config) => {
   *     const unit = state.userPreferences?.temperatureUnit || "celsius";
   *     return [
   *       new SystemMessage(`You are a helpful assistant. Use ${unit} for temperature.`),
   *     ];
   *   },
   * });
   *
   * const result = await agent.invoke({
   *   messages: [
   *     new HumanMessage("What's the weather like?"),
   *   ],
   *   userPreferences: {
   *     temperatureUnit: "fahrenheit",
   *     location: "New York",
   *   },
   *   conversationCount: 1,
   * });
   * ```
   */
  stateSchema?: TStateSchema;
  /**
   * An optional schema for the context. It allows to pass in a typed context object into the agent
   * invocation and allows to access it in hooks such as `prompt` and middleware.
   * As opposed to the agent state, defined in `stateSchema`, the context is not persisted between
   * agent invocations.
   *
   * @example
   * ```ts
   * const agent = createAgent({
   *   llm: model,
   *   tools: [getWeather],
   *   contextSchema: z.object({
   *     capital: z.string(),
   *   }),
   *   prompt: (state, config) => {
   *     return [
   *       new SystemMessage(`You are a helpful assistant. The capital of France is ${config.context.capital}.`),
   *     ];
   *   },
   * });
   *
   * const result = await agent.invoke({
   *   messages: [
   *     new SystemMessage("You are a helpful assistant."),
   *     new HumanMessage("What is the capital of France?"),
   *   ],
   * }, {
   *   context: {
   *     capital: "Paris",
   *   },
   * });
   * ```
   */
  contextSchema?: ContextSchema;
  /**
   * An optional checkpoint saver to persist the agent's state.
   * @see {@link https://docs.langchain.com/oss/javascript/langgraph/persistence | Checkpointing}
   */
  checkpointer?: BaseCheckpointSaver | boolean;
  /**
   * An optional store to persist the agent's state.
   * @see {@link https://docs.langchain.com/oss/javascript/langgraph/memory#memory-storage | Long-term memory}
   */
  store?: BaseStore;
  /**
   * An optional schema for the final agent output.
   *
   * If provided, output will be formatted to match the given schema and returned in the 'structuredResponse' state key.
   * If not provided, `structuredResponse` will not be present in the output state.
   *
   * Can be passed in as:
   *   - Zod schema
   *     ```ts
   *     const agent = createAgent({
   *       responseFormat: z.object({
   *         capital: z.string(),
   *       }),
   *       // ...
   *     });
   *     ```
   *   - JSON schema
   *     ```ts
   *     const agent = createAgent({
   *       responseFormat: {
   *         type: "json_schema",
   *         schema: {
   *           type: "object",
   *           properties: {
   *             capital: { type: "string" },
   *           },
   *           required: ["capital"],
   *         },
   *       },
   *       // ...
   *     });
   *     ```
   *   - Create React Agent ResponseFormat
   *     ```ts
   *     import { providerStrategy, toolStrategy } from "langchain";
   *     const agent = createAgent({
   *       responseFormat: providerStrategy(
   *         z.object({
   *           capital: z.string(),
   *         })
   *       ),
   *       // or
   *       responseFormat: [
   *         toolStrategy({ ... }),
   *         toolStrategy({ ... }),
   *       ]
   *       // ...
   *     });
   *     ```
   *
   * **Note**: The graph will make a separate call to the LLM to generate the structured response after the agent loop is finished.
   * This is not the only strategy to get structured responses, see more options in [this guide](https://langchain-ai.github.io/langgraph/how-tos/react-agent-structured-output/).
   */
  responseFormat?: ResponseFormatType;
  /**
   * Middleware instances to run during agent execution.
   * Each middleware can define its own state schema and hook into the agent lifecycle.
   *
   * @see {@link https://docs.langchain.com/oss/javascript/langchain/middleware | Middleware}
   */
  middleware?: readonly AgentMiddleware[];
  /**
   * An optional name for the agent.
   */
  name?: string;
  /**
   * An optional description for the agent.
   * This can be used to describe the agent to the underlying supervisor LLM.
   */
  description?: string;
  /**
   * Use to specify how to expose the agent name to the underlying supervisor LLM.
   *   - `undefined`: Relies on the LLM provider {@link AIMessage#name}. Currently, only OpenAI supports this.
   *   - `"inline"`: Add the agent name directly into the content field of the {@link AIMessage} using XML-style tags.
   *       Example: `"How can I help you"` -> `"<name>agent_name</name><content>How can I help you?</content>"`
   */
  includeAgentName?: "inline" | undefined;
  /**
   * An optional abort signal that indicates that the overall operation should be aborted.
   */
  signal?: AbortSignal;
  /**
   * Determines the version of the graph to create.
   *
   * Can be one of
   * - `"v1"`: The tool node processes a single message. All tool calls in the message are
   *           executed in parallel within the tool node.
   * - `"v2"`: The tool node processes a single tool call. Tool calls are distributed across
   *           multiple instances of the tool node using the Send API.
   *
   * @default `"v2"`
   */
  version?: "v1" | "v2";
};
/**
 * Type helper to extract union type from an array of Zod schemas
 */
type ExtractZodArrayTypes<T extends readonly InteropZodType<any>[]> = T extends readonly [InteropZodType<infer A>, ...infer Rest] ? Rest extends readonly InteropZodType<any>[] ? A | ExtractZodArrayTypes<Rest> : A : never;
type WithStateGraphNodes<K extends string, Graph> = Graph extends StateGraph<infer SD, infer S, infer U, infer N, infer I, infer O, infer C> ? StateGraph<SD, S, U, N | K, I, O, C> : never;
//#endregion
export { AgentTypeConfig, BuiltInState, CombineTools, CreateAgentParams, DefaultAgentTypeConfig, ExecutedToolCall, ExtractZodArrayTypes, InferAgentContext, InferAgentContextSchema, InferAgentMiddleware, InferAgentResponse, InferAgentState, InferAgentStateSchema, InferAgentTools, InferAgentType, InferMiddlewareTools, InferMiddlewareToolsArray, Interrupt, JumpTo, N, ResolveAgentTypeConfig, ToolCall$1 as ToolCall, ToolResult, ToolsToMessageToolSet, UserInput, WithStateGraphNodes };
//# sourceMappingURL=types.d.ts.map