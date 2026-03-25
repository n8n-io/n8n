const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_language_models_llms = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/llms"));
const __gradientai_nodejs_sdk = require_rolldown_runtime.__toESM(require("@gradientai/nodejs-sdk"));

//#region src/llms/gradient_ai.ts
var gradient_ai_exports = {};
require_rolldown_runtime.__export(gradient_ai_exports, { GradientLLM: () => GradientLLM });
/**
* The GradientLLM class is used to interact with Gradient AI inference Endpoint models.
* This requires your Gradient AI Access Token which is autoloaded if not specified.
*/
var GradientLLM = class extends __langchain_core_language_models_llms.LLM {
	static lc_name() {
		return "GradientLLM";
	}
	get lc_secrets() {
		return {
			gradientAccessKey: "GRADIENT_ACCESS_TOKEN",
			workspaceId: "GRADIENT_WORKSPACE_ID"
		};
	}
	modelSlug = "llama2-7b-chat";
	adapterId;
	gradientAccessKey;
	workspaceId;
	inferenceParameters;
	lc_serializable = true;
	model;
	constructor(fields) {
		super(fields);
		this.modelSlug = fields?.modelSlug ?? this.modelSlug;
		this.adapterId = fields?.adapterId;
		this.gradientAccessKey = fields?.gradientAccessKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("GRADIENT_ACCESS_TOKEN");
		this.workspaceId = fields?.workspaceId ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("GRADIENT_WORKSPACE_ID");
		this.inferenceParameters = fields.inferenceParameters;
		if (!this.gradientAccessKey) throw new Error("Missing Gradient AI Access Token");
		if (!this.workspaceId) throw new Error("Missing Gradient AI Workspace ID");
	}
	_llmType() {
		return "gradient_ai";
	}
	/**
	* Calls the Gradient AI endpoint and retrieves the result.
	* @param {string} prompt The input prompt.
	* @returns {Promise<string>} A promise that resolves to the generated string.
	*/
	/** @ignore */
	async _call(prompt, _options) {
		await this.setModel();
		const response = await this.caller.call(async () => this.model.complete({
			query: prompt,
			...this.inferenceParameters
		}));
		return response.generatedOutput;
	}
	async setModel() {
		if (this.model) return;
		const gradient = new __gradientai_nodejs_sdk.Gradient({
			accessToken: this.gradientAccessKey,
			workspaceId: this.workspaceId
		});
		if (this.adapterId) this.model = await gradient.getModelAdapter({ modelAdapterId: this.adapterId });
		else this.model = await gradient.getBaseModel({ baseModelSlug: this.modelSlug });
	}
};

//#endregion
exports.GradientLLM = GradientLLM;
Object.defineProperty(exports, 'gradient_ai_exports', {
  enumerable: true,
  get: function () {
    return gradient_ai_exports;
  }
});
//# sourceMappingURL=gradient_ai.cjs.map