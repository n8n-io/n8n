import { AIMessagePromptTemplate, ChatPromptTemplate, HumanMessagePromptTemplate, PromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { ConditionalPromptSelector, isChatModel } from "@langchain/core/example_selectors";

//#region src/chains/question_answering/refine_prompts.ts
const DEFAULT_REFINE_PROMPT_TMPL = `The original question is as follows: {question}
We have provided an existing answer: {existing_answer}
We have the opportunity to refine the existing answer
(only if needed) with some more context below.
------------
{context}
------------
Given the new context, refine the original answer to better answer the question. 
If the context isn't useful, return the original answer.`;
const DEFAULT_REFINE_PROMPT = /* @__PURE__ */ new PromptTemplate({
	inputVariables: [
		"question",
		"existing_answer",
		"context"
	],
	template: DEFAULT_REFINE_PROMPT_TMPL
});
const refineTemplate = `The original question is as follows: {question}
We have provided an existing answer: {existing_answer}
We have the opportunity to refine the existing answer
(only if needed) with some more context below.
------------
{context}
------------
Given the new context, refine the original answer to better answer the question. 
If the context isn't useful, return the original answer.`;
const messages = [
	/* @__PURE__ */ HumanMessagePromptTemplate.fromTemplate("{question}"),
	/* @__PURE__ */ AIMessagePromptTemplate.fromTemplate("{existing_answer}"),
	/* @__PURE__ */ HumanMessagePromptTemplate.fromTemplate(refineTemplate)
];
const CHAT_REFINE_PROMPT = /* @__PURE__ */ ChatPromptTemplate.fromMessages(messages);
const REFINE_PROMPT_SELECTOR = /* @__PURE__ */ new ConditionalPromptSelector(DEFAULT_REFINE_PROMPT, [[isChatModel, CHAT_REFINE_PROMPT]]);
const DEFAULT_TEXT_QA_PROMPT_TMPL = `Context information is below. 
---------------------
{context}
---------------------
Given the context information and no prior knowledge, answer the question: {question}`;
const DEFAULT_TEXT_QA_PROMPT = /* @__PURE__ */ new PromptTemplate({
	inputVariables: ["context", "question"],
	template: DEFAULT_TEXT_QA_PROMPT_TMPL
});
const chat_qa_prompt_template = `Context information is below. 
---------------------
{context}
---------------------
Given the context information and no prior knowledge, answer any questions`;
const chat_messages = [/* @__PURE__ */ SystemMessagePromptTemplate.fromTemplate(chat_qa_prompt_template), /* @__PURE__ */ HumanMessagePromptTemplate.fromTemplate("{question}")];
const CHAT_QUESTION_PROMPT = /* @__PURE__ */ ChatPromptTemplate.fromMessages(chat_messages);
const QUESTION_PROMPT_SELECTOR = /* @__PURE__ */ new ConditionalPromptSelector(DEFAULT_TEXT_QA_PROMPT, [[isChatModel, CHAT_QUESTION_PROMPT]]);

//#endregion
export { QUESTION_PROMPT_SELECTOR, REFINE_PROMPT_SELECTOR };
//# sourceMappingURL=refine_prompts.js.map