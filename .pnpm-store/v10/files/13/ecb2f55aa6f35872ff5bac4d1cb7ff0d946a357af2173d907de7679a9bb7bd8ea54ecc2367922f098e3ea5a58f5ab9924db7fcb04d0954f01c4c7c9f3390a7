import { BaseMessage, BaseMessageChunk, BaseMessageFields } from "./base.cjs";
import { MessageStructure } from "./message.cjs";

//#region src/messages/function.d.ts
interface FunctionMessageFields<TStructure extends MessageStructure = MessageStructure> extends BaseMessageFields<TStructure, "function"> {
  name: string;
}
/**
 * Represents a function message in a conversation.
 */
declare class FunctionMessage<TStructure extends MessageStructure = MessageStructure> extends BaseMessage<TStructure, "function"> implements FunctionMessageFields<TStructure> {
  static lc_name(): string;
  readonly type: "function";
  name: string;
  constructor(fields: FunctionMessageFields<TStructure>);
}
/**
 * Represents a chunk of a function message, which can be concatenated
 * with other function message chunks.
 */
declare class FunctionMessageChunk<TStructure extends MessageStructure = MessageStructure> extends BaseMessageChunk<TStructure, "function"> {
  static lc_name(): string;
  readonly type: "function";
  concat(chunk: FunctionMessageChunk<TStructure>): this;
}
declare function isFunctionMessage(x: BaseMessage): x is FunctionMessage;
declare function isFunctionMessageChunk(x: BaseMessageChunk): x is FunctionMessageChunk;
//#endregion
export { FunctionMessage, FunctionMessageChunk, FunctionMessageFields, isFunctionMessage, isFunctionMessageChunk };
//# sourceMappingURL=function.d.cts.map