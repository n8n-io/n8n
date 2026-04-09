import { JSONObject } from '../../json-value';

/**
 * Usage information for a language model call.
 */
export type LanguageModelV3Usage = {
  /**
   * Information about the input tokens.
   */
  inputTokens: {
    /**
     * The total number of input (prompt) tokens used.
     */
    total: number | undefined;

    /**
     * The number of non-cached input (prompt) tokens used.
     */
    noCache: number | undefined;

    /**
     * The number of cached input (prompt) tokens read.
     */
    cacheRead: number | undefined;

    /**
     * The number of cached input (prompt) tokens written.
     */
    cacheWrite: number | undefined;
  };

  /**
   * Information about the output tokens.
   */
  outputTokens: {
    /**
     * The total number of output (completion) tokens used.
     */
    total: number | undefined;

    /**
     * The number of text tokens used.
     */
    text: number | undefined;

    /**
     * The number of reasoning tokens used.
     */
    reasoning: number | undefined;
  };

  /**
   * Raw usage information from the provider.
   *
   * This is the usage information in the shape that the provider returns.
   * It can include additional information that is not part of the standard usage information.
   */
  raw?: JSONObject;
};
