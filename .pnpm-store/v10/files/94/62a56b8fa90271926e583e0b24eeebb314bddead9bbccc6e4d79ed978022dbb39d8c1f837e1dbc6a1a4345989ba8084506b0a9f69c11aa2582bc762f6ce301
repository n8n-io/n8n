import { BaseMessage } from "../../messages/base.cjs";
import { AIMessage, AIMessageChunk } from "../../messages/ai.cjs";
import { MessageStructure, MessageToolSet } from "../../messages/message.cjs";
import { ChatGenerationChunk, ChatResult } from "../../outputs.cjs";
import { InteropZodType } from "../types/zod.cjs";
import { CallbackManagerForLLMRun } from "../../callbacks/manager.cjs";
import { Runnable } from "../../runnables/base.cjs";
import { BaseLanguageModelInput, StructuredOutputMethodOptions, StructuredOutputMethodParams } from "../../language_models/base.cjs";
import { StructuredTool } from "../../tools/index.cjs";
import { BaseChatModel, BaseChatModelCallOptions, BaseChatModelParams } from "../../language_models/chat_models.cjs";
import { BaseLLMParams } from "../../language_models/llms.cjs";

//#region src/utils/testing/chat_models.d.ts
/** Minimal shape actually needed by `bindTools` */
interface ToolSpec {
  name: string;
  description?: string;
  schema: InteropZodType | Record<string, unknown>;
}
/**
 * Interface specific to the Fake Streaming Chat model.
 */
interface FakeStreamingChatModelCallOptions extends BaseChatModelCallOptions {}
/**
 * Interface for the Constructor-field specific to the Fake Streaming Chat model (all optional because we fill in defaults).
 */
interface FakeStreamingChatModelFields extends BaseChatModelParams {
  /** Milliseconds to pause between fallback char-by-char chunks */
  sleep?: number;
  /** Full AI messages to fall back to when no `chunks` supplied */
  responses?: BaseMessage[];
  /** Exact chunks to emit (can include tool-call deltas) */
  chunks?: AIMessageChunk[];
  /** How tool specs are formatted in `bindTools` */
  toolStyle?: "openai" | "anthropic" | "bedrock" | "google";
  /** Throw this error instead of streaming (useful in tests) */
  thrownErrorString?: string;
}
declare class FakeChatModel extends BaseChatModel {
  _combineLLMOutput(): never[];
  _llmType(): string;
  _generate(messages: BaseMessage[], options?: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
}
declare class FakeStreamingChatModel extends BaseChatModel<FakeStreamingChatModelCallOptions> {
  sleep: number;
  responses: BaseMessage[];
  chunks: AIMessageChunk[];
  toolStyle: "openai" | "anthropic" | "bedrock" | "google";
  thrownErrorString?: string;
  private tools;
  constructor({
    sleep,
    responses,
    chunks,
    toolStyle,
    thrownErrorString,
    ...rest
  }: FakeStreamingChatModelFields & BaseLLMParams);
  _llmType(): string;
  bindTools(tools: (StructuredTool | ToolSpec)[]): Runnable<BaseLanguageModelInput, AIMessageChunk<MessageStructure<MessageToolSet>>, FakeStreamingChatModelCallOptions>;
  _generate(messages: BaseMessage[], _options: this["ParsedCallOptions"], _runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  _streamResponseChunks(_messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
}
/**
 * Interface for the input parameters specific to the Fake List Chat model.
 */
interface FakeChatInput extends BaseChatModelParams {
  /** Responses to return */
  responses: string[];
  /** Time to sleep in milliseconds between responses */
  sleep?: number;
  emitCustomEvent?: boolean;
  /**
   * Generation info to include on the last chunk during streaming.
   * This gets merged into response_metadata by the base chat model.
   * Useful for testing response_metadata propagation (e.g., finish_reason).
   */
  generationInfo?: Record<string, unknown>;
}
interface FakeListChatModelCallOptions extends BaseChatModelCallOptions {
  thrownErrorString?: string;
}
/**
 * A fake Chat Model that returns a predefined list of responses. It can be used
 * for testing purposes.
 * @example
 * ```typescript
 * const chat = new FakeListChatModel({
 *   responses: ["I'll callback later.", "You 'console' them!"]
 * });
 *
 * const firstMessage = new HumanMessage("You want to hear a JavaScript joke?");
 * const secondMessage = new HumanMessage("How do you cheer up a JavaScript developer?");
 *
 * // Call the chat model with a message and log the response
 * const firstResponse = await chat.call([firstMessage]);
 * console.log({ firstResponse });
 *
 * const secondResponse = await chat.call([secondMessage]);
 * console.log({ secondResponse });
 * ```
 */
declare class FakeListChatModel extends BaseChatModel<FakeListChatModelCallOptions> {
  static lc_name(): string;
  lc_serializable: boolean;
  responses: string[];
  i: number;
  sleep?: number;
  emitCustomEvent: boolean;
  generationInfo?: Record<string, unknown>;
  private tools;
  toolStyle: "openai" | "anthropic" | "bedrock" | "google";
  constructor(params: FakeChatInput);
  _combineLLMOutput(): never[];
  _llmType(): string;
  _generate(_messages: BaseMessage[], options?: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  _formatGeneration(text: string): {
    message: AIMessage<MessageStructure<MessageToolSet>>;
    text: string;
  };
  _streamResponseChunks(_messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  _sleepIfRequested(): Promise<void>;
  _sleep(): Promise<void>;
  _createResponseChunk(text: string, generationInfo?: Record<string, any>): ChatGenerationChunk;
  _currentResponse(): string;
  _incrementResponse(): void;
  bindTools(tools: (StructuredTool | ToolSpec)[]): Runnable<BaseLanguageModelInput, AIMessageChunk<MessageStructure<MessageToolSet>>, FakeListChatModelCallOptions>;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(_params: StructuredOutputMethodParams<RunOutput, false> | InteropZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(_params: StructuredOutputMethodParams<RunOutput, true> | InteropZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
}
//#endregion
export { FakeChatInput, FakeChatModel, FakeListChatModel, FakeListChatModelCallOptions, FakeStreamingChatModel, FakeStreamingChatModelCallOptions, FakeStreamingChatModelFields, ToolSpec };
//# sourceMappingURL=chat_models.d.cts.map