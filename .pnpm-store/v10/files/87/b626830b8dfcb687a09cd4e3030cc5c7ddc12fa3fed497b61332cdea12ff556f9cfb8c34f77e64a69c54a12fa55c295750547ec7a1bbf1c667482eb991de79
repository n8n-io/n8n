import { __export } from "../_virtual/rolldown_runtime.js";
import { Agent } from "./agent.js";
import { loadFromHub } from "../util/hub.js";
import { loadFromFile } from "../util/load.js";
import { parseFileConfig } from "../util/parse.js";

//#region src/agents/load.ts
var load_exports = {};
__export(load_exports, { loadAgent: () => loadAgent });
const loadAgentFromFile = async (file, path, llmAndTools) => {
	const serialized = parseFileConfig(file, path);
	return Agent.deserialize({
		...serialized,
		...llmAndTools
	});
};
const loadAgent = async (uri, llmAndTools) => {
	const hubResult = await loadFromHub(uri, loadAgentFromFile, "agents", new Set(["json", "yaml"]), llmAndTools);
	if (hubResult) return hubResult;
	return loadFromFile(uri, loadAgentFromFile, llmAndTools);
};

//#endregion
export { loadAgent, load_exports };
//# sourceMappingURL=load.js.map