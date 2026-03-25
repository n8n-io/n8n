import { BaseChain } from "../../chains/base.js";
import { LLMChain } from "../../chains/llm_chain.js";
import { TimeWeightedVectorStoreRetriever } from "../../retrievers/time_weighted.js";
import { Document } from "@langchain/core/documents";
import { PromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { CallbackManagerForChainRun, Callbacks } from "@langchain/core/callbacks/manager";
import { BaseMemory, InputValues, OutputValues } from "@langchain/core/memory";
import { ChainValues } from "@langchain/core/utils/types";

//#region src/experimental/generative_agents/generative_agent_memory.d.ts
type GenerativeAgentMemoryConfig = {
  reflectionThreshold?: number;
  importanceWeight?: number;
  verbose?: boolean;
  maxTokensLimit?: number;
};
/**
 * Class that manages the memory of a generative agent in LangChain. It
 * extends the `BaseChain` class and has methods for adding observations
 * or memories to the agent's memory, scoring the importance of a memory,
 * reflecting on recent events to add synthesized memories, and generating
 * insights on a topic of reflection based on pertinent memories.
 */
declare class GenerativeAgentMemoryChain extends BaseChain {
  static lc_name(): string;
  reflecting: boolean;
  reflectionThreshold?: number;
  importanceWeight: number;
  memoryRetriever: TimeWeightedVectorStoreRetriever;
  llm: BaseLanguageModelInterface;
  verbose: boolean;
  private aggregateImportance;
  constructor(llm: BaseLanguageModelInterface, memoryRetriever: TimeWeightedVectorStoreRetriever, config: Omit<GenerativeAgentMemoryConfig, "maxTokensLimit">);
  _chainType(): string;
  get inputKeys(): string[];
  get outputKeys(): string[];
  /**
   * Method that creates a new LLMChain with the given prompt.
   * @param prompt The PromptTemplate to use for the new LLMChain.
   * @returns A new LLMChain instance.
   */
  chain(prompt: PromptTemplate): LLMChain;
  _call(values: ChainValues, runManager?: CallbackManagerForChainRun): Promise<{
    output: number;
  }>;
  /**
   * Method that pauses the agent to reflect on recent events and generate
   * new insights.
   * @param now The current date.
   * @param runManager The CallbackManagerForChainRun to use for the reflection.
   * @returns An array of new insights as strings.
   */
  pauseToReflect(now?: Date, runManager?: CallbackManagerForChainRun): Promise<string[]>;
  /**
   * Method that scores the importance of a given memory.
   * @param memoryContent The content of the memory to score.
   * @param runManager The CallbackManagerForChainRun to use for scoring.
   * @returns The importance score of the memory as a number.
   */
  scoreMemoryImportance(memoryContent: string, runManager?: CallbackManagerForChainRun): Promise<number>;
  /**
   * Method that retrieves the topics of reflection based on the last K
   * memories.
   * @param lastK The number of most recent memories to consider for generating topics.
   * @param runManager The CallbackManagerForChainRun to use for retrieving topics.
   * @returns An array of topics of reflection as strings.
   */
  getTopicsOfReflection(lastK: number, runManager?: CallbackManagerForChainRun): Promise<string[]>;
  /**
   * Method that generates insights on a given topic of reflection based on
   * pertinent memories.
   * @param topic The topic of reflection.
   * @param now The current date.
   * @param runManager The CallbackManagerForChainRun to use for generating insights.
   * @returns An array of insights as strings.
   */
  getInsightsOnTopic(topic: string, now?: Date, runManager?: CallbackManagerForChainRun): Promise<string[]>;
  /**
   * Method that parses a newline-separated string into a list of strings.
   * @param text The newline-separated string to parse.
   * @returns An array of strings.
   */
  static parseList(text: string): string[];
  /**
   * Method that fetches memories related to a given observation.
   * @param observation The observation to fetch memories for.
   * @param _now The current date.
   * @param runManager The CallbackManagerForChainRun to use for fetching memories.
   * @returns An array of Document instances representing the fetched memories.
   */
  fetchMemories(observation: string, _now?: Date, runManager?: CallbackManagerForChainRun): Promise<Document[]>;
}
/**
 * Class that manages the memory of a generative agent in LangChain. It
 * extends the `BaseMemory` class and has methods for adding a memory,
 * formatting memories, getting memories until a token limit is reached,
 * loading memory variables, saving the context of a model run to memory,
 * and clearing memory contents.
 * @example
 * ```typescript
 * const createNewMemoryRetriever = async () => {
 *   const vectorStore = new MemoryVectorStore(new OpenAIEmbeddings());
 *   const retriever = new TimeWeightedVectorStoreRetriever({
 *     vectorStore,
 *     otherScoreKeys: ["importance"],
 *     k: 15,
 *   });
 *   return retriever;
 * };
 * const tommiesMemory = new GenerativeAgentMemory(
 *   llm,
 *   await createNewMemoryRetriever(),
 *   { reflectionThreshold: 8 },
 * );
 * const summary = await tommiesMemory.getSummary();
 * ```
 */
declare class GenerativeAgentMemory extends BaseMemory {
  llm: BaseLanguageModelInterface;
  memoryRetriever: TimeWeightedVectorStoreRetriever;
  verbose: boolean;
  reflectionThreshold?: number;
  private maxTokensLimit;
  queriesKey: string;
  mostRecentMemoriesTokenKey: string;
  addMemoryKey: string;
  relevantMemoriesKey: string;
  relevantMemoriesSimpleKey: string;
  mostRecentMemoriesKey: string;
  nowKey: string;
  memoryChain: GenerativeAgentMemoryChain;
  constructor(llm: BaseLanguageModelInterface, memoryRetriever: TimeWeightedVectorStoreRetriever, config?: GenerativeAgentMemoryConfig);
  /**
   * Method that returns the key for relevant memories.
   * @returns The key for relevant memories as a string.
   */
  getRelevantMemoriesKey(): string;
  /**
   * Method that returns the key for the most recent memories token.
   * @returns The key for the most recent memories token as a string.
   */
  getMostRecentMemoriesTokenKey(): string;
  /**
   * Method that returns the key for adding a memory.
   * @returns The key for adding a memory as a string.
   */
  getAddMemoryKey(): string;
  /**
   * Method that returns the key for the current time.
   * @returns The key for the current time as a string.
   */
  getCurrentTimeKey(): string;
  get memoryKeys(): string[];
  /**
   * Method that adds a memory to the agent's memory.
   * @param memoryContent The content of the memory to add.
   * @param now The current date.
   * @param metadata The metadata for the memory.
   * @param callbacks The Callbacks to use for adding the memory.
   * @returns The result of the memory addition.
   */
  addMemory(memoryContent: string, now?: Date, metadata?: Record<string, unknown>, callbacks?: Callbacks): Promise<ChainValues>;
  /**
   * Method that formats the given relevant memories in detail.
   * @param relevantMemories The relevant memories to format.
   * @returns The formatted memories as a string.
   */
  formatMemoriesDetail(relevantMemories: Document[]): string;
  /**
   * Method that formats the given relevant memories in a simple manner.
   * @param relevantMemories The relevant memories to format.
   * @returns The formatted memories as a string.
   */
  formatMemoriesSimple(relevantMemories: Document[]): string;
  /**
   * Method that retrieves memories until a token limit is reached.
   * @param consumedTokens The number of tokens consumed so far.
   * @returns The memories as a string.
   */
  getMemoriesUntilLimit(consumedTokens: number): Promise<string>;
  get memoryVariables(): string[];
  /**
   * Method that loads memory variables based on the given inputs.
   * @param inputs The inputs to use for loading memory variables.
   * @returns An object containing the loaded memory variables.
   */
  loadMemoryVariables(inputs: InputValues): Promise<Record<string, string>>;
  /**
   * Method that saves the context of a model run to memory.
   * @param _inputs The inputs of the model run.
   * @param outputs The outputs of the model run.
   * @returns Nothing.
   */
  saveContext(_inputs: InputValues, outputs: OutputValues): Promise<void>;
  /**
   * Method that clears the memory contents.
   * @returns Nothing.
   */
  clear(): void;
}
//#endregion
export { GenerativeAgentMemory };
//# sourceMappingURL=generative_agent_memory.d.ts.map