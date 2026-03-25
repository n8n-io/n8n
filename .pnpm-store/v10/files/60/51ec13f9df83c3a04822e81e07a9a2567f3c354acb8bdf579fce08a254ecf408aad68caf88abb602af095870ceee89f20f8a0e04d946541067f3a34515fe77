const require_constants = require('../constants.cjs');
const require_state = require('../graph/state.cjs');
const require_tool_executor = require('./tool_executor.cjs');

//#region src/prebuilt/agent_executor.ts
/** @ignore */
function createAgentExecutor({ agentRunnable, tools }) {
	let toolExecutor;
	if (!Array.isArray(tools)) toolExecutor = tools;
	else toolExecutor = new require_tool_executor.ToolExecutor({ tools });
	const shouldContinue = (data) => {
		if (data.agentOutcome && "returnValues" in data.agentOutcome) return "end";
		return "continue";
	};
	const runAgent = async (data, config) => {
		const agentOutcome = await agentRunnable.invoke(data, config);
		return { agentOutcome };
	};
	const executeTools = async (data, config) => {
		const agentAction = data.agentOutcome;
		if (!agentAction || "returnValues" in agentAction) throw new Error("Agent has not been run yet");
		const output = await toolExecutor.invoke(agentAction, config);
		return { steps: [{
			action: agentAction,
			observation: output
		}] };
	};
	const workflow = new require_state.StateGraph({ channels: {
		input: null,
		agentOutcome: null,
		steps: {
			reducer: (x, y) => x.concat(y),
			default: () => []
		}
	} }).addNode("agent", runAgent).addNode("action", executeTools).addEdge(require_constants.START, "agent").addConditionalEdges("agent", shouldContinue, {
		continue: "action",
		end: require_constants.END
	}).addEdge("action", "agent");
	return workflow.compile();
}

//#endregion
exports.createAgentExecutor = createAgentExecutor;
//# sourceMappingURL=agent_executor.cjs.map