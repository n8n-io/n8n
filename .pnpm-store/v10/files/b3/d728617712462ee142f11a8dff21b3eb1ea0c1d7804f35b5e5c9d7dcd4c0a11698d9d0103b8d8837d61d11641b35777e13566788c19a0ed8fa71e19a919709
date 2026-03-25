import { ConversationChain, DEFAULT_TEMPLATE } from "../conversation.js";
import { RetrievalQAChain } from "../retrieval_qa.js";
import { MultiRouteChain } from "./multi_route.js";
import { LLMRouterChain } from "./llm_router.js";
import { zipEntries } from "./utils.js";
import { RouterOutputParser } from "../../output_parsers/router.js";
import { STRUCTURED_MULTI_RETRIEVAL_ROUTER_TEMPLATE } from "./multi_retrieval_prompt.js";
import { PromptTemplate, interpolateFString } from "@langchain/core/prompts";
import { z } from "zod/v3";

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
var MultiRetrievalQAChain = class MultiRetrievalQAChain extends MultiRouteChain {
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
		const destinations = zipEntries(retrieverNames, retrieverDescriptions).map(([name, desc]) => `${name}: ${desc}`);
		const structuredOutputParserSchema = z.object({
			destination: z.string().optional().describe("name of the question answering system to use or \"DEFAULT\""),
			next_inputs: z.object({ query: z.string().describe("a potentially modified version of the original input") }).describe("input to be fed to the next model")
		});
		const outputParser = new RouterOutputParser(structuredOutputParserSchema);
		const destinationsStr = destinations.join("\n");
		const routerTemplate = interpolateFString(STRUCTURED_MULTI_RETRIEVAL_ROUTER_TEMPLATE(outputParser.getFormatInstructions({ interpolationDepth: 4 })), { destinations: destinationsStr });
		const routerPrompt = new PromptTemplate({
			template: routerTemplate,
			inputVariables: ["input"],
			outputParser
		});
		const routerChain = LLMRouterChain.fromLLM(llm, routerPrompt);
		const prompts = retrieverPrompts ?? retrievers.map(() => null);
		const destinationChains = zipEntries(retrieverNames, retrievers, prompts).reduce((acc, [name, retriever, prompt]) => {
			const opt = retrievalQAChainOpts ?? {};
			if (prompt) opt.prompt = prompt;
			acc[name] = RetrievalQAChain.fromLLM(llm, retriever, opt);
			return acc;
		}, {});
		let _defaultChain;
		if (defaultChain) _defaultChain = defaultChain;
		else if (defaultRetriever) _defaultChain = RetrievalQAChain.fromLLM(llm, defaultRetriever, {
			...retrievalQAChainOpts,
			prompt: defaultPrompt
		});
		else {
			const promptTemplate = DEFAULT_TEMPLATE.replace("input", "query");
			const prompt = new PromptTemplate({
				template: promptTemplate,
				inputVariables: ["history", "query"]
			});
			_defaultChain = new ConversationChain({
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
export { MultiRetrievalQAChain };
//# sourceMappingURL=multi_retrieval_qa.js.map