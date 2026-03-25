const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));

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
const REFINE_PROMPT = /* @__PURE__ */ new __langchain_core_prompts.PromptTemplate({
	template: refinePromptTemplate,
	inputVariables: ["existing_answer", "text"]
});

//#endregion
exports.REFINE_PROMPT = REFINE_PROMPT;
//# sourceMappingURL=refine_prompts.cjs.map