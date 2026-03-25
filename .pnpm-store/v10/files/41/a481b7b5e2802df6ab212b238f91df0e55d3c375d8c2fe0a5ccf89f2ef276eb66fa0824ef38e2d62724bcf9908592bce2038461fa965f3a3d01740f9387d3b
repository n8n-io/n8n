/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Text Generation Input.
 *
 * Auto-generated from TGI specs.
 * For more details, check out
 * https://github.com/huggingface/huggingface.js/blob/main/packages/tasks/scripts/inference-tgi-import.ts.
 */
export interface TextGenerationInput {
    inputs: string;
    parameters?: TextGenerationInputGenerateParameters;
    stream?: boolean;
    [property: string]: unknown;
}
export interface TextGenerationInputGenerateParameters {
    /**
     * Lora adapter id
     */
    adapter_id?: string;
    /**
     * Generate best_of sequences and return the one if the highest token logprobs.
     */
    best_of?: number;
    /**
     * Whether to return decoder input token logprobs and ids.
     */
    decoder_input_details?: boolean;
    /**
     * Whether to return generation details.
     */
    details?: boolean;
    /**
     * Activate logits sampling.
     */
    do_sample?: boolean;
    /**
     * The parameter for frequency penalty. 1.0 means no penalty
     * Penalize new tokens based on their existing frequency in the text so far,
     * decreasing the model's likelihood to repeat the same line verbatim.
     */
    frequency_penalty?: number;
    grammar?: TextGenerationInputGrammarType;
    /**
     * Maximum number of tokens to generate.
     */
    max_new_tokens?: number;
    /**
     * The parameter for repetition penalty. 1.0 means no penalty.
     * See [this paper](https://arxiv.org/pdf/1909.05858.pdf) for more details.
     */
    repetition_penalty?: number;
    /**
     * Whether to prepend the prompt to the generated text
     */
    return_full_text?: boolean;
    /**
     * Random sampling seed.
     */
    seed?: number;
    /**
     * Stop generating tokens if a member of `stop` is generated.
     */
    stop?: string[];
    /**
     * The value used to module the logits distribution.
     */
    temperature?: number;
    /**
     * The number of highest probability vocabulary tokens to keep for top-k-filtering.
     */
    top_k?: number;
    /**
     * The number of highest probability vocabulary tokens to keep for top-n-filtering.
     */
    top_n_tokens?: number;
    /**
     * Top-p value for nucleus sampling.
     */
    top_p?: number;
    /**
     * Truncate inputs tokens to the given size.
     */
    truncate?: number;
    /**
     * Typical Decoding mass
     * See [Typical Decoding for Natural Language Generation](https://arxiv.org/abs/2202.00666)
     * for more information.
     */
    typical_p?: number;
    /**
     * Watermarking with [A Watermark for Large Language
     * Models](https://arxiv.org/abs/2301.10226).
     */
    watermark?: boolean;
    [property: string]: unknown;
}
export interface TextGenerationInputGrammarType {
    type: Type;
    /**
     * A string that represents a [JSON Schema](https://json-schema.org/).
     *
     * JSON Schema is a declarative language that allows to annotate JSON documents
     * with types and descriptions.
     */
    value: unknown;
    [property: string]: unknown;
}
export type Type = "json" | "regex" | "json_schema";
/**
 * Text Generation Output.
 *
 * Auto-generated from TGI specs.
 * For more details, check out
 * https://github.com/huggingface/huggingface.js/blob/main/packages/tasks/scripts/inference-tgi-import.ts.
 */
export interface TextGenerationOutput {
    details?: TextGenerationOutputDetails;
    generated_text: string;
    [property: string]: unknown;
}
export interface TextGenerationOutputDetails {
    best_of_sequences?: TextGenerationOutputBestOfSequence[];
    finish_reason: TextGenerationOutputFinishReason;
    generated_tokens: number;
    prefill: TextGenerationOutputPrefillToken[];
    seed?: number;
    tokens: TextGenerationOutputToken[];
    top_tokens?: Array<TextGenerationOutputToken[]>;
    [property: string]: unknown;
}
export interface TextGenerationOutputBestOfSequence {
    finish_reason: TextGenerationOutputFinishReason;
    generated_text: string;
    generated_tokens: number;
    prefill: TextGenerationOutputPrefillToken[];
    seed?: number;
    tokens: TextGenerationOutputToken[];
    top_tokens?: Array<TextGenerationOutputToken[]>;
    [property: string]: unknown;
}
export type TextGenerationOutputFinishReason = "length" | "eos_token" | "stop_sequence";
export interface TextGenerationOutputPrefillToken {
    id: number;
    logprob: number;
    text: string;
    [property: string]: unknown;
}
export interface TextGenerationOutputToken {
    id: number;
    logprob: number;
    special: boolean;
    text: string;
    [property: string]: unknown;
}
/**
 * Text Generation Stream Output.
 *
 * Auto-generated from TGI specs.
 * For more details, check out
 * https://github.com/huggingface/huggingface.js/blob/main/packages/tasks/scripts/inference-tgi-import.ts.
 */
export interface TextGenerationStreamOutput {
    details?: TextGenerationStreamOutputStreamDetails;
    generated_text?: string;
    index: number;
    token: TextGenerationStreamOutputToken;
    top_tokens?: TextGenerationStreamOutputToken[];
    [property: string]: unknown;
}
export interface TextGenerationStreamOutputStreamDetails {
    finish_reason: TextGenerationOutputFinishReason;
    generated_tokens: number;
    input_length: number;
    seed?: number;
    [property: string]: unknown;
}
export interface TextGenerationStreamOutputToken {
    id: number;
    logprob: number;
    special: boolean;
    text: string;
    [property: string]: unknown;
}
//# sourceMappingURL=inference.d.ts.map