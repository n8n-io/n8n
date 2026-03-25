const require_llm_chain = require('../llm_chain.cjs');
const require_combine_docs_chain = require('../combine_docs_chain.cjs');
const require_stuff_prompts = require('./stuff_prompts.cjs');
const require_refine_prompts = require('./refine_prompts.cjs');

//#region src/chains/summarization/load.ts
const loadSummarizationChain = (llm, params = { type: "map_reduce" }) => {
	const { verbose } = params;
	if (params.type === "stuff") {
		const { prompt = require_stuff_prompts.DEFAULT_PROMPT } = params;
		const llmChain = new require_llm_chain.LLMChain({
			prompt,
			llm,
			verbose
		});
		const chain = new require_combine_docs_chain.StuffDocumentsChain({
			llmChain,
			documentVariableName: "text",
			verbose
		});
		return chain;
	}
	if (params.type === "map_reduce") {
		const { combineMapPrompt = require_stuff_prompts.DEFAULT_PROMPT, combinePrompt = require_stuff_prompts.DEFAULT_PROMPT, combineLLM, returnIntermediateSteps } = params;
		const llmChain = new require_llm_chain.LLMChain({
			prompt: combineMapPrompt,
			llm,
			verbose
		});
		const combineLLMChain = new require_llm_chain.LLMChain({
			prompt: combinePrompt,
			llm: combineLLM ?? llm,
			verbose
		});
		const combineDocumentChain = new require_combine_docs_chain.StuffDocumentsChain({
			llmChain: combineLLMChain,
			documentVariableName: "text",
			verbose
		});
		const chain = new require_combine_docs_chain.MapReduceDocumentsChain({
			llmChain,
			combineDocumentChain,
			documentVariableName: "text",
			returnIntermediateSteps,
			verbose
		});
		return chain;
	}
	if (params.type === "refine") {
		const { refinePrompt = require_refine_prompts.REFINE_PROMPT, refineLLM, questionPrompt = require_stuff_prompts.DEFAULT_PROMPT } = params;
		const llmChain = new require_llm_chain.LLMChain({
			prompt: questionPrompt,
			llm,
			verbose
		});
		const refineLLMChain = new require_llm_chain.LLMChain({
			prompt: refinePrompt,
			llm: refineLLM ?? llm,
			verbose
		});
		const chain = new require_combine_docs_chain.RefineDocumentsChain({
			llmChain,
			refineLLMChain,
			documentVariableName: "text",
			verbose
		});
		return chain;
	}
	throw new Error(`Invalid _type: ${params.type}`);
};

//#endregion
exports.loadSummarizationChain = loadSummarizationChain;
//# sourceMappingURL=load.cjs.map