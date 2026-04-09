import { ImageModelV3File } from '@ai-sdk/provider';
import { convertUint8ArrayToBase64 } from './uint8-utils';

/**
 * Convert an ImageModelV3File to a URL or data URI string.
 *
 * If the file is a URL, it returns the URL as-is.
 * If the file is base64 data, it returns a data URI with the base64 data.
 * If the file is a Uint8Array, it converts it to base64 and returns a data URI.
 */
export function convertImageModelFileToDataUri(file: ImageModelV3File): string {
  if (file.type === 'url') return file.url;

  return `data:${file.mediaType};base64,${
    typeof file.data === 'string'
      ? file.data
      : convertUint8ArrayToBase64(file.data)
  }`;
}
