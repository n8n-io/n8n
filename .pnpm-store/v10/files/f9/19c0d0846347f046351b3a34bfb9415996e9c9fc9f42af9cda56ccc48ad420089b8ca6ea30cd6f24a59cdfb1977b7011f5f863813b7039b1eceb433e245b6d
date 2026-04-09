import { ServerResponse } from 'http';
import { AsyncIterableStream } from '../util/async-iterable-stream';
import {
  CallWarning,
  FinishReason,
  LanguageModelRequestMetadata,
  LanguageModelResponseMetadata,
  ProviderMetadata,
} from '../types';
import { LanguageModelUsage } from '../types/usage';

/**
 * The result of a `streamObject` call that contains the partial object stream and additional information.
 */
export interface StreamObjectResult<PARTIAL, RESULT, ELEMENT_STREAM> {
  /**
   * Warnings from the model provider (e.g. unsupported settings)
   */
  readonly warnings: Promise<CallWarning[] | undefined>;

  /**
   * The token usage of the generated response. Resolved when the response is finished.
   */
  readonly usage: Promise<LanguageModelUsage>;

  /**
   * Additional provider-specific metadata. They are passed through
   * from the provider to the AI SDK and enable provider-specific
   * results that can be fully encapsulated in the provider.
   */
  readonly providerMetadata: Promise<ProviderMetadata | undefined>;

  /**
   * Additional request information from the last step.
   */
  readonly request: Promise<LanguageModelRequestMetadata>;

  /**
   * Additional response information.
   */
  readonly response: Promise<LanguageModelResponseMetadata>;

  /**
   * The reason why the generation finished. Taken from the last step.
   *
   * Resolved when the response is finished.
   */
  readonly finishReason: Promise<FinishReason>;

  /**
   * The generated object (typed according to the schema). Resolved when the response is finished.
   */
  readonly object: Promise<RESULT>;

  /**
   * Stream of partial objects. It gets more complete as the stream progresses.
   *
   * Note that the partial object is not validated.
   * If you want to be certain that the actual content matches your schema, you need to implement your own validation for partial results.
   */
  readonly partialObjectStream: AsyncIterableStream<PARTIAL>;

  /**
   * Stream over complete array elements. Only available if the output strategy is set to `array`.
   */
  readonly elementStream: ELEMENT_STREAM;

  /**
   * Text stream of the JSON representation of the generated object. It contains text chunks.
   * When the stream is finished, the object is valid JSON that can be parsed.
   */
  readonly textStream: AsyncIterableStream<string>;

  /**
   * Stream of different types of events, including partial objects, errors, and finish events.
   * Only errors that stop the stream, such as network errors, are thrown.
   */
  readonly fullStream: AsyncIterableStream<ObjectStreamPart<PARTIAL>>;

  /**
   * Writes text delta output to a Node.js response-like object.
   * It sets a `Content-Type` header to `text/plain; charset=utf-8` and
   * writes each text delta as a separate chunk.
   *
   * @param response A Node.js response-like object (ServerResponse).
   * @param init Optional headers, status code, and status text.
   */
  pipeTextStreamToResponse(response: ServerResponse, init?: ResponseInit): void;

  /**
   * Creates a simple text stream response.
   * The response has a `Content-Type` header set to `text/plain; charset=utf-8`.
   * Each text delta is encoded as UTF-8 and sent as a separate chunk.
   * Non-text-delta events are ignored.
   *
   * @param init Optional headers, status code, and status text.
   */
  toTextStreamResponse(init?: ResponseInit): Response;
}

export type ObjectStreamPart<PARTIAL> =
  | {
      type: 'object';
      object: PARTIAL;
    }
  | {
      type: 'text-delta';
      textDelta: string;
    }
  | {
      type: 'error';
      error: unknown;
    }
  | {
      type: 'finish';
      finishReason: FinishReason;
      usage: LanguageModelUsage;
      response: LanguageModelResponseMetadata;
      providerMetadata?: ProviderMetadata;
    };
