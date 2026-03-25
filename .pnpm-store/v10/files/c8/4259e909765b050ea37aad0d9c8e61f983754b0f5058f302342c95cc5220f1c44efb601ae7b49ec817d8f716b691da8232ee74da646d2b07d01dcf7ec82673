import { LLMChain } from "../../../chains/llm_chain.js";
import { SUFFIX } from "../../mrkl/prompt.js";
import { ZeroShotAgent } from "../../mrkl/index.js";
import { AgentExecutor } from "../../executor.js";
import { VectorStoreQATool } from "../../../tools/vectorstore.js";
import { VECTOR_PREFIX, VECTOR_ROUTER_PREFIX } from "./prompt.js";
import { BaseToolkit } from "@langchain/core/tools";

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
var VectorStoreToolkit = class extends BaseToolkit {
	tools;
	llm;
	constructor(vectorStoreInfo, llm) {
		super();
		const description = VectorStoreQATool.getDescription(vectorStoreInfo.name, vectorStoreInfo.description);
		this.llm = llm;
		this.tools = [new VectorStoreQATool(vectorStoreInfo.name, description, {
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
var VectorStoreRouterToolkit = class extends BaseToolkit {
	tools;
	vectorStoreInfos;
	llm;
	constructor(vectorStoreInfos, llm) {
		super();
		this.llm = llm;
		this.vectorStoreInfos = vectorStoreInfos;
		this.tools = vectorStoreInfos.map((vectorStoreInfo) => {
			const description = VectorStoreQATool.getDescription(vectorStoreInfo.name, vectorStoreInfo.description);
			return new VectorStoreQATool(vectorStoreInfo.name, description, {
				vectorStore: vectorStoreInfo.vectorStore,
				llm: this.llm
			});
		});
	}
};
function createVectorStoreAgent(llm, toolkit, args) {
	const { prefix = VECTOR_PREFIX, suffix = SUFFIX, inputVariables = ["input", "agent_scratchpad"] } = args ?? {};
	const { tools } = toolkit;
	const prompt = ZeroShotAgent.createPrompt(tools, {
		prefix,
		suffix,
		inputVariables
	});
	const chain = new LLMChain({
		prompt,
		llm
	});
	const agent = new ZeroShotAgent({
		llmChain: chain,
		allowedTools: tools.map((t) => t.name)
	});
	return AgentExecutor.fromAgentAndTools({
		agent,
		tools,
		returnIntermediateSteps: true
	});
}
function createVectorStoreRouterAgent(llm, toolkit, args) {
	const { prefix = VECTOR_ROUTER_PREFIX, suffix = SUFFIX, inputVariables = ["input", "agent_scratchpad"] } = args ?? {};
	const { tools } = toolkit;
	const prompt = ZeroShotAgent.createPrompt(tools, {
		prefix,
		suffix,
		inputVariables
	});
	const chain = new LLMChain({
		prompt,
		llm
	});
	const agent = new ZeroShotAgent({
		llmChain: chain,
		allowedTools: tools.map((t) => t.name)
	});
	return AgentExecutor.fromAgentAndTools({
		agent,
		tools,
		returnIntermediateSteps: true
	});
}

//#endregion
export { VectorStoreRouterToolkit, VectorStoreToolkit, createVectorStoreAgent, createVectorStoreRouterAgent };
//# sourceMappingURL=vectorstore.js.map