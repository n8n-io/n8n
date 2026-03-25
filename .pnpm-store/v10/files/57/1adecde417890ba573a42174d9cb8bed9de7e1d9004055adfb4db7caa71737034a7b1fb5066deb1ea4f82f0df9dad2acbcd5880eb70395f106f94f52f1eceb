import { BaseMessage, BaseMessageChunk, _mergeDicts, mergeContent } from "./base.js";
//#region src/messages/chat.ts
/**
* Represents a chat message in a conversation.
*/
var ChatMessage = class ChatMessage extends BaseMessage {
	static lc_name() {
		return "ChatMessage";
	}
	type = "generic";
	role;
	static _chatMessageClass() {
		return ChatMessage;
	}
	constructor(fields, role) {
		if (typeof fields === "string" || Array.isArray(fields)) fields = {
			content: fields,
			role
		};
		super(fields);
		this.role = fields.role;
	}
	static isInstance(obj) {
		return super.isInstance(obj) && obj.type === "generic";
	}
	get _printableFields() {
		return {
			...super._printableFields,
			role: this.role
		};
	}
};
/**
* Represents a chunk of a chat message, which can be concatenated with
* other chat message chunks.
*/
var ChatMessageChunk = class extends BaseMessageChunk {
	static lc_name() {
		return "ChatMessageChunk";
	}
	type = "generic";
	role;
	constructor(fields, role) {
		if (typeof fields === "string" || Array.isArray(fields)) fields = {
			content: fields,
			role
		};
		super(fields);
		this.role = fields.role;
	}
	concat(chunk) {
		const Cls = this.constructor;
		return new Cls({
			content: mergeContent(this.content, chunk.content),
			additional_kwargs: _mergeDicts(this.additional_kwargs, chunk.additional_kwargs),
			response_metadata: _mergeDicts(this.response_metadata, chunk.response_metadata),
			role: this.role,
			id: this.id ?? chunk.id
		});
	}
	static isInstance(obj) {
		return super.isInstance(obj) && obj.type === "generic";
	}
	get _printableFields() {
		return {
			...super._printableFields,
			role: this.role
		};
	}
};
/**
* @deprecated Use {@link ChatMessage.isInstance} instead
*/
function isChatMessage(x) {
	return x._getType() === "generic";
}
/**
* @deprecated Use {@link ChatMessageChunk.isInstance} instead
*/
function isChatMessageChunk(x) {
	return x._getType() === "generic";
}
//#endregion
export { ChatMessage, ChatMessageChunk, isChatMessage, isChatMessageChunk };

//# sourceMappingURL=chat.js.map