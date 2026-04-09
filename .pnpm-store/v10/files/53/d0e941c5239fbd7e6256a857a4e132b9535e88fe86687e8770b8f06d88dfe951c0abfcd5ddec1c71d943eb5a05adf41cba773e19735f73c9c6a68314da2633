import { SharedV3Headers } from '../../shared';
import { LanguageModelV3StreamPart } from './language-model-v3-stream-part';

/**
 * The result of a language model doStream call.
 */
export type LanguageModelV3StreamResult = {
  /**
   * The stream.
   */
  stream: ReadableStream<LanguageModelV3StreamPart>;

  /**
   * Optional request information for telemetry and debugging purposes.
   */
  request?: {
    /**
     * Request HTTP body that was sent to the provider API.
     */
    body?: unknown;
  };

  /**
   * Optional response data.
   */
  response?: {
    /**
     * Response headers.
     */
    headers?: SharedV3Headers;
  };
};
