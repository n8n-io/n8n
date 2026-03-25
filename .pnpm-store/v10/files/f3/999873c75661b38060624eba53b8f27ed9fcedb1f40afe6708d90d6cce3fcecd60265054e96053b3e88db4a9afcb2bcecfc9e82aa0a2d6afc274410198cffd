import { initChatModel } from "../../chat_models/universal.js";
import { createMiddleware } from "../middleware.js";

//#region src/agents/middleware/modelFallback.ts
/**
* Middleware that provides automatic model fallback on errors.
*
* This middleware attempts to retry failed model calls with alternative models
* in sequence. When a model call fails, it tries the next model in the fallback
* list until either a call succeeds or all models have been exhausted.
*
* @example
* ```ts
* import { createAgent, modelFallbackMiddleware } from "langchain";
*
* // Create middleware with fallback models (not including primary)
* const fallback = modelFallbackMiddleware(
*   "openai:gpt-4o-mini",  // First fallback
*   "anthropic:claude-sonnet-4-5-20250929",  // Second fallback
* );
*
* const agent = createAgent({
*   model: "openai:gpt-4o",  // Primary model
*   middleware: [fallback],
*   tools: [],
* });
*
* // If gpt-4o fails, automatically tries gpt-4o-mini, then claude
* const result = await agent.invoke({
*   messages: [{ role: "user", content: "Hello" }]
* });
* ```
*
* @param fallbackModels - The fallback models to try, in order.
* @returns A middleware instance that handles model failures with fallbacks
*/
function modelFallbackMiddleware(...fallbackModels) {
	return createMiddleware({
		name: "modelFallbackMiddleware",
		wrapModelCall: async (request, handler) => {
			/**
			* Try the primary model first
			*/
			try {
				return await handler(request);
			} catch (error) {
				/**
				* If primary model fails, try fallback models in sequence
				*/
				for (let i = 0; i < fallbackModels.length; i++) try {
					const fallbackModel = fallbackModels[i];
					const model = typeof fallbackModel === "string" ? await initChatModel(fallbackModel) : fallbackModel;
					return await handler({
						...request,
						model
					});
				} catch (fallbackError) {
					/**
					* If this is the last fallback, throw the error
					*/
					if (i === fallbackModels.length - 1) throw fallbackError;
				}
				/**
				* If no fallbacks were provided, re-throw the original error
				*/
				throw error;
			}
		}
	});
}

//#endregion
export { modelFallbackMiddleware };
//# sourceMappingURL=modelFallback.js.map