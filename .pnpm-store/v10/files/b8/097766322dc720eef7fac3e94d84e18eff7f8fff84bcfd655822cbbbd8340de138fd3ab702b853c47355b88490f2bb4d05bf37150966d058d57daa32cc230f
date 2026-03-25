const require_base = require("./base.cjs");
//#region src/messages/human.ts
/**
* Represents a human message in a conversation.
*/
var HumanMessage = class extends require_base.BaseMessage {
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
var HumanMessageChunk = class extends require_base.BaseMessageChunk {
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
			content: require_base.mergeContent(this.content, chunk.content),
			additional_kwargs: require_base._mergeDicts(this.additional_kwargs, chunk.additional_kwargs),
			response_metadata: require_base._mergeDicts(this.response_metadata, chunk.response_metadata),
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
exports.HumanMessage = HumanMessage;
exports.HumanMessageChunk = HumanMessageChunk;
exports.isHumanMessage = isHumanMessage;
exports.isHumanMessageChunk = isHumanMessageChunk;

//# sourceMappingURL=human.cjs.map