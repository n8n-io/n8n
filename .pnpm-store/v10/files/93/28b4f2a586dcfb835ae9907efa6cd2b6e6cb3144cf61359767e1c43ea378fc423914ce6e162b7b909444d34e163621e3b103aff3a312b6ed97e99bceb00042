//#region src/utils/tools.ts
/**
* Extracts tool calls with their results from a list of messages.
*
* @template ToolCall The type of tool calls.
* @param messages The list of messages to extract tool calls from.
* @returns An array of ToolCallWithResult objects.
*
* @example
* ```ts
* const toolCalls = getToolCallsWithResults(messages);
* for (const { call, result } of toolCalls) {
*   if (call.name === "get_weather") {
*     console.log(`Weather for ${call.args.location}:`, result?.content);
*   }
* }
* ```
*/
/**
* Computes the lifecycle state of a tool call based on its result.
*/
function computeToolCallState(result, impliedCompleted) {
	if (result) return result.status === "error" ? "error" : "completed";
	if (impliedCompleted) return "completed";
	return "pending";
}
function getToolCallsWithResults(messages) {
	const results = [];
	const toolResultsById = /* @__PURE__ */ new Map();
	for (const msg of messages) if (msg.type === "tool") toolResultsById.set(msg.tool_call_id, msg);
	for (let msgIdx = 0; msgIdx < messages.length; msgIdx += 1) {
		const msg = messages[msgIdx];
		if (msg.type === "ai" && msg.tool_calls && msg.tool_calls.length > 0) {
			const aiMessage = msg;
			let impliedCompleted = false;
			for (let j = msgIdx + 1; j < messages.length; j += 1) if (messages[j].type === "ai") {
				impliedCompleted = true;
				break;
			}
			for (let i = 0; i < aiMessage.tool_calls.length; i += 1) {
				const call = aiMessage.tool_calls[i];
				const callId = call.id;
				const result = callId ? toolResultsById.get(callId) : void 0;
				results.push({
					id: callId ?? `${aiMessage.id ?? "unknown"}-${i}`,
					call,
					result,
					aiMessage,
					index: i,
					state: computeToolCallState(result, impliedCompleted)
				});
			}
		}
	}
	return results;
}
//#endregion
exports.getToolCallsWithResults = getToolCallsWithResults;

//# sourceMappingURL=tools.cjs.map