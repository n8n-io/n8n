import { __export } from "../_virtual/rolldown_runtime.js";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";

//#region src/chains/retrieval.ts
var retrieval_exports = {};
__export(retrieval_exports, { createRetrievalChain: () => createRetrievalChain });
function isBaseRetriever(x) {
	return !!x && typeof x.invoke === "function";
}
/**
* Create a retrieval chain that retrieves documents and then passes them on.
* @param {CreateRetrievalChainParams} params A params object
*     containing a retriever and a combineDocsChain.
* @returns An LCEL Runnable which returns a an object
*     containing at least `context` and `answer` keys.
* @example
* ```typescript
* // pnpm add langchain @langchain/openai
*
* import { ChatOpenAI } from "@langchain/openai";
* import { pull } from "langchain/hub";
* import { createRetrievalChain } from "@langchain/classic/chains/retrieval";
* import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents";
*
* const retrievalQAChatPrompt = await pull("langchain-ai/retrieval-qa-chat");
* const llm = new ChatOpenAI({ model: "gpt-4o-mini" });
* const retriever = ...
* const combineDocsChain = await createStuffDocumentsChain(...);
* const retrievalChain = await createRetrievalChain({
*   retriever,
*   combineDocsChain,
* });
* const response = await chain.invoke({ input: "..." });
* ```
*/
async function createRetrievalChain({ retriever, combineDocsChain }) {
	let retrieveDocumentsChain;
	if (isBaseRetriever(retriever)) retrieveDocumentsChain = RunnableSequence.from([(input) => input.input, retriever]);
	else retrieveDocumentsChain = retriever;
	const retrievalChain = RunnableSequence.from([RunnablePassthrough.assign({
		context: retrieveDocumentsChain.withConfig({ runName: "retrieve_documents" }),
		chat_history: (input) => input.chat_history ?? []
	}), RunnablePassthrough.assign({ answer: combineDocsChain })]).withConfig({ runName: "retrieval_chain" });
	return retrievalChain;
}

//#endregion
export { createRetrievalChain, retrieval_exports };
//# sourceMappingURL=retrieval.js.map