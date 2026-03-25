import { BaseMessage } from "@langchain/core/messages";

//#region src/agents/middleware/utils.d.ts
/**
 * Default token counter that approximates based on character count.
 *
 * If tools are provided, the token count also includes stringified tool schemas.
 *
 * @param messages Messages to count tokens for
 * @param tools Optional list of tools to include in the token count. Each tool
 *   can be either a LangChain tool instance or a dict representing a tool schema.
 *   LangChain tool instances are converted to OpenAI tool format before counting.
 * @returns Approximate token count
 */
declare function countTokensApproximately(messages: BaseMessage[], tools?: Array<Record<string, any>> | null): number;
//#endregion
export { countTokensApproximately };
//# sourceMappingURL=utils.d.cts.map