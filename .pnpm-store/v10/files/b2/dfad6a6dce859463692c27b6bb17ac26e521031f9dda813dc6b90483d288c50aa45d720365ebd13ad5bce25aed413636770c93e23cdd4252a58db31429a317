const require_runtime = require('../../../../_virtual/_rolldown/runtime.cjs');
const require_middleware = require('../../../middleware.cjs');
let zod_v3 = require("zod/v3");

//#region src/agents/middleware/provider/anthropic/promptCaching.ts
const DEFAULT_ENABLE_CACHING = true;
const DEFAULT_TTL = "5m";
const DEFAULT_MIN_MESSAGES_TO_CACHE = 3;
const DEFAULT_UNSUPPORTED_MODEL_BEHAVIOR = "warn";
const contextSchema = zod_v3.z.object({
	enableCaching: zod_v3.z.boolean().optional(),
	ttl: zod_v3.z.enum(["5m", "1h"]).optional(),
	minMessagesToCache: zod_v3.z.number().optional(),
	unsupportedModelBehavior: zod_v3.z.enum([
		"ignore",
		"warn",
		"raise"
	]).optional()
});
var PromptCachingMiddlewareError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "PromptCachingMiddlewareError";
	}
};
/**
* Creates a prompt caching middleware for Anthropic models to optimize API usage.
*
* This middleware automatically adds cache control headers to the last messages when using Anthropic models,
* enabling their prompt caching feature. This can significantly reduce costs for applications with repetitive
* prompts, long system messages, or extensive conversation histories.
*
* ## How It Works
*
* The middleware intercepts model requests and adds cache control metadata that tells Anthropic's
* API to cache processed prompt prefixes. On subsequent requests with matching prefixes, the
* cached representations are reused, skipping redundant token processing.
*
* ## Benefits
*
* - **Cost Reduction**: Avoid reprocessing the same tokens repeatedly (up to 90% savings on cached portions)
* - **Lower Latency**: Cached prompts are processed faster as embeddings are pre-computed
* - **Better Scalability**: Reduced computational load enables handling more requests
* - **Consistent Performance**: Stable response times for repetitive queries
*
* @param middlewareOptions - Configuration options for the caching behavior
* @param middlewareOptions.enableCaching - Whether to enable prompt caching (default: `true`)
* @param middlewareOptions.ttl - Cache time-to-live: `"5m"` for 5 minutes or `"1h"` for 1 hour (default: `"5m"`)
* @param middlewareOptions.minMessagesToCache - Minimum number of messages required before caching is applied (default: `3`)
* @param middlewareOptions.unsupportedModelBehavior - The behavior to take when an unsupported model is used (default: `"warn"`)
*
* @returns A middleware instance that can be passed to `createAgent`
*
* @throws {Error} If used with non-Anthropic models
*
* @example
* Basic usage with default settings
* ```typescript
* import { createAgent } from "langchain";
* import { anthropicPromptCachingMiddleware } from "langchain";
*
* const agent = createAgent({
*   model: "anthropic:claude-sonnet-4-5",
*   middleware: [
*     anthropicPromptCachingMiddleware()
*   ]
* });
* ```
*
* @example
* Custom configuration for longer conversations
* ```typescript
* const cachingMiddleware = anthropicPromptCachingMiddleware({
*   ttl: "1h",  // Cache for 1 hour instead of default 5 minutes
*   minMessagesToCache: 5  // Only cache after 5 messages
* });
*
* const agent = createAgent({
*   model: "anthropic:claude-sonnet-4-5",
*   systemPrompt: "You are a helpful assistant with deep knowledge of...", // Long system prompt
*   middleware: [cachingMiddleware]
* });
* ```
*
* @example
* Conditional caching based on runtime context
* ```typescript
* const agent = createAgent({
*   model: "anthropic:claude-sonnet-4-5",
*   middleware: [
*     anthropicPromptCachingMiddleware({
*       enableCaching: true,
*       ttl: "5m"
*     })
*   ]
* });
*
* // Disable caching for specific requests
* await agent.invoke(
*   { messages: [new HumanMessage("Process this without caching")] },
*   {
*     configurable: {
*       middleware_context: { enableCaching: false }
*     }
*   }
* );
* ```
*
* @example
* Optimal setup for customer support chatbot
* ```typescript
* const supportAgent = createAgent({
*   model: "anthropic:claude-sonnet-4-5",
*   systemPrompt: `You are a customer support agent for ACME Corp.
*
*     Company policies:
*     - Always be polite and professional
*     - Refer to knowledge base for product information
*     - Escalate billing issues to human agents
*     ... (extensive policies and guidelines)
*   `,
*   tools: [searchKnowledgeBase, createTicket, checkOrderStatus],
*   middleware: [
*     anthropicPromptCachingMiddleware({
*       ttl: "1h",  // Long TTL for stable system prompt
*       minMessagesToCache: 1  // Cache immediately due to large system prompt
*     })
*   ]
* });
* ```
*
* @remarks
* - **Anthropic Only**: This middleware only works with Anthropic models and will throw an error if used with other providers
* - **Automatic Application**: Caching is applied automatically when message count exceeds `minMessagesToCache`
* - **Cache Scope**: Caches are isolated per API key and cannot be shared across different keys
* - **TTL Options**: Only supports "5m" (5 minutes) and "1h" (1 hour) as TTL values per Anthropic's API
* - **Best Use Cases**: Long system prompts, multi-turn conversations, repetitive queries, RAG applications
* - **Cost Impact**: Cached tokens are billed at 10% of the base input token price, cache writes are billed at 25% of the base
*
* @see {@link createAgent} for agent creation
* @see {@link https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching} Anthropic's prompt caching documentation
* @public
*/
function anthropicPromptCachingMiddleware(middlewareOptions) {
	return require_middleware.createMiddleware({
		name: "PromptCachingMiddleware",
		contextSchema,
		wrapModelCall: (request, handler) => {
			/**
			* Prefer runtime context values over middleware options values over defaults
			*/
			const enableCaching = request.runtime.context.enableCaching ?? middlewareOptions?.enableCaching ?? DEFAULT_ENABLE_CACHING;
			const ttl = request.runtime.context.ttl ?? middlewareOptions?.ttl ?? DEFAULT_TTL;
			const minMessagesToCache = request.runtime.context.minMessagesToCache ?? middlewareOptions?.minMessagesToCache ?? DEFAULT_MIN_MESSAGES_TO_CACHE;
			const unsupportedModelBehavior = request.runtime.context.unsupportedModelBehavior ?? middlewareOptions?.unsupportedModelBehavior ?? DEFAULT_UNSUPPORTED_MODEL_BEHAVIOR;
			if (!enableCaching || !request.model) return handler(request);
			if (!(request.model.getName() === "ChatAnthropic" || request.model.getName() === "ConfigurableModel" && request.model._defaultConfig?.modelProvider === "anthropic")) {
				const modelName = request.model.getName();
				const baseMessage = `Unsupported model '${request.model.getName() === "ConfigurableModel" ? `${modelName} (${request.model._defaultConfig?.modelProvider})` : modelName}'. Prompt caching requires an Anthropic model`;
				if (unsupportedModelBehavior === "raise") throw new PromptCachingMiddlewareError(`${baseMessage} (e.g., 'anthropic:claude-4-0-sonnet').`);
				else if (unsupportedModelBehavior === "warn") console.warn(`PromptCachingMiddleware: Skipping caching for ${modelName}. Consider switching to an Anthropic model for caching benefits.`);
				return handler(request);
			}
			if (request.state.messages.length + (request.systemPrompt ? 1 : 0) < minMessagesToCache) return handler(request);
			/**
			* The cache_control is applied at the final message formatting layer in ChatAnthropic,
			* which avoids issues with message content block manipulation during earlier
			* processing stages (e.g., streaming response reassembly).
			*
			* @see https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
			*/
			return handler({
				...request,
				modelSettings: {
					...request.modelSettings,
					cache_control: {
						type: "ephemeral",
						ttl
					}
				}
			});
		}
	});
}

//#endregion
exports.anthropicPromptCachingMiddleware = anthropicPromptCachingMiddleware;
//# sourceMappingURL=promptCaching.cjs.map