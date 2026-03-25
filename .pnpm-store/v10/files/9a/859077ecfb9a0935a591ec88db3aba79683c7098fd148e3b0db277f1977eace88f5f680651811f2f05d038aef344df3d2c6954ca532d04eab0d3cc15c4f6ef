const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_language_models_llms = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/llms"));
const __writerai_writer_sdk = require_rolldown_runtime.__toESM(require("@writerai/writer-sdk"));

//#region src/llms/writer.ts
var writer_exports = {};
require_rolldown_runtime.__export(writer_exports, { Writer: () => Writer });
/**
* Class representing a Writer Large Language Model (LLM). It interacts
* with the Writer API to generate text completions.
*/
var Writer = class extends __langchain_core_language_models_llms.LLM {
	static lc_name() {
		return "Writer";
	}
	get lc_secrets() {
		return {
			apiKey: "WRITER_API_KEY",
			orgId: "WRITER_ORG_ID"
		};
	}
	get lc_aliases() {
		return {
			apiKey: "writer_api_key",
			orgId: "writer_org_id"
		};
	}
	lc_serializable = true;
	apiKey;
	orgId;
	model = "palmyra-instruct";
	temperature;
	minTokens;
	maxTokens;
	bestOf;
	frequencyPenalty;
	logprobs;
	n;
	presencePenalty;
	topP;
	constructor(fields) {
		super(fields ?? {});
		const apiKey = fields?.apiKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("WRITER_API_KEY");
		const orgId = fields?.orgId ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("WRITER_ORG_ID");
		if (!apiKey) throw new Error("Please set the WRITER_API_KEY environment variable or pass it to the constructor as the apiKey field.");
		if (!orgId) throw new Error("Please set the WRITER_ORG_ID environment variable or pass it to the constructor as the orgId field.");
		this.apiKey = apiKey;
		this.orgId = typeof orgId === "string" ? parseInt(orgId, 10) : orgId;
		this.model = fields?.model ?? this.model;
		this.temperature = fields?.temperature ?? this.temperature;
		this.minTokens = fields?.minTokens ?? this.minTokens;
		this.maxTokens = fields?.maxTokens ?? this.maxTokens;
		this.bestOf = fields?.bestOf ?? this.bestOf;
		this.frequencyPenalty = fields?.frequencyPenalty ?? this.frequencyPenalty;
		this.logprobs = fields?.logprobs ?? this.logprobs;
		this.n = fields?.n ?? this.n;
		this.presencePenalty = fields?.presencePenalty ?? this.presencePenalty;
		this.topP = fields?.topP ?? this.topP;
	}
	_llmType() {
		return "writer";
	}
	/** @ignore */
	async _call(prompt, options) {
		const sdk = new __writerai_writer_sdk.Writer({
			security: { apiKey: this.apiKey },
			organizationId: this.orgId
		});
		return this.caller.callWithOptions({ signal: options.signal }, async () => {
			try {
				const res = await sdk.completions.create({
					completionRequest: {
						prompt,
						stop: options.stop,
						temperature: this.temperature,
						minTokens: this.minTokens,
						maxTokens: this.maxTokens,
						bestOf: this.bestOf,
						n: this.n,
						frequencyPenalty: this.frequencyPenalty,
						logprobs: this.logprobs,
						presencePenalty: this.presencePenalty,
						topP: this.topP
					},
					modelId: this.model
				});
				return res.completionResponse?.choices?.[0].text ?? "No completion found.";
			} catch (e) {
				e.response = e.rawResponse;
				throw e;
			}
		});
	}
};

//#endregion
exports.Writer = Writer;
Object.defineProperty(exports, 'writer_exports', {
  enumerable: true,
  get: function () {
    return writer_exports;
  }
});
//# sourceMappingURL=writer.cjs.map