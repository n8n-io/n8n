import { BaseMessage, BaseMessageLike } from "@langchain/core/messages";

//#region src/graph/messages_reducer.d.ts
/**
 * Special value that signifies the intent to remove all previous messages in the state reducer.
 * Used as the unique identifier for a `RemoveMessage` instance which, when encountered,
 * causes all prior messages to be discarded, leaving only those following this marker.
 */
declare const REMOVE_ALL_MESSAGES = "__remove_all__";
/**
 * Type that represents an acceptable input for the messages state reducer.
 *
 * - Can be a single `BaseMessage` or `BaseMessageLike`.
 * - Can be an array of `BaseMessage` or `BaseMessageLike`.
 */
type Messages = Array<BaseMessage | BaseMessageLike> | BaseMessage | BaseMessageLike;
/**
 * Reducer function for combining two sets of messages in LangGraph's state system.
 *
 * This reducer handles several tasks:
 * 1. Normalizes both `left` and `right` message inputs to arrays.
 * 2. Coerces any message-like objects into real `BaseMessage` instances.
 * 3. Ensures all messages have unique, stable IDs by generating missing ones.
 * 4. If a `RemoveMessage` instance is encountered in `right` with the ID `REMOVE_ALL_MESSAGES`,
 *    all previous messages are discarded and only the subsequent messages in `right` are returned.
 * 5. Otherwise, merges `left` and `right` messages together following these rules:
 *    - If a message in `right` shares an ID with a message in `left`:
 *      - If it is a `RemoveMessage`, that message (by ID) is marked for removal.
 *      - If it is a normal message, it replaces the message with the same ID from `left`.
 *    - If a message in `right` **does not exist** in `left`:
 *      - If it is a `RemoveMessage`, this is considered an error (cannot remove non-existent ID).
 *      - Otherwise, the message is appended.
 *    - Messages flagged for removal are omitted from the final output.
 *
 * @param left - The existing array (or single message) of messages from current state.
 * @param right - The new array (or single message) of messages to be applied.
 * @returns A new array of `BaseMessage` objects representing the updated state.
 *
 * @throws Error if a `RemoveMessage` is used to delete a message with an ID that does not exist in the merged list.
 *
 * @example
 * ```ts
 * const msg1 = new AIMessage("hello");
 * const msg2 = new HumanMessage("hi");
 * const removal = new RemoveMessage({ id: msg1.id });
 * const newState = messagesStateReducer([msg1], [msg2, removal]);
 * // newState will only contain msg2 (msg1 is removed)
 * ```
 */
declare function messagesStateReducer(left: Messages, right: Messages): BaseMessage[];
//#endregion
export { Messages, REMOVE_ALL_MESSAGES, messagesStateReducer };
//# sourceMappingURL=messages_reducer.d.cts.map