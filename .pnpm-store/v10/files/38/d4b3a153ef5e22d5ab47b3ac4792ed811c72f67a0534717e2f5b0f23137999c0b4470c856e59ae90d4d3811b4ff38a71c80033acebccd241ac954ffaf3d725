const require_runtime = require('../../_virtual/_rolldown/runtime.cjs');
let _langchain_core_messages = require("@langchain/core/messages");
let _langchain_core_tools = require("@langchain/core/tools");
let _langchain_core_utils_function_calling = require("@langchain/core/utils/function_calling");

//#region src/agents/middleware/utils.ts
/**
* Default token counter that approximates based on character count.
*
* If tools are provided, the token count also includes stringified tool schemas.
*
* @param messages Messages to count tokens for
* @param tools Optional list of tools to include in the token count. Each tool
*   can be either a LangChain tool instance or a dict representing a tool schema.
*   LangChain tool instances are converted to OpenAI tool format before counting.
* @returns Approximate token count
*/
function countTokensApproximately(messages, tools) {
	const charsPerToken = 4;
	let totalChars = 0;
	if (tools && tools.length > 0) {
		let toolsChars = 0;
		for (const tool of tools) {
			const toolDict = (0, _langchain_core_tools.isLangChainTool)(tool) ? (0, _langchain_core_utils_function_calling.convertToOpenAITool)(tool) : tool;
			toolsChars += JSON.stringify(toolDict).length;
		}
		totalChars += toolsChars;
	}
	for (const msg of messages) {
		let textContent;
		if (typeof msg.content === "string") textContent = msg.content;
		else if (Array.isArray(msg.content)) textContent = msg.content.map((item) => {
			if (typeof item === "string") return item;
			if (item.type === "text" && "text" in item) return item.text;
			return "";
		}).join("");
		else textContent = "";
		if (_langchain_core_messages.AIMessage.isInstance(msg) && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) textContent += JSON.stringify(msg.tool_calls);
		if (_langchain_core_messages.ToolMessage.isInstance(msg)) textContent += msg.tool_call_id ?? "";
		totalChars += textContent.length;
	}
	return Math.ceil(totalChars / charsPerToken);
}
function getHookConstraint(hook) {
	if (!hook || typeof hook === "function") return;
	return hook.canJumpTo;
}
function getHookFunction(arg) {
	if (typeof arg === "function") return arg;
	return arg.hook;
}
/**
* Sleep for the specified number of milliseconds.
*/
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
* Calculate delay for a retry attempt with exponential backoff and jitter.
*
* @param retryNumber - The retry attempt number (0-indexed)
* @param config - Configuration for backoff calculation
* @returns Delay in milliseconds before next retry
*
* @internal Exported for testing purposes
*/
function calculateRetryDelay(config, retryNumber) {
	const { backoffFactor, initialDelayMs, maxDelayMs, jitter } = config;
	let delay;
	if (backoffFactor === 0) delay = initialDelayMs;
	else delay = initialDelayMs * backoffFactor ** retryNumber;
	delay = Math.min(delay, maxDelayMs);
	if (jitter && delay > 0) {
		const jitterAmount = delay * .25;
		delay = delay + (Math.random() * 2 - 1) * jitterAmount;
		delay = Math.max(0, delay);
	}
	return delay;
}

//#endregion
exports.calculateRetryDelay = calculateRetryDelay;
exports.countTokensApproximately = countTokensApproximately;
exports.getHookConstraint = getHookConstraint;
exports.getHookFunction = getHookFunction;
exports.sleep = sleep;
//# sourceMappingURL=utils.cjs.map