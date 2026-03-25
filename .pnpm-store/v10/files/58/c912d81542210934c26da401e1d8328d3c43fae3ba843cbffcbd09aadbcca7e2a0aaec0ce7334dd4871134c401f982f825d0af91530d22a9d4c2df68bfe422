import { ensureLangGraphConfig } from "../pregel/utils/config.js";
import { messagesStateReducer } from "./messages_reducer.js";
import { StateGraph } from "./state.js";
import { coerceMessageLikeToMessage } from "@langchain/core/messages";

//#region src/graph/message.ts
/** @ignore */
var MessageGraph = class extends StateGraph {
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
	const { stateKey: userStateKey, ...userConfig } = options ?? {};
	const config = ensureLangGraphConfig(userConfig);
	let stateKey = userStateKey ?? "messages";
	if (userStateKey === null) stateKey = void 0;
	const validMessage = coerceMessageLikeToMessage(message);
	if (!validMessage.id) throw new Error("Message ID is required.");
	const messagesHandler = (() => {
		if (Array.isArray(config.callbacks)) return config.callbacks;
		if (typeof config.callbacks !== "undefined") return config.callbacks.handlers;
		return [];
	})().find((cb) => "name" in cb && cb.name === "StreamMessagesHandler");
	if (messagesHandler) {
		const metadata = config.metadata ?? {};
		const namespace = (metadata.langgraph_checkpoint_ns ?? "").split("|");
		messagesHandler._emit([namespace, metadata], validMessage, void 0, false);
	}
	if (stateKey) config.configurable?.__pregel_send?.([[stateKey, validMessage]]);
	return validMessage;
}

//#endregion
export { MessageGraph, pushMessage };
//# sourceMappingURL=message.js.map