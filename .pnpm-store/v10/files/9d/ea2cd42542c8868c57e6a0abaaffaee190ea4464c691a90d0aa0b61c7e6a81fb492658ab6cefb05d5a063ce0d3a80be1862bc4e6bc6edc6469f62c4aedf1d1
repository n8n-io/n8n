/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Translation inference
 */
export interface TranslationInput {
    /**
     * The text to translate.
     */
    inputs: string;
    /**
     * Additional inference parameters for Translation
     */
    parameters?: TranslationParameters;
    [property: string]: unknown;
}
/**
 * Additional inference parameters for Translation
 */
export interface TranslationParameters {
    /**
     * Whether to clean up the potential extra spaces in the text output.
     */
    clean_up_tokenization_spaces?: boolean;
    /**
     * Additional parametrization of the text generation algorithm.
     */
    generate_parameters?: {
        [key: string]: unknown;
    };
    /**
     * The source language of the text. Required for models that can translate from multiple
     * languages.
     */
    src_lang?: string;
    /**
     * Target language to translate to. Required for models that can translate to multiple
     * languages.
     */
    tgt_lang?: string;
    /**
     * The truncation strategy to use.
     */
    truncation?: TranslationTruncationStrategy;
    [property: string]: unknown;
}
/**
 * The truncation strategy to use.
 */
export type TranslationTruncationStrategy = "do_not_truncate" | "longest_first" | "only_first" | "only_second";
/**
 * Outputs of inference for the Translation task
 */
export interface TranslationOutput {
    /**
     * The translated text.
     */
    translation_text: string;
    [property: string]: unknown;
}
//# sourceMappingURL=inference.d.ts.map