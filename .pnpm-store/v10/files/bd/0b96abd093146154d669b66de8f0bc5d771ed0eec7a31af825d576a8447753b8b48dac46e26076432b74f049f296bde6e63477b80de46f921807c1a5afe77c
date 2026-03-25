import { t as require_binding } from "./shared/binding-BJqdPU1r.mjs";
import "./shared/normalize-string-or-regex-BhaIG1rU.mjs";
import { n as PluginContextData, r as bindingifyPlugin } from "./shared/bindingify-input-options-Bk0BBr2s.mjs";
import "./shared/parse-ast-index-BFX0oHaQ.mjs";
import { parentPort, workerData } from "node:worker_threads";

//#region src/parallel-plugin-worker.ts
var import_binding = require_binding();
const { registryId, pluginInfos, threadNumber } = workerData;
(async () => {
	try {
		(0, import_binding.registerPlugins)(registryId, await Promise.all(pluginInfos.map(async (pluginInfo) => {
			const definePluginImpl = (await import(pluginInfo.fileUrl)).default;
			const plugin = await definePluginImpl(pluginInfo.options, { threadNumber });
			return {
				index: pluginInfo.index,
				plugin: bindingifyPlugin(plugin, {}, {}, new PluginContextData(() => {}, {}, []), [], () => {}, "info", false)
			};
		})));
		parentPort.postMessage({ type: "success" });
	} catch (error) {
		parentPort.postMessage({
			type: "error",
			error
		});
	} finally {
		parentPort.unref();
	}
})();

//#endregion
export {  };