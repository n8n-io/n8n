const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));
const __langchain_core_prompt_values = require_rolldown_runtime.__toESM(require("@langchain/core/prompt_values"));

//#region src/retrievers/hyde.ts
var hyde_exports = {};
require_rolldown_runtime.__export(hyde_exports, {
	HydeRetriever: () => HydeRetriever,
	getPromptTemplateFromKey: () => getPromptTemplateFromKey
});
/**
* A class for retrieving relevant documents based on a given query. It
* extends the VectorStoreRetriever class and uses a BaseLanguageModel to
* generate a hypothetical answer to the query, which is then used to
* retrieve relevant documents.
* @example
* ```typescript
* const retriever = new HydeRetriever({
*   vectorStore: new MemoryVectorStore(new OpenAIEmbeddings()),
*   llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
*   k: 1,
* });
* await vectorStore.addDocuments(
*   [
*     "My name is John.",
*     "My name is Bob.",
*     "My favourite food is pizza.",
*     "My favourite food is pasta.",
*   ].map((pageContent) => new Document({ pageContent })),
* );
* const results = await retriever.invoke(
*   "What is my favourite food?",
* );
* ```
*/
var HydeRetriever = class extends __langchain_core_vectorstores.VectorStoreRetriever {
	static lc_name() {
		return "HydeRetriever";
	}
	get lc_namespace() {
		return [
			"langchain",
			"retrievers",
			"hyde"
		];
	}
	llm;
	promptTemplate;
	constructor(fields) {
		super(fields);
		this.llm = fields.llm;
		this.promptTemplate = typeof fields.promptTemplate === "string" ? getPromptTemplateFromKey(fields.promptTemplate) : fields.promptTemplate;
		if (this.promptTemplate) {
			const { inputVariables } = this.promptTemplate;
			if (inputVariables.length !== 1 && inputVariables[0] !== "question") throw new Error(`Prompt template must accept a single input variable 'question'. Invalid input variables for prompt template: ${inputVariables}`);
		}
	}
	async _getRelevantDocuments(query, runManager) {
		let value = new __langchain_core_prompt_values.StringPromptValue(query);
		if (this.promptTemplate) value = await this.promptTemplate.formatPromptValue({ question: query });
		const res = await this.llm.generatePrompt([value]);
		const answer = res.generations[0][0].text;
		const results = await this.vectorStore.similaritySearch(answer, this.k, this.filter, runManager?.getChild("vectorstore"));
		return results;
	}
};
/**
* Returns a BasePromptTemplate instance based on a given PromptKey.
*/
function getPromptTemplateFromKey(key) {
	let template;
	switch (key) {
		case "websearch":
			template = `Please write a passage to answer the question
Question: {question}
Passage:`;
			break;
		case "scifact":
			template = `Please write a scientific paper passage to support/refute the claim
Claim: {question}
Passage:`;
			break;
		case "arguana":
			template = `Please write a counter argument for the passage
Passage: {question}
Counter Argument:`;
			break;
		case "trec-covid":
			template = `Please write a scientific paper passage to answer the question
Question: {question}
Passage:`;
			break;
		case "fiqa":
			template = `Please write a financial article passage to answer the question
Question: {question}
Passage:`;
			break;
		case "dbpedia-entity":
			template = `Please write a passage to answer the question.
Question: {question}
Passage:`;
			break;
		case "trec-news":
			template = `Please write a news passage about the topic.
Topic: {question}
Passage:`;
			break;
		case "mr-tydi":
			template = `Please write a passage in Swahili/Korean/Japanese/Bengali to answer the question in detail.
Question: {question}
Passage:`;
			break;
		default: throw new Error(`Invalid prompt key: ${key}`);
	}
	return __langchain_core_prompts.PromptTemplate.fromTemplate(template);
}

//#endregion
exports.HydeRetriever = HydeRetriever;
exports.getPromptTemplateFromKey = getPromptTemplateFromKey;
Object.defineProperty(exports, 'hyde_exports', {
  enumerable: true,
  get: function () {
    return hyde_exports;
  }
});
//# sourceMappingURL=hyde.cjs.map