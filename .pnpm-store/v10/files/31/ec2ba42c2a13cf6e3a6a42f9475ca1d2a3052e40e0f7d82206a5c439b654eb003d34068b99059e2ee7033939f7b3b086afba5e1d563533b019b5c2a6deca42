import { __export } from "../_virtual/rolldown_runtime.js";
import { authenticateAndSetInstance } from "../utils/ibm.js";
import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { BaseDocumentCompressor } from "@langchain/core/retrievers/document_compressors";

//#region src/document_compressors/ibm.ts
var ibm_exports = {};
__export(ibm_exports, { WatsonxRerank: () => WatsonxRerank });
var WatsonxRerank = class extends BaseDocumentCompressor {
	maxRetries = 0;
	version = "2024-05-31";
	truncateInputTokens;
	returnOptions;
	model;
	spaceId;
	projectId;
	maxConcurrency;
	serviceUrl;
	service;
	constructor(fields) {
		super();
		if (fields.projectId && fields.spaceId) throw new Error("Maximum 1 id type can be specified per instance");
		if (!fields.projectId && !fields.spaceId) throw new Error("No id specified! At least id of 1 type has to be specified");
		this.model = fields.model;
		this.serviceUrl = fields.serviceUrl;
		this.version = fields.version;
		this.projectId = fields?.projectId;
		this.spaceId = fields?.spaceId;
		this.maxRetries = fields.maxRetries ?? this.maxRetries;
		this.maxConcurrency = fields.maxConcurrency;
		this.truncateInputTokens = fields.truncateInputTokens;
		this.returnOptions = fields.returnOptions;
		const { watsonxAIApikey, watsonxAIAuthType, watsonxAIBearerToken, watsonxAIUsername, watsonxAIPassword, watsonxAIUrl, disableSSL, version, serviceUrl } = fields;
		const auth = authenticateAndSetInstance({
			watsonxAIApikey,
			watsonxAIAuthType,
			watsonxAIBearerToken,
			watsonxAIUsername,
			watsonxAIPassword,
			watsonxAIUrl,
			disableSSL,
			version,
			serviceUrl
		});
		if (auth) this.service = auth;
		else throw new Error("You have not provided one type of authentication");
	}
	scopeId() {
		if (this.projectId) return {
			projectId: this.projectId,
			modelId: this.model
		};
		else return {
			spaceId: this.spaceId,
			modelId: this.model
		};
	}
	invocationParams(options) {
		return {
			truncate_input_tokens: options?.truncateInputTokens ?? this.truncateInputTokens,
			return_options: {
				top_n: options?.returnOptions?.topN ?? this.returnOptions?.topN,
				inputs: options?.returnOptions?.inputs ?? this.returnOptions?.inputs
			}
		};
	}
	async compressDocuments(documents, query) {
		const caller = new AsyncCaller({
			maxConcurrency: this.maxConcurrency,
			maxRetries: this.maxRetries
		});
		const inputs = documents.map((document) => ({ text: document.pageContent }));
		const { result } = await caller.call(() => this.service.textRerank({
			...this.scopeId(),
			inputs,
			query,
			parameters: { truncate_input_tokens: this.truncateInputTokens }
		}));
		const resultDocuments = result.results.map(({ index, score }) => {
			const rankedDocument = documents[index];
			rankedDocument.metadata.relevanceScore = score;
			return rankedDocument;
		});
		return resultDocuments;
	}
	async rerank(documents, query, options) {
		const inputs = documents.map((document) => {
			if (typeof document === "string") return { text: document };
			return { text: document.pageContent };
		});
		const caller = new AsyncCaller({
			maxConcurrency: this.maxConcurrency,
			maxRetries: this.maxRetries
		});
		const { result } = await caller.call(() => this.service.textRerank({
			...this.scopeId(),
			inputs,
			query,
			parameters: this.invocationParams(options)
		}));
		const response = result.results.map((document) => {
			return document?.input ? {
				index: document.index,
				relevanceScore: document.score,
				input: document?.input.text
			} : {
				index: document.index,
				relevanceScore: document.score
			};
		});
		return response;
	}
};

//#endregion
export { WatsonxRerank, ibm_exports };
//# sourceMappingURL=ibm.js.map