import { BaseMessage, BaseMessageChunk, _mergeDicts, mergeContent } from "./base.js";
//#region src/messages/human.ts
/**
* Represents a human message in a conversation.
*/
var HumanMessage = class extends BaseMessage {
	static lc_name() {
		return "HumanMessage";
	}
	type = "human";
	constructor(fields) {
		super(fields);
	}
	static isInstance(obj) {
		return super.isInstance(obj) && obj.type === "human";
	}
};
/**
* Represents a chunk of a human message, which can be concatenated with
* other human message chunks.
*/
var HumanMessageChunk = class extends BaseMessageChunk {
	static lc_name() {
		return "HumanMessageChunk";
	}
	type = "human";
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
		return super.isInstance(obj) && obj.type === "human";
	}
};
/**
* @deprecated Use {@link HumanMessage.isInstance} instead
*/
function isHumanMessage(x) {
	return x.getType() === "human";
}
/**
* @deprecated Use {@link HumanMessageChunk.isInstance} instead
*/
function isHumanMessageChunk(x) {
	return x.getType() === "human";
}
//#endregion
export { HumanMessage, HumanMessageChunk, isHumanMessage, isHumanMessageChunk };

//# sourceMappingURL=human.js.map