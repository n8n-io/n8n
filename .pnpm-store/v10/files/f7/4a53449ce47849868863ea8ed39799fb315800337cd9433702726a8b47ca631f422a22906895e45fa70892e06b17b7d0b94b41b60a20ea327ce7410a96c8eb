import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { BaseMessage, BaseMessageChunk, _mergeDicts, _mergeObj, _mergeStatus, mergeContent } from "./base.js";
//#region src/messages/tool.ts
var tool_exports = /* @__PURE__ */ __exportAll({
	ToolMessage: () => ToolMessage,
	ToolMessageChunk: () => ToolMessageChunk,
	defaultToolCallParser: () => defaultToolCallParser,
	isDirectToolOutput: () => isDirectToolOutput,
	isToolMessage: () => isToolMessage,
	isToolMessageChunk: () => isToolMessageChunk
});
function isDirectToolOutput(x) {
	return x != null && typeof x === "object" && "lc_direct_tool_output" in x && x.lc_direct_tool_output === true;
}
/**
* Represents a tool message in a conversation.
*/
var ToolMessage = class extends BaseMessage {
	static lc_name() {
		return "ToolMessage";
	}
	get lc_aliases() {
		return { tool_call_id: "tool_call_id" };
	}
	lc_direct_tool_output = true;
	type = "tool";
	/**
	* Status of the tool invocation.
	* @version 0.2.19
	*/
	status;
	tool_call_id;
	metadata;
	/**
	* Artifact of the Tool execution which is not meant to be sent to the model.
	*
	* Should only be specified if it is different from the message content, e.g. if only
	* a subset of the full tool output is being passed as message content but the full
	* output is needed in other parts of the code.
	*/
	artifact;
	constructor(fields, tool_call_id, name) {
		const toolMessageFields = typeof fields === "string" || Array.isArray(fields) ? {
			content: fields,
			name,
			tool_call_id
		} : fields;
		super(toolMessageFields);
		this.tool_call_id = toolMessageFields.tool_call_id;
		this.artifact = toolMessageFields.artifact;
		this.status = toolMessageFields.status;
		this.metadata = toolMessageFields.metadata;
	}
	static isInstance(message) {
		return super.isInstance(message) && message.type === "tool";
	}
	get _printableFields() {
		return {
			...super._printableFields,
			tool_call_id: this.tool_call_id,
			artifact: this.artifact
		};
	}
};
/**
* Represents a chunk of a tool message, which can be concatenated
* with other tool message chunks.
*/
var ToolMessageChunk = class extends BaseMessageChunk {
	type = "tool";
	tool_call_id;
	/**
	* Status of the tool invocation.
	* @version 0.2.19
	*/
	status;
	/**
	* Artifact of the Tool execution which is not meant to be sent to the model.
	*
	* Should only be specified if it is different from the message content, e.g. if only
	* a subset of the full tool output is being passed as message content but the full
	* output is needed in other parts of the code.
	*/
	artifact;
	constructor(fields) {
		super(fields);
		this.tool_call_id = fields.tool_call_id;
		this.artifact = fields.artifact;
		this.status = fields.status;
	}
	static lc_name() {
		return "ToolMessageChunk";
	}
	concat(chunk) {
		const Cls = this.constructor;
		return new Cls({
			content: mergeContent(this.content, chunk.content),
			additional_kwargs: _mergeDicts(this.additional_kwargs, chunk.additional_kwargs),
			response_metadata: _mergeDicts(this.response_metadata, chunk.response_metadata),
			artifact: _mergeObj(this.artifact, chunk.artifact),
			tool_call_id: this.tool_call_id,
			id: this.id ?? chunk.id,
			status: _mergeStatus(this.status, chunk.status)
		});
	}
	get _printableFields() {
		return {
			...super._printableFields,
			tool_call_id: this.tool_call_id,
			artifact: this.artifact
		};
	}
};
function defaultToolCallParser(rawToolCalls) {
	const toolCalls = [];
	const invalidToolCalls = [];
	for (const toolCall of rawToolCalls) if (!toolCall.function) continue;
	else {
		const functionName = toolCall.function.name;
		try {
			const functionArgs = JSON.parse(toolCall.function.arguments);
			toolCalls.push({
				name: functionName || "",
				args: functionArgs || {},
				id: toolCall.id
			});
		} catch {
			invalidToolCalls.push({
				name: functionName,
				args: toolCall.function.arguments,
				id: toolCall.id,
				error: "Malformed args."
			});
		}
	}
	return [toolCalls, invalidToolCalls];
}
/**
* @deprecated Use {@link ToolMessage.isInstance} instead
*/
function isToolMessage(x) {
	return typeof x === "object" && x !== null && "getType" in x && typeof x.getType === "function" && x.getType() === "tool";
}
/**
* @deprecated Use {@link ToolMessageChunk.isInstance} instead
*/
function isToolMessageChunk(x) {
	return x._getType() === "tool";
}
//#endregion
export { ToolMessage, ToolMessageChunk, defaultToolCallParser, isDirectToolOutput, isToolMessage, isToolMessageChunk, tool_exports };

//# sourceMappingURL=tool.js.map