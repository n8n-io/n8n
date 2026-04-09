import { prepareHeaders } from '../util/prepare-headers';

/**
 * Creates a Response object from a text stream.
 * Each text chunk is encoded as UTF-8 and sent as a separate chunk.
 * Sets a `Content-Type` header to `text/plain; charset=utf-8`.
 *
 * @param options - The options for creating the response.
 * @param options.status - Optional HTTP status code (default: 200).
 * @param options.statusText - Optional HTTP status text.
 * @param options.headers - Optional response headers.
 * @param options.textStream - The text stream to send.
 * @returns A Response object with the text stream body.
 */
export function createTextStreamResponse({
  status,
  statusText,
  headers,
  textStream,
}: ResponseInit & {
  textStream: ReadableStream<string>;
}): Response {
  return new Response(textStream.pipeThrough(new TextEncoderStream()), {
    status: status ?? 200,
    statusText,
    headers: prepareHeaders(headers, {
      'content-type': 'text/plain; charset=utf-8',
    }),
  });
}
