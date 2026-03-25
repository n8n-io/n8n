const require_rolldown_runtime = require('../../../_virtual/rolldown_runtime.cjs');
const require_util_document = require('../../../util/document.cjs');
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));
const zod = require_rolldown_runtime.__toESM(require("zod"));

//#region src/agents/toolkits/conversational_retrieval/tool.ts
function createRetrieverTool(retriever, input) {
	const func = async ({ input: input$1 }, runManager) => {
		const docs = await retriever.invoke(input$1, runManager?.getChild("retriever"));
		return require_util_document.formatDocumentsAsString(docs);
	};
	const schema = zod.z.object({ input: zod.z.string().describe("Natural language query used as input to the retriever") });
	return new __langchain_core_tools.DynamicStructuredTool({
		...input,
		func,
		schema
	});
}

//#endregion
exports.createRetrieverTool = createRetrieverTool;
//# sourceMappingURL=tool.cjs.map