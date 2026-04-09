import { LanguageModelV2 } from '../../language-model/v2/language-model-v2';
import { LanguageModelV2CallOptions } from '../../language-model/v2/language-model-v2-call-options';

/**
 * Experimental middleware for LanguageModelV2.
 * This type defines the structure for middleware that can be used to modify
 * the behavior of LanguageModelV2 operations.
 */
export type LanguageModelV2Middleware = {
  /**
   * Middleware specification version. Use `v2` for the current version.
   */
  middlewareVersion?: 'v2' | undefined; // backwards compatibility

  /**
   * Override the provider name if desired.
   * @param options.model - The language model instance.
   */
  overrideProvider?: (options: { model: LanguageModelV2 }) => string;

  /**
   * Override the model ID if desired.
   * @param options.model - The language model instance.
   */
  overrideModelId?: (options: { model: LanguageModelV2 }) => string;

  /**
   * Override the supported URLs if desired.
   * @param options.model - The language model instance.
   */
  overrideSupportedUrls?: (options: {
    model: LanguageModelV2;
  }) => PromiseLike<Record<string, RegExp[]>> | Record<string, RegExp[]>;

  /**
   * Transforms the parameters before they are passed to the language model.
   * @param options - Object containing the type of operation and the parameters.
   * @param options.type - The type of operation ('generate' or 'stream').
   * @param options.params - The original parameters for the language model call.
   * @returns A promise that resolves to the transformed parameters.
   */
  transformParams?: (options: {
    type: 'generate' | 'stream';
    params: LanguageModelV2CallOptions;
    model: LanguageModelV2;
  }) => PromiseLike<LanguageModelV2CallOptions>;

  /**
   * Wraps the generate operation of the language model.
   * @param options - Object containing the generate function, parameters, and model.
   * @param options.doGenerate - The original generate function.
   * @param options.doStream - The original stream function.
   * @param options.params - The parameters for the generate call. If the
   * `transformParams` middleware is used, this will be the transformed parameters.
   * @param options.model - The language model instance.
   * @returns A promise that resolves to the result of the generate operation.
   */
  wrapGenerate?: (options: {
    doGenerate: () => ReturnType<LanguageModelV2['doGenerate']>;
    doStream: () => ReturnType<LanguageModelV2['doStream']>;
    params: LanguageModelV2CallOptions;
    model: LanguageModelV2;
  }) => Promise<Awaited<ReturnType<LanguageModelV2['doGenerate']>>>;

  /**
   * Wraps the stream operation of the language model.
   *
   * @param options - Object containing the stream function, parameters, and model.
   * @param options.doGenerate - The original generate function.
   * @param options.doStream - The original stream function.
   * @param options.params - The parameters for the stream call. If the
   * `transformParams` middleware is used, this will be the transformed parameters.
   * @param options.model - The language model instance.
   * @returns A promise that resolves to the result of the stream operation.
   */
  wrapStream?: (options: {
    doGenerate: () => ReturnType<LanguageModelV2['doGenerate']>;
    doStream: () => ReturnType<LanguageModelV2['doStream']>;
    params: LanguageModelV2CallOptions;
    model: LanguageModelV2;
  }) => PromiseLike<Awaited<ReturnType<LanguageModelV2['doStream']>>>;
};
