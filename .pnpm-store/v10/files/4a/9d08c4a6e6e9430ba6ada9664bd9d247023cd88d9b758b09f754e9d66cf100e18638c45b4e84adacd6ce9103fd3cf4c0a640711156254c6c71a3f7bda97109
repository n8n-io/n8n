import { SharedV3ProviderMetadata } from '../../shared/v3/shared-v3-provider-metadata';

/**
 * A source that has been used as input to generate the response.
 */
export type LanguageModelV3Source =
  | {
      type: 'source';

      /**
       * The type of source - URL sources reference web content.
       */
      sourceType: 'url';

      /**
       * The ID of the source.
       */
      id: string;

      /**
       * The URL of the source.
       */
      url: string;

      /**
       * The title of the source.
       */
      title?: string;

      /**
       * Additional provider metadata for the source.
       */
      providerMetadata?: SharedV3ProviderMetadata;
    }
  | {
      type: 'source';

      /**
       * The type of source - document sources reference files/documents.
       */
      sourceType: 'document';

      /**
       * The ID of the source.
       */
      id: string;

      /**
       * IANA media type of the document (e.g., 'application/pdf').
       */
      mediaType: string;

      /**
       * The title of the document.
       */
      title: string;

      /**
       * Optional filename of the document.
       */
      filename?: string;

      /**
       * Additional provider metadata for the source.
       */
      providerMetadata?: SharedV3ProviderMetadata;
    };
