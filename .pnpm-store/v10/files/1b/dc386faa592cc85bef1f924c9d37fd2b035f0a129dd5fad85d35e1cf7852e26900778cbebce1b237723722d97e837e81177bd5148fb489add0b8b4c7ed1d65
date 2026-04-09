import { ServerResponse } from 'node:http';
import { prepareHeaders } from '../util/prepare-headers';
import { writeToServerResponse } from '../util/write-to-server-response';

/**
 * Writes a text stream to a Node.js ServerResponse object.
 * Each text chunk is encoded as UTF-8 and written as a separate chunk.
 * Sets a `Content-Type` header to `text/plain; charset=utf-8`.
 *
 * @param options - The options for piping the stream.
 * @param options.response - The Node.js ServerResponse to write to.
 * @param options.status - Optional HTTP status code.
 * @param options.statusText - Optional HTTP status text.
 * @param options.headers - Optional response headers.
 * @param options.textStream - The text stream to pipe.
 */
export function pipeTextStreamToResponse({
  response,
  status,
  statusText,
  headers,
  textStream,
}: {
  response: ServerResponse;
  textStream: ReadableStream<string>;
} & ResponseInit): void {
  writeToServerResponse({
    response,
    status,
    statusText,
    headers: Object.fromEntries(
      prepareHeaders(headers, {
        'content-type': 'text/plain; charset=utf-8',
      }).entries(),
    ),
    stream: textStream.pipeThrough(new TextEncoderStream()),
  });
}
