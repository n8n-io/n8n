import {
  CallWarning,
  FinishReason,
  LanguageModelRequestMetadata,
  LanguageModelResponseMetadata,
  ProviderMetadata,
} from '../types';
import { LanguageModelUsage } from '../types/usage';

/**
 * The result of a `generateObject` call.
 */
export interface GenerateObjectResult<OBJECT> {
  /**
   * The generated object (typed according to the schema).
   */
  readonly object: OBJECT;

  /**
   * The reasoning that was used to generate the object.
   * Concatenated from all reasoning parts.
   */
  readonly reasoning: string | undefined;

  /**
   * The reason why the generation finished.
   */
  readonly finishReason: FinishReason;

  /**
   * The token usage of the generated response.
   */
  readonly usage: LanguageModelUsage;

  /**
   * Warnings from the model provider (e.g. unsupported settings).
   */
  readonly warnings: CallWarning[] | undefined;

  /**
   * Additional request information.
   */
  readonly request: LanguageModelRequestMetadata;

  /**
   * Additional response information.
   */
  readonly response: LanguageModelResponseMetadata & {
    /**
     * Response body (available only for providers that use HTTP requests).
     */
    body?: unknown;
  };

  /**
   * Additional provider-specific metadata. They are passed through
   * from the provider to the AI SDK and enable provider-specific
   * results that can be fully encapsulated in the provider.
   */
  readonly providerMetadata: ProviderMetadata | undefined;

  /**
   * Converts the object to a JSON response.
   * The response will have a status code of 200 and a content type of `application/json; charset=utf-8`.
   */
  toJsonResponse(init?: ResponseInit): Response;
}
