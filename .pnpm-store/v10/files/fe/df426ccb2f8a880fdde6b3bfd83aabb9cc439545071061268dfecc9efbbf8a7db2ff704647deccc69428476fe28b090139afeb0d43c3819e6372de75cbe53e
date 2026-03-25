import { LLMChain } from "../../chains/llm_chain.js";
import { QA_PROMPT } from "./prompt.js";

//#region src/evaluation/qa/eval_chain.ts
const eqSet = (xs, ys) => xs.size === ys.size && [...xs].every((x) => ys.has(x));
var QAEvalChain = class extends LLMChain {
	static lc_name() {
		return "QAEvalChain";
	}
	static fromLlm(llm, options = {}) {
		const prompt = options.prompt || QA_PROMPT;
		const expectedInputVars = new Set([
			"query",
			"answer",
			"result"
		]);
		const inputVarsSet = new Set(prompt.inputVariables);
		if (!eqSet(expectedInputVars, inputVarsSet)) throw new Error(`Input variables should be ${[...expectedInputVars]}, but got ${prompt.inputVariables}`);
		return new this({
			llm,
			prompt,
			...options.chainInput
		});
	}
	async evaluate(examples, predictions, args = {
		questionKey: "query",
		answerKey: "answer",
		predictionKey: "result"
	}) {
		const inputs = examples.map((example, i) => ({
			query: example[args.questionKey],
			answer: example[args.answerKey],
			result: predictions[i][args.predictionKey]
		}));
		return await this.apply(inputs);
	}
};

//#endregion
export { QAEvalChain };
//# sourceMappingURL=eval_chain.js.map