import { __export } from "../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { LLM } from "@langchain/core/language_models/llms";

//#region src/llms/deepinfra.ts
var deepinfra_exports = {};
__export(deepinfra_exports, {
	DEEPINFRA_API_BASE: () => DEEPINFRA_API_BASE,
	DEFAULT_MODEL_NAME: () => DEFAULT_MODEL_NAME,
	DeepInfraLLM: () => DeepInfraLLM,
	ENV_VARIABLE: () => ENV_VARIABLE
});
const DEEPINFRA_API_BASE = "https://api.deepinfra.com/v1/openai/completions";
const DEFAULT_MODEL_NAME = "mistralai/Mixtral-8x22B-Instruct-v0.1";
const ENV_VARIABLE = "DEEPINFRA_API_TOKEN";
var DeepInfraLLM = class extends LLM {
	static lc_name() {
		return "DeepInfraLLM";
	}
	lc_serializable = true;
	apiKey;
	model;
	maxTokens;
	temperature;
	constructor(fields = {}) {
		super(fields);
		this.apiKey = fields.apiKey ?? getEnvironmentVariable(ENV_VARIABLE);
		this.model = fields.model ?? DEFAULT_MODEL_NAME;
		this.maxTokens = fields.maxTokens;
		this.temperature = fields.temperature;
	}
	_llmType() {
		return "DeepInfra";
	}
	async _call(prompt, options) {
		const body = {
			temperature: this.temperature,
			max_tokens: this.maxTokens,
			...options,
			prompt,
			model: this.model
		};
		const response = await this.caller.call(() => fetch(DEEPINFRA_API_BASE, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(body)
		}).then((res) => res.json()));
		return response;
	}
};

//#endregion
export { DEEPINFRA_API_BASE, DEFAULT_MODEL_NAME, DeepInfraLLM, ENV_VARIABLE, deepinfra_exports };
//# sourceMappingURL=deepinfra.js.map