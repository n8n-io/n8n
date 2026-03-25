import { BaseChatMemory, BaseChatMemoryInput } from "./chat_memory.js";
import { BaseEntityStore } from "./stores/entity/base.js";
import { PromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { InputValues, MemoryVariables, OutputValues } from "@langchain/core/memory";

//#region src/memory/entity_memory.d.ts

/**
 * Interface for the input parameters required by the EntityMemory class.
 */
interface EntityMemoryInput extends BaseChatMemoryInput {
  llm: BaseLanguageModelInterface;
  humanPrefix?: string;
  aiPrefix?: string;
  entityExtractionPrompt?: PromptTemplate;
  entitySummarizationPrompt?: PromptTemplate;
  entityCache?: string[];
  k?: number;
  chatHistoryKey?: string;
  entitiesKey?: string;
  entityStore?: BaseEntityStore;
}
// Entity extractor & summarizer to memory.
/**
 * Class for managing entity extraction and summarization to memory in
 * chatbot applications. Extends the BaseChatMemory class and implements
 * the EntityMemoryInput interface.
 * @example
 * ```typescript
 * const memory = new EntityMemory({
 *   llm: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
 *   chatHistoryKey: "history",
 *   entitiesKey: "entities",
 * });
 * const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.9 });
 * const chain = new LLMChain({
 *   llm: model,
 *   prompt: ENTITY_MEMORY_CONVERSATION_TEMPLATE,
 *   memory,
 * });
 *
 * const res1 = await chain.call({ input: "Hi! I'm Jim." });
 * console.log({
 *   res1,
 *   memory: await memory.loadMemoryVariables({ input: "Who is Jim?" }),
 * });
 *
 * const res2 = await chain.call({
 *   input: "I work in construction. What about you?",
 * });
 * console.log({
 *   res2,
 *   memory: await memory.loadMemoryVariables({ input: "Who is Jim?" }),
 * });
 *
 * ```
 */
declare class EntityMemory extends BaseChatMemory implements EntityMemoryInput {
  private entityExtractionChain;
  private entitySummarizationChain;
  entityStore: BaseEntityStore;
  entityCache: string[];
  k: number;
  chatHistoryKey: string;
  llm: BaseLanguageModelInterface;
  entitiesKey: string;
  humanPrefix?: string;
  aiPrefix?: string;
  constructor(fields: EntityMemoryInput);
  get memoryKeys(): string[];
  // Will always return list of memory variables.
  get memoryVariables(): string[];
  // Return history buffer.
  /**
   * Method to load memory variables and perform entity extraction.
   * @param inputs Input values for the method.
   * @returns Promise resolving to an object containing memory variables.
   */
  loadMemoryVariables(inputs: InputValues): Promise<MemoryVariables>;
  // Save context from this conversation to buffer.
  /**
   * Method to save the context from a conversation to a buffer and perform
   * entity summarization.
   * @param inputs Input values for the method.
   * @param outputs Output values from the method.
   * @returns Promise resolving to void.
   */
  saveContext(inputs: InputValues, outputs: OutputValues): Promise<void>;
  // Clear memory contents.
  /**
   * Method to clear the memory contents.
   * @returns Promise resolving to void.
   */
  clear(): Promise<void>;
}
//#endregion
export { EntityMemory };
//# sourceMappingURL=entity_memory.d.ts.map