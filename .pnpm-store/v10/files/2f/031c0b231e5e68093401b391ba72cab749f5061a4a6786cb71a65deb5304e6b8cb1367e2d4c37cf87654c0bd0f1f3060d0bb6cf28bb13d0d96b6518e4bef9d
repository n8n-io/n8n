import { AgentActionOutputParser } from "../types.js";
import { AgentAction, AgentFinish } from "@langchain/core/agents";

//#region src/agents/xml/output_parser.d.ts

/**
 * @example
 * ```typescript
 * const prompt = ChatPromptTemplate.fromMessages([
 *   HumanMessagePromptTemplate.fromTemplate(AGENT_INSTRUCTIONS),
 *   new MessagesPlaceholder("agent_scratchpad"),
 * ]);
 * const runnableAgent = RunnableSequence.from([
 *   ...rest of runnable
 *   prompt,
 *   new ChatAnthropic({ modelName: "claude-2", temperature: 0 }).withConfig({
 *     stop: ["</tool_input>", "</final_answer>"],
 *   }),
 *   new XMLAgentOutputParser(),
 * ]);
 * const result = await executor.invoke({
 *   input: "What is the weather in Honolulu?",
 *   tools: [],
 * });
 * ```
 */
declare class XMLAgentOutputParser extends AgentActionOutputParser {
  lc_namespace: string[];
  static lc_name(): string;
  /**
   * Parses the output text from the agent and returns an AgentAction or
   * AgentFinish object.
   * @param text The output text from the agent.
   * @returns An AgentAction or AgentFinish object.
   */
  parse(text: string): Promise<AgentAction | AgentFinish>;
  getFormatInstructions(): string;
}
//#endregion
export { XMLAgentOutputParser };
//# sourceMappingURL=output_parser.d.ts.map