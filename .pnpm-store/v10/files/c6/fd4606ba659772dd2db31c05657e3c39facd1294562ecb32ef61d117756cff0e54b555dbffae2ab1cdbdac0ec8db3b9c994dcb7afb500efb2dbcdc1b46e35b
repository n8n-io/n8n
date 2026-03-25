import { getEndpoint, getHeadersWithUserAgent } from "../utils/azure.js";
import { OpenAI } from "../llms.js";
import { AzureOpenAI } from "openai";
import { getEnvironmentVariable } from "@langchain/core/utils/env";

//#region src/azure/llms.ts
var AzureOpenAI$1 = class extends OpenAI {
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
		this.azureOpenAIApiDeploymentName = (fields?.azureOpenAIApiCompletionsDeploymentName || fields?.azureOpenAIApiDeploymentName) ?? (getEnvironmentVariable("AZURE_OPENAI_API_COMPLETIONS_DEPLOYMENT_NAME") || getEnvironmentVariable("AZURE_OPENAI_API_DEPLOYMENT_NAME"));
		this.azureOpenAIApiKey = fields?.azureOpenAIApiKey ?? (typeof fields?.openAIApiKey === "string" ? fields?.openAIApiKey : void 0) ?? (typeof fields?.apiKey === "string" ? fields?.apiKey : void 0) ?? getEnvironmentVariable("AZURE_OPENAI_API_KEY");
		this.azureOpenAIApiInstanceName = fields?.azureOpenAIApiInstanceName ?? getEnvironmentVariable("AZURE_OPENAI_API_INSTANCE_NAME");
		this.azureOpenAIApiVersion = fields?.azureOpenAIApiVersion ?? fields?.openAIApiVersion ?? getEnvironmentVariable("AZURE_OPENAI_API_VERSION");
		this.azureOpenAIBasePath = fields?.azureOpenAIBasePath ?? getEnvironmentVariable("AZURE_OPENAI_BASE_PATH");
		this.azureOpenAIEndpoint = fields?.azureOpenAIEndpoint ?? getEnvironmentVariable("AZURE_OPENAI_ENDPOINT");
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
export { AzureOpenAI$1 as AzureOpenAI };
//# sourceMappingURL=llms.js.map