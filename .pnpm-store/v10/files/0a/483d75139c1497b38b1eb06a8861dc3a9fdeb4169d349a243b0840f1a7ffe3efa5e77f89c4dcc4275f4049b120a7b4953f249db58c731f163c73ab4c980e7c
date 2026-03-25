import { __exportAll } from "./_virtual/_rolldown/runtime.js";
import { AsyncCaller } from "./utils/async_caller.js";
//#region src/embeddings.ts
var embeddings_exports = /* @__PURE__ */ __exportAll({ Embeddings: () => Embeddings });
/**
* An abstract class that provides methods for embedding documents and
* queries using LangChain.
*/
var Embeddings = class {
	/**
	* The async caller should be used by subclasses to make any async calls,
	* which will thus benefit from the concurrency and retry logic.
	*/
	caller;
	constructor(params) {
		this.caller = new AsyncCaller(params ?? {});
	}
};
//#endregion
export { Embeddings, embeddings_exports };

//# sourceMappingURL=embeddings.js.map