const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_criteria = require('./criteria/criteria.cjs');
require('./criteria/index.cjs');
const require_trajectory = require('./agents/trajectory.cjs');
require('./agents/index.cjs');
const require_base = require('./embedding_distance/base.cjs');
require('./embedding_distance/index.cjs');
const require_pairwise = require('./comparison/pairwise.cjs');
require('./comparison/index.cjs');
const __langchain_core_language_models_chat_models = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/chat_models"));

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
			evaluator = await require_criteria.CriteriaEvalChain.fromLLM(llm, criteria, chainOptions);
			break;
		case "labeled_criteria":
			evaluator = await require_criteria.LabeledCriteriaEvalChain.fromLLM(llm, criteria, chainOptions);
			break;
		case "pairwise_string":
			evaluator = await require_pairwise.PairwiseStringEvalChain.fromLLM(llm, criteria, chainOptions);
			break;
		case "labeled_pairwise_string":
			evaluator = await require_pairwise.LabeledPairwiseStringEvalChain.fromLLM(llm, criteria, chainOptions);
			break;
		case "trajectory":
			if (!(llm instanceof __langchain_core_language_models_chat_models.BaseChatModel)) throw new Error("LLM must be an instance of a base chat model.");
			evaluator = await require_trajectory.TrajectoryEvalChain.fromLLM(llm, agentTools, chainOptions);
			break;
		case "embedding_distance":
			evaluator = new require_base.EmbeddingDistanceEvalChain({
				embedding: options?.embedding,
				distanceMetric: options?.distanceMetric
			});
			break;
		case "pairwise_embedding_distance":
			evaluator = new require_base.PairwiseEmbeddingDistanceEvalChain({});
			break;
		default: throw new Error(`Unknown type: ${type}`);
	}
	return evaluator;
}

//#endregion
exports.loadEvaluator = loadEvaluator;
//# sourceMappingURL=loader.cjs.map