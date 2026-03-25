import { __export } from "../_virtual/rolldown_runtime.js";
import { BaseChain } from "./base.js";
import { loadFromHub } from "../util/hub.js";
import { loadFromFile } from "../util/load.js";
import { parseFileConfig } from "../util/parse.js";

//#region src/chains/load.ts
var load_exports = {};
__export(load_exports, { loadChain: () => loadChain });
const loadChainFromFile = async (file, path, values = {}) => {
	const serialized = parseFileConfig(file, path);
	return BaseChain.deserialize(serialized, values);
};
/**
* Load a chain from {@link https://github.com/hwchase17/langchain-hub | LangchainHub} or local filesystem.
*
* @example
* Loading from LangchainHub:
* ```ts
* import { loadChain } from "@langchain/classic/chains/load";
* const chain = await loadChain("lc://chains/hello-world/chain.json");
* const res = await chain.call({ topic: "my favorite color" });
* ```
*
* @example
* Loading from local filesystem:
* ```ts
* import { loadChain } from "@langchain/classic/chains/load";
* const chain = await loadChain("/path/to/chain.json");
* ```
*/
const loadChain = async (uri, values = {}) => {
	const hubResult = await loadFromHub(uri, loadChainFromFile, "chains", new Set(["json", "yaml"]), values);
	if (hubResult) return hubResult;
	return loadFromFile(uri, loadChainFromFile, values);
};

//#endregion
export { loadChain, load_exports };
//# sourceMappingURL=load.js.map