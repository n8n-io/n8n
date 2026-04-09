import {
  DownloadError,
  readResponseWithSizeLimit,
  DEFAULT_MAX_DOWNLOAD_SIZE,
  validateDownloadUrl,
} from '@ai-sdk/provider-utils';
import {
  withUserAgentSuffix,
  getRuntimeEnvironmentUserAgent,
} from '@ai-sdk/provider-utils';
import { VERSION } from '../../version';

/**
 * Download a file from a URL.
 *
 * @param url - The URL to download from.
 * @param maxBytes - Maximum allowed download size in bytes. Defaults to 100 MiB.
 * @param abortSignal - An optional abort signal to cancel the download.
 * @returns The downloaded data and media type.
 *
 * @throws DownloadError if the download fails or exceeds maxBytes.
 */
export const download = async ({
  url,
  maxBytes,
  abortSignal,
}: {
  url: URL;
  maxBytes?: number;
  abortSignal?: AbortSignal;
}) => {
  const urlText = url.toString();
  validateDownloadUrl(urlText);
  try {
    const response = await fetch(urlText, {
      headers: withUserAgentSuffix(
        {},
        `ai-sdk/${VERSION}`,
        getRuntimeEnvironmentUserAgent(),
      ),
      signal: abortSignal,
    });

    // Validate final URL after redirects to prevent SSRF via open redirect
    if (response.redirected) {
      validateDownloadUrl(response.url);
    }

    if (!response.ok) {
      throw new DownloadError({
        url: urlText,
        statusCode: response.status,
        statusText: response.statusText,
      });
    }

    const data = await readResponseWithSizeLimit({
      response,
      url: urlText,
      maxBytes: maxBytes ?? DEFAULT_MAX_DOWNLOAD_SIZE,
    });

    return {
      data,
      mediaType: response.headers.get('content-type') ?? undefined,
    };
  } catch (error) {
    if (DownloadError.isInstance(error)) {
      throw error;
    }

    throw new DownloadError({ url: urlText, cause: error });
  }
};
