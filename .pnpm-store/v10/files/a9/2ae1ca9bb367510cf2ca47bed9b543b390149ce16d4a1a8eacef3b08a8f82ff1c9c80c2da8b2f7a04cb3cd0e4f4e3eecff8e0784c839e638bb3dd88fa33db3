import { ChatOpenAICompletions } from "../../chat_models/completions.js";
import { AZURE_ALIASES, AZURE_SECRETS, AZURE_SERIALIZABLE_KEYS, _constructAzureFields, _getAzureClientOptions, _serializeAzureChat } from "./common.js";

//#region src/azure/chat_models/completions.ts
var AzureChatOpenAICompletions = class extends ChatOpenAICompletions {
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
			...AZURE_ALIASES
		};
	}
	get lc_secrets() {
		return {
			...super.lc_secrets,
			...AZURE_SECRETS
		};
	}
	get lc_serializable_keys() {
		return [...super.lc_serializable_keys, ...AZURE_SERIALIZABLE_KEYS];
	}
	getLsParams(options) {
		const params = super.getLsParams(options);
		params.ls_provider = "azure";
		return params;
	}
	constructor(fields) {
		super(fields);
		_constructAzureFields.call(this, fields);
	}
	_getClientOptions(options) {
		return _getAzureClientOptions.call(this, options);
	}
	toJSON() {
		return _serializeAzureChat.call(this, super.toJSON());
	}
};

//#endregion
export { AzureChatOpenAICompletions };
//# sourceMappingURL=completions.js.map