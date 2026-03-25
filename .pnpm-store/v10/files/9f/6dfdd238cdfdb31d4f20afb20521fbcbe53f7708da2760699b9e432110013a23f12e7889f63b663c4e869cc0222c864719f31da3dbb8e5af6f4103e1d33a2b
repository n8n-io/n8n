const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_util_document = require('../util/document.cjs');
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));
const zod_v3 = require_rolldown_runtime.__toESM(require("zod/v3"));

//#region src/tools/retriever.ts
var retriever_exports = {};
require_rolldown_runtime.__export(retriever_exports, { createRetrieverTool: () => createRetrieverTool });
function createRetrieverTool(retriever, input) {
	const func = async ({ query }, runManager) => {
		const docs = await retriever.invoke(query, runManager?.getChild("retriever"));
		return require_util_document.formatDocumentsAsString(docs);
	};
	const schema = zod_v3.z.object({ query: zod_v3.z.string().describe("query to look up in retriever") });
	return new __langchain_core_tools.DynamicStructuredTool({
		...input,
		func,
		schema
	});
}

//#endregion
exports.createRetrieverTool = createRetrieverTool;
Object.defineProperty(exports, 'retriever_exports', {
  enumerable: true,
  get: function () {
    return retriever_exports;
  }
});
//# sourceMappingURL=retriever.cjs.map