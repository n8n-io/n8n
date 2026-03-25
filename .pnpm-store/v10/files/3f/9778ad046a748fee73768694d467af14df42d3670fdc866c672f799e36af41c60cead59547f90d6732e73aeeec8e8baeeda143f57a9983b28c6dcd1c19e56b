import { BaseMessage, BaseMessageFields } from "./base.js";
import { MessageStructure } from "./message.js";

//#region src/messages/modifier.d.ts
interface RemoveMessageFields<TStructure extends MessageStructure = MessageStructure> extends Omit<BaseMessageFields<TStructure, "remove">, "content"> {
  /**
   * The ID of the message to remove.
   */
  id: string;
}
/**
 * Message responsible for deleting other messages.
 */
declare class RemoveMessage<TStructure extends MessageStructure = MessageStructure> extends BaseMessage<TStructure, "remove"> {
  readonly type: "remove";
  /**
   * The ID of the message to remove.
   */
  id: string;
  constructor(fields: RemoveMessageFields<TStructure>);
  get _printableFields(): Record<string, unknown>;
  static isInstance(obj: unknown): obj is RemoveMessage;
}
//#endregion
export { RemoveMessage, RemoveMessageFields };
//# sourceMappingURL=modifier.d.ts.map