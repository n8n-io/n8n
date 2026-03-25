import { AgentActionOutputParser } from "../types.cjs";

//#region src/agents/chat/outputParser.d.ts

/**
 * A class that extends the AgentActionOutputParser to parse the output of
 * the ChatAgent in LangChain. It checks if the output text contains the
 * final answer action or a JSON response, and parses it accordingly.
 * @example
 * ```typescript
 * const prompt = ChatPromptTemplate.fromMessages([
 *   [
 *     "ai",
 *     `{PREFIX}
 * {FORMAT_INSTRUCTIONS}
 * {SUFFIX}`,
 *   ],
 *   ["human", "Question: {input}"],
 * ]);
 * const runnableAgent = RunnableSequence.from([
 *   {
 *     input: (i: { input: string; steps: AgentStep[] }) => i.input,
 *     agent_scratchpad: (i: { input: string; steps: AgentStep[] }) =>
 *       formatLogToString(i.steps),
 *   },
 *   prompt,
 *   new OpenAI({ temperature: 0 }),
 *   new ChatAgentOutputParser(),
 * ]);
 *
 * const executor = AgentExecutor.fromAgentAndTools({
 *   agent: runnableAgent,
 *   tools: [new SerpAPI(), new Calculator()],
 * });
 *
 * const result = await executor.invoke({
 *   input:
 *     "Who is Olivia Wilde's boyfriend? What is his current age raised to the 0.23 power?",
 * });
 * ```
 */
declare class ChatAgentOutputParser extends AgentActionOutputParser {
  lc_namespace: string[];
  /**
   * Parses the output text from the MRKL chain into an agent action or
   * agent finish. If the text contains the final answer action or does not
   * contain an action, it returns an AgentFinish with the output and log.
   * If the text contains a JSON response, it returns the tool, toolInput,
   * and log.
   * @param text The output text from the MRKL chain.
   * @returns An object that satisfies the AgentFinish interface or an object with the tool, toolInput, and log.
   */
  parse(text: string): Promise<{
    returnValues: {
      output: string;
    };
    log: string;
    tool?: undefined;
    toolInput?: undefined;
  } | {
    returnValues?: undefined;
    tool: any;
    toolInput: any;
    log: string;
  }>;
  /**
   * Returns the format instructions used in the output parser for the
   * ChatAgent class.
   * @returns The format instructions as a string.
   */
  getFormatInstructions(): string;
}
//#endregion
export { ChatAgentOutputParser };
//# sourceMappingURL=outputParser.d.cts.map