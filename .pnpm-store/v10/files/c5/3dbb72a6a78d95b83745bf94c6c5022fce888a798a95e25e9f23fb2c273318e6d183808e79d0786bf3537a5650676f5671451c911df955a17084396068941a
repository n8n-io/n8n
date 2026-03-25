const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));

//#region src/evaluation/qa/prompt.ts
const QA_TEMPLATE = `You are a teacher grading a quiz.
You are given a question, the student's answer, and the true answer, and are asked to score the student answer as either CORRECT or INCORRECT.

Example Format:
QUESTION: question here
STUDENT ANSWER: student's answer here
TRUE ANSWER: true answer here
GRADE: CORRECT or INCORRECT here

Grade the student answers based ONLY on their factual accuracy. Ignore differences in punctuation and phrasing between the student answer and true answer. It is OK if the student answer contains more information than the true answer, as long as it does not contain any conflicting statements. Begin! 

QUESTION: {query}
STUDENT ANSWER: {result}
TRUE ANSWER: {answer}
GRADE:`;
const QA_PROMPT = /* @__PURE__ */ new __langchain_core_prompts.PromptTemplate({
	inputVariables: [
		"query",
		"result",
		"answer"
	],
	template: QA_TEMPLATE
});

//#endregion
exports.QA_PROMPT = QA_PROMPT;
//# sourceMappingURL=prompt.cjs.map