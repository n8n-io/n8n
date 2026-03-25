import { ObjectTool } from "./schema.cjs";
import * as _langchain_core_messages0 from "@langchain/core/messages";
import { BaseMessage } from "@langchain/core/messages";
import { PartialValues } from "@langchain/core/utils/types";
import { BaseChatPromptTemplate, SerializedBasePromptTemplate } from "@langchain/core/prompts";
import { VectorStoreRetrieverInterface } from "@langchain/core/vectorstores";

//#region src/experimental/autogpt/prompt.d.ts
/**
 * Interface for the input parameters of the AutoGPTPrompt class.
 */
interface AutoGPTPromptInput {
  aiName: string;
  aiRole: string;
  tools: ObjectTool[];
  tokenCounter: (text: string) => Promise<number>;
  sendTokenLimit?: number;
}
/**
 * Class used to generate prompts for the AutoGPT model. It takes into
 * account the AI's name, role, tools, token counter, and send token
 * limit. The class also handles the formatting of messages and the
 * construction of the full prompt.
 */
declare class AutoGPTPrompt extends BaseChatPromptTemplate implements AutoGPTPromptInput {
  aiName: string;
  aiRole: string;
  tools: ObjectTool[];
  tokenCounter: (text: string) => Promise<number>;
  sendTokenLimit: number;
  constructor(fields: AutoGPTPromptInput);
  _getPromptType(): "autogpt";
  /**
   * Constructs the full prompt based on the provided goals.
   * @param goals An array of goals.
   * @returns The full prompt as a string.
   */
  constructFullPrompt(goals: string[]): string;
  /**
   * Formats the messages based on the provided parameters.
   * @param goals An array of goals.
   * @param memory A VectorStoreRetriever instance.
   * @param messages An array of previous messages.
   * @param user_input The user's input.
   * @returns An array of formatted messages.
   */
  formatMessages({
    goals,
    memory,
    messages: previousMessages,
    user_input
  }: {
    goals: string[];
    memory: VectorStoreRetrieverInterface;
    messages: BaseMessage[];
    user_input: string;
  }): Promise<BaseMessage<_langchain_core_messages0.MessageStructure, _langchain_core_messages0.MessageType>[]>;
  /**
   * This method is not implemented in the AutoGPTPrompt class and will
   * throw an error if called.
   * @param _values Partial values.
   * @returns Throws an error.
   */
  partial(_values: PartialValues): Promise<BaseChatPromptTemplate>;
  serialize(): SerializedBasePromptTemplate;
}
//#endregion
export { AutoGPTPrompt, AutoGPTPromptInput };
//# sourceMappingURL=prompt.d.cts.map