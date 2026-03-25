import { AgentActionOutputParser } from "../types.cjs";
import { AgentAction, AgentFinish } from "@langchain/core/agents";

//#region src/agents/react/output_parser.d.ts

/**
 * Parses ReAct-style LLM calls that have a single tool input.
 *
 * Expects output to be in one of two formats.
 *
 * If the output signals that an action should be taken,
 * should be in the below format. This will result in an AgentAction
 * being returned.
 *
 * ```
 * Thought: agent thought here
 * Action: search
 * Action Input: what is the temperature in SF?
 * ```
 *
 * If the output signals that a final answer should be given,
 * should be in the below format. This will result in an AgentFinish
 * being returned.
 *
 * ```
 * Thought: agent thought here
 * Final Answer: The temperature is 100 degrees
 * ```
 * @example
 * ```typescript
 *
 * const runnableAgent = RunnableSequence.from([
 *   ...rest of runnable
 *   new ReActSingleInputOutputParser({ toolNames: ["SerpAPI", "Calculator"] }),
 * ]);
 * const agent = AgentExecutor.fromAgentAndTools({
 *   agent: runnableAgent,
 *   tools: [new SerpAPI(), new Calculator()],
 * });
 * const result = await agent.invoke({
 *   input: "whats the weather in pomfret?",
 * });
 * ```
 */
declare class ReActSingleInputOutputParser extends AgentActionOutputParser {
  lc_namespace: string[];
  private toolNames;
  constructor(fields: {
    toolNames: string[];
  });
  /**
   * Parses the given text into an AgentAction or AgentFinish object. If an
   * output fixing parser is defined, uses it to parse the text.
   * @param text Text to parse.
   * @returns Promise that resolves to an AgentAction or AgentFinish object.
   */
  parse(text: string): Promise<AgentAction | AgentFinish>;
  /**
   * Returns the format instructions as a string. If the 'raw' option is
   * true, returns the raw FORMAT_INSTRUCTIONS.
   * @param options Options for getting the format instructions.
   * @returns Format instructions as a string.
   */
  getFormatInstructions(): string;
}
//#endregion
export { ReActSingleInputOutputParser };
//# sourceMappingURL=output_parser.d.cts.map