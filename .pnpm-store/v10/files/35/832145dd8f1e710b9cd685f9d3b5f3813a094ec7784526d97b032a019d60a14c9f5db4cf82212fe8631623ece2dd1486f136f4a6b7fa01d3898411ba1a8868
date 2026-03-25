const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));

//#region src/chains/history_aware_retriever.ts
var history_aware_retriever_exports = {};
require_rolldown_runtime.__export(history_aware_retriever_exports, { createHistoryAwareRetriever: () => createHistoryAwareRetriever });
/**
* Create a chain that takes conversation history and returns documents.
* If there is no `chat_history`, then the `input` is just passed directly to the
* retriever. If there is `chat_history`, then the prompt and LLM will be used
* to generate a search query. That search query is then passed to the retriever.
* @param {CreateHistoryAwareRetriever} params
* @returns An LCEL Runnable. The runnable input must take in `input`, and if there
* is chat history should take it in the form of `chat_history`.
* The Runnable output is a list of Documents
* @example
* ```typescript
* // pnpm add langchain @langchain/openai
*
* import { ChatOpenAI } from "@langchain/openai";
* import { pull } from "langchain/hub";
* import { createHistoryAwareRetriever } from "@langchain/classic/chains/history_aware_retriever";
*
* const rephrasePrompt = await pull("langchain-ai/chat-langchain-rephrase");
* const llm = new ChatOpenAI({ model: "gpt-4o-mini" });
* const retriever = ...
* const chain = await createHistoryAwareRetriever({
*   llm,
*   retriever,
*   rephrasePrompt,
* });
* const result = await chain.invoke({"input": "...", "chat_history": [] })
* ```
*/
async function createHistoryAwareRetriever({ llm, retriever, rephrasePrompt }) {
	if (!rephrasePrompt.inputVariables.includes("input")) throw new Error(`Expected "input" to be a prompt variable, but got ${JSON.stringify(rephrasePrompt.inputVariables)}`);
	const retrieveDocuments = __langchain_core_runnables.RunnableBranch.from([[(input) => !input.chat_history || input.chat_history.length === 0, __langchain_core_runnables.RunnableSequence.from([(input) => input.input, retriever])], __langchain_core_runnables.RunnableSequence.from([
		rephrasePrompt,
		llm,
		new __langchain_core_output_parsers.StringOutputParser(),
		retriever
	])]).withConfig({ runName: "history_aware_retriever" });
	return retrieveDocuments;
}

//#endregion
exports.createHistoryAwareRetriever = createHistoryAwareRetriever;
Object.defineProperty(exports, 'history_aware_retriever_exports', {
  enumerable: true,
  get: function () {
    return history_aware_retriever_exports;
  }
});
//# sourceMappingURL=history_aware_retriever.cjs.map