import { ChatPromptTemplate, HumanMessagePromptTemplate, PromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { ConditionalPromptSelector, isChatModel } from "@langchain/core/example_selectors";

//#region src/chains/question_answering/stuff_prompts.ts
const DEFAULT_QA_PROMPT = /* @__PURE__ */ new PromptTemplate({
	template: "Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.\n\n{context}\n\nQuestion: {question}\nHelpful Answer:",
	inputVariables: ["context", "question"]
});
const system_template = `Use the following pieces of context to answer the users question. 
If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
{context}`;
const messages = [/* @__PURE__ */ SystemMessagePromptTemplate.fromTemplate(system_template), /* @__PURE__ */ HumanMessagePromptTemplate.fromTemplate("{question}")];
const CHAT_PROMPT = /* @__PURE__ */ ChatPromptTemplate.fromMessages(messages);
const QA_PROMPT_SELECTOR = /* @__PURE__ */ new ConditionalPromptSelector(DEFAULT_QA_PROMPT, [[isChatModel, CHAT_PROMPT]]);

//#endregion
export { QA_PROMPT_SELECTOR };
//# sourceMappingURL=stuff_prompts.js.map