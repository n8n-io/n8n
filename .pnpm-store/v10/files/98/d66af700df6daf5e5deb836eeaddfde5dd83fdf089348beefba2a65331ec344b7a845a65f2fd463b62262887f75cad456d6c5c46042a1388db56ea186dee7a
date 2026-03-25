const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_config = require('../pregel/utils/config.cjs');
const require_state = require('./state.cjs');
const uuid = require_rolldown_runtime.__toESM(require("uuid"));
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));

//#region src/graph/message.ts
const REMOVE_ALL_MESSAGES = "__remove_all__";
/**
* Prebuilt reducer that combines returned messages.
* Can handle standard messages and special modifiers like {@link RemoveMessage}
* instances.
*/
function messagesStateReducer(left, right) {
	const leftArray = Array.isArray(left) ? left : [left];
	const rightArray = Array.isArray(right) ? right : [right];
	const leftMessages = leftArray.map(__langchain_core_messages.coerceMessageLikeToMessage);
	const rightMessages = rightArray.map(__langchain_core_messages.coerceMessageLikeToMessage);
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
		if (m.getType() === "remove" && m.id === REMOVE_ALL_MESSAGES) removeAllIdx = i;
	}
	if (removeAllIdx != null) return rightMessages.slice(removeAllIdx + 1);
	const merged = [...leftMessages];
	const mergedById = new Map(merged.map((m, i) => [m.id, i]));
	const idsToRemove = /* @__PURE__ */ new Set();
	for (const m of rightMessages) {
		const existingIdx = mergedById.get(m.id);
		if (existingIdx !== void 0) if (m.getType() === "remove") idsToRemove.add(m.id);
		else {
			idsToRemove.delete(m.id);
			merged[existingIdx] = m;
		}
		else {
			if (m.getType() === "remove") throw new Error(`Attempting to delete a message with an ID that doesn't exist ('${m.id}')`);
			mergedById.set(m.id, merged.length);
			merged.push(m);
		}
	}
	return merged.filter((m) => !idsToRemove.has(m.id));
}
/** @ignore */
var MessageGraph = class extends require_state.StateGraph {
	constructor() {
		super({ channels: { __root__: {
			reducer: messagesStateReducer,
			default: () => []
		} } });
	}
};
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
function pushMessage(message, options) {
	const { stateKey: userStateKey,...userConfig } = options ?? {};
	const config = require_config.ensureLangGraphConfig(userConfig);
	let stateKey = userStateKey ?? "messages";
	if (userStateKey === null) stateKey = void 0;
	const validMessage = (0, __langchain_core_messages.coerceMessageLikeToMessage)(message);
	if (!validMessage.id) throw new Error("Message ID is required.");
	const callbacks = (() => {
		if (Array.isArray(config.callbacks)) return config.callbacks;
		if (typeof config.callbacks !== "undefined") return config.callbacks.handlers;
		return [];
	})();
	const messagesHandler = callbacks.find((cb) => "name" in cb && cb.name === "StreamMessagesHandler");
	if (messagesHandler) {
		const metadata = config.metadata ?? {};
		const namespace = (metadata.langgraph_checkpoint_ns ?? "").split("|");
		messagesHandler._emit([namespace, metadata], validMessage, void 0, false);
	}
	if (stateKey) config.configurable?.__pregel_send?.([[stateKey, validMessage]]);
	return validMessage;
}

//#endregion
exports.MessageGraph = MessageGraph;
exports.REMOVE_ALL_MESSAGES = REMOVE_ALL_MESSAGES;
exports.messagesStateReducer = messagesStateReducer;
exports.pushMessage = pushMessage;
//# sourceMappingURL=message.cjs.map