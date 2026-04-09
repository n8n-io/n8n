/**
 * Reason why a language model finished generating a response.
 *
 * Contains both a unified finish reason and a raw finish reason from the provider.
 * The unified finish reason is used to provide a consistent finish reason across different providers.
 * The raw finish reason is used to provide the original finish reason from the provider.
 */
export type LanguageModelV3FinishReason = {
  /**
   * Unified finish reason. This enables using the same finish reason across different providers.
   *
   * Can be one of the following:
   * - `stop`: model generated stop sequence
   * - `length`: model generated maximum number of tokens
   * - `content-filter`: content filter violation stopped the model
   * - `tool-calls`: model triggered tool calls
   * - `error`: model stopped because of an error
   * - `other`: model stopped for other reasons
   */
  unified:
    | 'stop'
    | 'length'
    | 'content-filter'
    | 'tool-calls'
    | 'error'
    | 'other';

  /**
   * Raw finish reason from the provider.
   * This is the original finish reason from the provider.
   */
  raw: string | undefined;
};
