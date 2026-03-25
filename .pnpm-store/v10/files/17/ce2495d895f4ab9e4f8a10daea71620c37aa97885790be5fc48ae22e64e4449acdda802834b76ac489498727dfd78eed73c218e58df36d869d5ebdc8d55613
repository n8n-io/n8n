require("../_virtual/_rolldown/runtime.cjs");
const require_utils_env = require("../utils/env.cjs");
let langsmith = require("langsmith");
//#region src/singletons/tracer.ts
let client;
const getDefaultLangChainClientSingleton = () => {
	if (client === void 0) client = new langsmith.Client(require_utils_env.getEnvironmentVariable("LANGCHAIN_CALLBACKS_BACKGROUND") === "false" ? { blockOnRootRunFinalization: true } : {});
	return client;
};
//#endregion
exports.getDefaultLangChainClientSingleton = getDefaultLangChainClientSingleton;

//# sourceMappingURL=tracer.cjs.map