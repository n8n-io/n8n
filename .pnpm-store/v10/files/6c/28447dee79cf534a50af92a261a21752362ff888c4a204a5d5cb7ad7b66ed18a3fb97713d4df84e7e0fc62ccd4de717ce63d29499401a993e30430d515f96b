import { initChatModel } from "../../chat_models/universal.js";
import { hasToolCalls } from "../utils.js";
import { countTokensApproximately } from "./utils.js";
import { createMiddleware } from "../middleware.js";
import { AIMessage, HumanMessage, RemoveMessage, SystemMessage, ToolMessage, getBufferString, trimMessages } from "@langchain/core/messages";
import { mergeConfigs, pickRunnableConfigKeys } from "@langchain/core/runnables";
import { REMOVE_ALL_MESSAGES } from "@langchain/langgraph";
import { interopSafeParse } from "@langchain/core/utils/types";
import { z } from "zod/v4";
import { z as z$1 } from "zod/v3";
import { v4 } from "uuid";
import { getModelContextSize } from "@langchain/core/language_models/base";

//#region src/agents/middleware/summarization.ts
const DEFAULT_SUMMARY_PROMPT = `<role>
Context Extraction Assistant
</role>

<primary_objective>
Your sole objective in this task is to extract the highest quality/most relevant context from the conversation history below.
</primary_objective>

<objective_information>
You're nearing the total number of input tokens you can accept, so you must extract the highest quality/most relevant pieces of information from your conversation history.
This context will then overwrite the conversation history presented below. Because of this, ensure the context you extract is only the most important information to your overall goal.
</objective_information>

<instructions>
The conversation history below will be replaced with the context you extract in this step. Because of this, you must do your very best to extract and record all of the most important context from the conversation history.
You want to ensure that you don't repeat any actions you've already completed, so the context you extract from the conversation history should be focused on the most important information to your overall goal.
</instructions>

The user will message you with the full message history you'll be extracting context from, to then replace. Carefully read over it all, and think deeply about what information is most important to your overall goal that should be saved:

With all of this in mind, please carefully read over the entire conversation history, and extract the most important and relevant context to replace it so that you can free up space in the conversation history.
Respond ONLY with the extracted context. Do not include any additional information, or text before or after the extracted context.

<messages>
Messages to summarize:
{messages}
</messages>`;
const DEFAULT_SUMMARY_PREFIX = "Here is a summary of the conversation to date:";
const DEFAULT_MESSAGES_TO_KEEP = 20;
const DEFAULT_TRIM_TOKEN_LIMIT = 4e3;
const DEFAULT_FALLBACK_MESSAGE_COUNT = 15;
const SEARCH_RANGE_FOR_TOOL_PAIRS = 5;
const tokenCounterSchema = z$1.function().args(z$1.array(z$1.custom())).returns(z$1.union([z$1.number(), z$1.promise(z$1.number())]));
const contextSizeSchema = z$1.object({
	fraction: z$1.number().gt(0, "Fraction must be greater than 0").max(1, "Fraction must be less than or equal to 1").optional(),
	tokens: z$1.number().positive("Tokens must be greater than 0").optional(),
	messages: z$1.number().int("Messages must be an integer").positive("Messages must be greater than 0").optional()
}).refine((data) => {
	return [
		data.fraction,
		data.tokens,
		data.messages
	].filter((v) => v !== void 0).length >= 1;
}, { message: "At least one of fraction, tokens, or messages must be provided" });
const keepSchema = z$1.object({
	fraction: z$1.number().min(0, "Messages must be non-negative").max(1, "Fraction must be less than or equal to 1").optional(),
	tokens: z$1.number().min(0, "Tokens must be greater than or equal to 0").optional(),
	messages: z$1.number().int("Messages must be an integer").min(0, "Messages must be non-negative").optional()
}).refine((data) => {
	return [
		data.fraction,
		data.tokens,
		data.messages
	].filter((v) => v !== void 0).length === 1;
}, { message: "Exactly one of fraction, tokens, or messages must be provided" });
const contextSchema = z$1.object({
	model: z$1.custom(),
	trigger: z$1.union([contextSizeSchema, z$1.array(contextSizeSchema)]).optional(),
	keep: keepSchema.optional(),
	tokenCounter: tokenCounterSchema.optional(),
	summaryPrompt: z$1.string().default(DEFAULT_SUMMARY_PROMPT),
	trimTokensToSummarize: z$1.number().optional(),
	summaryPrefix: z$1.string().optional(),
	maxTokensBeforeSummary: z$1.number().optional(),
	messagesToKeep: z$1.number().optional()
});
/**
* Get max input tokens from model profile or fallback to model name lookup
*/
function getProfileLimits(input) {
	if ("profile" in input && typeof input.profile === "object" && input.profile && "maxInputTokens" in input.profile && (typeof input.profile.maxInputTokens === "number" || input.profile.maxInputTokens == null)) return input.profile.maxInputTokens ?? void 0;
	if ("model" in input && typeof input.model === "string") return getModelContextSize(input.model);
	if ("modelName" in input && typeof input.modelName === "string") return getModelContextSize(input.modelName);
}
/**
* Summarization middleware that automatically summarizes conversation history when token limits are approached.
*
* This middleware monitors message token counts and automatically summarizes older
* messages when a threshold is reached, preserving recent messages and maintaining
* context continuity by ensuring AI/Tool message pairs remain together.
*
* @param options Configuration options for the summarization middleware
* @returns A middleware instance
*
* @example
* ```ts
* import { summarizationMiddleware } from "langchain";
* import { createAgent } from "langchain";
*
* // Single condition: trigger if tokens >= 4000 AND messages >= 10
* const agent1 = createAgent({
*   llm: model,
*   tools: [getWeather],
*   middleware: [
*     summarizationMiddleware({
*       model: new ChatOpenAI({ model: "gpt-4o" }),
*       trigger: { tokens: 4000, messages: 10 },
*       keep: { messages: 20 },
*     })
*   ],
* });
*
* // Multiple conditions: trigger if (tokens >= 5000 AND messages >= 3) OR (tokens >= 3000 AND messages >= 6)
* const agent2 = createAgent({
*   llm: model,
*   tools: [getWeather],
*   middleware: [
*     summarizationMiddleware({
*       model: new ChatOpenAI({ model: "gpt-4o" }),
*       trigger: [
*         { tokens: 5000, messages: 3 },
*         { tokens: 3000, messages: 6 },
*       ],
*       keep: { messages: 20 },
*     })
*   ],
* });
*
* ```
*/
function summarizationMiddleware(options) {
	/**
	* Parse user options to get their explicit values
	*/
	const { data: userOptions, error } = interopSafeParse(contextSchema, options);
	if (error) throw new Error(`Invalid summarization middleware options: ${z.prettifyError(error)}`);
	return createMiddleware({
		name: "SummarizationMiddleware",
		contextSchema: contextSchema.extend({ model: z$1.custom().optional() }),
		beforeModel: async (state, runtime) => {
			let trigger = userOptions.trigger;
			let keep = userOptions.keep;
			/**
			* Handle deprecated parameters
			*/
			if (userOptions.maxTokensBeforeSummary !== void 0) {
				console.warn("maxTokensBeforeSummary is deprecated. Use `trigger: { tokens: value }` instead.");
				if (trigger === void 0) trigger = { tokens: userOptions.maxTokensBeforeSummary };
			}
			/**
			* Handle deprecated parameters
			*/
			if (userOptions.messagesToKeep !== void 0) {
				console.warn("messagesToKeep is deprecated. Use `keep: { messages: value }` instead.");
				if (!keep || keep && "messages" in keep && keep.messages === DEFAULT_MESSAGES_TO_KEEP) keep = { messages: userOptions.messagesToKeep };
			}
			/**
			* Merge context with user options
			*/
			const resolvedTrigger = runtime.context?.trigger !== void 0 ? runtime.context.trigger : trigger;
			const resolvedKeep = runtime.context?.keep !== void 0 ? runtime.context.keep : keep ?? { messages: DEFAULT_MESSAGES_TO_KEEP };
			const validatedKeep = keepSchema.parse(resolvedKeep);
			/**
			* Validate trigger conditions
			*/
			let triggerConditions = [];
			if (resolvedTrigger === void 0) triggerConditions = [];
			else if (Array.isArray(resolvedTrigger))
 /**
			* It's an array of ContextSize objects
			*/
			triggerConditions = resolvedTrigger.map((t) => contextSizeSchema.parse(t));
			else
 /**
			* Single ContextSize object - all properties must be satisfied (AND logic)
			*/
			triggerConditions = [contextSizeSchema.parse(resolvedTrigger)];
			/**
			* Check if profile is required
			*/
			const requiresProfile = triggerConditions.some((c) => "fraction" in c) || "fraction" in validatedKeep;
			const model = typeof userOptions.model === "string" ? await initChatModel(userOptions.model) : userOptions.model;
			if (requiresProfile && !getProfileLimits(model)) throw new Error("Model profile information is required to use fractional token limits. Use absolute token counts instead.");
			const summaryPrompt = runtime.context?.summaryPrompt === DEFAULT_SUMMARY_PROMPT ? userOptions.summaryPrompt ?? DEFAULT_SUMMARY_PROMPT : runtime.context?.summaryPrompt ?? userOptions.summaryPrompt ?? DEFAULT_SUMMARY_PROMPT;
			const summaryPrefix = runtime.context.summaryPrefix ?? userOptions.summaryPrefix ?? DEFAULT_SUMMARY_PREFIX;
			const trimTokensToSummarize = runtime.context?.trimTokensToSummarize !== void 0 ? runtime.context.trimTokensToSummarize : userOptions.trimTokensToSummarize ?? DEFAULT_TRIM_TOKEN_LIMIT;
			/**
			* Ensure all messages have IDs
			*/
			ensureMessageIds(state.messages);
			const tokenCounter = runtime.context?.tokenCounter !== void 0 ? runtime.context.tokenCounter : userOptions.tokenCounter ?? countTokensApproximately;
			const totalTokens = await tokenCounter(state.messages);
			if (!await shouldSummarize(state.messages, totalTokens, triggerConditions, model)) return;
			const { systemPrompt, conversationMessages } = splitSystemMessage(state.messages);
			const cutoffIndex = await determineCutoffIndex(conversationMessages, validatedKeep, tokenCounter, model);
			if (cutoffIndex <= 0) return;
			const { messagesToSummarize, preservedMessages } = partitionMessages(systemPrompt, conversationMessages, cutoffIndex);
			const summaryMessage = new HumanMessage({
				content: `${summaryPrefix}\n\n${await createSummary(messagesToSummarize, model, summaryPrompt, tokenCounter, trimTokensToSummarize, runtime)}`,
				id: v4(),
				additional_kwargs: { lc_source: "summarization" }
			});
			return { messages: [
				new RemoveMessage({ id: REMOVE_ALL_MESSAGES }),
				summaryMessage,
				...preservedMessages
			] };
		}
	});
}
/**
* Ensure all messages have unique IDs
*/
function ensureMessageIds(messages) {
	for (const msg of messages) if (!msg.id) msg.id = v4();
}
/**
* Separate system message from conversation messages
*/
function splitSystemMessage(messages) {
	if (messages.length > 0 && SystemMessage.isInstance(messages[0])) return {
		systemPrompt: messages[0],
		conversationMessages: messages.slice(1)
	};
	return { conversationMessages: messages };
}
/**
* Partition messages into those to summarize and those to preserve
*/
function partitionMessages(systemPrompt, conversationMessages, cutoffIndex) {
	const messagesToSummarize = conversationMessages.slice(0, cutoffIndex);
	const preservedMessages = conversationMessages.slice(cutoffIndex);
	if (systemPrompt) messagesToSummarize.unshift(systemPrompt);
	return {
		messagesToSummarize,
		preservedMessages
	};
}
/**
* Determine whether summarization should run for the current token usage
*
* @param messages - Current messages in the conversation
* @param totalTokens - Total token count for all messages
* @param triggerConditions - Array of trigger conditions. Returns true if ANY condition is satisfied (OR logic).
*                           Within each condition, ALL specified properties must be satisfied (AND logic).
* @param model - The language model being used
* @returns true if summarization should be triggered
*/
async function shouldSummarize(messages, totalTokens, triggerConditions, model) {
	if (triggerConditions.length === 0) return false;
	/**
	* Check each condition (OR logic between conditions)
	*/
	for (const trigger of triggerConditions) {
		/**
		* Within a single condition, all specified properties must be satisfied (AND logic)
		*/
		let conditionMet = true;
		let hasAnyProperty = false;
		if (trigger.messages !== void 0) {
			hasAnyProperty = true;
			if (messages.length < trigger.messages) conditionMet = false;
		}
		if (trigger.tokens !== void 0) {
			hasAnyProperty = true;
			if (totalTokens < trigger.tokens) conditionMet = false;
		}
		if (trigger.fraction !== void 0) {
			hasAnyProperty = true;
			const maxInputTokens = getProfileLimits(model);
			if (typeof maxInputTokens === "number") {
				if (totalTokens < Math.floor(maxInputTokens * trigger.fraction)) conditionMet = false;
			} else
 /**
			* If fraction is specified but we can't get model limits, skip this condition
			*/
			conditionMet = false;
		}
		/**
		* If condition has at least one property and all properties are satisfied, trigger summarization
		*/
		if (hasAnyProperty && conditionMet) return true;
	}
	return false;
}
/**
* Determine cutoff index respecting retention configuration
*/
async function determineCutoffIndex(messages, keep, tokenCounter, model) {
	if ("tokens" in keep || "fraction" in keep) {
		const tokenBasedCutoff = await findTokenBasedCutoff(messages, keep, tokenCounter, model);
		if (typeof tokenBasedCutoff === "number") return tokenBasedCutoff;
		/**
		* Fallback to message count if token-based fails
		*/
		return findSafeCutoff(messages, DEFAULT_MESSAGES_TO_KEEP);
	}
	/**
	* find cutoff index based on message count
	*/
	return findSafeCutoff(messages, keep.messages ?? DEFAULT_MESSAGES_TO_KEEP);
}
/**
* Find cutoff index based on target token retention
*/
async function findTokenBasedCutoff(messages, keep, tokenCounter, model) {
	if (messages.length === 0) return 0;
	let targetTokenCount;
	if ("fraction" in keep && keep.fraction !== void 0) {
		const maxInputTokens = getProfileLimits(model);
		if (typeof maxInputTokens !== "number") return;
		targetTokenCount = Math.floor(maxInputTokens * keep.fraction);
	} else if ("tokens" in keep && keep.tokens !== void 0) targetTokenCount = Math.floor(keep.tokens);
	else return;
	if (targetTokenCount <= 0) targetTokenCount = 1;
	if (await tokenCounter(messages) <= targetTokenCount) return 0;
	/**
	* Use binary search to identify the earliest message index that keeps the
	* suffix within the token budget.
	*/
	let left = 0;
	let right = messages.length;
	let cutoffCandidate = messages.length;
	const maxIterations = Math.floor(Math.log2(messages.length)) + 1;
	for (let i = 0; i < maxIterations; i++) {
		if (left >= right) break;
		const mid = Math.floor((left + right) / 2);
		if (await tokenCounter(messages.slice(mid)) <= targetTokenCount) {
			cutoffCandidate = mid;
			right = mid;
		} else left = mid + 1;
	}
	if (cutoffCandidate === messages.length) cutoffCandidate = left;
	if (cutoffCandidate >= messages.length) {
		if (messages.length === 1) return 0;
		cutoffCandidate = messages.length - 1;
	}
	/**
	* Find safe cutoff point that preserves AI/Tool pairs.
	* If cutoff lands on ToolMessage, move backward to include the AIMessage.
	*/
	const safeCutoff = findSafeCutoffPoint(messages, cutoffCandidate);
	/**
	* If findSafeCutoffPoint moved forward (fallback case), verify it's safe.
	* If it moved backward, we already have a safe point.
	*/
	if (safeCutoff <= cutoffCandidate) return safeCutoff;
	/**
	* Fallback: iterate backward to find a safe cutoff
	*/
	for (let i = cutoffCandidate; i >= 0; i--) if (isSafeCutoffPoint(messages, i)) return i;
	return 0;
}
/**
* Find safe cutoff point that preserves AI/Tool message pairs
*/
function findSafeCutoff(messages, messagesToKeep) {
	if (messages.length <= messagesToKeep) return 0;
	const targetCutoff = messages.length - messagesToKeep;
	/**
	* First, try to find a safe cutoff point using findSafeCutoffPoint.
	* This handles the case where cutoff lands on a ToolMessage by moving
	* backward to include the corresponding AIMessage.
	*/
	const safeCutoff = findSafeCutoffPoint(messages, targetCutoff);
	/**
	* If findSafeCutoffPoint moved backward (found matching AIMessage), use it.
	*/
	if (safeCutoff <= targetCutoff) return safeCutoff;
	/**
	* Fallback: iterate backward to find a safe cutoff
	*/
	for (let i = targetCutoff; i >= 0; i--) if (isSafeCutoffPoint(messages, i)) return i;
	return 0;
}
/**
* Check if cutting at index would separate AI/Tool message pairs
*/
function isSafeCutoffPoint(messages, cutoffIndex) {
	if (cutoffIndex >= messages.length) return true;
	/**
	* Prevent preserved messages from starting with AI message containing tool calls
	*/
	if (cutoffIndex < messages.length && AIMessage.isInstance(messages[cutoffIndex]) && hasToolCalls(messages[cutoffIndex])) return false;
	const searchStart = Math.max(0, cutoffIndex - SEARCH_RANGE_FOR_TOOL_PAIRS);
	const searchEnd = Math.min(messages.length, cutoffIndex + SEARCH_RANGE_FOR_TOOL_PAIRS);
	for (let i = searchStart; i < searchEnd; i++) {
		if (!hasToolCalls(messages[i])) continue;
		const toolCallIds = extractToolCallIds(messages[i]);
		if (cutoffSeparatesToolPair(messages, i, cutoffIndex, toolCallIds)) return false;
	}
	return true;
}
/**
* Extract tool call IDs from an AI message
*/
function extractToolCallIds(aiMessage) {
	const toolCallIds = /* @__PURE__ */ new Set();
	if (aiMessage.tool_calls) for (const toolCall of aiMessage.tool_calls) {
		const id = typeof toolCall === "object" && "id" in toolCall ? toolCall.id : null;
		if (id) toolCallIds.add(id);
	}
	return toolCallIds;
}
/**
* Find a safe cutoff point that doesn't split AI/Tool message pairs.
*
* If the message at `cutoffIndex` is a `ToolMessage`, search backward for the
* `AIMessage` containing the corresponding `tool_calls` and adjust the cutoff to
* include it. This ensures tool call requests and responses stay together.
*
* Falls back to advancing forward past `ToolMessage` objects only if no matching
* `AIMessage` is found (edge case).
*/
function findSafeCutoffPoint(messages, cutoffIndex) {
	if (cutoffIndex >= messages.length || !ToolMessage.isInstance(messages[cutoffIndex])) return cutoffIndex;
	const toolCallIds = /* @__PURE__ */ new Set();
	let idx = cutoffIndex;
	while (idx < messages.length && ToolMessage.isInstance(messages[idx])) {
		const toolMsg = messages[idx];
		if (toolMsg.tool_call_id) toolCallIds.add(toolMsg.tool_call_id);
		idx++;
	}
	for (let i = cutoffIndex - 1; i >= 0; i--) {
		const msg = messages[i];
		if (AIMessage.isInstance(msg) && hasToolCalls(msg)) {
			const aiToolCallIds = extractToolCallIds(msg);
			for (const id of toolCallIds) if (aiToolCallIds.has(id)) return i;
		}
	}
	return idx;
}
/**
* Check if cutoff separates an AI message from its corresponding tool messages
*/
function cutoffSeparatesToolPair(messages, aiMessageIndex, cutoffIndex, toolCallIds) {
	for (let j = aiMessageIndex + 1; j < messages.length; j++) {
		const message = messages[j];
		if (ToolMessage.isInstance(message) && toolCallIds.has(message.tool_call_id)) {
			if (aiMessageIndex < cutoffIndex !== j < cutoffIndex) return true;
		}
	}
	return false;
}
/**
* Generate summary for the given messages.
*
* @param messagesToSummarize - Messages to summarize.
* @param model - The language model to use for summarization.
* @param summaryPrompt - The prompt template for summarization.
* @param tokenCounter - Function to count tokens.
* @param trimTokensToSummarize - Optional token limit for trimming messages.
* @param runtime - The runtime environment, used to inherit config so that
*   LangGraph's handlers can properly track and tag the summarization model call.
*/
async function createSummary(messagesToSummarize, model, summaryPrompt, tokenCounter, trimTokensToSummarize, runtime) {
	if (!messagesToSummarize.length) return "No previous conversation history.";
	const trimmedMessages = await trimMessagesForSummary(messagesToSummarize, tokenCounter, trimTokensToSummarize);
	if (!trimmedMessages.length) return "Previous conversation was too long to summarize.";
	/**
	* Format messages using getBufferString to avoid token inflation from metadata
	* when str() / JSON.stringify is called on message objects.
	* This produces compact output like:
	* ```
	* Human: What's the weather?
	* AI: Let me check...[tool_calls]
	* Tool: 72°F and sunny
	* ```
	*/
	const formattedMessages = getBufferString(trimmedMessages);
	try {
		const formattedPrompt = summaryPrompt.replace("{messages}", formattedMessages);
		const config = mergeConfigs(pickRunnableConfigKeys(runtime) ?? {}, { metadata: { lc_source: "summarization" } });
		const content = (await model.invoke(formattedPrompt, config)).content;
		/**
		* Handle both string content and MessageContent array
		*/
		if (typeof content === "string") return content.trim();
		else if (Array.isArray(content)) return content.map((item) => {
			if (typeof item === "string") return item;
			if (typeof item === "object" && item !== null && "text" in item) return item.text;
			return "";
		}).join("").trim();
		return "Error generating summary: Invalid response format";
	} catch (e) {
		return `Error generating summary: ${e}`;
	}
}
/**
* Trim messages to fit within summary generation limits
*/
async function trimMessagesForSummary(messages, tokenCounter, trimTokensToSummarize) {
	if (trimTokensToSummarize === void 0) return messages;
	try {
		return await trimMessages(messages, {
			maxTokens: trimTokensToSummarize,
			tokenCounter: async (msgs) => tokenCounter(msgs),
			strategy: "last",
			allowPartial: true,
			includeSystem: true
		});
	} catch {
		/**
		* Fallback to last N messages if trimming fails
		*/
		return messages.slice(-DEFAULT_FALLBACK_MESSAGE_COUNT);
	}
}

//#endregion
export { contextSizeSchema, getProfileLimits, keepSchema, summarizationMiddleware };
//# sourceMappingURL=summarization.js.map