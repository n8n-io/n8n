import { wrapOpenAIClientError } from "../utils/client.js";
import { getEndpoint, getHeadersWithUserAgent } from "../utils/azure.js";
import { OpenAIEmbeddings } from "../embeddings.js";
import { AzureOpenAI } from "openai";
import { getEnvironmentVariable } from "@langchain/core/utils/env";

//#region src/azure/embeddings.ts
var AzureOpenAIEmbeddings = class extends OpenAIEmbeddings {
	azureOpenAIApiVersion;
	azureOpenAIApiKey;
	azureADTokenProvider;
	azureOpenAIApiInstanceName;
	azureOpenAIApiDeploymentName;
	azureOpenAIBasePath;
	constructor(fields) {
		super(fields);
		this.batchSize = fields?.batchSize ?? 1;
		this.azureOpenAIApiKey = fields?.azureOpenAIApiKey ?? (typeof fields?.apiKey === "string" ? fields?.apiKey : void 0) ?? getEnvironmentVariable("AZURE_OPENAI_API_KEY");
		this.azureOpenAIApiVersion = fields?.azureOpenAIApiVersion ?? fields?.openAIApiVersion ?? getEnvironmentVariable("AZURE_OPENAI_API_VERSION");
		this.azureOpenAIBasePath = fields?.azureOpenAIBasePath ?? getEnvironmentVariable("AZURE_OPENAI_BASE_PATH");
		this.azureOpenAIApiInstanceName = fields?.azureOpenAIApiInstanceName ?? getEnvironmentVariable("AZURE_OPENAI_API_INSTANCE_NAME");
		this.azureOpenAIApiDeploymentName = (fields?.azureOpenAIApiEmbeddingsDeploymentName || fields?.azureOpenAIApiDeploymentName) ?? (getEnvironmentVariable("AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME") || getEnvironmentVariable("AZURE_OPENAI_API_DEPLOYMENT_NAME"));
		this.azureADTokenProvider = fields?.azureADTokenProvider;
	}
	async embeddingWithRetry(request) {
		if (!this.client) {
			const openAIEndpointConfig = {
				azureOpenAIApiDeploymentName: this.azureOpenAIApiDeploymentName,
				azureOpenAIApiInstanceName: this.azureOpenAIApiInstanceName,
				azureOpenAIApiKey: this.azureOpenAIApiKey,
				azureOpenAIBasePath: this.azureOpenAIBasePath,
				azureADTokenProvider: this.azureADTokenProvider,
				baseURL: this.clientConfig.baseURL
			};
			const endpoint = getEndpoint(openAIEndpointConfig);
			const { apiKey: existingApiKey,...clientConfigRest } = this.clientConfig;
			const params = {
				...clientConfigRest,
				baseURL: endpoint,
				timeout: this.timeout,
				maxRetries: 0
			};
			if (!this.azureADTokenProvider) params.apiKey = openAIEndpointConfig.azureOpenAIApiKey;
			if (!params.baseURL) delete params.baseURL;
			params.defaultHeaders = getHeadersWithUserAgent(params.defaultHeaders, true, "2.0.0");
			this.client = new AzureOpenAI({
				apiVersion: this.azureOpenAIApiVersion,
				azureADTokenProvider: this.azureADTokenProvider,
				deployment: this.azureOpenAIApiDeploymentName,
				...params
			});
		}
		const requestOptions = {};
		if (this.azureOpenAIApiKey) {
			requestOptions.headers = {
				"api-key": this.azureOpenAIApiKey,
				...requestOptions.headers
			};
			requestOptions.query = {
				"api-version": this.azureOpenAIApiVersion,
				...requestOptions.query
			};
		}
		return this.caller.call(async () => {
			try {
				const res = await this.client.embeddings.create(request, requestOptions);
				return res;
			} catch (e) {
				const error = wrapOpenAIClientError(e);
				throw error;
			}
		});
	}
};

//#endregion
export { AzureOpenAIEmbeddings };
//# sourceMappingURL=embeddings.js.map