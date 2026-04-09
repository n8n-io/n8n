import { DownloadError } from './download-error';

/**
 * Default maximum download size: 2 GiB.
 *
 * `fetch().arrayBuffer()` has ~2x peak memory overhead (undici buffers the
 * body internally, then creates the JS ArrayBuffer), so very large downloads
 * risk exceeding the default V8 heap limit on 64-bit systems and terminating
 * the process with an out-of-memory error.
 *
 * Setting this limit converts an unrecoverable OOM crash into a catchable
 * `DownloadError`.
 */
export const DEFAULT_MAX_DOWNLOAD_SIZE = 2 * 1024 * 1024 * 1024;

/**
 * Reads a fetch Response body with a size limit to prevent memory exhaustion.
 *
 * Checks the Content-Length header for early rejection, then reads the body
 * incrementally via ReadableStream and aborts with a DownloadError when the
 * limit is exceeded.
 *
 * @param response - The fetch Response to read.
 * @param url - The URL being downloaded (used in error messages).
 * @param maxBytes - Maximum allowed bytes. Defaults to DEFAULT_MAX_DOWNLOAD_SIZE.
 * @returns A Uint8Array containing the response body.
 * @throws DownloadError if the response exceeds maxBytes.
 */
export async function readResponseWithSizeLimit({
  response,
  url,
  maxBytes = DEFAULT_MAX_DOWNLOAD_SIZE,
}: {
  response: Response;
  url: string;
  maxBytes?: number;
}): Promise<Uint8Array> {
  // Early rejection based on Content-Length header
  const contentLength = response.headers.get('content-length');
  if (contentLength != null) {
    const length = parseInt(contentLength, 10);
    if (!isNaN(length) && length > maxBytes) {
      throw new DownloadError({
        url,
        message: `Download of ${url} exceeded maximum size of ${maxBytes} bytes (Content-Length: ${length}).`,
      });
    }
  }

  const body = response.body;

  // Handle missing body (empty responses)
  if (body == null) {
    return new Uint8Array(0);
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.length;

      if (totalBytes > maxBytes) {
        throw new DownloadError({
          url,
          message: `Download of ${url} exceeded maximum size of ${maxBytes} bytes.`,
        });
      }

      chunks.push(value);
    }
  } finally {
    try {
      await reader.cancel();
    } finally {
      reader.releaseLock();
    }
  }

  // Concatenate chunks into a single Uint8Array
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}
