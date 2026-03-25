import { ChatMessage } from "@langchain/core/messages";

//#region src/utils/misc.ts
const iife$1 = (fn) => fn();
function isReasoningModel(model) {
	if (!model) return false;
	if (/^o\d/.test(model ?? "")) return true;
	if (model.startsWith("gpt-5") && !model.startsWith("gpt-5-chat")) return true;
	return false;
}
function extractGenericMessageCustomRole(message) {
	if (message.role !== "system" && message.role !== "developer" && message.role !== "assistant" && message.role !== "user" && message.role !== "function" && message.role !== "tool") console.warn(`Unknown message role: ${message.role}`);
	return message.role;
}
function messageToOpenAIRole(message) {
	const type = message._getType();
	switch (type) {
		case "system": return "system";
		case "ai": return "assistant";
		case "human": return "user";
		case "function": return "function";
		case "tool": return "tool";
		case "generic":
			if (!ChatMessage.isInstance(message)) throw new Error("Invalid generic chat message");
			return extractGenericMessageCustomRole(message);
		default: throw new Error(`Unknown message type: ${type}`);
	}
}

//#endregion
export { iife$1 as iife, isReasoningModel, messageToOpenAIRole };
//# sourceMappingURL=misc.js.map