import { AgentActionOutputParser } from "../types.js";
import { ChatGeneration } from "@langchain/core/outputs";
import { BaseMessage } from "@langchain/core/messages";
import { AgentAction, AgentFinish } from "@langchain/core/agents";

//#region src/agents/openai_functions/output_parser.d.ts

/**
 * Type that represents an agent action with an optional message log.
 */
type FunctionsAgentAction = AgentAction & {
  messageLog?: BaseMessage[];
};
/**
 * @example
 * ```typescript
 *
 * const prompt = ChatPromptTemplate.fromMessages([
 *   ["ai", "You are a helpful assistant"],
 *   ["human", "{input}"],
 *   new MessagesPlaceholder("agent_scratchpad"),
 * ]);
 *
 * const modelWithFunctions = new ChatOpenAI({
 *   model: "gpt-4",
 *   temperature: 0,
 * }).bindTools(tools);
 *
 * const runnableAgent = RunnableSequence.from([
 *   {
 *     input: (i) => i.input,
 *     agent_scratchpad: (i) => formatAgentSteps(i.steps),
 *   },
 *   prompt,
 *   modelWithFunctions,
 *   new OpenAIFunctionsAgentOutputParser(),
 * ]);
 *
 * const result = await runnableAgent.invoke({
 *   input: "What is the weather in New York?",
 *   steps: agentSteps,
 * });
 *
 * ```
 */
declare class OpenAIFunctionsAgentOutputParser extends AgentActionOutputParser {
  lc_namespace: string[];
  static lc_name(): string;
  parse(text: string): Promise<AgentAction | AgentFinish>;
  parseResult(generations: ChatGeneration[]): Promise<AgentFinish | FunctionsAgentAction>;
  /**
   * Parses the output message into a FunctionsAgentAction or AgentFinish
   * object.
   * @param message The BaseMessage to parse.
   * @returns A FunctionsAgentAction or AgentFinish object.
   */
  parseAIMessage(message: BaseMessage): FunctionsAgentAction | AgentFinish;
  getFormatInstructions(): string;
}
//#endregion
export { FunctionsAgentAction, OpenAIFunctionsAgentOutputParser };
//# sourceMappingURL=output_parser.d.ts.map