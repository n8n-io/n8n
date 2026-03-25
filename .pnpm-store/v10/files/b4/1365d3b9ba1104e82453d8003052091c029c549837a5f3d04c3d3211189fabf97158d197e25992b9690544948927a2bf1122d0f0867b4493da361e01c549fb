import { CriteriaEvalChain, LabeledCriteriaEvalChain } from "./criteria/criteria.js";
import "./criteria/index.js";
import { TrajectoryEvalChain } from "./agents/trajectory.js";
import "./agents/index.js";
import { EmbeddingDistanceEvalChain, PairwiseEmbeddingDistanceEvalChain } from "./embedding_distance/base.js";
import "./embedding_distance/index.js";
import { LabeledPairwiseStringEvalChain, PairwiseStringEvalChain } from "./comparison/pairwise.js";
import "./comparison/index.js";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

//#region src/evaluation/loader.ts
/**
* Load the requested evaluation chain specified by a string
* @param type The type of evaluator to load.
* @param options
*        - llm The language model to use for the evaluator.
*        - criteria The criteria to use for the evaluator.
*        - agentTools A list of tools available to the agent,for TrajectoryEvalChain.
*/
async function loadEvaluator(type, options) {
	const { llm, chainOptions, criteria, agentTools } = options;
	let evaluator;
	switch (type) {
		case "criteria":
			evaluator = await CriteriaEvalChain.fromLLM(llm, criteria, chainOptions);
			break;
		case "labeled_criteria":
			evaluator = await LabeledCriteriaEvalChain.fromLLM(llm, criteria, chainOptions);
			break;
		case "pairwise_string":
			evaluator = await PairwiseStringEvalChain.fromLLM(llm, criteria, chainOptions);
			break;
		case "labeled_pairwise_string":
			evaluator = await LabeledPairwiseStringEvalChain.fromLLM(llm, criteria, chainOptions);
			break;
		case "trajectory":
			if (!(llm instanceof BaseChatModel)) throw new Error("LLM must be an instance of a base chat model.");
			evaluator = await TrajectoryEvalChain.fromLLM(llm, agentTools, chainOptions);
			break;
		case "embedding_distance":
			evaluator = new EmbeddingDistanceEvalChain({
				embedding: options?.embedding,
				distanceMetric: options?.distanceMetric
			});
			break;
		case "pairwise_embedding_distance":
			evaluator = new PairwiseEmbeddingDistanceEvalChain({});
			break;
		default: throw new Error(`Unknown type: ${type}`);
	}
	return evaluator;
}

//#endregion
export { loadEvaluator };
//# sourceMappingURL=loader.js.map