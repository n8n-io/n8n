import { END, START } from "../constants.js";
import { StateGraph } from "../graph/state.js";
import { ToolExecutor } from "./tool_executor.js";

//#region src/prebuilt/agent_executor.ts
/** @ignore */
function createAgentExecutor({ agentRunnable, tools }) {
	let toolExecutor;
	if (!Array.isArray(tools)) toolExecutor = tools;
	else toolExecutor = new ToolExecutor({ tools });
	const shouldContinue = (data) => {
		if (data.agentOutcome && "returnValues" in data.agentOutcome) return "end";
		return "continue";
	};
	const runAgent = async (data, config) => {
		return { agentOutcome: await agentRunnable.invoke(data, config) };
	};
	const executeTools = async (data, config) => {
		const agentAction = data.agentOutcome;
		if (!agentAction || "returnValues" in agentAction) throw new Error("Agent has not been run yet");
		return { steps: [{
			action: agentAction,
			observation: await toolExecutor.invoke(agentAction, config)
		}] };
	};
	return new StateGraph({ channels: {
		input: null,
		agentOutcome: null,
		steps: {
			reducer: (x, y) => x.concat(y),
			default: () => []
		}
	} }).addNode("agent", runAgent).addNode("action", executeTools).addEdge(START, "agent").addConditionalEdges("agent", shouldContinue, {
		continue: "action",
		end: END
	}).addEdge("action", "agent").compile();
}

//#endregion
export { createAgentExecutor };
//# sourceMappingURL=agent_executor.js.map