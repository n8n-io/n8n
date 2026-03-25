import { addLangChainErrorFields } from "../errors/index.js";
import { BaseMessage, isBaseMessage } from "../messages/base.js";
import { AIMessage } from "../messages/ai.js";
import { ChatMessage } from "../messages/chat.js";
import { HumanMessage } from "../messages/human.js";
import { SystemMessage } from "../messages/system.js";
import { coerceMessageLikeToMessage } from "../messages/utils.js";
import { Runnable } from "../runnables/base.js";
import "../messages/index.js";
import { ChatPromptValue } from "../prompt_values.js";
import { BasePromptTemplate } from "./base.js";
import { BaseStringPromptTemplate } from "./string.js";
import { parseFString, parseMustache } from "./template.js";
import { PromptTemplate } from "./prompt.js";
import { ImagePromptTemplate } from "./image.js";
import { DictPromptTemplate } from "./dict.js";
//#region src/prompts/chat.ts
/**
* Abstract class that serves as a base for creating message prompt
* templates. It defines how to format messages for different roles in a
* conversation.
*/
var BaseMessagePromptTemplate = class extends Runnable {
	lc_namespace = [
		"langchain_core",
		"prompts",
		"chat"
	];
	lc_serializable = true;
	/**
	* Calls the formatMessages method with the provided input and options.
	* @param input Input for the formatMessages method
	* @param options Optional BaseCallbackConfig
	* @returns Formatted output messages
	*/
	async invoke(input, options) {
		return this._callWithConfig((input) => this.formatMessages(input), input, {
			...options,
			runType: "prompt"
		});
	}
};
/**
* Class that represents a placeholder for messages in a chat prompt. It
* extends the BaseMessagePromptTemplate.
*/
var MessagesPlaceholder = class extends BaseMessagePromptTemplate {
	static lc_name() {
		return "MessagesPlaceholder";
	}
	variableName;
	optional;
	constructor(fields) {
		if (typeof fields === "string") fields = { variableName: fields };
		super(fields);
		this.variableName = fields.variableName;
		this.optional = fields.optional ?? false;
	}
	get inputVariables() {
		return [this.variableName];
	}
	async formatMessages(values) {
		const input = values[this.variableName];
		if (this.optional && !input) return [];
		else if (!input) {
			const error = /* @__PURE__ */ new Error(`Field "${this.variableName}" in prompt uses a MessagesPlaceholder, which expects an array of BaseMessages as an input value. Received: undefined`);
			error.name = "InputFormatError";
			throw error;
		}
		let formattedMessages;
		try {
			if (Array.isArray(input)) formattedMessages = input.map(coerceMessageLikeToMessage);
			else formattedMessages = [coerceMessageLikeToMessage(input)];
		} catch (e) {
			const readableInput = typeof input === "string" ? input : JSON.stringify(input, null, 2);
			const error = new Error([
				`Field "${this.variableName}" in prompt uses a MessagesPlaceholder, which expects an array of BaseMessages or coerceable values as input.`,
				`Received value: ${readableInput}`,
				`Additional message: ${e.message}`
			].join("\n\n"));
			error.name = "InputFormatError";
			error.lc_error_code = e.lc_error_code;
			throw error;
		}
		return formattedMessages;
	}
};
/**
* Abstract class that serves as a base for creating message string prompt
* templates. It extends the BaseMessagePromptTemplate.
*/
var BaseMessageStringPromptTemplate = class extends BaseMessagePromptTemplate {
	prompt;
	constructor(fields) {
		if (!("prompt" in fields)) fields = { prompt: fields };
		super(fields);
		this.prompt = fields.prompt;
	}
	get inputVariables() {
		return this.prompt.inputVariables;
	}
	async formatMessages(values) {
		return [await this.format(values)];
	}
};
/**
* Abstract class that serves as a base for creating chat prompt
* templates. It extends the BasePromptTemplate.
*/
var BaseChatPromptTemplate = class extends BasePromptTemplate {
	constructor(input) {
		super(input);
	}
	async format(values) {
		return (await this.formatPromptValue(values)).toString();
	}
	async formatPromptValue(values) {
		return new ChatPromptValue(await this.formatMessages(values));
	}
};
/**
* Class that represents a chat message prompt template. It extends the
* BaseMessageStringPromptTemplate.
*/
var ChatMessagePromptTemplate = class extends BaseMessageStringPromptTemplate {
	static lc_name() {
		return "ChatMessagePromptTemplate";
	}
	role;
	constructor(fields, role) {
		if (!("prompt" in fields)) fields = {
			prompt: fields,
			role
		};
		super(fields);
		this.role = fields.role;
	}
	async format(values) {
		return new ChatMessage(await this.prompt.format(values), this.role);
	}
	static fromTemplate(template, role, options) {
		return new this(PromptTemplate.fromTemplate(template, { templateFormat: options?.templateFormat }), role);
	}
};
function isTextTemplateParam(param) {
	if (param === null || typeof param !== "object" || Array.isArray(param)) return false;
	return Object.keys(param).length === 1 && "text" in param && typeof param.text === "string";
}
function isImageTemplateParam(param) {
	if (param === null || typeof param !== "object" || Array.isArray(param)) return false;
	return "image_url" in param && (typeof param.image_url === "string" || typeof param.image_url === "object" && param.image_url !== null && "url" in param.image_url && typeof param.image_url.url === "string");
}
var _StringImageMessagePromptTemplate = class extends BaseMessagePromptTemplate {
	lc_namespace = [
		"langchain_core",
		"prompts",
		"chat"
	];
	lc_serializable = true;
	inputVariables = [];
	additionalOptions = {};
	prompt;
	messageClass;
	static _messageClass() {
		throw new Error("Can not invoke _messageClass from inside _StringImageMessagePromptTemplate");
	}
	chatMessageClass;
	constructor(fields, additionalOptions) {
		if (!("prompt" in fields)) fields = { prompt: fields };
		super(fields);
		this.prompt = fields.prompt;
		if (Array.isArray(this.prompt)) {
			let inputVariables = [];
			this.prompt.forEach((prompt) => {
				if ("inputVariables" in prompt) inputVariables = inputVariables.concat(prompt.inputVariables);
			});
			this.inputVariables = inputVariables;
		} else this.inputVariables = this.prompt.inputVariables;
		this.additionalOptions = additionalOptions ?? this.additionalOptions;
	}
	createMessage(content) {
		const constructor = this.constructor;
		if (constructor._messageClass()) return new (constructor._messageClass())({ content });
		else if (constructor.chatMessageClass) {
			const MsgClass = constructor.chatMessageClass();
			return new MsgClass({
				content,
				role: this.getRoleFromMessageClass(MsgClass.lc_name())
			});
		} else throw new Error("No message class defined");
	}
	getRoleFromMessageClass(name) {
		switch (name) {
			case "HumanMessage": return "human";
			case "AIMessage": return "ai";
			case "SystemMessage": return "system";
			case "ChatMessage": return "chat";
			default: throw new Error("Invalid message class name");
		}
	}
	static fromTemplate(template, additionalOptions) {
		if (typeof template === "string") return new this(PromptTemplate.fromTemplate(template, additionalOptions));
		const prompt = [];
		for (const item of template) if (typeof item === "string") prompt.push(PromptTemplate.fromTemplate(item, additionalOptions));
		else if (item === null) {} else if (isTextTemplateParam(item)) {
			let text = "";
			if (typeof item.text === "string") text = item.text ?? "";
			const options = {
				...additionalOptions,
				additionalContentFields: item
			};
			prompt.push(PromptTemplate.fromTemplate(text, options));
		} else if (isImageTemplateParam(item)) {
			let imgTemplate = item.image_url ?? "";
			let imgTemplateObject;
			let inputVariables = [];
			if (typeof imgTemplate === "string") {
				let parsedTemplate;
				if (additionalOptions?.templateFormat === "mustache") parsedTemplate = parseMustache(imgTemplate);
				else parsedTemplate = parseFString(imgTemplate);
				const variables = parsedTemplate.flatMap((item) => item.type === "variable" ? [item.name] : []);
				if ((variables?.length ?? 0) > 0) {
					if (variables.length > 1) throw new Error(`Only one format variable allowed per image template.\nGot: ${variables}\nFrom: ${imgTemplate}`);
					inputVariables = [variables[0]];
				} else inputVariables = [];
				imgTemplate = { url: imgTemplate };
				imgTemplateObject = new ImagePromptTemplate({
					template: imgTemplate,
					inputVariables,
					templateFormat: additionalOptions?.templateFormat,
					additionalContentFields: item
				});
			} else if (typeof imgTemplate === "object") {
				if ("url" in imgTemplate) {
					let parsedTemplate;
					if (additionalOptions?.templateFormat === "mustache") parsedTemplate = parseMustache(imgTemplate.url);
					else parsedTemplate = parseFString(imgTemplate.url);
					inputVariables = parsedTemplate.flatMap((item) => item.type === "variable" ? [item.name] : []);
				} else inputVariables = [];
				imgTemplateObject = new ImagePromptTemplate({
					template: imgTemplate,
					inputVariables,
					templateFormat: additionalOptions?.templateFormat,
					additionalContentFields: item
				});
			} else throw new Error("Invalid image template");
			prompt.push(imgTemplateObject);
		} else if (typeof item === "object") prompt.push(new DictPromptTemplate({
			template: item,
			templateFormat: additionalOptions?.templateFormat
		}));
		return new this({
			prompt,
			additionalOptions
		});
	}
	async format(input) {
		if (this.prompt instanceof BaseStringPromptTemplate) {
			const text = await this.prompt.format(input);
			return this.createMessage(text);
		} else {
			const content = [];
			for (const prompt of this.prompt) {
				let inputs = {};
				if (!("inputVariables" in prompt)) throw new Error(`Prompt ${prompt} does not have inputVariables defined.`);
				for (const item of prompt.inputVariables) {
					if (!inputs) inputs = { [item]: input[item] };
					inputs = {
						...inputs,
						[item]: input[item]
					};
				}
				if (prompt instanceof BaseStringPromptTemplate) {
					const formatted = await prompt.format(inputs);
					let additionalContentFields;
					if ("additionalContentFields" in prompt) additionalContentFields = prompt.additionalContentFields;
					if (formatted !== "") content.push({
						...additionalContentFields,
						type: "text",
						text: formatted
					});
				} else if (prompt instanceof ImagePromptTemplate) {
					const formatted = await prompt.format(inputs);
					let additionalContentFields;
					if ("additionalContentFields" in prompt) additionalContentFields = prompt.additionalContentFields;
					content.push({
						...additionalContentFields,
						type: "image_url",
						image_url: formatted
					});
				} else if (prompt instanceof DictPromptTemplate) {
					const formatted = await prompt.format(inputs);
					let additionalContentFields;
					if ("additionalContentFields" in prompt) additionalContentFields = prompt.additionalContentFields;
					content.push({
						...additionalContentFields,
						...formatted
					});
				}
			}
			return this.createMessage(content);
		}
	}
	async formatMessages(values) {
		return [await this.format(values)];
	}
};
/**
* Class that represents a human message prompt template. It extends the
* BaseMessageStringPromptTemplate.
* @example
* ```typescript
* const message = HumanMessagePromptTemplate.fromTemplate("{text}");
* const formatted = await message.format({ text: "Hello world!" });
*
* const chatPrompt = ChatPromptTemplate.fromMessages([message]);
* const formattedChatPrompt = await chatPrompt.invoke({
*   text: "Hello world!",
* });
* ```
*/
var HumanMessagePromptTemplate = class extends _StringImageMessagePromptTemplate {
	static _messageClass() {
		return HumanMessage;
	}
	static lc_name() {
		return "HumanMessagePromptTemplate";
	}
};
/**
* Class that represents an AI message prompt template. It extends the
* BaseMessageStringPromptTemplate.
*/
var AIMessagePromptTemplate = class extends _StringImageMessagePromptTemplate {
	static _messageClass() {
		return AIMessage;
	}
	static lc_name() {
		return "AIMessagePromptTemplate";
	}
};
/**
* Class that represents a system message prompt template. It extends the
* BaseMessageStringPromptTemplate.
* @example
* ```typescript
* const message = SystemMessagePromptTemplate.fromTemplate("{text}");
* const formatted = await message.format({ text: "Hello world!" });
*
* const chatPrompt = ChatPromptTemplate.fromMessages([message]);
* const formattedChatPrompt = await chatPrompt.invoke({
*   text: "Hello world!",
* });
* ```
*/
var SystemMessagePromptTemplate = class extends _StringImageMessagePromptTemplate {
	static _messageClass() {
		return SystemMessage;
	}
	static lc_name() {
		return "SystemMessagePromptTemplate";
	}
};
function _isBaseMessagePromptTemplate(baseMessagePromptTemplateLike) {
	return typeof baseMessagePromptTemplateLike.formatMessages === "function";
}
function _coerceMessagePromptTemplateLike(messagePromptTemplateLike, extra) {
	if (_isBaseMessagePromptTemplate(messagePromptTemplateLike) || isBaseMessage(messagePromptTemplateLike)) return messagePromptTemplateLike;
	if (Array.isArray(messagePromptTemplateLike) && messagePromptTemplateLike[0] === "placeholder") {
		const messageContent = messagePromptTemplateLike[1];
		if (extra?.templateFormat === "mustache" && typeof messageContent === "string" && messageContent.slice(0, 2) === "{{" && messageContent.slice(-2) === "}}") return new MessagesPlaceholder({
			variableName: messageContent.slice(2, -2),
			optional: true
		});
		else if (typeof messageContent === "string" && messageContent[0] === "{" && messageContent[messageContent.length - 1] === "}") return new MessagesPlaceholder({
			variableName: messageContent.slice(1, -1),
			optional: true
		});
		throw new Error(`Invalid placeholder template for format ${extra?.templateFormat ?? `"f-string"`}: "${messagePromptTemplateLike[1]}". Expected a variable name surrounded by ${extra?.templateFormat === "mustache" ? "double" : "single"} curly braces.`);
	}
	const message = coerceMessageLikeToMessage(messagePromptTemplateLike);
	let templateData;
	if (typeof message.content === "string") templateData = message.content;
	else templateData = message.content.map((item) => {
		if ("text" in item) return {
			...item,
			text: item.text
		};
		else if ("image_url" in item) return {
			...item,
			image_url: item.image_url
		};
		else return item;
	});
	if (message._getType() === "human") return HumanMessagePromptTemplate.fromTemplate(templateData, extra);
	else if (message._getType() === "ai") return AIMessagePromptTemplate.fromTemplate(templateData, extra);
	else if (message._getType() === "system") return SystemMessagePromptTemplate.fromTemplate(templateData, extra);
	else if (ChatMessage.isInstance(message)) return ChatMessagePromptTemplate.fromTemplate(message.content, message.role, extra);
	else throw new Error(`Could not coerce message prompt template from input. Received message type: "${message._getType()}".`);
}
function isMessagesPlaceholder(x) {
	return x.constructor.lc_name() === "MessagesPlaceholder";
}
/**
* Class that represents a chat prompt. It extends the
* BaseChatPromptTemplate and uses an array of BaseMessagePromptTemplate
* instances to format a series of messages for a conversation.
* @example
* ```typescript
* const message = SystemMessagePromptTemplate.fromTemplate("{text}");
* const chatPrompt = ChatPromptTemplate.fromMessages([
*   ["ai", "You are a helpful assistant."],
*   message,
* ]);
* const formattedChatPrompt = await chatPrompt.invoke({
*   text: "Hello world!",
* });
* ```
*/
var ChatPromptTemplate = class ChatPromptTemplate extends BaseChatPromptTemplate {
	static lc_name() {
		return "ChatPromptTemplate";
	}
	get lc_aliases() {
		return { promptMessages: "messages" };
	}
	promptMessages;
	validateTemplate = true;
	templateFormat = "f-string";
	constructor(input) {
		super(input);
		if (input.templateFormat === "mustache" && input.validateTemplate === void 0) this.validateTemplate = false;
		Object.assign(this, input);
		if (this.validateTemplate) {
			const inputVariablesMessages = /* @__PURE__ */ new Set();
			for (const promptMessage of this.promptMessages) {
				if (promptMessage instanceof BaseMessage) continue;
				for (const inputVariable of promptMessage.inputVariables) inputVariablesMessages.add(inputVariable);
			}
			const totalInputVariables = this.inputVariables;
			const inputVariablesInstance = new Set(this.partialVariables ? totalInputVariables.concat(Object.keys(this.partialVariables)) : totalInputVariables);
			const difference = new Set([...inputVariablesInstance].filter((x) => !inputVariablesMessages.has(x)));
			if (difference.size > 0) throw new Error(`Input variables \`${[...difference]}\` are not used in any of the prompt messages.`);
			const otherDifference = new Set([...inputVariablesMessages].filter((x) => !inputVariablesInstance.has(x)));
			if (otherDifference.size > 0) throw new Error(`Input variables \`${[...otherDifference]}\` are used in prompt messages but not in the prompt template.`);
		}
	}
	_getPromptType() {
		return "chat";
	}
	async _parseImagePrompts(message, inputValues) {
		if (typeof message.content === "string") return message;
		message.content = await Promise.all(message.content.map(async (item) => {
			if (item.type !== "image_url") return item;
			let imageUrl = "";
			if (typeof item.image_url === "string") imageUrl = item.image_url;
			else if (typeof item.image_url === "object" && item.image_url !== null && "url" in item.image_url && typeof item.image_url.url === "string") imageUrl = item.image_url.url;
			const formattedUrl = await PromptTemplate.fromTemplate(imageUrl, { templateFormat: this.templateFormat }).format(inputValues);
			if (typeof item.image_url === "object" && item.image_url !== null && "url" in item.image_url) item.image_url.url = formattedUrl;
			else item.image_url = formattedUrl;
			return item;
		}));
		return message;
	}
	async formatMessages(values) {
		const allValues = await this.mergePartialAndUserVariables(values);
		let resultMessages = [];
		for (const promptMessage of this.promptMessages) if (promptMessage instanceof BaseMessage) resultMessages.push(await this._parseImagePrompts(promptMessage, allValues));
		else {
			let inputValues;
			if (this.templateFormat === "mustache") inputValues = { ...allValues };
			else inputValues = promptMessage.inputVariables.reduce((acc, inputVariable) => {
				if (!(inputVariable in allValues) && !(isMessagesPlaceholder(promptMessage) && promptMessage.optional)) throw addLangChainErrorFields(/* @__PURE__ */ new Error(`Missing value for input variable \`${inputVariable.toString()}\``), "INVALID_PROMPT_INPUT");
				acc[inputVariable] = allValues[inputVariable];
				return acc;
			}, {});
			const message = await promptMessage.formatMessages(inputValues);
			resultMessages = resultMessages.concat(message);
		}
		return resultMessages;
	}
	async partial(values) {
		const newInputVariables = this.inputVariables.filter((iv) => !(iv in values));
		const newPartialVariables = {
			...this.partialVariables ?? {},
			...values
		};
		return new ChatPromptTemplate({
			...this,
			inputVariables: newInputVariables,
			partialVariables: newPartialVariables
		});
	}
	static fromTemplate(template, options) {
		const humanTemplate = new HumanMessagePromptTemplate({ prompt: PromptTemplate.fromTemplate(template, options) });
		return this.fromMessages([humanTemplate]);
	}
	/**
	* Create a chat model-specific prompt from individual chat messages
	* or message-like tuples.
	* @param promptMessages Messages to be passed to the chat model
	* @returns A new ChatPromptTemplate
	*/
	static fromMessages(promptMessages, extra) {
		const flattenedMessages = promptMessages.reduce((acc, promptMessage) => acc.concat(promptMessage instanceof ChatPromptTemplate ? promptMessage.promptMessages : [_coerceMessagePromptTemplateLike(promptMessage, extra)]), []);
		const flattenedPartialVariables = promptMessages.reduce((acc, promptMessage) => promptMessage instanceof ChatPromptTemplate ? Object.assign(acc, promptMessage.partialVariables) : acc, Object.create(null));
		const inputVariables = /* @__PURE__ */ new Set();
		for (const promptMessage of flattenedMessages) {
			if (promptMessage instanceof BaseMessage) continue;
			for (const inputVariable of promptMessage.inputVariables) {
				if (inputVariable in flattenedPartialVariables) continue;
				inputVariables.add(inputVariable);
			}
		}
		return new this({
			...extra,
			inputVariables: [...inputVariables],
			promptMessages: flattenedMessages,
			partialVariables: flattenedPartialVariables,
			templateFormat: extra?.templateFormat
		});
	}
};
//#endregion
export { AIMessagePromptTemplate, BaseChatPromptTemplate, BaseMessagePromptTemplate, BaseMessageStringPromptTemplate, ChatMessagePromptTemplate, ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate };

//# sourceMappingURL=chat.js.map