import { MIDDLEWARE_BRAND } from "./middleware/types.js";

//#region src/agents/middleware.ts
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
function createMiddleware(config) {
	return {
		[MIDDLEWARE_BRAND]: true,
		name: config.name,
		stateSchema: config.stateSchema,
		contextSchema: config.contextSchema,
		wrapToolCall: config.wrapToolCall,
		wrapModelCall: config.wrapModelCall,
		beforeAgent: config.beforeAgent,
		beforeModel: config.beforeModel,
		afterModel: config.afterModel,
		afterAgent: config.afterAgent,
		tools: config.tools
	};
}

//#endregion
export { createMiddleware };
//# sourceMappingURL=middleware.js.map