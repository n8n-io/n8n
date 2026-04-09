import { GeneratedFile } from '../generate-text';
import { ImageModelProviderMetadata } from '../types/image-model';
import { ImageModelResponseMetadata } from '../types/image-model-response-metadata';
import { ImageModelUsage } from '../types/usage';
import { Warning } from '../types/warning';

/**
 * The result of a `generateImage` call.
 * It contains the images and additional information.
 */
export interface GenerateImageResult {
  /**
   * The first image that was generated.
   */
  readonly image: GeneratedFile;

  /**
   * The images that were generated.
   */
  readonly images: Array<GeneratedFile>;

  /**
   * Warnings for the call, e.g. unsupported settings.
   */
  readonly warnings: Array<Warning>;

  /**
   * Response metadata from the provider. There may be multiple responses if we made multiple calls to the model.
   */
  readonly responses: Array<ImageModelResponseMetadata>;

  /**
   * Provider-specific metadata. They are passed through from the provider to the AI SDK and enable provider-specific
   * results that can be fully encapsulated in the provider.
   */
  readonly providerMetadata: ImageModelProviderMetadata;

  /**
   * Combined token usage across all underlying provider calls for this image generation.
   */
  readonly usage: ImageModelUsage;
}
