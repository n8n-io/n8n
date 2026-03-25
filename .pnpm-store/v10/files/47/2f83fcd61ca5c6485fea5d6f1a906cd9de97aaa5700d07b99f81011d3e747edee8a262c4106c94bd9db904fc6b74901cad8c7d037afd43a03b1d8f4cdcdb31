import { BaseChain } from "../../chains/base.cjs";
import { LLMChain } from "../../chains/llm_chain.cjs";
import { GenerativeAgentMemory } from "./generative_agent_memory.cjs";
import { ChainValues } from "@langchain/core/utils/types";
import { PromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { CallbackManagerForChainRun, Callbacks } from "@langchain/core/callbacks/manager";

//#region src/experimental/generative_agents/generative_agent.d.ts

/**
 * Configuration for the GenerativeAgent class. Defines the character's
 * name, optional age, permanent traits, status, verbosity, and summary
 * refresh seconds.
 */
type GenerativeAgentConfig = {
  name: string;
  age?: number;
  traits: string;
  status: string;
  verbose?: boolean;
  summaryRefreshSeconds?: number;
};
/**
 * Implementation of a generative agent that can learn and form new memories over
 * time. It extends the BaseChain class, which is a generic
 * sequence of calls to components, including other chains.
 * @example
 * ```typescript
 * const tommie: GenerativeAgent = new GenerativeAgent(
 *   new OpenAI({ temperature: 0.9, maxTokens: 1500 }),
 *   new GenerativeAgentMemory(
 *     new ChatOpenAI({ model: "gpt-4o-mini" }),
 *     new TimeWeightedVectorStoreRetriever({
 *       vectorStore: new MemoryVectorStore(new OpenAIEmbeddings()),
 *       otherScoreKeys: ["importance"],
 *       k: 15,
 *     }),
 *     { reflectionThreshold: 8 },
 *   ),
 *   {
 *     name: "Tommie",
 *     age: 25,
 *     traits: "anxious, likes design, talkative",
 *     status: "looking for a job",
 *   },
 * );
 *
 * await tommie.addMemory(
 *   "Tommie remembers his dog, Bruno, from when he was a kid",
 *   new Date(),
 * );
 * const summary = await tommie.getSummary({ forceRefresh: true });
 * const response = await tommie.generateDialogueResponse(
 *   "USER says Hello Tommie, how are you today?",
 * );
 * ```
 */
declare class GenerativeAgent extends BaseChain {
  static lc_name(): string;
  // a character with memory and innate characterisitics
  name: string; // the character's name
  age?: number; // the optional age of the character
  traits: string; // permanent traits to ascribe to the character
  status: string; // the traits of the character you wish not to change
  longTermMemory: GenerativeAgentMemory;
  llm: BaseLanguageModelInterface; // the underlying language model
  verbose: boolean; // false
  private summary; // stateful self-summary generated via reflection on the character's memory.
  private summaryRefreshSeconds;
  private lastRefreshed; // the last time the character's summary was regenerated
  // TODO: Add support for daily summaries
  // private dailySummaries: string[] = []; // summary of the events in the plan that the agent took.
  _chainType(): string;
  get inputKeys(): string[];
  get outputKeys(): string[];
  constructor(llm: BaseLanguageModelInterface, longTermMemory: GenerativeAgentMemory, config: GenerativeAgentConfig);
  // LLM methods
  /**
   * Parses a newline-separated string into a list of strings.
   * @param text The string to parse.
   * @returns An array of strings parsed from the input text.
   */
  parseList(text: string): string[];
  /**
   * Creates a new LLMChain with the given prompt and the agent's language
   * model, verbosity, output key, and memory.
   * @param prompt The prompt to use for the LLMChain.
   * @returns A new LLMChain instance.
   */
  chain(prompt: PromptTemplate): LLMChain;
  /**
   * Extracts the observed entity from the given observation.
   * @param observation The observation to extract the entity from.
   * @param runManager Optional CallbackManagerForChainRun instance.
   * @returns The extracted entity as a string.
   */
  getEntityFromObservations(observation: string, runManager?: CallbackManagerForChainRun): Promise<string>;
  /**
   * Extracts the action of the given entity from the given observation.
   * @param observation The observation to extract the action from.
   * @param entityName The name of the entity to extract the action for.
   * @param runManager Optional CallbackManagerForChainRun instance.
   * @returns The extracted action as a string.
   */
  getEntityAction(observation: string, entityName: string, runManager?: CallbackManagerForChainRun): Promise<string>;
  /**
   * Summarizes memories that are most relevant to an observation.
   * @param observation The observation to summarize related memories for.
   * @param runManager Optional CallbackManagerForChainRun instance.
   * @returns The summarized memories as a string.
   */
  summarizeRelatedMemories(observation: string, runManager?: CallbackManagerForChainRun): Promise<string>;
  _call(values: ChainValues, runManager?: CallbackManagerForChainRun): Promise<ChainValues>;
  private _cleanResponse;
  /**
   * Generates a reaction to the given observation.
   * @param observation The observation to generate a reaction for.
   * @param now Optional current date.
   * @returns A boolean indicating whether to continue the dialogue and the output string.
   */
  generateReaction(observation: string, now?: Date): Promise<[boolean, string]>;
  /**
   * Generates a dialogue response to the given observation.
   * @param observation The observation to generate a dialogue response for.
   * @param now Optional current date.
   * @returns A boolean indicating whether to continue the dialogue and the output string.
   */
  generateDialogueResponse(observation: string, now?: Date): Promise<[boolean, string]>;
  // Agent stateful' summary methods
  // Each dialog or response prompt includes a header
  // summarizing the agent's self-description. This is
  // updated periodically through probing it's memories
  /**
   * Gets the agent's summary, which includes the agent's name, age, traits,
   * and a summary of the agent's core characteristics. The summary is
   * updated periodically through probing the agent's memories.
   * @param config Optional configuration object with current date and a boolean to force refresh.
   * @param runManager Optional CallbackManagerForChainRun instance.
   * @returns The agent's summary as a string.
   */
  getSummary(config?: {
    now?: Date;
    forceRefresh?: boolean;
  }, runManager?: CallbackManagerForChainRun): Promise<string>;
  /**
   * Computes the agent's summary by summarizing the agent's core
   * characteristics given the agent's relevant memories.
   * @param runManager Optional CallbackManagerForChainRun instance.
   * @returns The computed summary as a string.
   */
  computeAgentSummary(runManager?: CallbackManagerForChainRun): Promise<string>;
  /**
   * Returns a full header of the agent's status, summary, and current time.
   * @param config Optional configuration object with current date and a boolean to force refresh.
   * @returns The full header as a string.
   */
  getFullHeader(config?: {
    now?: Date;
    forceRefresh?: boolean;
  }): string;
  /**
   * Adds a memory to the agent's long-term memory.
   * @param memoryContent The content of the memory to add.
   * @param now Optional current date.
   * @param metadata Optional metadata for the memory.
   * @param callbacks Optional Callbacks instance.
   * @returns The result of adding the memory to the agent's long-term memory.
   */
  addMemory(memoryContent: string, now?: Date, metadata?: Record<string, unknown>, callbacks?: Callbacks): Promise<ChainValues>;
}
//#endregion
export { GenerativeAgent };
//# sourceMappingURL=generative_agent.d.cts.map