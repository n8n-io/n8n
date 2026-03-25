import { __export } from "../_virtual/rolldown_runtime.js";
import { formatDocumentsAsString } from "../util/document.js";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod/v3";

//#region src/tools/retriever.ts
var retriever_exports = {};
__export(retriever_exports, { createRetrieverTool: () => createRetrieverTool });
function createRetrieverTool(retriever, input) {
	const func = async ({ query }, runManager) => {
		const docs = await retriever.invoke(query, runManager?.getChild("retriever"));
		return formatDocumentsAsString(docs);
	};
	const schema = z.object({ query: z.string().describe("query to look up in retriever") });
	return new DynamicStructuredTool({
		...input,
		func,
		schema
	});
}

//#endregion
export { createRetrieverTool, retriever_exports };
//# sourceMappingURL=retriever.js.map