const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_agent = require('./agent.cjs');
const require_hub = require('../util/hub.cjs');
const require_load = require('../util/load.cjs');
const require_parse = require('../util/parse.cjs');

//#region src/agents/load.ts
var load_exports = {};
require_rolldown_runtime.__export(load_exports, { loadAgent: () => loadAgent });
const loadAgentFromFile = async (file, path, llmAndTools) => {
	const serialized = require_parse.parseFileConfig(file, path);
	return require_agent.Agent.deserialize({
		...serialized,
		...llmAndTools
	});
};
const loadAgent = async (uri, llmAndTools) => {
	const hubResult = await require_hub.loadFromHub(uri, loadAgentFromFile, "agents", new Set(["json", "yaml"]), llmAndTools);
	if (hubResult) return hubResult;
	return require_load.loadFromFile(uri, loadAgentFromFile, llmAndTools);
};

//#endregion
exports.loadAgent = loadAgent;
Object.defineProperty(exports, 'load_exports', {
  enumerable: true,
  get: function () {
    return load_exports;
  }
});
//# sourceMappingURL=load.cjs.map