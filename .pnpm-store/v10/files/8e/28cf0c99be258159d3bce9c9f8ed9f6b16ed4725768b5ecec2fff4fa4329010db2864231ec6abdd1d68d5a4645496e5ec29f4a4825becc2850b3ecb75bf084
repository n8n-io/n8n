const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_azure = require('../utils/azure.cjs');
const require_llms = require('../llms.cjs');
const openai = require_rolldown_runtime.__toESM(require("openai"));
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));

//#region src/azure/llms.ts
var AzureOpenAI = class extends require_llms.OpenAI {
	azureOpenAIApiVersion;
	azureOpenAIApiKey;
	azureADTokenProvider;
	azureOpenAIApiInstanceName;
	azureOpenAIApiDeploymentName;
	azureOpenAIBasePath;
	azureOpenAIEndpoint;
	get lc_aliases() {
		return {
			...super.lc_aliases,
			openAIApiKey: "openai_api_key",
			openAIApiVersion: "openai_api_version",
			openAIBasePath: "openai_api_base",
			deploymentName: "deployment_name",
			azureOpenAIEndpoint: "azure_endpoint",
			azureOpenAIApiVersion: "openai_api_version",
			azureOpenAIBasePath: "openai_api_base",
			azureOpenAIApiDeploymentName: "deployment_name"
		};
	}
	get lc_secrets() {
		return {
			...super.lc_secrets,
			azureOpenAIApiKey: "AZURE_OPENAI_API_KEY"
		};
	}
	constructor(fields) {
		super(fields);
		this.azureOpenAIApiDeploymentName = (fields?.azureOpenAIApiCompletionsDeploymentName || fields?.azureOpenAIApiDeploymentName) ?? ((0, __langchain_core_utils_env.getEnvironmentVariable)("AZURE_OPENAI_API_COMPLETIONS_DEPLOYMENT_NAME") || (0, __langchain_core_utils_env.getEnvironmentVariable)("AZURE_OPENAI_API_DEPLOYMENT_NAME"));
		this.azureOpenAIApiKey = fields?.azureOpenAIApiKey ?? (typeof fields?.openAIApiKey === "string" ? fields?.openAIApiKey : void 0) ?? (typeof fields?.apiKey === "string" ? fields?.apiKey : void 0) ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("AZURE_OPENAI_API_KEY");
		this.azureOpenAIApiInstanceName = fields?.azureOpenAIApiInstanceName ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("AZURE_OPENAI_API_INSTANCE_NAME");
		this.azureOpenAIApiVersion = fields?.azureOpenAIApiVersion ?? fields?.openAIApiVersion ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("AZURE_OPENAI_API_VERSION");
		this.azureOpenAIBasePath = fields?.azureOpenAIBasePath ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("AZURE_OPENAI_BASE_PATH");
		this.azureOpenAIEndpoint = fields?.azureOpenAIEndpoint ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("AZURE_OPENAI_ENDPOINT");
		this.azureADTokenProvider = fields?.azureADTokenProvider;
		if (!this.azureOpenAIApiKey && !this.apiKey && !this.azureADTokenProvider) throw new Error("Azure OpenAI API key or Token Provider not found");
	}
	_getClientOptions(options) {
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
				...params
			});
		}
		const requestOptions = {
			...this.clientConfig,
			...options
		};
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
		return requestOptions;
	}
	toJSON() {
		const json = super.toJSON();
		function isRecord(obj) {
			return typeof obj === "object" && obj != null;
		}
		if (isRecord(json) && isRecord(json.kwargs)) {
			delete json.kwargs.azure_openai_base_path;
			delete json.kwargs.azure_openai_api_deployment_name;
			delete json.kwargs.azure_openai_api_key;
			delete json.kwargs.azure_openai_api_version;
			delete json.kwargs.azure_open_ai_base_path;
		}
		return json;
	}
};

//#endregion
exports.AzureOpenAI = AzureOpenAI;
//# sourceMappingURL=llms.cjs.map