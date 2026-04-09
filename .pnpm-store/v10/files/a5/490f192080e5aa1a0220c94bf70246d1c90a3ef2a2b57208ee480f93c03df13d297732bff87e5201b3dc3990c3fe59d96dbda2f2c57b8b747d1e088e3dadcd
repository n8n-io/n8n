import { prepareHeaders } from '../util/prepare-headers';
import { JsonToSseTransformStream } from './json-to-sse-transform-stream';
import { UI_MESSAGE_STREAM_HEADERS } from './ui-message-stream-headers';
import { UIMessageChunk } from './ui-message-chunks';
import { UIMessageStreamResponseInit } from './ui-message-stream-response-init';

/**
 * Creates a Response object from a UI message stream.
 * The stream is transformed to Server-Sent Events (SSE) format.
 *
 * @param options.status - The HTTP status code for the response.
 * @param options.statusText - The HTTP status text for the response.
 * @param options.headers - Additional HTTP headers to include in the response.
 * @param options.stream - The UI message chunk stream to send.
 * @param options.consumeSseStream - Optional callback to consume a copy of the SSE stream independently.
 *
 * @returns A `Response` object with the UI message stream as the body.
 */
export function createUIMessageStreamResponse({
  status,
  statusText,
  headers,
  stream,
  consumeSseStream,
}: UIMessageStreamResponseInit & {
  stream: ReadableStream<UIMessageChunk>;
}): Response {
  let sseStream = stream.pipeThrough(new JsonToSseTransformStream());

  // when the consumeSseStream is provided, we need to tee the stream
  // and send the second part to the consumeSseStream function
  // so that it can be consumed by the client independently
  if (consumeSseStream) {
    const [stream1, stream2] = sseStream.tee();
    sseStream = stream1;
    consumeSseStream({ stream: stream2 }); // no await (do not block the response)
  }

  return new Response(sseStream.pipeThrough(new TextEncoderStream()), {
    status,
    statusText,
    headers: prepareHeaders(headers, UI_MESSAGE_STREAM_HEADERS),
  });
}
