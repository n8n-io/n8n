import { BaseChain } from "../chains/base.js";
import { LLMChain } from "../chains/llm_chain.js";
import "../chains/index.js";

//#region src/evaluation/base.ts
/**
* Compare two sets for equality
*
* @param xs
* @param ys
*/
const eqSet = (xs, ys) => xs.size === ys.size && [...xs].every((x) => ys.has(x));
/**
* Base llm chain class for evaluators.
*/
var LLMEvalChain = class extends LLMChain {
	requiresInput = false;
	requiresReference = false;
	skipInputWarning = `Ignoring input in ${this.constructor.name}, as it is not expected.`;
	skipReferenceWarning = `Ignoring reference in ${this.constructor.name}, as it is not expected.`;
	/**
	* Check if the evaluation arguments are valid.
	* @param reference  The reference label.
	* @param input The input string.
	* @throws {Error} If the evaluator requires an input string but none is provided, or if the evaluator requires a reference label but none is provided.
	*/
	checkEvaluationArgs(reference, input) {
		if (this.requiresInput && input == null) throw new Error(`${this.constructor.name} requires an input string.`);
		else if (input != null && !this.requiresInput) console.warn(this.skipInputWarning);
		if (this.requiresReference && reference == null) throw new Error(`${this.constructor.name} requires a reference string.`);
		else if (reference != null && !this.requiresReference) console.warn(this.skipReferenceWarning);
	}
};
/**
* Base chain class for evaluators.
*/
var EvalChain = class extends BaseChain {
	requiresInput = false;
	requiresReference = false;
	skipInputWarning = `Ignoring input in ${this.constructor.name}, as it is not expected.`;
	skipReferenceWarning = `Ignoring reference in ${this.constructor.name}, as it is not expected.`;
	/**
	* Check if the evaluation arguments are valid.
	* @param reference  The reference label.
	* @param input The input string.
	* @throws {Error} If the evaluator requires an input string but none is provided, or if the evaluator requires a reference label but none is provided.
	*/
	checkEvaluationArgs(reference, input) {
		if (this.requiresInput && input == null) throw new Error(`${this.constructor.name} requires an input string.`);
		else if (input != null && !this.requiresInput) console.warn(this.skipInputWarning);
		if (this.requiresReference && reference == null) throw new Error(`${this.constructor.name} requires a reference string.`);
		else if (reference != null && !this.requiresReference) console.warn(this.skipReferenceWarning);
	}
};
/**
* Grade, tag, or otherwise evaluate predictions relative to their inputs
* and/or reference labels
*/
var LLMStringEvaluator = class extends LLMEvalChain {
	/**
	* The name of the evaluation.
	*/
	evaluationName = this.constructor.name;
	/**
	* Evaluate Chain or LLM output, based on optional input and label.
	* @returns The evaluation results containing the score or value. It is recommended that the dictionary contain the following keys:
	* - score: the score of the evaluation, if applicable.
	* - value: the string value of the evaluation, if applicable.
	* - reasoning: the reasoning for the evaluation, if applicable.
	* @param args
	* @param callOptions
	* @param config
	*/
	evaluateStrings(args, config) {
		this.checkEvaluationArgs(args.reference, args.input);
		return this._evaluateStrings(args, config);
	}
};
/**
* Grade, tag, or otherwise evaluate predictions relative to their inputs
* and/or reference labels
*/
var StringEvaluator = class extends EvalChain {
	/**
	* The name of the evaluation.
	*/
	evaluationName = this.constructor.name;
	/**
	* Evaluate Chain or LLM output, based on optional input and label.
	* @returns The evaluation results containing the score or value. It is recommended that the dictionary contain the following keys:
	* - score: the score of the evaluation, if applicable.
	* - value: the string value of the evaluation, if applicable.
	* - reasoning: the reasoning for the evaluation, if applicable.
	* @param args
	* @param config
	*/
	evaluateStrings(args, config) {
		this.checkEvaluationArgs(args.reference, args.input);
		return this._evaluateStrings(args, config);
	}
};
/**
* Compare the output of two models (or two outputs of the same model).
*/
var PairwiseStringEvaluator = class extends EvalChain {
	/**
	* The name of the evaluation.
	*/
	evaluationName = this.constructor.name;
	/**
	* Evaluate the output string pairs.
	* @param args
	* @param config
	* @return A dictionary containing the preference, scores, and/or other information.
	*/
	evaluateStringPairs(args, config) {
		return this._evaluateStringPairs(args, config);
	}
};
/**
* Compare the output of two models (or two outputs of the same model).
*/
var LLMPairwiseStringEvaluator = class extends LLMEvalChain {
	/**
	* The name of the evaluation.
	*/
	evaluationName = this.constructor.name;
	/**
	* Evaluate the output string pairs.
	* @param args
	* @param callOptions
	* @param config
	* @return A dictionary containing the preference, scores, and/or other information.
	*/
	evaluateStringPairs(args, callOptions, config) {
		this.checkEvaluationArgs(args.reference, args.input);
		return this._evaluateStringPairs(args, callOptions, config);
	}
};
/**
* Interface for evaluating agent trajectories.
*/
var AgentTrajectoryEvaluator = class extends LLMEvalChain {
	requiresInput = true;
	/**
	* The name of the evaluation.
	*/
	evaluationName = this.constructor.name;
	/**
	* Evaluate a trajectory.
	* @return The evaluation result.
	* @param args
	* @param callOptions
	* @param config
	*/
	evaluateAgentTrajectory(args, callOptions, config) {
		this.checkEvaluationArgs(args.reference, args.input);
		return this._evaluateAgentTrajectory(args, callOptions, config);
	}
};

//#endregion
export { AgentTrajectoryEvaluator, LLMPairwiseStringEvaluator, LLMStringEvaluator, PairwiseStringEvaluator, StringEvaluator, eqSet };
//# sourceMappingURL=base.js.map