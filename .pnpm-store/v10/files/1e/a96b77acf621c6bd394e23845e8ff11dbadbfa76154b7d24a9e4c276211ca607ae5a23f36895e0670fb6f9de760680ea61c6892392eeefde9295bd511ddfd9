import { ServerResponse } from 'node:http';

/**
 * Writes the content of a stream to a server response.
 */
export function writeToServerResponse({
  response,
  status,
  statusText,
  headers,
  stream,
}: {
  response: ServerResponse;
  status?: number;
  statusText?: string;
  headers?: Record<string, string | number | string[]>;
  stream: ReadableStream<Uint8Array>;
}): void {
  const statusCode = status ?? 200;
  if (statusText !== undefined) {
    response.writeHead(statusCode, statusText, headers);
  } else {
    response.writeHead(statusCode, headers);
  }

  const reader = stream.getReader();
  const read = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Respect backpressure: if write() returns false, wait for 'drain' event
        const canContinue = response.write(value);
        if (!canContinue) {
          await new Promise<void>(resolve => {
            response.once('drain', resolve);
          });
        }
      }
    } catch (error) {
      throw error;
    } finally {
      response.end();
    }
  };

  read();
}
