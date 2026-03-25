import { AfterAgentHook, AfterModelHook, AgentMiddleware, BeforeAgentHook, BeforeModelHook, WrapModelCallHook, WrapToolCallHook } from "./middleware/types.js";
import { ClientTool, ServerTool } from "@langchain/core/tools";
import { StateDefinitionInit } from "@langchain/langgraph";
import { InferInteropZodOutput, InteropZodObject } from "@langchain/core/utils/types";

//#region src/agents/middleware.d.ts
/**
 * Creates a middleware instance with automatic schema inference.
 *
 * @param config - Middleware configuration
 * @param config.name - The name of the middleware
 * @param config.stateSchema - The schema of the middleware state
 * @param config.contextSchema - The schema of the middleware context
 * @param config.wrapModelCall - The function to wrap model invocation
 * @param config.wrapToolCall - The function to wrap tool invocation
 * @param config.beforeModel - The function to run before the model call
 * @param config.afterModel - The function to run after the model call
 * @param config.beforeAgent - The function to run before the agent execution starts
 * @param config.afterAgent - The function to run after the agent execution completes
 * @returns A middleware instance
 *
 * @example Using Zod schema
 * ```ts
 * const authMiddleware = createMiddleware({
 *   name: "AuthMiddleware",
 *   stateSchema: z.object({
 *     isAuthenticated: z.boolean().default(false),
 *   }),
 *   contextSchema: z.object({
 *     userId: z.string(),
 *   }),
 *   beforeModel: async (state, runtime) => {
 *     if (!state.isAuthenticated) {
 *       throw new Error("Not authenticated");
 *     }
 *   },
 * });
 * ```
 *
 * @example Using StateSchema
 * ```ts
 * import { StateSchema, ReducedValue } from "@langchain/langgraph";
 *
 * const historyMiddleware = createMiddleware({
 *   name: "HistoryMiddleware",
 *   stateSchema: new StateSchema({
 *     count: z.number().default(0),
 *     history: new ReducedValue(
 *       z.array(z.string()).default(() => []),
 *       { inputSchema: z.string(), reducer: (current, next) => [...current, next] }
 *     ),
 *   }),
 *   beforeModel: async (state, runtime) => {
 *     return { count: state.count + 1 };
 *   },
 * });
 * ```
 */
declare function createMiddleware<TSchema extends StateDefinitionInit | undefined = undefined, TContextSchema extends InteropZodObject | undefined = undefined, const TTools extends readonly (ClientTool | ServerTool)[] = readonly (ClientTool | ServerTool)[]>(config: {
  /**
   * The name of the middleware
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
   */
  wrapToolCall?: WrapToolCallHook<TSchema, NormalizeContextSchema<TContextSchema>>;
  /**
   * Wraps the model invocation with custom logic. This allows you to:
   * - Modify the request before calling the model
   * - Handle errors and retry with different parameters
   * - Post-process the response
   * - Implement custom caching, logging, or other cross-cutting concerns
   *
   * The request parameter contains: model, messages, systemPrompt, tools, state, and runtime.
   *
   * @param request - The model request containing all the parameters needed.
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
  wrapModelCall?: WrapModelCallHook<TSchema, NormalizeContextSchema<TContextSchema>>;
  /**
   * The function to run before the agent execution starts. This function is called once at the start of the agent invocation.
   * It allows to modify the state of the agent before any model calls or tool executions.
   *
   * @param state - The middleware state
   * @param runtime - The middleware runtime
   * @returns The modified middleware state or undefined to pass through
   */
  beforeAgent?: BeforeAgentHook<TSchema, NormalizeContextSchema<TContextSchema>>;
  /**
   * The function to run before the model call. This function is called before the model is invoked and before the `wrapModelCall` hook.
   * It allows to modify the state of the agent.
   *
   * @param state - The middleware state
   * @param runtime - The middleware runtime
   * @returns The modified middleware state or undefined to pass through
   */
  beforeModel?: BeforeModelHook<TSchema, NormalizeContextSchema<TContextSchema>>;
  /**
   * The function to run after the model call. This function is called after the model is invoked and before any tools are called.
   * It allows to modify the state of the agent after the model is invoked, e.g. to update tool call parameters.
   *
   * @param state - The middleware state
   * @param runtime - The middleware runtime
   * @returns The modified middleware state or undefined to pass through
   */
  afterModel?: AfterModelHook<TSchema, NormalizeContextSchema<TContextSchema>>;
  /**
   * The function to run after the agent execution completes. This function is called once at the end of the agent invocation.
   * It allows to modify the final state of the agent after all model calls and tool executions are complete.
   *
   * @param state - The middleware state
   * @param runtime - The middleware runtime
   * @returns The modified middleware state or undefined to pass through
   */
  afterAgent?: AfterAgentHook<TSchema, NormalizeContextSchema<TContextSchema>>;
}): AgentMiddleware<TSchema, TContextSchema, NormalizeContextSchema<TContextSchema>, TTools>;
type NormalizeContextSchema<TContextSchema extends InteropZodObject | undefined = undefined> = TContextSchema extends InteropZodObject ? InferInteropZodOutput<TContextSchema> : unknown;
//#endregion
export { createMiddleware };
//# sourceMappingURL=middleware.d.ts.map