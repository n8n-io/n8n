const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_client = require('../utils/client.cjs');
const require_azure = require('../utils/azure.cjs');
const require_embeddings = require('../embeddings.cjs');
const openai = require_rolldown_runtime.__toESM(require("openai"));
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));

//#region src/azure/embeddings.ts
var AzureOpenAIEmbeddings = class extends require_embeddings.OpenAIEmbeddings {
	azureOpenAIApiVersion;
	azureOpenAIApiKey;
	azureADTokenProvider;
	azureOpenAIApiInstanceName;
	azureOpenAIApiDeploymentName;
	azureOpenAIBasePath;
	constructor(fields) {
		super(fields);
		this.batchSize = fields?.batchSize ?? 1;
		this.azureOpenAIApiKey = fields?.azureOpenAIApiKey ?? (typeof fields?.apiKey === "string" ? fields?.apiKey : void 0) ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("AZURE_OPENAI_API_KEY");
		this.azureOpenAIApiVersion = fields?.azureOpenAIApiVersion ?? fields?.openAIApiVersion ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("AZURE_OPENAI_API_VERSION");
		this.azureOpenAIBasePath = fields?.azureOpenAIBasePath ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("AZURE_OPENAI_BASE_PATH");
		this.azureOpenAIApiInstanceName = fields?.azureOpenAIApiInstanceName ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("AZURE_OPENAI_API_INSTANCE_NAME");
		this.azureOpenAIApiDeploymentName = (fields?.azureOpenAIApiEmbeddingsDeploymentName || fields?.azureOpenAIApiDeploymentName) ?? ((0, __langchain_core_utils_env.getEnvironmentVariable)("AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME") || (0, __langchain_core_utils_env.getEnvironmentVariable)("AZURE_OPENAI_API_DEPLOYMENT_NAME"));
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
			const endpoint = require_azure.getEndpoint(openAIEndpointConfig);
			const { apiKey: existingApiKey,...clientConfigRest } = this.clientConfig;
			const params = {
				...clientConfigRest,
				baseURL: endpoint,
				timeout: this.timeout,
				maxRetries: 0
			};
			if (!this.azureADTokenProvider) params.apiKey = openAIEndpointConfig.azureOpenAIApiKey;
			if (!params.baseURL) delete params.baseURL;
			params.defaultHeaders = require_azure.getHeadersWithUserAgent(params.defaultHeaders, true, "2.0.0");
			this.client = new openai.AzureOpenAI({
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
				const error = require_client.wrapOpenAIClientError(e);
				throw error;
			}
		});
	}
};

//#endregion
exports.AzureOpenAIEmbeddings = AzureOpenAIEmbeddings;
//# sourceMappingURL=embeddings.cjs.map