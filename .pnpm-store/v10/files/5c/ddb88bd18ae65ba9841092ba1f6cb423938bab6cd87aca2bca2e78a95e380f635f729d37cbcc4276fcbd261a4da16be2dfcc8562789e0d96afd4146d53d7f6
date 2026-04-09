import { SharedV3ProviderMetadata } from '../../shared';

/**
 * A video or image file that can be used for video editing or image-to-video generation.
 * Supports both image inputs (for image-to-video) and video inputs (for editing).
 */
export type VideoModelV3File =
  | {
      type: 'file';

      /**
       * The IANA media type of the file.
       * Video types: 'video/mp4', 'video/webm', 'video/quicktime'
       * Image types: 'image/png', 'image/jpeg', 'image/webp'
       */
      mediaType: string;

      /**
       * File data as base64 encoded string or binary data.
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
       * The URL of the video or image file.
       */
      url: string;

      /**
       * Optional provider-specific metadata for the file part.
       */
      providerOptions?: SharedV3ProviderMetadata;
    };
