import { download as originalDownload } from './download';

/**
 * Experimental. Can change in patch versions without warning.
 *
 * Download function. Called with the array of URLs and a boolean indicating
 * whether the URL is supported by the model.
 *
 * The download function can decide for each URL:
 * - to return null (which means that the URL should be passed to the model)
 * - to download the asset and return the data (incl. retries, authentication, etc.)
 *
 * Should throw DownloadError if the download fails.
 *
 * Should return an array of objects sorted by the order of the requested downloads.
 * For each object, the data should be a Uint8Array if the URL was downloaded.
 * For each object, the mediaType should be the media type of the downloaded asset.
 * For each object, the data should be null if the URL should be passed through as is.
 */
export type DownloadFunction = (
  options: Array<{
    url: URL;
    isUrlSupportedByModel: boolean;
  }>,
) => PromiseLike<
  Array<{
    data: Uint8Array;
    mediaType: string | undefined;
  } | null>
>;

/**
 * Default download function.
 * Downloads the file if it is not supported by the model.
 */
export const createDefaultDownloadFunction =
  (download: typeof originalDownload = originalDownload): DownloadFunction =>
  requestedDownloads =>
    Promise.all(
      requestedDownloads.map(async requestedDownload =>
        requestedDownload.isUrlSupportedByModel
          ? null
          : download(requestedDownload),
      ),
    );
