import { BaseMessage, BaseMessageChunk, _mergeDicts, mergeContent } from "./base.js";
//#region src/messages/function.ts
/**
* Represents a function message in a conversation.
*/
var FunctionMessage = class extends BaseMessage {
	static lc_name() {
		return "FunctionMessage";
	}
	type = "function";
	name;
	constructor(fields) {
		super(fields);
		this.name = fields.name;
	}
};
/**
* Represents a chunk of a function message, which can be concatenated
* with other function message chunks.
*/
var FunctionMessageChunk = class extends BaseMessageChunk {
	static lc_name() {
		return "FunctionMessageChunk";
	}
	type = "function";
	concat(chunk) {
		const Cls = this.constructor;
		return new Cls({
			content: mergeContent(this.content, chunk.content),
			additional_kwargs: _mergeDicts(this.additional_kwargs, chunk.additional_kwargs),
			response_metadata: _mergeDicts(this.response_metadata, chunk.response_metadata),
			name: this.name ?? "",
			id: this.id ?? chunk.id
		});
	}
};
function isFunctionMessage(x) {
	return x._getType() === "function";
}
function isFunctionMessageChunk(x) {
	return x._getType() === "function";
}
//#endregion
export { FunctionMessage, FunctionMessageChunk, isFunctionMessage, isFunctionMessageChunk };

//# sourceMappingURL=function.js.map