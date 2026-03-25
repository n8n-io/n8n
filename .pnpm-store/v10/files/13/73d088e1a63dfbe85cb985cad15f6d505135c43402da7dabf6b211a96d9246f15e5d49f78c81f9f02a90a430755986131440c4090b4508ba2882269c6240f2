const require_rolldown_runtime = require('../../../_virtual/rolldown_runtime.cjs');
const require_llm_chain = require('../../../chains/llm_chain.cjs');
const require_prompt = require('../../mrkl/prompt.cjs');
const require_index = require('../../mrkl/index.cjs');
const require_executor = require('../../executor.cjs');
const require_vectorstore = require('../../../tools/vectorstore.cjs');
const require_prompt$1 = require('./prompt.cjs');
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));

//#region src/agents/toolkits/vectorstore/vectorstore.ts
/**
* Class representing a toolkit for working with a single vector store. It
* initializes the vector store QA tool based on the provided vector store
* information and language model.
* @example
* ```typescript
* const toolkit = new VectorStoreToolkit(
*   {
*     name: "state_of_union_address",
*     description: "the most recent state of the Union address",
*     vectorStore: new HNSWLib(),
*   },
*   new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
* );
* const result = await toolkit.invoke({
*   input:
*     "What did biden say about Ketanji Brown Jackson in the state of the union address?",
* });
* console.log(`Got output ${result.output}`);
* ```
*/
var VectorStoreToolkit = class extends __langchain_core_tools.BaseToolkit {
	tools;
	llm;
	constructor(vectorStoreInfo, llm) {
		super();
		const description = require_vectorstore.VectorStoreQATool.getDescription(vectorStoreInfo.name, vectorStoreInfo.description);
		this.llm = llm;
		this.tools = [new require_vectorstore.VectorStoreQATool(vectorStoreInfo.name, description, {
			vectorStore: vectorStoreInfo.vectorStore,
			llm: this.llm
		})];
	}
};
/**
* Class representing a toolkit for working with multiple vector stores.
* It initializes multiple vector store QA tools based on the provided
* vector store information and language model.
*/
var VectorStoreRouterToolkit = class extends __langchain_core_tools.BaseToolkit {
	tools;
	vectorStoreInfos;
	llm;
	constructor(vectorStoreInfos, llm) {
		super();
		this.llm = llm;
		this.vectorStoreInfos = vectorStoreInfos;
		this.tools = vectorStoreInfos.map((vectorStoreInfo) => {
			const description = require_vectorstore.VectorStoreQATool.getDescription(vectorStoreInfo.name, vectorStoreInfo.description);
			return new require_vectorstore.VectorStoreQATool(vectorStoreInfo.name, description, {
				vectorStore: vectorStoreInfo.vectorStore,
				llm: this.llm
			});
		});
	}
};
function createVectorStoreAgent(llm, toolkit, args) {
	const { prefix = require_prompt$1.VECTOR_PREFIX, suffix = require_prompt.SUFFIX, inputVariables = ["input", "agent_scratchpad"] } = args ?? {};
	const { tools } = toolkit;
	const prompt = require_index.ZeroShotAgent.createPrompt(tools, {
		prefix,
		suffix,
		inputVariables
	});
	const chain = new require_llm_chain.LLMChain({
		prompt,
		llm
	});
	const agent = new require_index.ZeroShotAgent({
		llmChain: chain,
		allowedTools: tools.map((t) => t.name)
	});
	return require_executor.AgentExecutor.fromAgentAndTools({
		agent,
		tools,
		returnIntermediateSteps: true
	});
}
function createVectorStoreRouterAgent(llm, toolkit, args) {
	const { prefix = require_prompt$1.VECTOR_ROUTER_PREFIX, suffix = require_prompt.SUFFIX, inputVariables = ["input", "agent_scratchpad"] } = args ?? {};
	const { tools } = toolkit;
	const prompt = require_index.ZeroShotAgent.createPrompt(tools, {
		prefix,
		suffix,
		inputVariables
	});
	const chain = new require_llm_chain.LLMChain({
		prompt,
		llm
	});
	const agent = new require_index.ZeroShotAgent({
		llmChain: chain,
		allowedTools: tools.map((t) => t.name)
	});
	return require_executor.AgentExecutor.fromAgentAndTools({
		agent,
		tools,
		returnIntermediateSteps: true
	});
}

//#endregion
exports.VectorStoreRouterToolkit = VectorStoreRouterToolkit;
exports.VectorStoreToolkit = VectorStoreToolkit;
exports.createVectorStoreAgent = createVectorStoreAgent;
exports.createVectorStoreRouterAgent = createVectorStoreRouterAgent;
//# sourceMappingURL=vectorstore.cjs.map