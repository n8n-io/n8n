const require_common = require('./common.cjs');
const require_responses = require('../../chat_models/responses.cjs');

//#region src/azure/chat_models/responses.ts
var AzureChatOpenAIResponses = class extends require_responses.ChatOpenAIResponses {
	azureOpenAIApiVersion;
	azureOpenAIApiKey;
	azureADTokenProvider;
	azureOpenAIApiInstanceName;
	azureOpenAIApiDeploymentName;
	azureOpenAIBasePath;
	azureOpenAIEndpoint;
	_llmType() {
		return "azure_openai";
	}
	get lc_aliases() {
		return {
			...super.lc_aliases,
			...require_common.AZURE_ALIASES
		};
	}
	get lc_secrets() {
		return {
			...super.lc_secrets,
			...require_common.AZURE_SECRETS
		};
	}
	get lc_serializable_keys() {
		return [...super.lc_serializable_keys, ...require_common.AZURE_SERIALIZABLE_KEYS];
	}
	getLsParams(options) {
		const params = super.getLsParams(options);
		params.ls_provider = "azure";
		return params;
	}
	constructor(fields) {
		super(fields);
		require_common._constructAzureFields.call(this, fields);
	}
	_getClientOptions(options) {
		return require_common._getAzureClientOptions.call(this, options);
	}
	toJSON() {
		return require_common._serializeAzureChat.call(this, super.toJSON());
	}
};

//#endregion
exports.AzureChatOpenAIResponses = AzureChatOpenAIResponses;
//# sourceMappingURL=responses.cjs.map