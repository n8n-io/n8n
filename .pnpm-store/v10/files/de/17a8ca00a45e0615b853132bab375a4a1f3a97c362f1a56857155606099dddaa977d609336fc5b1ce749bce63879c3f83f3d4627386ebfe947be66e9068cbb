const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_language_models_llms = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/llms"));

//#region src/llms/deepinfra.ts
var deepinfra_exports = {};
require_rolldown_runtime.__export(deepinfra_exports, {
	DEEPINFRA_API_BASE: () => DEEPINFRA_API_BASE,
	DEFAULT_MODEL_NAME: () => DEFAULT_MODEL_NAME,
	DeepInfraLLM: () => DeepInfraLLM,
	ENV_VARIABLE: () => ENV_VARIABLE
});
const DEEPINFRA_API_BASE = "https://api.deepinfra.com/v1/openai/completions";
const DEFAULT_MODEL_NAME = "mistralai/Mixtral-8x22B-Instruct-v0.1";
const ENV_VARIABLE = "DEEPINFRA_API_TOKEN";
var DeepInfraLLM = class extends __langchain_core_language_models_llms.LLM {
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
		this.apiKey = fields.apiKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)(ENV_VARIABLE);
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
exports.DEEPINFRA_API_BASE = DEEPINFRA_API_BASE;
exports.DEFAULT_MODEL_NAME = DEFAULT_MODEL_NAME;
exports.DeepInfraLLM = DeepInfraLLM;
exports.ENV_VARIABLE = ENV_VARIABLE;
Object.defineProperty(exports, 'deepinfra_exports', {
  enumerable: true,
  get: function () {
    return deepinfra_exports;
  }
});
//# sourceMappingURL=deepinfra.cjs.map