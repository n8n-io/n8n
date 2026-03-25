import { AgentRunnableSequence } from "../agent.cjs";
import * as _langchain_core_agents0 from "@langchain/core/agents";
import { AgentStep } from "@langchain/core/agents";
import { BasePromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { ToolInterface } from "@langchain/core/tools";

//#region src/agents/react/index.d.ts
/**
 * Params used by the createXmlAgent function.
 */
type CreateReactAgentParams = {
  /** LLM to use for the agent. */
  llm: BaseLanguageModelInterface;
  /** Tools this agent has access to. */
  tools: ToolInterface[];
  /**
   * The prompt to use. Must have input keys for
   * `tools`, `tool_names`, and `agent_scratchpad`.
   */
  prompt: BasePromptTemplate;
  /**
   * Whether to invoke the underlying model in streaming mode,
   * allowing streaming of intermediate steps. Defaults to true.
   */
  streamRunnable?: boolean;
};
/**
 * Create an agent that uses ReAct prompting.
 * @param params Params required to create the agent. Includes an LLM, tools, and prompt.
 * @returns A runnable sequence representing an agent. It takes as input all the same input
 *     variables as the prompt passed in does. It returns as output either an
 *     AgentAction or AgentFinish.
 *
 * @example
 * ```typescript
 * import { AgentExecutor, createReactAgent } from "langchain/agents";
 * import { pull } from "langchain/hub";
 * import type { PromptTemplate } from "@langchain/core/prompts";
 *
 * import { OpenAI } from "@langchain/openai";
 *
 * // Define the tools the agent will have access to.
 * const tools = [...];
 *
 * // Get the prompt to use - you can modify this!
 * // If you want to see the prompt in full, you can at:
 * // https://smith.langchain.com/hub/hwchase17/react
 * const prompt = await pull<PromptTemplate>("hwchase17/react");
 *
 * const llm = new OpenAI({
 *   temperature: 0,
 * });
 *
 * const agent = await createReactAgent({
 *   llm,
 *   tools,
 *   prompt,
 * });
 *
 * const agentExecutor = new AgentExecutor({
 *   agent,
 *   tools,
 * });
 *
 * const result = await agentExecutor.invoke({
 *   input: "what is LangChain?",
 * });
 * ```
 */
declare function createReactAgent({
  llm,
  tools,
  prompt,
  streamRunnable
}: CreateReactAgentParams): Promise<AgentRunnableSequence<{
  steps: AgentStep[];
}, _langchain_core_agents0.AgentAction | _langchain_core_agents0.AgentFinish>>;
//#endregion
export { CreateReactAgentParams, createReactAgent };
//# sourceMappingURL=index.d.cts.map