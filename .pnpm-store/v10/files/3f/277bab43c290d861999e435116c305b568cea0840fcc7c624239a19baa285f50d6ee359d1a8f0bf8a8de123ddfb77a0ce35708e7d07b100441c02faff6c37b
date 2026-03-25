import { AgentInput, SerializedZeroShotAgent } from "../types.js";
import { Agent, AgentArgs, OutputParserArgs } from "../agent.js";
import { Optional } from "../../types/type-utils.js";
import { ZeroShotAgentOutputParser } from "./outputParser.js";
import { PromptTemplate } from "@langchain/core/prompts";
import { ToolInterface } from "@langchain/core/tools";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";

//#region src/agents/mrkl/index.d.ts

/**
 * Interface for creating a prompt for the ZeroShotAgent.
 */
interface ZeroShotCreatePromptArgs {
  /** String to put after the list of tools. */
  suffix?: string;
  /** String to put before the list of tools. */
  prefix?: string;
  /** List of input variables the final prompt will expect. */
  inputVariables?: string[];
}
/**
 * Type for the input to the ZeroShotAgent, with the 'outputParser'
 * property made optional.
 */
type ZeroShotAgentInput = Optional<AgentInput, "outputParser">;
/**
 * Agent for the MRKL chain.
 * @augments Agent
 * @example
 * ```typescript
 *
 * const agent = new ZeroShotAgent({
 *   llmChain: new LLMChain({
 *     llm: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
 *     prompt: ZeroShotAgent.createPrompt([new SerpAPI(), new Calculator()], {
 *       prefix: `Answer the following questions as best you can, but speaking as a pirate might speak. You have access to the following tools:`,
 *       suffix: `Begin! Remember to speak as a pirate when giving your final answer. Use lots of "Args"
 * Question: {input}
 * {agent_scratchpad}`,
 *       inputVariables: ["input", "agent_scratchpad"],
 *     }),
 *   }),
 *   allowedTools: ["search", "calculator"],
 * });
 *
 * const result = await agent.invoke({
 *   input: `Who is Olivia Wilde's boyfriend? What is his current age raised to the 0.23 power?`,
 * });
 * ```
 */
declare class ZeroShotAgent extends Agent {
  static lc_name(): string;
  lc_namespace: string[];
  ToolType: ToolInterface;
  constructor(input: ZeroShotAgentInput);
  _agentType(): "zero-shot-react-description";
  observationPrefix(): string;
  llmPrefix(): string;
  /**
   * Returns the default output parser for the ZeroShotAgent.
   * @param fields Optional arguments for the output parser.
   * @returns An instance of ZeroShotAgentOutputParser.
   */
  static getDefaultOutputParser(fields?: OutputParserArgs): ZeroShotAgentOutputParser;
  /**
   * Validates the tools for the ZeroShotAgent. Throws an error if any tool
   * does not have a description.
   * @param tools List of tools to validate.
   */
  static validateTools(tools: ToolInterface[]): void;
  /**
   * Create prompt in the style of the zero shot agent.
   *
   * @param tools - List of tools the agent will have access to, used to format the prompt.
   * @param args - Arguments to create the prompt with.
   * @param args.suffix - String to put after the list of tools.
   * @param args.prefix - String to put before the list of tools.
   * @param args.inputVariables - List of input variables the final prompt will expect.
   */
  static createPrompt(tools: ToolInterface[], args?: ZeroShotCreatePromptArgs): PromptTemplate<any, any>;
  /**
   * Creates a ZeroShotAgent from a Large Language Model and a set of tools.
   * @param llm The Large Language Model to use.
   * @param tools The tools for the agent to use.
   * @param args Optional arguments for creating the agent.
   * @returns A new instance of ZeroShotAgent.
   */
  static fromLLMAndTools(llm: BaseLanguageModelInterface, tools: ToolInterface[], args?: ZeroShotCreatePromptArgs & AgentArgs): ZeroShotAgent;
  static deserialize(data: SerializedZeroShotAgent & {
    llm?: BaseLanguageModelInterface;
    tools?: ToolInterface[];
  }): Promise<ZeroShotAgent>;
}
//#endregion
export { ZeroShotAgent, ZeroShotAgentInput, ZeroShotCreatePromptArgs };
//# sourceMappingURL=index.d.ts.map