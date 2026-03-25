import { PromptTemplate } from "@langchain/core/prompts";

//#region src/evaluation/criteria/prompt.ts
const template = `You are assessing a submitted answer on a given task or input based on a set of criteria. Here is the data:
[BEGIN DATA]
***
[Input]: {input}
***
[Submission]: {output}
***
[Criteria]: {criteria}
***
[END DATA]
Does the submission meet the Criteria? First, write out in a step by step manner your reasoning about each criterion to be sure that your conclusion is correct. Avoid simply stating the correct answers at the outset. Then print only the single character "Y" or "N" (without quotes or punctuation) on its own line corresponding to the correct answer of whether the submission meets all criteria. At the end, repeat just the letter again by itself on a new line.`;
const CRITERIA_PROMPT = /* @__PURE__ */ new PromptTemplate({
	inputVariables: [
		"input",
		"output",
		"criteria"
	],
	template
});
const referenceTemplate = `You are assessing a submitted answer on a given task or input based on a set of criteria. Here is the data:
[BEGIN DATA]
***
[Input]: {input}
***
[Submission]: {output}
***
[Criteria]: {criteria}
***
[Reference]: {reference}
***
[END DATA]
Does the submission meet the Criteria? First, write out in a step by step manner your reasoning about each criterion to be sure that your conclusion is correct. Avoid simply stating the correct answers at the outset. Then print only the single character "Y" or "N" (without quotes or punctuation) on its own line corresponding to the correct answer of whether the submission meets all criteria. At the end, repeat just the letter again by itself on a new line.`;
const PROMPT_WITH_REFERENCES = /* @__PURE__ */ new PromptTemplate({
	inputVariables: [
		"input",
		"output",
		"criteria",
		"reference"
	],
	template: referenceTemplate
});

//#endregion
export { CRITERIA_PROMPT, PROMPT_WITH_REFERENCES };
//# sourceMappingURL=prompt.js.map