const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const __langchain_core_example_selectors = require_rolldown_runtime.__toESM(require("@langchain/core/example_selectors"));

//#region src/chains/question_answering/stuff_prompts.ts
const DEFAULT_QA_PROMPT = /* @__PURE__ */ new __langchain_core_prompts.PromptTemplate({
	template: "Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.\n\n{context}\n\nQuestion: {question}\nHelpful Answer:",
	inputVariables: ["context", "question"]
});
const system_template = `Use the following pieces of context to answer the users question. 
If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
{context}`;
const messages = [/* @__PURE__ */ __langchain_core_prompts.SystemMessagePromptTemplate.fromTemplate(system_template), /* @__PURE__ */ __langchain_core_prompts.HumanMessagePromptTemplate.fromTemplate("{question}")];
const CHAT_PROMPT = /* @__PURE__ */ __langchain_core_prompts.ChatPromptTemplate.fromMessages(messages);
const QA_PROMPT_SELECTOR = /* @__PURE__ */ new __langchain_core_example_selectors.ConditionalPromptSelector(DEFAULT_QA_PROMPT, [[__langchain_core_example_selectors.isChatModel, CHAT_PROMPT]]);

//#endregion
exports.QA_PROMPT_SELECTOR = QA_PROMPT_SELECTOR;
//# sourceMappingURL=stuff_prompts.cjs.map