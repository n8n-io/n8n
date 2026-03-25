import { AgentBuiltInState, Runtime } from "../runtime.cjs";
import { AgentMiddleware } from "./types.cjs";
import { SystemMessage } from "@langchain/core/messages";
import * as _langchain_core_tools0 from "@langchain/core/tools";

//#region src/agents/middleware/dynamicSystemPrompt.d.ts
type DynamicSystemPromptMiddlewareConfig<TContextSchema> = (state: AgentBuiltInState, runtime: Runtime<TContextSchema>) => string | SystemMessage | Promise<string | SystemMessage>;
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
declare function dynamicSystemPromptMiddleware<TContextSchema = unknown>(fn: DynamicSystemPromptMiddlewareConfig<TContextSchema>): AgentMiddleware<undefined, undefined, unknown, readonly (_langchain_core_tools0.ServerTool | _langchain_core_tools0.ClientTool)[]>;
//#endregion
export { DynamicSystemPromptMiddlewareConfig, dynamicSystemPromptMiddleware };
//# sourceMappingURL=dynamicSystemPrompt.d.cts.map