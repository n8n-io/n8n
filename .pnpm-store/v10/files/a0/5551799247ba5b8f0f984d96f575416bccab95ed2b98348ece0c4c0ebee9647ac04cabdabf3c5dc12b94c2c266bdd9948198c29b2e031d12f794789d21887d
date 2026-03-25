import { patchConfig, pickRunnableConfigKeys } from "@langchain/core/runnables";
import { DynamicTool } from "@langchain/core/tools";
import { AsyncLocalStorageProviderSingleton } from "@langchain/core/singletons";

//#region src/tools/custom.ts
function customTool(func, fields) {
	return new DynamicTool({
		...fields,
		description: "",
		metadata: { customTool: fields },
		func: async (input, runManager, config) => new Promise((resolve, reject) => {
			const childConfig = patchConfig(config, { callbacks: runManager?.getChild() });
			AsyncLocalStorageProviderSingleton.runWithConfig(pickRunnableConfigKeys(childConfig), async () => {
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
export { customTool };
//# sourceMappingURL=custom.js.map