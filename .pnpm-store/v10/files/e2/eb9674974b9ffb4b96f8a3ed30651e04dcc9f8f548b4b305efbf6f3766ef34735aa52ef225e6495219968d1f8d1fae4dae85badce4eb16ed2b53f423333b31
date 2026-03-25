Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("./_virtual/_rolldown/runtime.cjs");
const require_utils_async_caller = require("./utils/async_caller.cjs");
//#region src/embeddings.ts
var embeddings_exports = /* @__PURE__ */ require_runtime.__exportAll({ Embeddings: () => Embeddings });
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
		this.caller = new require_utils_async_caller.AsyncCaller(params ?? {});
	}
};
//#endregion
exports.Embeddings = Embeddings;
Object.defineProperty(exports, "embeddings_exports", {
	enumerable: true,
	get: function() {
		return embeddings_exports;
	}
});

//# sourceMappingURL=embeddings.cjs.map