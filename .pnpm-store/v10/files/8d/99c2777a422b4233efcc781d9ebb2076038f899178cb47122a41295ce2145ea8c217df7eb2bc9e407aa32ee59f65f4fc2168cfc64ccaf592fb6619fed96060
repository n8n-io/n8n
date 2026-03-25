const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_misc = require('./misc.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));

//#region src/utils/azure.ts
/**
* This function generates an endpoint URL for (Azure) OpenAI
* based on the configuration parameters provided.
*
* @param {OpenAIEndpointConfig} config - The configuration object for the (Azure) endpoint.
*
* @property {string} config.azureOpenAIApiDeploymentName - The deployment name of Azure OpenAI.
* @property {string} config.azureOpenAIApiInstanceName - The instance name of Azure OpenAI, e.g. `example-resource`.
* @property {string} config.azureOpenAIApiKey - The API Key for Azure OpenAI.
* @property {string} config.azureOpenAIBasePath - The base path for Azure OpenAI, e.g. `https://example-resource.azure.openai.com/openai/deployments/`.
* @property {string} config.baseURL - Some other custom base path URL.
* @property {string} config.azureOpenAIEndpoint - The endpoint for the Azure OpenAI instance, e.g. `https://example-resource.azure.openai.com/`.
*
* The function operates as follows:
* - If both `azureOpenAIBasePath` and `azureOpenAIApiDeploymentName` (plus `azureOpenAIApiKey`) are provided, it returns an URL combining these two parameters (`${azureOpenAIBasePath}/${azureOpenAIApiDeploymentName}`).
* - If both `azureOpenAIEndpoint` and `azureOpenAIApiDeploymentName` (plus `azureOpenAIApiKey`) are provided, it returns an URL combining these two parameters (`${azureOpenAIEndpoint}/openai/deployments/${azureOpenAIApiDeploymentName}`).
* - If `azureOpenAIApiKey` is provided, it checks for `azureOpenAIApiInstanceName` and `azureOpenAIApiDeploymentName` and throws an error if any of these is missing. If both are provided, it generates an URL incorporating these parameters.
* - If none of the above conditions are met, return any custom `baseURL`.
* - The function returns the generated URL as a string, or undefined if no custom paths are specified.
*
* @throws Will throw an error if the necessary parameters for generating the URL are missing.
*
* @returns {string | undefined} The generated (Azure) OpenAI endpoint URL.
*/
function getEndpoint(config) {
	const { azureOpenAIApiDeploymentName, azureOpenAIApiInstanceName, azureOpenAIApiKey, azureOpenAIBasePath, baseURL, azureADTokenProvider, azureOpenAIEndpoint } = config;
	if ((azureOpenAIApiKey || azureADTokenProvider) && azureOpenAIBasePath && azureOpenAIApiDeploymentName) return `${azureOpenAIBasePath}/${azureOpenAIApiDeploymentName}`;
	if ((azureOpenAIApiKey || azureADTokenProvider) && azureOpenAIEndpoint && azureOpenAIApiDeploymentName) return `${azureOpenAIEndpoint}/openai/deployments/${azureOpenAIApiDeploymentName}`;
	if (azureOpenAIApiKey || azureADTokenProvider) {
		if (!azureOpenAIApiInstanceName) throw new Error("azureOpenAIApiInstanceName is required when using azureOpenAIApiKey");
		if (!azureOpenAIApiDeploymentName) throw new Error("azureOpenAIApiDeploymentName is a required parameter when using azureOpenAIApiKey");
		return `https://${azureOpenAIApiInstanceName}.openai.azure.com/openai/deployments/${azureOpenAIApiDeploymentName}`;
	}
	return baseURL;
}
function isHeaders(headers) {
	return typeof Headers !== "undefined" && headers !== null && typeof headers === "object" && Object.prototype.toString.call(headers) === "[object Headers]";
}
/**
* Normalizes various header formats into a consistent Record format.
*
* This function accepts headers in multiple formats and converts them to a
* Record<string, HeaderValue | readonly HeaderValue[]> for consistent handling.
*
* @param headers - The headers to normalize. Can be:
*   - A Headers instance
*   - An array of [key, value] pairs
*   - A plain object with string keys
*   - A NullableHeaders-like object with a 'values' property containing Headers
*   - null or undefined
* @returns A normalized Record containing the header key-value pairs
*
* @example
* ```ts
* // With Headers instance
* const headers1 = new Headers([['content-type', 'application/json']]);
* const normalized1 = normalizeHeaders(headers1);
*
* // With plain object
* const headers2 = { 'content-type': 'application/json' };
* const normalized2 = normalizeHeaders(headers2);
*
* // With array of pairs
* const headers3 = [['content-type', 'application/json']];
* const normalized3 = normalizeHeaders(headers3);
* ```
*/
function normalizeHeaders(headers) {
	const output = require_misc.iife(() => {
		if (isHeaders(headers)) return headers;
		else if (Array.isArray(headers)) return new Headers(headers);
		else if (typeof headers === "object" && headers !== null && "values" in headers && isHeaders(headers.values)) return headers.values;
		else if (typeof headers === "object" && headers !== null) {
			const entries = Object.entries(headers).filter(([, v]) => typeof v === "string").map(([k, v]) => [k, v]);
			return new Headers(entries);
		}
		return new Headers();
	});
	return Object.fromEntries(output.entries());
}
function getFormattedEnv() {
	let env = (0, __langchain_core_utils_env.getEnv)();
	if (env === "node" || env === "deno") env = `(${env}/${process.version}; ${process.platform}; ${process.arch})`;
	return env;
}
function getHeadersWithUserAgent(headers, isAzure = false, version = "1.0.0") {
	const normalizedHeaders = normalizeHeaders(headers);
	const env = getFormattedEnv();
	const library = `langchainjs${isAzure ? "-azure" : ""}-openai`;
	return {
		...normalizedHeaders,
		"User-Agent": normalizedHeaders["User-Agent"] ? `${library}/${version} (${env})${normalizedHeaders["User-Agent"]}` : `${library}/${version} (${env})`
	};
}

//#endregion
exports.getEndpoint = getEndpoint;
exports.getFormattedEnv = getFormattedEnv;
exports.getHeadersWithUserAgent = getHeadersWithUserAgent;
exports.isHeaders = isHeaders;
exports.normalizeHeaders = normalizeHeaders;
//# sourceMappingURL=azure.cjs.map