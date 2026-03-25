/**
 * Outputs of inference for the Text To Speech task
 */
export interface TextToSpeechOutput {
	/**
	 * The generated audio
	 */
	audio: Blob;
	/**
	 * The sampling rate of the generated audio waveform.
	 */
	sampling_rate?: number;
	[property: string]: unknown;
}
/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Text To Speech inference
 */
export interface TextToSpeechInput {
	/**
	 * The input text data
	 */
	inputs: string;
	/**
	 * Additional inference parameters for Text To Speech
	 */
	parameters?: TextToSpeechParameters;
	[property: string]: unknown;
}
/**
 * Additional inference parameters for Text To Speech
 */
export interface TextToSpeechParameters {
	/**
	 * Parametrization of the text generation process
	 */
	generation_parameters?: GenerationParameters;
	[property: string]: unknown;
}
/**
 * Parametrization of the text generation process
 */
export interface GenerationParameters {
	/**
	 * Whether to use sampling instead of greedy decoding when generating new tokens.
	 */
	do_sample?: boolean;
	/**
	 * Controls the stopping condition for beam-based methods.
	 */
	early_stopping?: EarlyStoppingUnion;
	/**
	 * If set to float strictly between 0 and 1, only tokens with a conditional probability
	 * greater than epsilon_cutoff will be sampled. In the paper, suggested values range from
	 * 3e-4 to 9e-4, depending on the size of the model. See [Truncation Sampling as Language
	 * Model Desmoothing](https://hf.co/papers/2210.15191) for more details.
	 */
	epsilon_cutoff?: number;
	/**
	 * Eta sampling is a hybrid of locally typical sampling and epsilon sampling. If set to
	 * float strictly between 0 and 1, a token is only considered if it is greater than either
	 * eta_cutoff or sqrt(eta_cutoff) * exp(-entropy(softmax(next_token_logits))). The latter
	 * term is intuitively the expected next token probability, scaled by sqrt(eta_cutoff). In
	 * the paper, suggested values range from 3e-4 to 2e-3, depending on the size of the model.
	 * See [Truncation Sampling as Language Model Desmoothing](https://hf.co/papers/2210.15191)
	 * for more details.
	 */
	eta_cutoff?: number;
	/**
	 * The maximum length (in tokens) of the generated text, including the input.
	 */
	max_length?: number;
	/**
	 * The maximum number of tokens to generate. Takes precedence over max_length.
	 */
	max_new_tokens?: number;
	/**
	 * The minimum length (in tokens) of the generated text, including the input.
	 */
	min_length?: number;
	/**
	 * The minimum number of tokens to generate. Takes precedence over min_length.
	 */
	min_new_tokens?: number;
	/**
	 * Number of groups to divide num_beams into in order to ensure diversity among different
	 * groups of beams. See [this paper](https://hf.co/papers/1610.02424) for more details.
	 */
	num_beam_groups?: number;
	/**
	 * Number of beams to use for beam search.
	 */
	num_beams?: number;
	/**
	 * The value balances the model confidence and the degeneration penalty in contrastive
	 * search decoding.
	 */
	penalty_alpha?: number;
	/**
	 * The value used to modulate the next token probabilities.
	 */
	temperature?: number;
	/**
	 * The number of highest probability vocabulary tokens to keep for top-k-filtering.
	 */
	top_k?: number;
	/**
	 * If set to float < 1, only the smallest set of most probable tokens with probabilities
	 * that add up to top_p or higher are kept for generation.
	 */
	top_p?: number;
	/**
	 * Local typicality measures how similar the conditional probability of predicting a target
	 * token next is to the expected conditional probability of predicting a random token next,
	 * given the partial text already generated. If set to float < 1, the smallest set of the
	 * most locally typical tokens with probabilities that add up to typical_p or higher are
	 * kept for generation. See [this paper](https://hf.co/papers/2202.00666) for more details.
	 */
	typical_p?: number;
	/**
	 * Whether the model should use the past last key/values attentions to speed up decoding
	 */
	use_cache?: boolean;
	[property: string]: unknown;
}
/**
 * Controls the stopping condition for beam-based methods.
 */
export type EarlyStoppingUnion = boolean | "never";
