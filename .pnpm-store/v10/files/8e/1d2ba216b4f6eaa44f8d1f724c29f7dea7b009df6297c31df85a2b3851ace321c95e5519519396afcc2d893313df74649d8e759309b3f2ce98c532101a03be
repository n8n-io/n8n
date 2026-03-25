const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));

//#region src/output_parsers/prompts.ts
const NAIVE_FIX_TEMPLATE = `Instructions:
--------------
{instructions}
--------------
Completion:
--------------
{completion}
--------------

Above, the Completion did not satisfy the constraints given in the Instructions.
Error:
--------------
{error}
--------------

Please try again. Please only respond with an answer that satisfies the constraints laid out in the Instructions:`;
const NAIVE_FIX_PROMPT = /* @__PURE__ */ __langchain_core_prompts.PromptTemplate.fromTemplate(NAIVE_FIX_TEMPLATE);

//#endregion
exports.NAIVE_FIX_PROMPT = NAIVE_FIX_PROMPT;
//# sourceMappingURL=prompts.cjs.map