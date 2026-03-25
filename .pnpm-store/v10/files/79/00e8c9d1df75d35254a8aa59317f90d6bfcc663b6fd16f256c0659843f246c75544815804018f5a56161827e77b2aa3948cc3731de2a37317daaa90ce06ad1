
//#region src/utils/tools.ts
function handleToolChoice(toolChoice) {
	if (!toolChoice) return void 0;
	else if (toolChoice === "any") return { type: "any" };
	else if (toolChoice === "auto") return { type: "auto" };
	else if (toolChoice === "none") return { type: "none" };
	else if (typeof toolChoice === "string") return {
		type: "tool",
		name: toolChoice
	};
	else return toolChoice;
}

//#endregion
exports.handleToolChoice = handleToolChoice;
//# sourceMappingURL=tools.cjs.map