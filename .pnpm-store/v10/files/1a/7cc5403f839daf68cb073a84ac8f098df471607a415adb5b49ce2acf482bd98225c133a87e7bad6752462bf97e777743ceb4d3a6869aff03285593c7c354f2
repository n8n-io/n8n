import { BaseMessage, BaseMessageChunk, BaseMessageFields } from "./base.cjs";
import { $InferMessageContent, MessageStructure } from "./message.cjs";

//#region src/messages/system.d.ts
interface SystemMessageFields<TStructure extends MessageStructure = MessageStructure> extends BaseMessageFields<TStructure, "system"> {}
/**
 * Represents a system message in a conversation.
 */
declare class SystemMessage<TStructure extends MessageStructure = MessageStructure> extends BaseMessage<TStructure, "system"> {
  static lc_name(): string;
  readonly type: "system";
  constructor(fields: $InferMessageContent<TStructure, "system"> | SystemMessageFields<TStructure>);
  /**
   * Concatenates a string or another system message with the current system message.
   * @param chunk - The chunk to concatenate with the system message.
   * @returns A new system message with the concatenated content.
   */
  concat(chunk: string | SystemMessage): SystemMessage<TStructure>;
  static isInstance(obj: unknown): obj is SystemMessage;
}
/**
 * Represents a chunk of a system message, which can be concatenated with
 * other system message chunks.
 */
declare class SystemMessageChunk<TStructure extends MessageStructure = MessageStructure> extends BaseMessageChunk<TStructure, "system"> {
  static lc_name(): string;
  readonly type: "system";
  constructor(fields: $InferMessageContent<TStructure, "system"> | SystemMessageFields<TStructure>);
  concat(chunk: SystemMessageChunk<TStructure>): this;
  static isInstance(obj: unknown): obj is SystemMessageChunk;
}
/**
 * @deprecated Use {@link SystemMessage.isInstance} instead
 */
declare function isSystemMessage<TStructure extends MessageStructure>(x: BaseMessage): x is SystemMessage<TStructure>;
/**
 * @deprecated Use {@link SystemMessageChunk.isInstance} instead
 */
declare function isSystemMessageChunk<TStructure extends MessageStructure>(x: BaseMessageChunk): x is SystemMessageChunk<TStructure>;
//#endregion
export { SystemMessage, SystemMessageChunk, SystemMessageFields, isSystemMessage, isSystemMessageChunk };
//# sourceMappingURL=system.d.cts.map