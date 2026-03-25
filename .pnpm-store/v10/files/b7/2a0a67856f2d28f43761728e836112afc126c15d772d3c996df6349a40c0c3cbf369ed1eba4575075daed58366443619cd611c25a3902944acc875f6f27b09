import { StateGraph } from "./state.js";
import { RunnableConfig } from "@langchain/core/runnables";
import * as _langchain_core_messages0 from "@langchain/core/messages";
import { BaseMessage, BaseMessageLike } from "@langchain/core/messages";

//#region src/graph/message.d.ts
declare const REMOVE_ALL_MESSAGES = "__remove_all__";
type Messages = Array<BaseMessage | BaseMessageLike> | BaseMessage | BaseMessageLike;
/**
 * Prebuilt reducer that combines returned messages.
 * Can handle standard messages and special modifiers like {@link RemoveMessage}
 * instances.
 */
declare function messagesStateReducer(left: Messages, right: Messages): BaseMessage[];
/** @ignore */
declare class MessageGraph extends StateGraph<BaseMessage[], BaseMessage[], Messages> {
  constructor();
}
/**
 * Manually push a message to a message stream.
 *
 * This is useful when you need to push a manually created message before the node
 * has finished executing.
 *
 * When a message is pushed, it will be automatically persisted to the state after the node has finished executing.
 * To disable persisting, set `options.stateKey` to `null`.
 *
 * @param message The message to push. The message must have an ID set, otherwise an error will be thrown.
 * @param options RunnableConfig / Runtime coming from node context.
 */
declare function pushMessage(message: BaseMessage | BaseMessageLike, options?: RunnableConfig & {
  /**
   * The key of the state to push the message to. Set to `null` to avoid persisting.
   * @default "messages"
   */
  stateKey?: string | null;
}): BaseMessage<_langchain_core_messages0.MessageStructure, _langchain_core_messages0.MessageType>;
//#endregion
export { MessageGraph, Messages, REMOVE_ALL_MESSAGES, messagesStateReducer, pushMessage };
//# sourceMappingURL=message.d.ts.map