import { __export } from "../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { LLM } from "@langchain/core/language_models/llms";

//#region src/llms/aleph_alpha.ts
var aleph_alpha_exports = {};
__export(aleph_alpha_exports, { AlephAlpha: () => AlephAlpha });
/**
* Specific implementation of a Large Language Model (LLM) designed to
* interact with the Aleph Alpha API. It extends the base LLM class and
* includes a variety of parameters for customizing the behavior of the
* Aleph Alpha model.
*/
var AlephAlpha = class extends LLM {
	lc_serializable = true;
	model = "luminous-base";
	maximum_tokens = 64;
	minimum_tokens = 0;
	echo;
	temperature = 0;
	top_k;
	top_p = 0;
	presence_penalty;
	frequency_penalty;
	sequence_penalty;
	sequence_penalty_min_length;
	repetition_penalties_include_prompt;
	repetition_penalties_include_completion;
	use_multiplicative_presence_penalty;
	use_multiplicative_frequency_penalty;
	use_multiplicative_sequence_penalty;
	penalty_bias;
	penalty_exceptions;
	penalty_exceptions_include_stop_sequences;
	best_of;
	n;
	logit_bias;
	log_probs;
	tokens;
	raw_completion;
	disable_optimizations;
	completion_bias_inclusion;
	completion_bias_inclusion_first_token_only;
	completion_bias_exclusion;
	completion_bias_exclusion_first_token_only;
	contextual_control_threshold;
	control_log_additive;
	aleph_alpha_api_key = getEnvironmentVariable("ALEPH_ALPHA_API_KEY");
	stop;
	base_url = "https://api.aleph-alpha.com/complete";
	constructor(fields) {
		super(fields ?? {});
		this.model = fields?.model ?? this.model;
		this.temperature = fields?.temperature ?? this.temperature;
		this.maximum_tokens = fields?.maximum_tokens ?? this.maximum_tokens;
		this.minimum_tokens = fields?.minimum_tokens ?? this.minimum_tokens;
		this.top_k = fields?.top_k ?? this.top_k;
		this.top_p = fields?.top_p ?? this.top_p;
		this.presence_penalty = fields?.presence_penalty ?? this.presence_penalty;
		this.frequency_penalty = fields?.frequency_penalty ?? this.frequency_penalty;
		this.sequence_penalty = fields?.sequence_penalty ?? this.sequence_penalty;
		this.sequence_penalty_min_length = fields?.sequence_penalty_min_length ?? this.sequence_penalty_min_length;
		this.repetition_penalties_include_prompt = fields?.repetition_penalties_include_prompt ?? this.repetition_penalties_include_prompt;
		this.repetition_penalties_include_completion = fields?.repetition_penalties_include_completion ?? this.repetition_penalties_include_completion;
		this.use_multiplicative_presence_penalty = fields?.use_multiplicative_presence_penalty ?? this.use_multiplicative_presence_penalty;
		this.use_multiplicative_frequency_penalty = fields?.use_multiplicative_frequency_penalty ?? this.use_multiplicative_frequency_penalty;
		this.use_multiplicative_sequence_penalty = fields?.use_multiplicative_sequence_penalty ?? this.use_multiplicative_sequence_penalty;
		this.penalty_bias = fields?.penalty_bias ?? this.penalty_bias;
		this.penalty_exceptions = fields?.penalty_exceptions ?? this.penalty_exceptions;
		this.penalty_exceptions_include_stop_sequences = fields?.penalty_exceptions_include_stop_sequences ?? this.penalty_exceptions_include_stop_sequences;
		this.best_of = fields?.best_of ?? this.best_of;
		this.n = fields?.n ?? this.n;
		this.logit_bias = fields?.logit_bias ?? this.logit_bias;
		this.log_probs = fields?.log_probs ?? this.log_probs;
		this.tokens = fields?.tokens ?? this.tokens;
		this.raw_completion = fields?.raw_completion ?? this.raw_completion;
		this.disable_optimizations = fields?.disable_optimizations ?? this.disable_optimizations;
		this.completion_bias_inclusion = fields?.completion_bias_inclusion ?? this.completion_bias_inclusion;
		this.completion_bias_inclusion_first_token_only = fields?.completion_bias_inclusion_first_token_only ?? this.completion_bias_inclusion_first_token_only;
		this.completion_bias_exclusion = fields?.completion_bias_exclusion ?? this.completion_bias_exclusion;
		this.completion_bias_exclusion_first_token_only = fields?.completion_bias_exclusion_first_token_only ?? this.completion_bias_exclusion_first_token_only;
		this.contextual_control_threshold = fields?.contextual_control_threshold ?? this.contextual_control_threshold;
		this.control_log_additive = fields?.control_log_additive ?? this.control_log_additive;
		this.aleph_alpha_api_key = fields?.aleph_alpha_api_key ?? this.aleph_alpha_api_key;
		this.stop = fields?.stop ?? this.stop;
	}
	/**
	* Validates the environment by ensuring the necessary Aleph Alpha API key
	* is available. Throws an error if the API key is missing.
	*/
	validateEnvironment() {
		if (!this.aleph_alpha_api_key) throw new Error("Aleph Alpha API Key is missing in environment variables.");
	}
	/** Get the default parameters for calling Aleph Alpha API. */
	get defaultParams() {
		return {
			model: this.model,
			temperature: this.temperature,
			maximum_tokens: this.maximum_tokens,
			minimum_tokens: this.minimum_tokens,
			top_k: this.top_k,
			top_p: this.top_p,
			presence_penalty: this.presence_penalty,
			frequency_penalty: this.frequency_penalty,
			sequence_penalty: this.sequence_penalty,
			sequence_penalty_min_length: this.sequence_penalty_min_length,
			repetition_penalties_include_prompt: this.repetition_penalties_include_prompt,
			repetition_penalties_include_completion: this.repetition_penalties_include_completion,
			use_multiplicative_presence_penalty: this.use_multiplicative_presence_penalty,
			use_multiplicative_frequency_penalty: this.use_multiplicative_frequency_penalty,
			use_multiplicative_sequence_penalty: this.use_multiplicative_sequence_penalty,
			penalty_bias: this.penalty_bias,
			penalty_exceptions: this.penalty_exceptions,
			penalty_exceptions_include_stop_sequences: this.penalty_exceptions_include_stop_sequences,
			best_of: this.best_of,
			n: this.n,
			logit_bias: this.logit_bias,
			log_probs: this.log_probs,
			tokens: this.tokens,
			raw_completion: this.raw_completion,
			disable_optimizations: this.disable_optimizations,
			completion_bias_inclusion: this.completion_bias_inclusion,
			completion_bias_inclusion_first_token_only: this.completion_bias_inclusion_first_token_only,
			completion_bias_exclusion: this.completion_bias_exclusion,
			completion_bias_exclusion_first_token_only: this.completion_bias_exclusion_first_token_only,
			contextual_control_threshold: this.contextual_control_threshold,
			control_log_additive: this.control_log_additive
		};
	}
	/** Get the identifying parameters for this LLM. */
	get identifyingParams() {
		return { ...this.defaultParams };
	}
	/** Get the type of LLM. */
	_llmType() {
		return "aleph_alpha";
	}
	async _call(prompt, options) {
		let stop = options?.stop;
		this.validateEnvironment();
		if (this.stop && stop && this.stop.length > 0 && stop.length > 0) throw new Error("`stop` found in both the input and default params.");
		stop = this.stop ?? stop ?? [];
		const headers = {
			Authorization: `Bearer ${this.aleph_alpha_api_key}`,
			"Content-Type": "application/json",
			Accept: "application/json"
		};
		const data = {
			prompt,
			stop_sequences: stop,
			...this.defaultParams
		};
		const responseData = await this.caller.call(async () => {
			const response = await fetch(this.base_url, {
				method: "POST",
				headers,
				body: JSON.stringify(data),
				signal: options.signal
			});
			if (!response.ok) {
				const text = await response.text();
				const error = /* @__PURE__ */ new Error(`Aleph Alpha call failed with status ${response.status} and body ${text}`);
				error.response = response;
				throw error;
			}
			return response.json();
		});
		if (!responseData.completions || responseData.completions.length === 0 || !responseData.completions[0].completion) throw new Error("No completions found in response");
		return responseData.completions[0].completion ?? "";
	}
};

//#endregion
export { AlephAlpha, aleph_alpha_exports };
//# sourceMappingURL=aleph_alpha.js.map