const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));
const __langchain_core_singletons = require_rolldown_runtime.__toESM(require("@langchain/core/singletons"));

//#region src/tools/custom.ts
function customTool(func, fields) {
	return new __langchain_core_tools.DynamicTool({
		...fields,
		description: "",
		metadata: { customTool: fields },
		func: async (input, runManager, config) => new Promise((resolve, reject) => {
			const childConfig = (0, __langchain_core_runnables.patchConfig)(config, { callbacks: runManager?.getChild() });
			__langchain_core_singletons.AsyncLocalStorageProviderSingleton.runWithConfig((0, __langchain_core_runnables.pickRunnableConfigKeys)(childConfig), async () => {
				try {
					resolve(func(input, childConfig));
				} catch (e) {
					reject(e);
				}
			});
		})
	});
}

//#endregion
exports.customTool = customTool;
//# sourceMappingURL=custom.cjs.map