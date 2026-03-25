import { RunnableBinding, RunnableLambda } from "@langchain/core/runnables";

//#region src/prebuilt/tool_executor.ts
const INVALID_TOOL_MSG_TEMPLATE = `{requestedToolName} is not a valid tool, try one of {availableToolNamesString}.`;
/** @deprecated Use {@link ToolNode} instead. */
var ToolExecutor = class extends RunnableBinding {
	lc_graph_name = "ToolExecutor";
	tools;
	toolMap;
	invalidToolMsgTemplate;
	constructor(fields) {
		const fieldsWithDefaults = {
			invalidToolMsgTemplate: INVALID_TOOL_MSG_TEMPLATE,
			...fields
		};
		const bound = RunnableLambda.from(async (input, config) => this._execute(input, config));
		super({
			bound,
			config: {}
		});
		this.tools = fieldsWithDefaults.tools;
		this.invalidToolMsgTemplate = fieldsWithDefaults.invalidToolMsgTemplate;
		this.toolMap = this.tools.reduce((acc, tool) => {
			acc[tool.name] = tool;
			return acc;
		}, {});
	}
	/**
	* Execute a tool invocation
	*
	* @param {ToolInvocationInterface} toolInvocation The tool to invoke and the input to pass to it.
	* @param {RunnableConfig | undefined} config Optional configuration to pass to the tool when invoked.
	* @returns Either the result of the tool invocation (`string` or `ToolMessage`, set by the `ToolOutput` generic) or a string error message.
	*/
	async _execute(toolInvocation, config) {
		if (!(toolInvocation.tool in this.toolMap)) return this.invalidToolMsgTemplate.replace("{requestedToolName}", toolInvocation.tool).replace("{availableToolNamesString}", Object.keys(this.toolMap).join(", "));
		else {
			const tool = this.toolMap[toolInvocation.tool];
			const output = await tool.invoke(toolInvocation.toolInput, config);
			return output;
		}
	}
};

//#endregion
export { ToolExecutor };
//# sourceMappingURL=tool_executor.js.map