import { SharedV3ProviderMetadata } from '../../shared';

/**
 * An image file that can be used for image editing or variation generation.
 */
export type ImageModelV3File =
  | {
      type: 'file';

      /**
       * The IANA media type of the file, e.g. `image/png`. Any string is supported.
       *
       * @see https://www.iana.org/assignments/media-types/media-types.xhtml
       */
      mediaType: string;

      /**
       * Generated file data as base64 encoded strings or binary data.
       *
       * The file data should be returned without any unnecessary conversion.
       * If the API returns base64 encoded strings, the file data should be returned
       * as base64 encoded strings. If the API returns binary data, the file data should
       * be returned as binary data.
       */
      data: string | Uint8Array;

      /**
       * Optional provider-specific metadata for the file part.
       */
      providerOptions?: SharedV3ProviderMetadata;
    }
  | {
      type: 'url';

      /**
       * The URL of the image file.
       */
      url: string;

      /**
       * Optional provider-specific metadata for the file part.
       */
      providerOptions?: SharedV3ProviderMetadata;
    };
