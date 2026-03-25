import { JumpToTarget } from "../constants.js";
import { AgentBuiltInState, Runtime as Runtime$1 } from "../runtime.js";
import { ModelRequest } from "../nodes/types.js";
import { AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { ClientTool, ServerTool } from "@langchain/core/tools";
import { AnnotationRoot, Command, InferStateSchemaUpdate, InferStateSchemaValue, StateDefinitionInit, StateSchema } from "@langchain/langgraph";
import { InteropZodToStateDefinition } from "@langchain/langgraph/zod";
import { InferInteropZodInput, InferInteropZodOutput, InteropZodDefault, InteropZodObject, InteropZodOptional } from "@langchain/core/utils/types";
import { ToolCall as ToolCall$1 } from "@langchain/core/messages/tool";

//#region src/agents/middleware/types.d.ts
type PromiseOrValue<T> = T | Promise<T>;
type AnyAnnotationRoot = AnnotationRoot<any>;
/**
 * Type bag that encapsulates all middleware type parameters.
 *
 * This interface bundles all the generic type parameters used throughout the middleware system
 * into a single configuration object. This pattern simplifies type signatures and makes
 * it easier to add new type parameters without changing multiple function signatures.
 *
 * @typeParam TSchema - The middleware state schema type. Can be a `StateDefinitionInit`
 *   (including `InteropZodObject`, `StateSchema`, or `AnnotationRoot`) or `undefined`.
 *
 * @typeParam TContextSchema - The middleware context schema type. Can be an `InteropZodObject`,
 *   `InteropZodDefault`, `InteropZodOptional`, or `undefined`.
 *
 * @typeParam TFullContext - The full context type available to middleware hooks.
 *
 * @typeParam TTools - The tools array type registered by the middleware.
 *
 * @example
 * ```typescript
 * // Define a type configuration
 * type MyMiddlewareTypes = MiddlewareTypeConfig<
 *   typeof myStateSchema,
 *   typeof myContextSchema,
 *   MyContextType,
 *   typeof myTools
 * >;
 * ```
 */
interface MiddlewareTypeConfig<TSchema extends StateDefinitionInit | undefined = StateDefinitionInit | undefined, TContextSchema extends InteropZodObject | InteropZodDefault<InteropZodObject> | InteropZodOptional<InteropZodObject> | undefined = InteropZodObject | InteropZodDefault<InteropZodObject> | InteropZodOptional<InteropZodObject> | undefined, TFullContext = any, TTools extends readonly (ClientTool | ServerTool)[] = readonly (ClientTool | ServerTool)[]> {
  /** The middleware state schema type */
  Schema: TSchema;
  /** The middleware context schema type */
  ContextSchema: TContextSchema;
  /** The full context type */
  FullContext: TFullContext;
  /** The tools array type */
  Tools: TTools;
}
/**
 * Default type configuration for middleware.
 * Used when no explicit type parameters are provided.
 */
type DefaultMiddlewareTypeConfig = MiddlewareTypeConfig;
type InferSchemaValueType<TSchema> = [TSchema] extends [never] ? AgentBuiltInState : TSchema extends StateSchema<infer TFields> ? InferStateSchemaValue<TFields> & AgentBuiltInState : TSchema extends InteropZodObject ? InferInteropZodOutput<TSchema> & AgentBuiltInState : TSchema extends StateDefinitionInit ? InferSchemaValue<TSchema> & AgentBuiltInState : AgentBuiltInState;
type InferSchemaUpdateType<TSchema> = [TSchema] extends [never] ? AgentBuiltInState : TSchema extends StateSchema<infer TFields> ? InferStateSchemaUpdate<TFields> & AgentBuiltInState : TSchema extends InteropZodObject ? InferInteropZodInput<TSchema> & AgentBuiltInState : TSchema extends StateDefinitionInit ? InferSchemaInput<TSchema> & AgentBuiltInState : AgentBuiltInState;
type NormalizedSchemaInput<TSchema extends StateDefinitionInit | undefined | never = any> = InferSchemaValueType<TSchema>;
type NormalizedSchemaUpdate<TSchema extends StateDefinitionInit | undefined | never = any> = InferSchemaUpdateType<TSchema>;
/**
 * Result type for middleware functions.
 */
type MiddlewareResult<TState> = (TState & {
  jumpTo?: JumpToTarget;
}) | void;
/**
 * Represents a tool call request for the wrapToolCall hook.
 * Contains the tool call information along with the agent's current state and runtime.
 */
interface ToolCallRequest<TState extends Record<string, unknown> = Record<string, unknown>, TContext = unknown> {
  /**
   * The tool call to be executed
   */
  toolCall: ToolCall$1;
  /**
   * The BaseTool instance being invoked.
   * Provides access to tool metadata like name, description, schema, etc.
   *
   * This will be `undefined` for dynamically registered tools that aren't
   * declared upfront when creating the agent. In such cases, middleware
   * should provide the tool implementation by spreading the request with
   * the tool property.
   *
   * @example Dynamic tool handling
   * ```ts
   * wrapToolCall: async (request, handler) => {
   *   if (request.toolCall.name === "dynamic_tool" && !request.tool) {
   *     // Provide the tool implementation for dynamically registered tools
   *     return handler({ ...request, tool: myDynamicTool });
   *   }
   *   return handler(request);
   * }
   * ```
   */
  tool: ClientTool | ServerTool | undefined;
  /**
   * The current agent state (includes both middleware state and built-in state).
   */
  state: TState & AgentBuiltInState;
  /**
   * The runtime context containing metadata, signal, writer, interrupt, etc.
   */
  runtime: Runtime$1<TContext>;
}
/**
 * Handler function type for wrapping tool calls.
 * Takes a tool call request and returns the tool result or a command.
 */
type ToolCallHandler<TSchema extends Record<string, unknown> = AgentBuiltInState, TContext = unknown> = (request: ToolCallRequest<TSchema, TContext>) => PromiseOrValue<ToolMessage | Command>;
/**
 * Wrapper function type for the wrapToolCall hook.
 * Allows middleware to intercept and modify tool execution.
 */
type WrapToolCallHook<TSchema extends StateDefinitionInit | undefined = undefined, TContext = unknown> = (request: ToolCallRequest<NormalizedSchemaInput<TSchema>, TContext>, handler: ToolCallHandler<NormalizedSchemaInput<TSchema>, TContext>) => PromiseOrValue<ToolMessage | Command>;
/**
 * Handler function type for wrapping model calls.
 * Takes a model request and returns the AI message response.
 *
 * @param request - The model request containing model, messages, systemPrompt, tools, state, and runtime
 * @returns The AI message response from the model
 */
type WrapModelCallHandler<TSchema extends StateDefinitionInit | undefined = undefined, TContext = unknown> = (request: Omit<ModelRequest<NormalizedSchemaInput<TSchema>, TContext>,
/**
 * allow to reset the system prompt or system message
 */
"systemPrompt" | "systemMessage"> & {
  systemPrompt?: string;
  systemMessage?: SystemMessage;
}) => PromiseOrValue<AIMessage>;
/**
 * Wrapper function type for the wrapModelCall hook.
 * Allows middleware to intercept and modify model execution.
 * This enables you to:
 * - Modify the request before calling the model (e.g., change system prompt, add/remove tools)
 * - Handle errors and retry with different parameters
 * - Post-process the response
 * - Implement custom caching, logging, or other cross-cutting concerns
 *
 * @param request - The model request containing all parameters needed for the model call
 * @param handler - The function that invokes the model. Call this with a ModelRequest to get the response
 * @returns The AI message response from the model (or a modified version)
 */
type WrapModelCallHook<TSchema extends StateDefinitionInit | undefined = undefined, TContext = unknown> = (request: ModelRequest<NormalizedSchemaInput<TSchema>, TContext>, handler: WrapModelCallHandler<TSchema, TContext>) => PromiseOrValue<AIMessage | Command>;
/**
 * Handler function type for the beforeAgent hook.
 * Called once at the start of agent invocation before any model calls or tool executions.
 *
 * @param state - The current agent state (includes both middleware state and built-in state)
 * @param runtime - The runtime context containing metadata, signal, writer, interrupt, etc.
 * @returns A middleware result containing partial state updates or undefined to pass through
 */
type BeforeAgentHandler<TSchema, TContext> = (state: InferSchemaValueType<TSchema>, runtime: Runtime$1<TContext>) => PromiseOrValue<MiddlewareResult<Partial<InferSchemaUpdateType<TSchema>>>>;
/**
 * Hook type for the beforeAgent lifecycle event.
 * Can be either a handler function or an object with a handler and optional jump targets.
 * This hook is called once at the start of the agent invocation.
 */
type BeforeAgentHook<TSchema extends StateDefinitionInit | undefined = undefined, TContext = unknown> = BeforeAgentHandler<TSchema, TContext> | {
  hook: BeforeAgentHandler<TSchema, TContext>;
  canJumpTo?: JumpToTarget[];
};
/**
 * Handler function type for the beforeModel hook.
 * Called before the model is invoked and before the wrapModelCall hook.
 *
 * @param state - The current agent state (includes both middleware state and built-in state)
 * @param runtime - The runtime context containing metadata, signal, writer, interrupt, etc.
 * @returns A middleware result containing partial state updates or undefined to pass through
 */
type BeforeModelHandler<TSchema, TContext> = (state: InferSchemaValueType<TSchema>, runtime: Runtime$1<TContext>) => PromiseOrValue<MiddlewareResult<Partial<InferSchemaUpdateType<TSchema>>>>;
/**
 * Hook type for the beforeModel lifecycle event.
 * Can be either a handler function or an object with a handler and optional jump targets.
 * This hook is called before each model invocation.
 */
type BeforeModelHook<TSchema extends StateDefinitionInit | undefined = undefined, TContext = unknown> = BeforeModelHandler<TSchema, TContext> | {
  hook: BeforeModelHandler<TSchema, TContext>;
  canJumpTo?: JumpToTarget[];
};
/**
 * Handler function type for the afterModel hook.
 * Called after the model is invoked and before any tools are called.
 * Allows modifying the agent state after model invocation, e.g., to update tool call parameters.
 *
 * @param state - The current agent state (includes both middleware state and built-in state)
 * @param runtime - The runtime context containing metadata, signal, writer, interrupt, etc.
 * @returns A middleware result containing partial state updates or undefined to pass through
 */
type AfterModelHandler<TSchema, TContext> = (state: InferSchemaValueType<TSchema>, runtime: Runtime$1<TContext>) => PromiseOrValue<MiddlewareResult<Partial<InferSchemaUpdateType<TSchema>>>>;
/**
 * Hook type for the afterModel lifecycle event.
 * Can be either a handler function or an object with a handler and optional jump targets.
 * This hook is called after each model invocation.
 */
type AfterModelHook<TSchema extends StateDefinitionInit | undefined = undefined, TContext = unknown> = AfterModelHandler<TSchema, TContext> | {
  hook: AfterModelHandler<TSchema, TContext>;
  canJumpTo?: JumpToTarget[];
};
/**
 * Handler function type for the afterAgent hook.
 * Called once at the end of agent invocation after all model calls and tool executions are complete.
 *
 * @param state - The current agent state (includes both middleware state and built-in state)
 * @param runtime - The runtime context containing metadata, signal, writer, interrupt, etc.
 * @returns A middleware result containing partial state updates or undefined to pass through
 */
type AfterAgentHandler<TSchema, TContext> = (state: InferSchemaValueType<TSchema>, runtime: Runtime$1<TContext>) => PromiseOrValue<MiddlewareResult<Partial<InferSchemaUpdateType<TSchema>>>>;
/**
 * Hook type for the afterAgent lifecycle event.
 * Can be either a handler function or an object with a handler and optional jump targets.
 * This hook is called once at the end of the agent invocation.
 */
type AfterAgentHook<TSchema extends StateDefinitionInit | undefined = undefined, TContext = unknown> = AfterAgentHandler<TSchema, TContext> | {
  hook: AfterAgentHandler<TSchema, TContext>;
  canJumpTo?: JumpToTarget[];
};
/**
 * Unique symbol used to brand middleware instances.
 * This prevents functions from being accidentally assignable to AgentMiddleware
 * since functions have a 'name' property that would otherwise make them structurally compatible.
 */
declare const MIDDLEWARE_BRAND: symbol;
/**
 * Base middleware interface.
 *
 * @typeParam TSchema - The middleware state schema type
 * @typeParam TContextSchema - The middleware context schema type
 * @typeParam TFullContext - The full context type available to hooks
 * @typeParam TTools - The tools array type registered by the middleware
 *
 * @example
 * ```typescript
 * const middleware = createMiddleware({
 *   name: "myMiddleware",
 *   stateSchema: z.object({ count: z.number() }),
 *   tools: [myTool],
 * });
 * ```
 */
interface AgentMiddleware<TSchema extends StateDefinitionInit | undefined = any, TContextSchema extends InteropZodObject | InteropZodDefault<InteropZodObject> | InteropZodOptional<InteropZodObject> | undefined = any, TFullContext = any, TTools extends readonly (ClientTool | ServerTool)[] = readonly (ClientTool | ServerTool)[]> {
  /**
   * Type marker for extracting the MiddlewareTypeConfig from a middleware instance.
   * This is a phantom property used only for type inference.
   * @internal
   */
  readonly "~middlewareTypes"?: MiddlewareTypeConfig<TSchema, TContextSchema, TFullContext, TTools>;
  /**
   * The name of the middleware.
   */
  name: string;
  /**
   * The schema of the middleware state. Middleware state is persisted between multiple invocations. It can be either:
   * - A Zod object (InteropZodObject)
   * - A StateSchema from LangGraph (supports ReducedValue, UntrackedValue)
   * - An AnnotationRoot
   * - Undefined
   */
  stateSchema?: TSchema;
  /**
   * The schema of the middleware context. Middleware context is read-only and not persisted between multiple invocations. It can be either:
   * - A Zod object
   * - A Zod optional object
   * - A Zod default object
   * - Undefined
   */
  contextSchema?: TContextSchema;
  /**
   * Additional tools registered by the middleware.
   */
  tools?: TTools;
  /**
   * Wraps tool execution with custom logic. This allows you to:
   * - Modify tool call parameters before execution
   * - Handle errors and retry with different parameters
   * - Post-process tool results
   * - Implement caching, logging, authentication, or other cross-cutting concerns
   * - Return Command objects for advanced control flow
   *
   * The handler receives a ToolCallRequest containing the tool call, state, and runtime,
   * along with a handler function to execute the actual tool.
   *
   * @param request - The tool call request containing toolCall, state, and runtime.
   * @param handler - The function that executes the tool. Call this with a ToolCallRequest to get the result.
   * @returns The tool result as a ToolMessage or a Command for advanced control flow.
   *
   * @example
   * ```ts
   * wrapToolCall: async (request, handler) => {
   *   console.log(`Calling tool: ${request.tool.name}`);
   *   console.log(`Tool description: ${request.tool.description}`);
   *
   *   try {
   *     // Execute the tool
   *     const result = await handler(request);
   *     console.log(`Tool ${request.tool.name} succeeded`);
   *     return result;
   *   } catch (error) {
   *     console.error(`Tool ${request.tool.name} failed:`, error);
   *     // Could return a custom error message or retry
   *     throw error;
   *   }
   * }
   * ```
   *
   * @example Authentication
   * ```ts
   * wrapToolCall: async (request, handler) => {
   *   // Check if user is authorized for this tool
   *   if (!request.runtime.context.isAuthorized(request.tool.name)) {
   *     return new ToolMessage({
   *       content: "Unauthorized to call this tool",
   *       tool_call_id: request.toolCall.id,
   *     });
   *   }
   *   return handler(request);
   * }
   * ```
   *
   * @example Caching
   * ```ts
   * const cache = new Map();
   * wrapToolCall: async (request, handler) => {
   *   const cacheKey = `${request.tool.name}:${JSON.stringify(request.toolCall.args)}`;
   *   if (cache.has(cacheKey)) {
   *     return cache.get(cacheKey);
   *   }
   *   const result = await handler(request);
   *   cache.set(cacheKey, result);
   *   return result;
   * }
   * ```
   */
  wrapToolCall?: WrapToolCallHook<TSchema, TFullContext>;
  /**
   * Wraps the model invocation with custom logic. This allows you to:
   * - Modify the request before calling the model
   * - Handle errors and retry with different parameters
   * - Post-process the response
   * - Implement custom caching, logging, or other cross-cutting concerns
   *
   * @param request - The model request containing model, messages, systemPrompt, tools, state, and runtime.
   * @param handler - The function that invokes the model. Call this with a ModelRequest to get the response.
   * @returns The response from the model (or a modified version).
   *
   * @example
   * ```ts
   * wrapModelCall: async (request, handler) => {
   *   // Modify request before calling
   *   const modifiedRequest = { ...request, systemPrompt: "You are helpful" };
   *
   *   try {
   *     // Call the model
   *     return await handler(modifiedRequest);
   *   } catch (error) {
   *     // Handle errors and retry with fallback
   *     const fallbackRequest = { ...request, model: fallbackModel };
   *     return await handler(fallbackRequest);
   *   }
   * }
   * ```
   */
  wrapModelCall?: WrapModelCallHook<TSchema, TFullContext>;
  /**
   * The function to run before the agent execution starts. This function is called once at the start of the agent invocation.
   * It allows to modify the state of the agent before any model calls or tool executions.
   *
   * @param state - The middleware state
   * @param runtime - The middleware runtime
   * @returns The modified middleware state or undefined to pass through
   */
  beforeAgent?: BeforeAgentHook<TSchema, TFullContext>;
  /**
   * The function to run before the model call. This function is called before the model is invoked and before the `wrapModelCall` hook.
   * It allows to modify the state of the agent.
   *
   * @param state - The middleware state
   * @param runtime - The middleware runtime
   * @returns The modified middleware state or undefined to pass through
   */
  beforeModel?: BeforeModelHook<TSchema, TFullContext>;
  /**
   * The function to run after the model call. This function is called after the model is invoked and before any tools are called.
   * It allows to modify the state of the agent after the model is invoked, e.g. to update tool call parameters.
   *
   * @param state - The middleware state
   * @param runtime - The middleware runtime
   * @returns The modified middleware state or undefined to pass through
   */
  afterModel?: AfterModelHook<TSchema, TFullContext>;
  /**
   * The function to run after the agent execution completes. This function is called once at the end of the agent invocation.
   * It allows to modify the final state of the agent after all model calls and tool executions are complete.
   *
   * @param state - The middleware state
   * @param runtime - The middleware runtime
   * @returns The modified middleware state or undefined to pass through
   */
  afterAgent?: AfterAgentHook<TSchema, TFullContext>;
}
/**
 * Helper type to filter out properties that start with underscore (private properties)
 */
type FilterPrivateProps<T> = { [K in keyof T as K extends `_${string}` ? never : K]: T[K] };
/**
 * Helper type to resolve a MiddlewareTypeConfig from either:
 * - A MiddlewareTypeConfig directly
 * - An AgentMiddleware instance (using `typeof middleware`)
 */
type ResolveMiddlewareTypeConfig<T> = T extends {
  "~middlewareTypes"?: infer Types;
} ? Types extends MiddlewareTypeConfig ? Types : never : T extends MiddlewareTypeConfig ? T : never;
/**
 * Helper type to extract any property from a MiddlewareTypeConfig or AgentMiddleware.
 *
 * @typeParam T - The MiddlewareTypeConfig or AgentMiddleware to extract from
 * @typeParam K - The property key to extract ("Schema" | "ContextSchema" | "FullContext" | "Tools")
 */
type InferMiddlewareType<T, K extends keyof MiddlewareTypeConfig> = ResolveMiddlewareTypeConfig<T>[K];
/**
 * Shorthand helper to extract the Schema type from a MiddlewareTypeConfig or AgentMiddleware.
 */
type InferMiddlewareSchema<T> = InferMiddlewareType<T, "Schema">;
/**
 * Shorthand helper to extract the ContextSchema type from a MiddlewareTypeConfig or AgentMiddleware.
 */
type InferMiddlewareContextSchema<T> = InferMiddlewareType<T, "ContextSchema">;
/**
 * Shorthand helper to extract the FullContext type from a MiddlewareTypeConfig or AgentMiddleware.
 */
type InferMiddlewareFullContext<T> = InferMiddlewareType<T, "FullContext">;
/**
 * Shorthand helper to extract the Tools type from a MiddlewareTypeConfig or AgentMiddleware.
 */
type InferMiddlewareToolsFromConfig<T> = InferMiddlewareType<T, "Tools">;
type InferChannelType<T extends AnyAnnotationRoot | InteropZodObject> = T extends AnyAnnotationRoot ? ToAnnotationRoot<T>["State"] : T extends InteropZodObject ? InferInteropZodInput<T> : {};
/**
 * Helper type to infer the state schema type from a middleware
 * This filters out private properties (those starting with underscore)
 * Supports both Zod schemas (InteropZodObject) and StateSchema from LangGraph
 */
type InferMiddlewareState<T extends AgentMiddleware> = T extends AgentMiddleware<infer TSchema, any, any, any> ? TSchema extends StateSchema<infer TFields> ? FilterPrivateProps<InferStateSchemaValue<TFields>> : TSchema extends InteropZodObject ? FilterPrivateProps<InferInteropZodOutput<TSchema>> : TSchema extends StateDefinitionInit ? FilterPrivateProps<InferSchemaValue<TSchema>> : {} : {};
/**
 * Helper type to infer the input state schema type from a middleware (all properties optional)
 * This filters out private properties (those starting with underscore)
 * Supports both Zod schemas (InteropZodObject) and StateSchema from LangGraph
 */
type InferMiddlewareInputState<T extends AgentMiddleware> = T extends AgentMiddleware<infer TSchema, any, any, any> ? TSchema extends StateSchema<infer TFields> ? FilterPrivateProps<InferStateSchemaUpdate<TFields>> : TSchema extends InteropZodObject ? FilterPrivateProps<InferInteropZodInput<TSchema>> : TSchema extends StateDefinitionInit ? FilterPrivateProps<InferSchemaInput<TSchema>> : {} : {};
/**
 * Helper type to infer merged state from an array of middleware (just the middleware states)
 */
type InferMiddlewareStates<T extends readonly AgentMiddleware[]> = T extends readonly [] ? {} : T extends readonly [infer First, ...infer Rest] ? First extends AgentMiddleware ? Rest extends readonly AgentMiddleware[] ? InferMiddlewareState<First> & InferMiddlewareStates<Rest> : InferMiddlewareState<First> : {} : {};
/**
 * Helper type to infer merged input state from an array of middleware (with optional defaults)
 */
type InferMiddlewareInputStates<T extends readonly AgentMiddleware[]> = T extends readonly [] ? {} : T extends readonly [infer First, ...infer Rest] ? First extends AgentMiddleware ? Rest extends readonly AgentMiddleware[] ? InferMiddlewareInputState<First> & InferMiddlewareInputStates<Rest> : InferMiddlewareInputState<First> : {} : {};
/**
 * Helper type to infer merged state from an array of middleware (includes built-in state)
 */
type InferMergedState<T extends readonly AgentMiddleware[]> = InferMiddlewareStates<T> & AgentBuiltInState;
/**
 * Helper type to infer merged input state from an array of middleware (includes built-in state)
 */
type InferMergedInputState<T extends readonly AgentMiddleware[]> = InferMiddlewareInputStates<T> & AgentBuiltInState;
/**
 * Helper type to infer the context schema type from a middleware
 */
type InferMiddlewareContext<T extends AgentMiddleware> = T extends AgentMiddleware<any, infer TContextSchema, any, any> ? TContextSchema extends InteropZodObject ? InferInteropZodInput<TContextSchema> : {} : {};
/**
 * Helper type to infer the input context schema type from a middleware (with optional defaults)
 */
type InferMiddlewareContextInput<T extends AgentMiddleware> = T extends AgentMiddleware<any, infer TContextSchema, any, any> ? TContextSchema extends InteropZodOptional<infer Inner> ? InferInteropZodInput<Inner> | undefined : TContextSchema extends InteropZodObject ? InferInteropZodInput<TContextSchema> : {} : {};
/**
 * Helper type to infer merged context from an array of middleware
 */
type InferMiddlewareContexts<T extends readonly AgentMiddleware[]> = T extends readonly [] ? {} : T extends readonly [infer First, ...infer Rest] ? First extends AgentMiddleware ? Rest extends readonly AgentMiddleware[] ? InferMiddlewareContext<First> & InferMiddlewareContexts<Rest> : InferMiddlewareContext<First> : {} : {};
/**
 * Helper to merge two context types, preserving undefined unions
 */
type MergeContextTypes<A, B> = [A] extends [undefined] ? [B] extends [undefined] ? undefined : B | undefined : [B] extends [undefined] ? A | undefined : [A] extends [B] ? A : [B] extends [A] ? B : A & B;
/**
 * Helper type to infer merged input context from an array of middleware (with optional defaults)
 */
type InferMiddlewareContextInputs<T extends readonly AgentMiddleware[]> = T extends readonly [] ? {} : T extends readonly [infer First, ...infer Rest] ? First extends AgentMiddleware ? Rest extends readonly AgentMiddleware[] ? MergeContextTypes<InferMiddlewareContextInput<First>, InferMiddlewareContextInputs<Rest>> : InferMiddlewareContextInput<First> : {} : {};
/**
 * Helper type to extract input type from context schema (with optional defaults)
 */
type InferContextInput<ContextSchema extends AnyAnnotationRoot | InteropZodObject> = ContextSchema extends InteropZodObject ? InferInteropZodInput<ContextSchema> : ContextSchema extends AnyAnnotationRoot ? ToAnnotationRoot<ContextSchema>["State"] : {};
type ToAnnotationRoot<A extends StateDefinitionInit> = A extends AnyAnnotationRoot ? A : A extends InteropZodObject ? InteropZodToStateDefinition<A> : never;
type InferSchemaValue<A extends StateDefinitionInit | undefined> = A extends StateSchema<infer TFields> ? InferStateSchemaValue<TFields> : A extends InteropZodObject ? InferInteropZodOutput<A> : A extends AnyAnnotationRoot ? A["State"] : {};
type InferSchemaInput<A extends StateDefinitionInit | undefined> = A extends StateSchema<infer TFields> ? InferStateSchemaUpdate<TFields> : A extends InteropZodObject ? InferInteropZodInput<A> : A extends AnyAnnotationRoot ? A["Update"] : {};
//#endregion
export { AfterAgentHook, AfterModelHook, AgentMiddleware, AnyAnnotationRoot, BeforeAgentHook, BeforeModelHook, DefaultMiddlewareTypeConfig, InferChannelType, InferContextInput, InferMergedInputState, InferMergedState, InferMiddlewareContext, InferMiddlewareContextInput, InferMiddlewareContextInputs, InferMiddlewareContextSchema, InferMiddlewareContexts, InferMiddlewareFullContext, InferMiddlewareInputState, InferMiddlewareInputStates, InferMiddlewareSchema, InferMiddlewareState, InferMiddlewareStates, InferMiddlewareToolsFromConfig, InferMiddlewareType, InferSchemaInput, InferSchemaUpdateType, InferSchemaValue, InferSchemaValueType, MIDDLEWARE_BRAND, MiddlewareResult, MiddlewareTypeConfig, NormalizedSchemaInput, NormalizedSchemaUpdate, ResolveMiddlewareTypeConfig, ToAnnotationRoot, ToolCallHandler, ToolCallRequest, WrapModelCallHandler, WrapModelCallHook, WrapToolCallHook };
//# sourceMappingURL=types.d.ts.map