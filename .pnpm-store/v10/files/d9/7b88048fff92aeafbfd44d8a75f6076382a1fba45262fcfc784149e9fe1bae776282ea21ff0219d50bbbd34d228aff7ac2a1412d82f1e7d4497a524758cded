import { getEndpoint, getHeadersWithUserAgent } from "../../utils/azure.js";
import { AzureOpenAI } from "openai";
import { getEnvironmentVariable } from "@langchain/core/utils/env";

//#region src/azure/chat_models/common.ts
const AZURE_ALIASES = {
	openAIApiKey: "openai_api_key",
	openAIApiVersion: "openai_api_version",
	openAIBasePath: "openai_api_base",
	deploymentName: "deployment_name",
	azureOpenAIEndpoint: "azure_endpoint",
	azureOpenAIApiVersion: "openai_api_version",
	azureOpenAIBasePath: "openai_api_base",
	azureOpenAIApiDeploymentName: "deployment_name"
};
const AZURE_SECRETS = { azureOpenAIApiKey: "AZURE_OPENAI_API_KEY" };
const AZURE_SERIALIZABLE_KEYS = [
	"azureOpenAIApiKey",
	"azureOpenAIApiVersion",
	"azureOpenAIBasePath",
	"azureOpenAIEndpoint",
	"azureOpenAIApiInstanceName",
	"azureOpenAIApiDeploymentName",
	"deploymentName",
	"openAIApiKey",
	"openAIApiVersion"
];
function _constructAzureFields(fields) {
	this.azureOpenAIApiKey = fields?.azureOpenAIApiKey ?? (typeof fields?.openAIApiKey === "string" ? fields?.openAIApiKey : void 0) ?? (typeof fields?.apiKey === "string" ? fields?.apiKey : void 0) ?? getEnvironmentVariable("AZURE_OPENAI_API_KEY");
	this.azureOpenAIApiInstanceName = fields?.azureOpenAIApiInstanceName ?? getEnvironmentVariable("AZURE_OPENAI_API_INSTANCE_NAME");
	this.azureOpenAIApiDeploymentName = fields?.azureOpenAIApiDeploymentName ?? fields?.deploymentName ?? getEnvironmentVariable("AZURE_OPENAI_API_DEPLOYMENT_NAME");
	this.azureOpenAIApiVersion = fields?.azureOpenAIApiVersion ?? fields?.openAIApiVersion ?? getEnvironmentVariable("AZURE_OPENAI_API_VERSION");
	this.azureOpenAIBasePath = fields?.azureOpenAIBasePath ?? getEnvironmentVariable("AZURE_OPENAI_BASE_PATH");
	this.azureOpenAIEndpoint = fields?.azureOpenAIEndpoint ?? getEnvironmentVariable("AZURE_OPENAI_ENDPOINT");
	this.azureADTokenProvider = fields?.azureADTokenProvider;
	if (!this.azureOpenAIApiKey && !this.apiKey && !this.azureADTokenProvider) throw new Error("Azure OpenAI API key or Token Provider not found");
}
function _getAzureClientOptions(options) {
	if (!this.client) {
		const openAIEndpointConfig = {
			azureOpenAIApiDeploymentName: this.azureOpenAIApiDeploymentName,
			azureOpenAIApiInstanceName: this.azureOpenAIApiInstanceName,
			azureOpenAIApiKey: this.azureOpenAIApiKey,
			azureOpenAIBasePath: this.azureOpenAIBasePath,
			azureADTokenProvider: this.azureADTokenProvider,
			baseURL: this.clientConfig.baseURL,
			azureOpenAIEndpoint: this.azureOpenAIEndpoint
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
function _serializeAzureChat(input) {
	const json = input;
	function isRecord(obj) {
		return typeof obj === "object" && obj != null;
	}
	if (isRecord(json) && isRecord(json.kwargs)) {
		delete json.kwargs.azure_openai_base_path;
		delete json.kwargs.azure_openai_api_deployment_name;
		delete json.kwargs.azure_openai_api_key;
		delete json.kwargs.azure_openai_api_version;
		delete json.kwargs.azure_open_ai_base_path;
		if (!json.kwargs.azure_endpoint && this.azureOpenAIEndpoint) json.kwargs.azure_endpoint = this.azureOpenAIEndpoint;
		if (!json.kwargs.azure_endpoint && this.azureOpenAIBasePath) {
			const parts = this.azureOpenAIBasePath.split("/openai/deployments/");
			if (parts.length === 2 && parts[0].startsWith("http")) {
				const [endpoint] = parts;
				json.kwargs.azure_endpoint = endpoint;
			}
		}
		if (!json.kwargs.azure_endpoint && this.azureOpenAIApiInstanceName) json.kwargs.azure_endpoint = `https://${this.azureOpenAIApiInstanceName}.openai.azure.com/`;
		if (!json.kwargs.deployment_name && this.azureOpenAIApiDeploymentName) json.kwargs.deployment_name = this.azureOpenAIApiDeploymentName;
		if (!json.kwargs.deployment_name && this.azureOpenAIBasePath) {
			const parts = this.azureOpenAIBasePath.split("/openai/deployments/");
			if (parts.length === 2) {
				const [, deployment] = parts;
				json.kwargs.deployment_name = deployment;
			}
		}
		if (json.kwargs.azure_endpoint && json.kwargs.deployment_name && json.kwargs.openai_api_base) delete json.kwargs.openai_api_base;
		if (json.kwargs.azure_openai_api_instance_name && json.kwargs.azure_endpoint) delete json.kwargs.azure_openai_api_instance_name;
	}
	return json;
}

//#endregion
export { AZURE_ALIASES, AZURE_SECRETS, AZURE_SERIALIZABLE_KEYS, _constructAzureFields, _getAzureClientOptions, _serializeAzureChat };
//# sourceMappingURL=common.js.map