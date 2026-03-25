import { __export } from "../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { ChatOpenAICompletions } from "@langchain/openai";

//#region src/chat_models/novita.ts
var novita_exports = {};
__export(novita_exports, { ChatNovitaAI: () => ChatNovitaAI });
/**
* Novita chat model implementation
*/
var ChatNovitaAI = class extends ChatOpenAICompletions {
	static lc_name() {
		return "ChatNovita";
	}
	_llmType() {
		return "novita";
	}
	get lc_secrets() {
		return {
			novitaApiKey: "NOVITA_API_KEY",
			apiKey: "NOVITA_API_KEY"
		};
	}
	lc_serializable = true;
	constructor(fields) {
		const novitaApiKey = fields?.apiKey || fields?.novitaApiKey || getEnvironmentVariable("NOVITA_API_KEY");
		if (!novitaApiKey) throw new Error(`Novita API key not found. Please set the NOVITA_API_KEY environment variable or provide the key into "novitaApiKey"`);
		super({
			...fields,
			model: fields?.model || "gryphe/mythomax-l2-13b",
			apiKey: novitaApiKey,
			configuration: { baseURL: "https://api.novita.ai/v3/openai/" }
		});
	}
	getLsParams(options) {
		const params = super.getLsParams(options);
		params.ls_provider = "novita";
		return params;
	}
	toJSON() {
		const result = super.toJSON();
		if ("kwargs" in result && typeof result.kwargs === "object" && result.kwargs != null) {
			delete result.kwargs.openai_api_key;
			delete result.kwargs.configuration;
		}
		return result;
	}
	async completionWithRetry(request, options) {
		delete request.frequency_penalty;
		delete request.presence_penalty;
		delete request.logit_bias;
		delete request.functions;
		if (request.stream === true) return super.completionWithRetry(request, options);
		return super.completionWithRetry(request, options);
	}
};

//#endregion
export { ChatNovitaAI, novita_exports };
//# sourceMappingURL=novita.js.map