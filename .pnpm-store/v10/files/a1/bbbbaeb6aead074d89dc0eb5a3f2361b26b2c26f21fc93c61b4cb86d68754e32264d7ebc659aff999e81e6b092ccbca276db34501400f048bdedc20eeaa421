const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __aws_sdk_client_bedrock_agent_runtime = require_rolldown_runtime.__toESM(require("@aws-sdk/client-bedrock-agent-runtime"));
const __langchain_core_retrievers = require_rolldown_runtime.__toESM(require("@langchain/core/retrievers"));

//#region src/retrievers/bedrock.ts
/**
* Class for interacting with Amazon Bedrock Knowledge Bases, a RAG workflow oriented service
* provided by AWS. Extends the BaseRetriever class.
* @example
* ```typescript
* const retriever = new AmazonKnowledgeBaseRetriever({
*   topK: 10,
*   knowledgeBaseId: "YOUR_KNOWLEDGE_BASE_ID",
*   region: "us-east-2",
*   clientOptions: {
*     credentials: {
*       accessKeyId: "YOUR_ACCESS_KEY_ID",
*       secretAccessKey: "YOUR_SECRET_ACCESS_KEY",
*     },
*   },
* });
*
* const docs = await retriever.getRelevantDocuments("How are clouds formed?");
* ```
*/
var AmazonKnowledgeBaseRetriever = class extends __langchain_core_retrievers.BaseRetriever {
	static lc_name() {
		return "AmazonKnowledgeBaseRetriever";
	}
	lc_namespace = [
		"langchain",
		"retrievers",
		"amazon_bedrock_knowledge_base"
	];
	knowledgeBaseId;
	topK;
	bedrockAgentRuntimeClient;
	filter;
	overrideSearchType;
	constructor({ knowledgeBaseId, topK = 10, clientOptions, region, filter, overrideSearchType }) {
		super();
		this.topK = topK;
		this.filter = filter;
		this.overrideSearchType = overrideSearchType;
		this.bedrockAgentRuntimeClient = new __aws_sdk_client_bedrock_agent_runtime.BedrockAgentRuntimeClient({
			region,
			...clientOptions
		});
		this.knowledgeBaseId = knowledgeBaseId;
	}
	/**
	* Cleans the result text by replacing sequences of whitespace with a
	* single space and removing ellipses.
	* @param resText The result text to clean.
	* @returns The cleaned result text.
	*/
	cleanResult(resText) {
		const res = resText.replace(/\s+/g, " ").replace(/\.\.\./g, "");
		return res;
	}
	async queryKnowledgeBase(query, topK, filter, overrideSearchType) {
		const retrieveCommand = new __aws_sdk_client_bedrock_agent_runtime.RetrieveCommand({
			knowledgeBaseId: this.knowledgeBaseId,
			retrievalQuery: { text: query },
			retrievalConfiguration: { vectorSearchConfiguration: {
				numberOfResults: topK,
				overrideSearchType,
				filter
			} }
		});
		const retrieveResponse = await this.bedrockAgentRuntimeClient.send(retrieveCommand);
		return retrieveResponse.retrievalResults?.map((result) => {
			let source;
			switch (result.location?.type) {
				case "CONFLUENCE":
					source = result.location?.confluenceLocation?.url;
					break;
				case "S3":
					source = result.location?.s3Location?.uri;
					break;
				case "SALESFORCE":
					source = result.location?.salesforceLocation?.url;
					break;
				case "SHAREPOINT":
					source = result.location?.sharePointLocation?.url;
					break;
				case "WEB":
					source = result.location?.webLocation?.url;
					break;
				default:
					source = result.location?.s3Location?.uri;
					break;
			}
			return {
				pageContent: this.cleanResult(result.content?.text || ""),
				metadata: {
					source,
					score: result.score,
					...result.metadata
				}
			};
		}) ?? [];
	}
	async _getRelevantDocuments(query) {
		const docs = await this.queryKnowledgeBase(query, this.topK, this.filter, this.overrideSearchType);
		return docs;
	}
};

//#endregion
exports.AmazonKnowledgeBaseRetriever = AmazonKnowledgeBaseRetriever;
//# sourceMappingURL=bedrock.cjs.map