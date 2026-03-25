let uuid = require("uuid");
let _langchain_core_messages = require("@langchain/core/messages");

//#region src/graph/messages_reducer.ts
/**
* Special value that signifies the intent to remove all previous messages in the state reducer.
* Used as the unique identifier for a `RemoveMessage` instance which, when encountered,
* causes all prior messages to be discarded, leaving only those following this marker.
*/
const REMOVE_ALL_MESSAGES = "__remove_all__";
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
function messagesStateReducer(left, right) {
	const leftArray = Array.isArray(left) ? left : [left];
	const rightArray = Array.isArray(right) ? right : [right];
	const leftMessages = leftArray.map(_langchain_core_messages.coerceMessageLikeToMessage);
	const rightMessages = rightArray.map(_langchain_core_messages.coerceMessageLikeToMessage);
	for (const m of leftMessages) if (m.id === null || m.id === void 0) {
		m.id = (0, uuid.v4)();
		m.lc_kwargs.id = m.id;
	}
	let removeAllIdx;
	for (let i = 0; i < rightMessages.length; i += 1) {
		const m = rightMessages[i];
		if (m.id === null || m.id === void 0) {
			m.id = (0, uuid.v4)();
			m.lc_kwargs.id = m.id;
		}
		if (_langchain_core_messages.RemoveMessage.isInstance(m) && m.id === REMOVE_ALL_MESSAGES) removeAllIdx = i;
	}
	if (removeAllIdx != null) return rightMessages.slice(removeAllIdx + 1);
	const merged = [...leftMessages];
	const mergedById = new Map(merged.map((m, i) => [m.id, i]));
	const idsToRemove = /* @__PURE__ */ new Set();
	for (const m of rightMessages) {
		const existingIdx = mergedById.get(m.id);
		if (existingIdx !== void 0) if (_langchain_core_messages.RemoveMessage.isInstance(m)) idsToRemove.add(m.id);
		else {
			idsToRemove.delete(m.id);
			merged[existingIdx] = m;
		}
		else {
			if (_langchain_core_messages.RemoveMessage.isInstance(m)) throw new Error(`Attempting to delete a message with an ID that doesn't exist ('${m.id}')`);
			mergedById.set(m.id, merged.length);
			merged.push(m);
		}
	}
	return merged.filter((m) => !idsToRemove.has(m.id));
}

//#endregion
exports.REMOVE_ALL_MESSAGES = REMOVE_ALL_MESSAGES;
exports.messagesStateReducer = messagesStateReducer;
//# sourceMappingURL=messages_reducer.cjs.map