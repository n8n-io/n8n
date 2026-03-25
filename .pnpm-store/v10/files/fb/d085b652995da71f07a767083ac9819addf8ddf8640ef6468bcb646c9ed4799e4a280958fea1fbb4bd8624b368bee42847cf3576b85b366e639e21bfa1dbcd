import { __exportAll } from "./_virtual/_rolldown/runtime.js";
import { Serializable } from "./load/serializable.js";
import { HumanMessage } from "./messages/human.js";
import { getBufferString } from "./messages/utils.js";
//#region src/prompt_values.ts
var prompt_values_exports = /* @__PURE__ */ __exportAll({
	BasePromptValue: () => BasePromptValue,
	ChatPromptValue: () => ChatPromptValue,
	ImagePromptValue: () => ImagePromptValue,
	StringPromptValue: () => StringPromptValue
});
/**
* Base PromptValue class. All prompt values should extend this class.
*/
var BasePromptValue = class extends Serializable {};
/**
* Represents a prompt value as a string. It extends the BasePromptValue
* class and overrides the toString and toChatMessages methods.
*/
var StringPromptValue = class extends BasePromptValue {
	static lc_name() {
		return "StringPromptValue";
	}
	lc_namespace = ["langchain_core", "prompt_values"];
	lc_serializable = true;
	value;
	constructor(value) {
		super({ value });
		this.value = value;
	}
	toString() {
		return this.value;
	}
	toChatMessages() {
		return [new HumanMessage(this.value)];
	}
};
/**
* Class that represents a chat prompt value. It extends the
* BasePromptValue and includes an array of BaseMessage instances.
*/
var ChatPromptValue = class extends BasePromptValue {
	lc_namespace = ["langchain_core", "prompt_values"];
	lc_serializable = true;
	static lc_name() {
		return "ChatPromptValue";
	}
	messages;
	constructor(fields) {
		if (Array.isArray(fields)) fields = { messages: fields };
		super(fields);
		this.messages = fields.messages;
	}
	toString() {
		return getBufferString(this.messages);
	}
	toChatMessages() {
		return this.messages;
	}
};
/**
* Class that represents an image prompt value. It extends the
* BasePromptValue and includes an ImageURL instance.
*/
var ImagePromptValue = class extends BasePromptValue {
	lc_namespace = ["langchain_core", "prompt_values"];
	lc_serializable = true;
	static lc_name() {
		return "ImagePromptValue";
	}
	imageUrl;
	/** @ignore */
	value;
	constructor(fields) {
		if (!("imageUrl" in fields)) fields = { imageUrl: fields };
		super(fields);
		this.imageUrl = fields.imageUrl;
	}
	toString() {
		return this.imageUrl.url;
	}
	toChatMessages() {
		return [new HumanMessage({ content: [{
			type: "image_url",
			image_url: {
				detail: this.imageUrl.detail,
				url: this.imageUrl.url
			}
		}] })];
	}
};
//#endregion
export { BasePromptValue, ChatPromptValue, ImagePromptValue, StringPromptValue, prompt_values_exports };

//# sourceMappingURL=prompt_values.js.map