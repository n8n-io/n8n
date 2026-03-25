import { BaseChatMemory, BaseChatMemoryInput } from "../../../memory/chat_memory.cjs";
import * as _langchain_core_messages1 from "@langchain/core/messages";
import { InputValues, MemoryVariables, OutputValues } from "@langchain/core/memory";
import { ChatOpenAI } from "@langchain/openai";

//#region src/agents/toolkits/conversational_retrieval/token_buffer_memory.d.ts

/**
 * Type definition for the fields required to initialize an instance of
 * OpenAIAgentTokenBufferMemory.
 */
type OpenAIAgentTokenBufferMemoryFields = BaseChatMemoryInput & {
  llm: ChatOpenAI;
  humanPrefix?: string;
  aiPrefix?: string;
  memoryKey?: string;
  maxTokenLimit?: number;
  returnMessages?: boolean;
  outputKey?: string;
  intermediateStepsKey?: string;
};
/**
 * Memory used to save agent output and intermediate steps.
 */
declare class OpenAIAgentTokenBufferMemory extends BaseChatMemory {
  humanPrefix: string;
  aiPrefix: string;
  llm: ChatOpenAI;
  memoryKey: string;
  maxTokenLimit: number;
  returnMessages: boolean;
  outputKey: string;
  intermediateStepsKey: string;
  constructor(fields: OpenAIAgentTokenBufferMemoryFields);
  get memoryKeys(): string[];
  /**
   * Retrieves the messages from the chat history.
   * @returns Promise that resolves with the messages from the chat history.
   */
  getMessages(): Promise<_langchain_core_messages1.BaseMessage<_langchain_core_messages1.MessageStructure, _langchain_core_messages1.MessageType>[]>;
  /**
   * Loads memory variables from the input values.
   * @param _values Input values.
   * @returns Promise that resolves with the loaded memory variables.
   */
  loadMemoryVariables(_values: InputValues): Promise<MemoryVariables>;
  /**
   * Saves the context of the chat, including user input, AI output, and
   * intermediate steps. Prunes the chat history if the total token count
   * exceeds the maximum limit.
   * @param inputValues Input values.
   * @param outputValues Output values.
   * @returns Promise that resolves when the context has been saved.
   */
  saveContext(inputValues: InputValues, outputValues: OutputValues): Promise<void>;
}
//#endregion
export { OpenAIAgentTokenBufferMemory };
//# sourceMappingURL=token_buffer_memory.d.cts.map