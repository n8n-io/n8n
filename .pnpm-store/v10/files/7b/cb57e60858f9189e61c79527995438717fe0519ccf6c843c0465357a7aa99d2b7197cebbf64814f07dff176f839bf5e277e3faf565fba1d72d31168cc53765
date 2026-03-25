import { formatDocumentsAsString } from "../../../util/document.js";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

//#region src/agents/toolkits/conversational_retrieval/tool.ts
function createRetrieverTool(retriever, input) {
	const func = async ({ input: input$1 }, runManager) => {
		const docs = await retriever.invoke(input$1, runManager?.getChild("retriever"));
		return formatDocumentsAsString(docs);
	};
	const schema = z.object({ input: z.string().describe("Natural language query used as input to the retriever") });
	return new DynamicStructuredTool({
		...input,
		func,
		schema
	});
}

//#endregion
export { createRetrieverTool };
//# sourceMappingURL=tool.js.map