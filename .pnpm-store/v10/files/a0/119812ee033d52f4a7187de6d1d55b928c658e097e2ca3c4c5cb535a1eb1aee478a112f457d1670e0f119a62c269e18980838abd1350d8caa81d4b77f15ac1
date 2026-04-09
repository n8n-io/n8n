import { JSONSchema7 } from 'json-schema';
import { SharedV2ProviderOptions } from '../../shared/v2/shared-v2-provider-options';
import { LanguageModelV2FunctionTool } from './language-model-v2-function-tool';
import { LanguageModelV2Prompt } from './language-model-v2-prompt';
import { LanguageModelV2ProviderDefinedTool } from './language-model-v2-provider-defined-tool';
import { LanguageModelV2ToolChoice } from './language-model-v2-tool-choice';

export type LanguageModelV2CallOptions = {
  /**
   * A language mode prompt is a standardized prompt type.
   *
   * Note: This is **not** the user-facing prompt. The AI SDK methods will map the
   * user-facing prompt types such as chat or instruction prompts to this format.
   * That approach allows us to evolve the user  facing prompts without breaking
   * the language model interface.
   */
  prompt: LanguageModelV2Prompt;

  /**
   * Maximum number of tokens to generate.
   */
  maxOutputTokens?: number;

  /**
   * Temperature setting. The range depends on the provider and model.
   */
  temperature?: number;

  /**
   * Stop sequences.
   * If set, the model will stop generating text when one of the stop sequences is generated.
   * Providers may have limits on the number of stop sequences.
   */
  stopSequences?: string[];

  /**
   * Nucleus sampling.
   */
  topP?: number;

  /**
   * Only sample from the top K options for each subsequent token.
   *
   * Used to remove "long tail" low probability responses.
   * Recommended for advanced use cases only. You usually only need to use temperature.
   */
  topK?: number;

  /**
   * Presence penalty setting. It affects the likelihood of the model to
   * repeat information that is already in the prompt.
   */
  presencePenalty?: number;

  /**
   * Frequency penalty setting. It affects the likelihood of the model
   * to repeatedly use the same words or phrases.
   */
  frequencyPenalty?: number;

  /**
   * Response format. The output can either be text or JSON. Default is text.
   *
   * If JSON is selected, a schema can optionally be provided to guide the LLM.
   */
  responseFormat?:
    | { type: 'text' }
    | {
        type: 'json';

        /**
         * JSON schema that the generated output should conform to.
         */
        schema?: JSONSchema7;

        /**
         * Name of output that should be generated. Used by some providers for additional LLM guidance.
         */
        name?: string;

        /**
         * Description of the output that should be generated. Used by some providers for additional LLM guidance.
         */
        description?: string;
      };

  /**
   * The seed (integer) to use for random sampling. If set and supported
   * by the model, calls will generate deterministic results.
   */
  seed?: number;

  /**
   * The tools that are available for the model.
   */
  tools?: Array<
    LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool
  >;

  /**
   * Specifies how the tool should be selected. Defaults to 'auto'.
   */
  toolChoice?: LanguageModelV2ToolChoice;

  /**
   * Include raw chunks in the stream. Only applicable for streaming calls.
   */
  includeRawChunks?: boolean;

  /**
   * Abort signal for cancelling the operation.
   */
  abortSignal?: AbortSignal;

  /**
   * Additional HTTP headers to be sent with the request.
   * Only applicable for HTTP-based providers.
   */
  headers?: Record<string, string | undefined>;

  /**
   * Additional provider-specific options. They are passed through
   * to the provider from the AI SDK and enable provider-specific
   * functionality that can be fully encapsulated in the provider.
   */
  providerOptions?: SharedV2ProviderOptions;
};
