import { BaseMessage, BaseMessageChunk, _mergeDicts, mergeContent } from "./base.js";
//#region src/messages/system.ts
/**
* Represents a system message in a conversation.
*/
var SystemMessage = class SystemMessage extends BaseMessage {
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
			content: mergeContent(this.content, chunk)
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
			content: mergeContent(this.content, chunk.content)
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
var SystemMessageChunk = class extends BaseMessageChunk {
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
			content: mergeContent(this.content, chunk.content),
			additional_kwargs: _mergeDicts(this.additional_kwargs, chunk.additional_kwargs),
			response_metadata: _mergeDicts(this.response_metadata, chunk.response_metadata),
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
export { SystemMessage, SystemMessageChunk, isSystemMessage, isSystemMessageChunk };

//# sourceMappingURL=system.js.map