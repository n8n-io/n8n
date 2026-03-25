import { PromptTemplate } from "@langchain/core/prompts";

//#region src/chains/summarization/refine_prompts.ts
const refinePromptTemplate = `Your job is to produce a final summary
We have provided an existing summary up to a certain point: "{existing_answer}"
We have the opportunity to refine the existing summary
(only if needed) with some more context below.
------------
"{text}"
------------

Given the new context, refine the original summary
If the context isn't useful, return the original summary.

REFINED SUMMARY:`;
const REFINE_PROMPT = /* @__PURE__ */ new PromptTemplate({
	template: refinePromptTemplate,
	inputVariables: ["existing_answer", "text"]
});

//#endregion
export { REFINE_PROMPT };
//# sourceMappingURL=refine_prompts.js.map