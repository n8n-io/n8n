const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_conversation = require('../conversation.cjs');
const require_retrieval_qa = require('../retrieval_qa.cjs');
const require_multi_route = require('./multi_route.cjs');
const require_llm_router = require('./llm_router.cjs');
const require_utils = require('./utils.cjs');
const require_router = require('../../output_parsers/router.cjs');
const require_multi_retrieval_prompt = require('./multi_retrieval_prompt.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const zod_v3 = require_rolldown_runtime.__toESM(require("zod/v3"));

//#region src/chains/router/multi_retrieval_qa.ts
/**
* A class that represents a multi-retrieval question answering chain in
* the LangChain framework. It extends the MultiRouteChain class and
* provides additional functionality specific to multi-retrieval QA
* chains.
* @example
* ```typescript
* const multiRetrievalQAChain = MultiRetrievalQAChain.fromLLMAndRetrievers(
*   new ChatOpenAI({ model: "gpt-4o-mini" }),
*   {
*     retrieverNames: ["aqua teen", "mst3k", "animaniacs"],
*     retrieverDescriptions: [
*       "Good for answering questions about Aqua Teen Hunger Force theme song",
*       "Good for answering questions about Mystery Science Theater 3000 theme song",
*       "Good for answering questions about Animaniacs theme song",
*     ],
*     retrievers: [
*       new MemoryVectorStore().asRetriever(3),
*       new MemoryVectorStore().asRetriever(3),
*       new MemoryVectorStore().asRetriever(3),
*     ],
*     retrievalQAChainOpts: {
*       returnSourceDocuments: true,
*     },
*   },
* );
*
* const result = await multiRetrievalQAChain.call({
*   input:
*     "In the Aqua Teen Hunger Force theme song, who calls himself the mike rula?",
* });
*
* console.log(result.sourceDocuments, result.text);
* ```
*/
var MultiRetrievalQAChain = class MultiRetrievalQAChain extends require_multi_route.MultiRouteChain {
	get outputKeys() {
		return ["result"];
	}
	/**
	* @deprecated Use `fromRetrieversAndPrompts` instead
	*/
	static fromRetrievers(llm, retrieverNames, retrieverDescriptions, retrievers, retrieverPrompts, defaults, options) {
		return MultiRetrievalQAChain.fromLLMAndRetrievers(llm, {
			retrieverNames,
			retrieverDescriptions,
			retrievers,
			retrieverPrompts,
			defaults,
			multiRetrievalChainOpts: options
		});
	}
	/**
	* A static method that creates an instance of MultiRetrievalQAChain from
	* a BaseLanguageModel and a set of retrievers. It takes in optional
	* parameters for the retriever names, descriptions, prompts, defaults,
	* and additional options. It is an alternative method to fromRetrievers
	* and provides more flexibility in configuring the underlying chains.
	* @param llm A BaseLanguageModel instance.
	* @param retrieverNames An array of retriever names.
	* @param retrieverDescriptions An array of retriever descriptions.
	* @param retrievers An array of BaseRetrieverInterface instances.
	* @param retrieverPrompts An optional array of PromptTemplate instances for the retrievers.
	* @param defaults An optional MultiRetrievalDefaults instance.
	* @param multiRetrievalChainOpts Additional optional parameters for the multi-retrieval chain.
	* @param retrievalQAChainOpts Additional optional parameters for the retrieval QA chain.
	* @returns A new instance of MultiRetrievalQAChain.
	*/
	static fromLLMAndRetrievers(llm, { retrieverNames, retrieverDescriptions, retrievers, retrieverPrompts, defaults, multiRetrievalChainOpts, retrievalQAChainOpts }) {
		const { defaultRetriever, defaultPrompt, defaultChain } = defaults ?? {};
		if (defaultPrompt && !defaultRetriever) throw new Error("`default_retriever` must be specified if `default_prompt` is \nprovided. Received only `default_prompt`.");
		const destinations = require_utils.zipEntries(retrieverNames, retrieverDescriptions).map(([name, desc]) => `${name}: ${desc}`);
		const structuredOutputParserSchema = zod_v3.z.object({
			destination: zod_v3.z.string().optional().describe("name of the question answering system to use or \"DEFAULT\""),
			next_inputs: zod_v3.z.object({ query: zod_v3.z.string().describe("a potentially modified version of the original input") }).describe("input to be fed to the next model")
		});
		const outputParser = new require_router.RouterOutputParser(structuredOutputParserSchema);
		const destinationsStr = destinations.join("\n");
		const routerTemplate = (0, __langchain_core_prompts.interpolateFString)(require_multi_retrieval_prompt.STRUCTURED_MULTI_RETRIEVAL_ROUTER_TEMPLATE(outputParser.getFormatInstructions({ interpolationDepth: 4 })), { destinations: destinationsStr });
		const routerPrompt = new __langchain_core_prompts.PromptTemplate({
			template: routerTemplate,
			inputVariables: ["input"],
			outputParser
		});
		const routerChain = require_llm_router.LLMRouterChain.fromLLM(llm, routerPrompt);
		const prompts = retrieverPrompts ?? retrievers.map(() => null);
		const destinationChains = require_utils.zipEntries(retrieverNames, retrievers, prompts).reduce((acc, [name, retriever, prompt]) => {
			const opt = retrievalQAChainOpts ?? {};
			if (prompt) opt.prompt = prompt;
			acc[name] = require_retrieval_qa.RetrievalQAChain.fromLLM(llm, retriever, opt);
			return acc;
		}, {});
		let _defaultChain;
		if (defaultChain) _defaultChain = defaultChain;
		else if (defaultRetriever) _defaultChain = require_retrieval_qa.RetrievalQAChain.fromLLM(llm, defaultRetriever, {
			...retrievalQAChainOpts,
			prompt: defaultPrompt
		});
		else {
			const promptTemplate = require_conversation.DEFAULT_TEMPLATE.replace("input", "query");
			const prompt = new __langchain_core_prompts.PromptTemplate({
				template: promptTemplate,
				inputVariables: ["history", "query"]
			});
			_defaultChain = new require_conversation.ConversationChain({
				llm,
				prompt,
				outputKey: "result"
			});
		}
		return new MultiRetrievalQAChain({
			...multiRetrievalChainOpts,
			routerChain,
			destinationChains,
			defaultChain: _defaultChain
		});
	}
	_chainType() {
		return "multi_retrieval_qa_chain";
	}
};

//#endregion
exports.MultiRetrievalQAChain = MultiRetrievalQAChain;
//# sourceMappingURL=multi_retrieval_qa.cjs.map