import { BaseMessage, BaseMessageChunk, BaseMessageFields } from "./base.cjs";
import { $InferMessageContent, MessageStructure } from "./message.cjs";

//#region src/messages/human.d.ts
interface HumanMessageFields<TStructure extends MessageStructure = MessageStructure> extends BaseMessageFields<TStructure, "human"> {}
/**
 * Represents a human message in a conversation.
 */
declare class HumanMessage<TStructure extends MessageStructure = MessageStructure> extends BaseMessage<TStructure, "human"> {
  static lc_name(): string;
  readonly type: "human";
  constructor(fields: $InferMessageContent<TStructure, "human"> | HumanMessageFields<TStructure>);
  static isInstance(obj: unknown): obj is HumanMessage;
}
/**
 * Represents a chunk of a human message, which can be concatenated with
 * other human message chunks.
 */
declare class HumanMessageChunk<TStructure extends MessageStructure = MessageStructure> extends BaseMessageChunk<TStructure, "human"> {
  static lc_name(): string;
  readonly type: "human";
  constructor(fields: $InferMessageContent<TStructure, "human"> | HumanMessageFields<TStructure>);
  concat(chunk: HumanMessageChunk<TStructure>): this;
  static isInstance(obj: unknown): obj is HumanMessageChunk;
}
/**
 * @deprecated Use {@link HumanMessage.isInstance} instead
 */
declare function isHumanMessage<TStructure extends MessageStructure>(x: BaseMessage): x is HumanMessage<TStructure>;
/**
 * @deprecated Use {@link HumanMessageChunk.isInstance} instead
 */
declare function isHumanMessageChunk<TStructure extends MessageStructure>(x: BaseMessageChunk): x is HumanMessageChunk<TStructure>;
//#endregion
export { HumanMessage, HumanMessageChunk, HumanMessageFields, isHumanMessage, isHumanMessageChunk };
//# sourceMappingURL=human.d.cts.map