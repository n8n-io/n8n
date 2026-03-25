import { BaseMessage, BaseMessageChunk, BaseMessageFields } from "./base.js";
import { $InferMessageContent, MessageStructure } from "./message.js";

//#region src/messages/chat.d.ts
interface ChatMessageFields<TStructure extends MessageStructure = MessageStructure> extends BaseMessageFields<TStructure, "generic"> {
  role: string;
}
/**
 * Represents a chat message in a conversation.
 */
declare class ChatMessage<TStructure extends MessageStructure = MessageStructure> extends BaseMessage<TStructure, "generic"> implements ChatMessageFields<TStructure> {
  static lc_name(): string;
  readonly type: "generic";
  role: string;
  static _chatMessageClass(): typeof ChatMessage;
  constructor(content: $InferMessageContent<TStructure, "generic">, role: string);
  constructor(fields: ChatMessageFields<TStructure>);
  static isInstance(obj: unknown): obj is ChatMessage;
  get _printableFields(): Record<string, unknown>;
}
/**
 * Represents a chunk of a chat message, which can be concatenated with
 * other chat message chunks.
 */
declare class ChatMessageChunk<TStructure extends MessageStructure = MessageStructure> extends BaseMessageChunk<TStructure, "generic"> {
  static lc_name(): string;
  readonly type: "generic";
  role: string;
  constructor(content: $InferMessageContent<TStructure, "generic">, role: string);
  constructor(fields: ChatMessageFields<TStructure>);
  concat(chunk: ChatMessageChunk<TStructure>): this;
  static isInstance(obj: unknown): obj is ChatMessageChunk;
  get _printableFields(): Record<string, unknown>;
}
/**
 * @deprecated Use {@link ChatMessage.isInstance} instead
 */
declare function isChatMessage(x: BaseMessage): x is ChatMessage;
/**
 * @deprecated Use {@link ChatMessageChunk.isInstance} instead
 */
declare function isChatMessageChunk(x: BaseMessageChunk): x is ChatMessageChunk;
//#endregion
export { ChatMessage, ChatMessageChunk, ChatMessageFields, isChatMessage, isChatMessageChunk };
//# sourceMappingURL=chat.d.ts.map