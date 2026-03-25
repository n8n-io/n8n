import { initChatModel } from "../../../../chat_models/universal.js";
import { createMiddleware } from "../../../middleware.js";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";

//#region src/agents/middleware/provider/openai/moderation.ts
/**
* Check if the model is an OpenAI model that supports moderation.
* @param model - The model to check.
* @returns Whether the model is an OpenAI model that supports moderation.
*/
function isOpenAIModel(model) {
	if (!model || typeof model !== "object" || model === null || !("client" in model) || !("_getClientOptions" in model) || typeof model._getClientOptions !== "function") return false;
	/**
	* client may not yet be initialized, so we need to check if the model has a _getClientOptions method.
	*/
	model._getClientOptions();
	return typeof model.client === "object" && model.client !== null && "moderations" in model.client && typeof model.client.moderations === "object" && model.client.moderations !== null && "create" in model.client.moderations && typeof model.client.moderations.create === "function";
}
/**
* Default template for violation messages.
*/
const DEFAULT_VIOLATION_TEMPLATE = "I'm sorry, but I can't comply with that request. It was flagged for {categories}.";
/**
* Error raised when OpenAI flags content and `exitBehavior` is set to `"error"`.
*/
var OpenAIModerationError = class extends Error {
	content;
	stage;
	result;
	originalMessage;
	constructor({ content, stage, result, message }) {
		super(message);
		this.name = "OpenAIModerationError";
		this.content = content;
		this.stage = stage;
		this.result = result;
		this.originalMessage = message;
	}
};
/**
* Middleware that moderates agent traffic using OpenAI's moderation endpoint.
*
* This middleware checks messages for content policy violations at different stages:
* - Input: User messages before they reach the model
* - Output: AI model responses
* - Tool results: Results returned from tool executions
*
* @param options - Configuration options for the middleware
* @param options.model - OpenAI model to use for moderation. Can be either a model name or a BaseChatModel instance.
* @param options.moderationModel - Moderation model to use.
* @param options.checkInput - Whether to check user input messages.
* @param options.checkOutput - Whether to check model output messages.
* @param options.checkToolResults - Whether to check tool result messages.
* @param options.exitBehavior - How to handle violations.
* @param options.violationMessage - Custom template for violation messages.
* @returns Middleware function that can be used to moderate agent traffic.
*
* @example  Using model instance
* ```ts
* import { createAgent, openAIModerationMiddleware } from "langchain";
*
* const middleware = openAIModerationMiddleware({
*   checkInput: true,
*   checkOutput: true,
*   exitBehavior: "end"
* });
*
* const agent = createAgent({
*   model: "openai:gpt-4o",
*   tools: [...],
*   middleware: [middleware],
* });
* ```
*
* @example Using model name
* ```ts
* import { createAgent, openAIModerationMiddleware } from "langchain";
*
* const middleware = openAIModerationMiddleware({
*   model: "gpt-4o-mini",
*   checkInput: true,
*   checkOutput: true,
*   exitBehavior: "end"
* });
*
* const agent = createAgent({
*   model: "openai:gpt-4o",
*   tools: [...],
*   middleware: [middleware],
* });
* ```
*
* @example Custom violation message
* ```ts
* const middleware = openAIModerationMiddleware({
*   violationMessage: "Content flagged: {categories}. Scores: {category_scores}"
* });
* ```
*/
function openAIModerationMiddleware(options) {
	const { model, moderationModel = "omni-moderation-latest", checkInput = true, checkOutput = true, checkToolResults = false, exitBehavior = "end", violationMessage } = options;
	let openaiModel;
	const initModerationModel = async () => {
		if (openaiModel) return openaiModel;
		const resolvedModel = typeof model === "string" ? await initChatModel(model) : model;
		/**
		* Check if the model is an OpenAI model.
		*/
		if (!resolvedModel.getName().includes("ChatOpenAI")) throw new Error(`Model must be an OpenAI model to use moderation middleware. Got: ${resolvedModel.getName()}`);
		/**
		* check if OpenAI model package supports moderation.
		*/
		if (!isOpenAIModel(resolvedModel)) throw new Error("Model must support moderation to use moderation middleware.");
		openaiModel = resolvedModel;
		return openaiModel;
	};
	/**
	* Extract text content from a message.
	*/
	const extractText = (message) => {
		if (message.content == null) return null;
		return message.text || null;
	};
	/**
	* Find the last index of a message type in the messages array.
	*/
	const findLastIndex = (messages, messageType) => {
		for (let idx = messages.length - 1; idx >= 0; idx--) if (messageType.isInstance(messages[idx])) return idx;
		return null;
	};
	/**
	* Format violation message from moderation result.
	*/
	const formatViolationMessage = (content, result) => {
		const categories = [];
		const categoriesObj = result.categories;
		for (const [name, flagged] of Object.entries(categoriesObj)) if (flagged) categories.push(name.replace(/_/g, " "));
		const categoryLabel = categories.length > 0 ? categories.join(", ") : "OpenAI's safety policies";
		const template = violationMessage || DEFAULT_VIOLATION_TEMPLATE;
		const scoresJson = JSON.stringify(result.category_scores, null, 2);
		try {
			return template.replace("{categories}", categoryLabel).replace("{category_scores}", scoresJson).replace("{original_content}", content);
		} catch {
			return template;
		}
	};
	function moderateContent(input, params) {
		const clientOptions = openaiModel?._getClientOptions?.();
		const moderationRequest = {
			input,
			model: params?.model ?? "omni-moderation-latest"
		};
		return openaiModel.client.moderations.create(moderationRequest, clientOptions);
	}
	/**
	* Apply violation handling based on exit behavior.
	*/
	const applyViolation = (messages, index, stage, content, result) => {
		const violationText = formatViolationMessage(content, result);
		if (exitBehavior === "error") throw new OpenAIModerationError({
			content,
			stage,
			result,
			message: violationText
		});
		if (exitBehavior === "end") return {
			jumpTo: "end",
			messages: [new AIMessage({ content: violationText })]
		};
		if (index == null) return;
		/**
		* Replace the original message with a new message that contains the violation text.
		*/
		const newMessages = [...messages];
		const original = newMessages[index];
		const MessageConstructor = Object.getPrototypeOf(original).constructor;
		newMessages[index] = new MessageConstructor({
			...original,
			content: violationText
		});
		return { messages: newMessages };
	};
	/**
	* Moderate user input messages.
	*/
	const moderateUserMessage = async (messages) => {
		const idx = findLastIndex(messages, HumanMessage);
		if (idx == null) return null;
		const message = messages[idx];
		const text = extractText(message);
		if (!text) return null;
		await initModerationModel();
		const flaggedResult = (await moderateContent(text, { model: moderationModel })).results.find((result) => result.flagged);
		if (!flaggedResult) return null;
		return applyViolation(messages, idx, "input", text, flaggedResult);
	};
	/**
	* Moderate tool result messages.
	*/
	const moderateToolMessages = async (messages) => {
		const lastAiIdx = findLastIndex(messages, AIMessage);
		if (lastAiIdx == null) return null;
		const working = [...messages];
		let modified = false;
		for (let idx = lastAiIdx + 1; idx < working.length; idx++) {
			const msg = working[idx];
			if (!ToolMessage.isInstance(msg)) continue;
			const text = extractText(msg);
			if (!text) continue;
			await initModerationModel();
			const flaggedResult = (await moderateContent(text, { model: moderationModel })).results.find((result) => result.flagged);
			if (!flaggedResult) continue;
			const action = applyViolation(working, idx, "tool", text, flaggedResult);
			if (action) {
				if ("jumpTo" in action) return action;
				if ("messages" in action) {
					working.splice(0, working.length, ...action.messages);
					modified = true;
				}
			}
		}
		if (modified) return { messages: working };
		return null;
	};
	/**
	* Moderate model output messages.
	*/
	const moderateOutput = async (messages) => {
		const lastAiIdx = findLastIndex(messages, AIMessage);
		if (lastAiIdx == null) return null;
		const aiMessage = messages[lastAiIdx];
		const text = extractText(aiMessage);
		if (!text) return null;
		await initModerationModel();
		const flaggedResult = (await moderateContent(text, { model: moderationModel })).results.find((result) => result.flagged);
		if (!flaggedResult) return null;
		return applyViolation(messages, lastAiIdx, "output", text, flaggedResult);
	};
	/**
	* Moderate inputs (user messages and tool results) before model call.
	*/
	const moderateInputs = async (messages) => {
		const working = [...messages];
		let modified = false;
		if (checkToolResults) {
			const action = await moderateToolMessages(working);
			if (action) {
				if ("jumpTo" in action) return action;
				if ("messages" in action) {
					working.splice(0, working.length, ...action.messages);
					modified = true;
				}
			}
		}
		if (checkInput) {
			const action = await moderateUserMessage(working);
			if (action) {
				if ("jumpTo" in action) return action;
				if ("messages" in action) {
					working.splice(0, working.length, ...action.messages);
					modified = true;
				}
			}
		}
		if (modified) return { messages: working };
		return null;
	};
	return createMiddleware({
		name: "OpenAIModerationMiddleware",
		beforeModel: {
			hook: async (state) => {
				if (!checkInput && !checkToolResults) return;
				const messages = state.messages || [];
				if (messages.length === 0) return;
				return await moderateInputs(messages) ?? void 0;
			},
			canJumpTo: ["end"]
		},
		afterModel: {
			hook: async (state) => {
				if (!checkOutput) return;
				const messages = state.messages || [];
				if (messages.length === 0) return;
				return await moderateOutput(messages) ?? void 0;
			},
			canJumpTo: ["end"]
		}
	});
}

//#endregion
export { openAIModerationMiddleware };
//# sourceMappingURL=moderation.js.map