const require_base = require("./base.cjs");
//#region src/messages/system.ts
/**
* Represents a system message in a conversation.
*/
var SystemMessage = class SystemMessage extends require_base.BaseMessage {
	static lc_name() {
		return "SystemMessage";
	}
	type = "system";
	constructor(fields) {
		super(fields);
	}
	/**
	* Concatenates a string or another system message with the current system message.
	* @param chunk - The chunk to concatenate with the system message.
	* @returns A new system message with the concatenated content.
	*/
	concat(chunk) {
		if (typeof chunk === "string") return new SystemMessage({
			...this,
			content: require_base.mergeContent(this.content, chunk)
		});
		if (SystemMessage.isInstance(chunk)) return new SystemMessage({
			...this,
			additional_kwargs: {
				...this.additional_kwargs,
				...chunk.additional_kwargs
			},
			response_metadata: {
				...this.response_metadata,
				...chunk.response_metadata
			},
			content: require_base.mergeContent(this.content, chunk.content)
		});
		throw new Error("Unexpected chunk type for system message");
	}
	static isInstance(obj) {
		return super.isInstance(obj) && obj.type === "system";
	}
};
/**
* Represents a chunk of a system message, which can be concatenated with
* other system message chunks.
*/
var SystemMessageChunk = class extends require_base.BaseMessageChunk {
	static lc_name() {
		return "SystemMessageChunk";
	}
	type = "system";
	constructor(fields) {
		super(fields);
	}
	concat(chunk) {
		const Cls = this.constructor;
		return new Cls({
			content: require_base.mergeContent(this.content, chunk.content),
			additional_kwargs: require_base._mergeDicts(this.additional_kwargs, chunk.additional_kwargs),
			response_metadata: require_base._mergeDicts(this.response_metadata, chunk.response_metadata),
			id: this.id ?? chunk.id
		});
	}
	static isInstance(obj) {
		return super.isInstance(obj) && obj.type === "system";
	}
};
/**
* @deprecated Use {@link SystemMessage.isInstance} instead
*/
function isSystemMessage(x) {
	return x._getType() === "system";
}
/**
* @deprecated Use {@link SystemMessageChunk.isInstance} instead
*/
function isSystemMessageChunk(x) {
	return x._getType() === "system";
}
//#endregion
exports.SystemMessage = SystemMessage;
exports.SystemMessageChunk = SystemMessageChunk;
exports.isSystemMessage = isSystemMessage;
exports.isSystemMessageChunk = isSystemMessageChunk;

//# sourceMappingURL=system.cjs.map