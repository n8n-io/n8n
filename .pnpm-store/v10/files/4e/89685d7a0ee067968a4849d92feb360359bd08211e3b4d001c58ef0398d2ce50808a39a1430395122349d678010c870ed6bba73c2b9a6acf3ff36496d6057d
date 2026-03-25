import { getEnvironmentVariable } from "../utils/env.js";
import { Client } from "langsmith";
//#region src/singletons/tracer.ts
let client;
const getDefaultLangChainClientSingleton = () => {
	if (client === void 0) client = new Client(getEnvironmentVariable("LANGCHAIN_CALLBACKS_BACKGROUND") === "false" ? { blockOnRootRunFinalization: true } : {});
	return client;
};
//#endregion
export { getDefaultLangChainClientSingleton };

//# sourceMappingURL=tracer.js.map