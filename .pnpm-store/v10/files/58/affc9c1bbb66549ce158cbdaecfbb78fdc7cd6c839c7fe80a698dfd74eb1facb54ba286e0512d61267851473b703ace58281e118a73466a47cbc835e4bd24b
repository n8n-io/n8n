const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));

//#region src/ui/messages.ts
function tryConvertToChunk(message) {
	try {
		return (0, __langchain_core_messages.convertToChunk)(message);
	} catch {
		return null;
	}
}
function tryCoerceMessageLikeToMessage(message) {
	if (message.type === "remove" && message.id != null) return new __langchain_core_messages.RemoveMessage({
		...message,
		id: message.id
	});
	return (0, __langchain_core_messages.coerceMessageLikeToMessage)(message);
}
var MessageTupleManager = class {
	chunks = {};
	constructor() {
		this.chunks = {};
	}
	add(serialized, metadata) {
		if (serialized.type.endsWith("MessageChunk")) serialized.type = serialized.type.slice(0, -12).toLowerCase();
		const message = tryCoerceMessageLikeToMessage(serialized);
		const chunk = tryConvertToChunk(message);
		const { id } = chunk ?? message;
		if (!id) {
			console.warn("No message ID found for chunk, ignoring in state", serialized);
			return null;
		}
		this.chunks[id] ??= {};
		this.chunks[id].metadata = metadata ?? this.chunks[id].metadata;
		if (chunk) {
			const prev = this.chunks[id].chunk;
			this.chunks[id].chunk = ((0, __langchain_core_messages.isBaseMessageChunk)(prev) ? prev : null)?.concat(chunk) ?? chunk;
		} else this.chunks[id].chunk = message;
		return id;
	}
	clear() {
		this.chunks = {};
	}
	get(id, defaultIndex) {
		if (id == null) return null;
		if (this.chunks[id] == null) return null;
		if (defaultIndex != null) this.chunks[id].index ??= defaultIndex;
		return this.chunks[id];
	}
};
const toMessageDict = (chunk) => {
	const { type, data } = chunk.toDict();
	return {
		...data,
		type
	};
};

//#endregion
exports.MessageTupleManager = MessageTupleManager;
exports.toMessageDict = toMessageDict;
//# sourceMappingURL=messages.cjs.map