Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("./_virtual/_rolldown/runtime.cjs");
const require_load_serializable = require("./load/serializable.cjs");
const require_human = require("./messages/human.cjs");
const require_utils = require("./messages/utils.cjs");
//#region src/prompt_values.ts
var prompt_values_exports = /* @__PURE__ */ require_runtime.__exportAll({
	BasePromptValue: () => BasePromptValue,
	ChatPromptValue: () => ChatPromptValue,
	ImagePromptValue: () => ImagePromptValue,
	StringPromptValue: () => StringPromptValue
});
/**
* Base PromptValue class. All prompt values should extend this class.
*/
var BasePromptValue = class extends require_load_serializable.Serializable {};
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
		return [new require_human.HumanMessage(this.value)];
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
		return require_utils.getBufferString(this.messages);
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
		return [new require_human.HumanMessage({ content: [{
			type: "image_url",
			image_url: {
				detail: this.imageUrl.detail,
				url: this.imageUrl.url
			}
		}] })];
	}
};
//#endregion
exports.BasePromptValue = BasePromptValue;
exports.ChatPromptValue = ChatPromptValue;
exports.ImagePromptValue = ImagePromptValue;
exports.StringPromptValue = StringPromptValue;
Object.defineProperty(exports, "prompt_values_exports", {
	enumerable: true,
	get: function() {
		return prompt_values_exports;
	}
});

//# sourceMappingURL=prompt_values.cjs.map