import { AgentMultiActionOutputParser } from "../types.cjs";
import { ToolsAgentAction, ToolsAgentStep } from "../tool_calling/output_parser.cjs";
import { AgentAction, AgentFinish } from "@langchain/core/agents";
import { BaseMessage } from "@langchain/core/messages";
import { ChatGeneration } from "@langchain/core/outputs";

//#region src/agents/openai_tools/output_parser.d.ts

/**
 * @example
 * ```typescript
 * const prompt = ChatPromptTemplate.fromMessages([
 *   ["ai", "You are a helpful assistant"],
 *   ["human", "{input}"],
 *   new MessagesPlaceholder("agent_scratchpad"),
 * ]);
 *
 * const runnableAgent = RunnableSequence.from([
 *   {
 *     input: (i: { input: string; steps: ToolsAgentStep[] }) => i.input,
 *     agent_scratchpad: (i: { input: string; steps: ToolsAgentStep[] }) =>
 *       formatToOpenAIToolMessages(i.steps),
 *   },
 *   prompt,
 *   new ChatOpenAI({
 *     model: "gpt-3.5-turbo-1106",
 *     temperature: 0,
 *   }).bindTools(tools),
 *   new OpenAIToolsAgentOutputParser(),
 * ]).withConfig({ runName: "OpenAIToolsAgent" });
 *
 * const result = await runnableAgent.invoke({
 *   input:
 *     "What is the sum of the current temperature in San Francisco, New York, and Tokyo?",
 * });
 * ```
 */
declare class OpenAIToolsAgentOutputParser extends AgentMultiActionOutputParser {
  lc_namespace: string[];
  static lc_name(): string;
  parse(text: string): Promise<AgentAction[] | AgentFinish>;
  parseResult(generations: ChatGeneration[]): Promise<AgentFinish | ToolsAgentAction[]>;
  /**
   * Parses the output message into a ToolsAgentAction[] or AgentFinish
   * object.
   * @param message The BaseMessage to parse.
   * @returns A ToolsAgentAction[] or AgentFinish object.
   */
  parseAIMessage(message: BaseMessage): ToolsAgentAction[] | AgentFinish;
  getFormatInstructions(): string;
}
//#endregion
export { OpenAIToolsAgentOutputParser };
//# sourceMappingURL=output_parser.d.cts.map