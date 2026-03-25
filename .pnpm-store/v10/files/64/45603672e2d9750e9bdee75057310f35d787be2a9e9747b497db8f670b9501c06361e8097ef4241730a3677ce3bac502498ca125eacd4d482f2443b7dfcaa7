import { ContentBlock } from "./content/index.cjs";
import { BaseMessage, BaseMessageChunk, BaseMessageFields } from "./base.cjs";
import { InvalidToolCall, ToolCallChunk } from "./tool.cjs";
import { $InferMessageContent, $InferMessageProperty, $InferToolCalls, MessageStructure } from "./message.cjs";

//#region src/messages/ai.d.ts
interface AIMessageFields<TStructure extends MessageStructure = MessageStructure> extends BaseMessageFields<TStructure, "ai"> {
  tool_calls?: $InferToolCalls<TStructure>[];
  invalid_tool_calls?: InvalidToolCall[];
  usage_metadata?: $InferMessageProperty<TStructure, "ai", "usage_metadata">;
}
declare class AIMessage<TStructure extends MessageStructure = MessageStructure> extends BaseMessage<TStructure, "ai"> implements AIMessageFields<TStructure> {
  readonly type: "ai";
  tool_calls?: $InferToolCalls<TStructure>[];
  invalid_tool_calls?: InvalidToolCall[];
  usage_metadata?: AIMessageFields<TStructure>["usage_metadata"];
  get lc_aliases(): Record<string, string>;
  constructor(fields: $InferMessageContent<TStructure, "ai"> | AIMessageFields<TStructure>);
  static lc_name(): string;
  get contentBlocks(): Array<ContentBlock.Standard>;
  get _printableFields(): Record<string, unknown>;
  /**
   * Type guard to check if an object is an AIMessage.
   * Preserves the MessageStructure type parameter when called with a typed BaseMessage.
   * @overload When called with a typed BaseMessage, preserves the TStructure type
   */
  static isInstance<T extends MessageStructure>(obj: BaseMessage<T>): obj is BaseMessage<T> & AIMessage<T>;
  /**
   * Type guard to check if an object is an AIMessage.
   * @overload When called with unknown, returns base AIMessage type
   */
  static isInstance(obj: unknown): obj is AIMessage;
}
/**
 * @deprecated Use {@link AIMessage.isInstance} instead
 */
declare function isAIMessage<TStructure extends MessageStructure>(x: BaseMessage): x is AIMessage<TStructure>;
/**
 * @deprecated Use {@link AIMessageChunk.isInstance} instead
 */
declare function isAIMessageChunk<TStructure extends MessageStructure>(x: BaseMessageChunk): x is AIMessageChunk<TStructure>;
type AIMessageChunkFields<TStructure extends MessageStructure = MessageStructure> = AIMessageFields<TStructure> & {
  tool_call_chunks?: ToolCallChunk[];
};
/**
 * Represents a chunk of an AI message, which can be concatenated with
 * other AI message chunks.
 */
declare class AIMessageChunk<TStructure extends MessageStructure = MessageStructure> extends BaseMessageChunk<TStructure, "ai"> implements AIMessage<TStructure>, AIMessageChunkFields<TStructure> {
  readonly type: "ai";
  tool_calls?: $InferToolCalls<TStructure>[];
  invalid_tool_calls?: InvalidToolCall[];
  tool_call_chunks?: ToolCallChunk[];
  usage_metadata?: AIMessageChunkFields<TStructure>["usage_metadata"];
  constructor(fields: $InferMessageContent<TStructure, "ai"> | AIMessageChunkFields<TStructure>);
  get lc_aliases(): Record<string, string>;
  static lc_name(): string;
  get contentBlocks(): Array<ContentBlock.Standard>;
  get _printableFields(): Record<string, unknown>;
  concat(chunk: AIMessageChunk<TStructure>): this;
  /**
   * Type guard to check if an object is an AIMessageChunk.
   * Preserves the MessageStructure type parameter when called with a typed BaseMessage.
   * @overload When called with a typed BaseMessage, preserves the TStructure type
   */
  static isInstance<T extends MessageStructure>(obj: BaseMessage<T>): obj is BaseMessage<T> & AIMessageChunk<T>;
  /**
   * Type guard to check if an object is an AIMessageChunk.
   * @overload When called with unknown, returns base AIMessageChunk type
   */
  static isInstance(obj: unknown): obj is AIMessageChunk;
}
//#endregion
export { AIMessage, AIMessageChunk, AIMessageChunkFields, AIMessageFields, isAIMessage, isAIMessageChunk };
//# sourceMappingURL=ai.d.cts.map