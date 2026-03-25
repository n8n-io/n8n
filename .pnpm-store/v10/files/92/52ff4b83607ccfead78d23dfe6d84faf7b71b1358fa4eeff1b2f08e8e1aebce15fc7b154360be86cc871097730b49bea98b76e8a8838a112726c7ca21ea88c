import { createMiddleware } from "../middleware.js";
import { SystemMessage } from "@langchain/core/messages";

//#region src/agents/middleware/dynamicSystemPrompt.ts
/**
* Dynamic System Prompt Middleware
*
* Allows setting the system prompt dynamically right before each model invocation.
* Useful when the prompt depends on the current agent state or per-invocation context.
*
* @typeParam TContextSchema - The shape of the runtime context available at invocation time.
* If your agent defines a `contextSchema`, pass the inferred type here to get full type-safety
* for `runtime.context`.
*
* @param fn - Function that receives the current agent `state` and `runtime`, and
* returns the system prompt for the next model call as a string.
*
* @returns A middleware instance that sets `systemPrompt` for the next model call.
*
* @example Basic usage with typed context
* ```ts
* import { z } from "zod";
* import { dynamicSystemPrompt } from "langchain";
* import { createAgent, SystemMessage } from "langchain";
*
* const contextSchema = z.object({ region: z.string().optional() });
*
* const middleware = dynamicSystemPrompt<z.infer<typeof contextSchema>>(
*   (_state, runtime) => `You are a helpful assistant. Region: ${runtime.context.region ?? "n/a"}`
* );
*
* const agent = createAgent({
*   model: "anthropic:claude-sonnet-4-5",
*   contextSchema,
*   middleware: [middleware],
* });
*
* await agent.invoke({ messages }, { context: { region: "EU" } });
* ```
*
* @public
*/
function dynamicSystemPromptMiddleware(fn) {
	return createMiddleware({
		name: "DynamicSystemPromptMiddleware",
		wrapModelCall: async (request, handler) => {
			const systemPrompt = await fn(request.state, request.runtime);
			if (!(typeof systemPrompt === "string" || SystemMessage.isInstance(systemPrompt))) throw new Error("dynamicSystemPromptMiddleware function must return a string or SystemMessage");
			return handler({
				...request,
				systemMessage: request.systemMessage.concat(systemPrompt)
			});
		}
	});
}

//#endregion
export { dynamicSystemPromptMiddleware };
//# sourceMappingURL=dynamicSystemPrompt.js.map