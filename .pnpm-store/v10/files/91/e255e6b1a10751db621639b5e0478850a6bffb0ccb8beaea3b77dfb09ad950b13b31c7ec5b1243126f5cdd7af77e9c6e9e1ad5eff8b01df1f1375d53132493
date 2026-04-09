import { GeneratedFile } from '../generate-text';
import { VideoModelProviderMetadata } from '../types/video-model';
import { VideoModelResponseMetadata } from '../types/video-model-response-metadata';
import { Warning } from '../types/warning';

/**
 * The result of an `experimental_generateVideo` call.
 * Contains the generated video and additional information.
 */
export interface GenerateVideoResult {
  /**
   * The first video that was generated.
   */
  readonly video: GeneratedFile;

  /**
   * All videos that were generated.
   */
  readonly videos: Array<GeneratedFile>;

  /**
   * Warnings for the call, e.g. unsupported settings.
   */
  readonly warnings: Array<Warning>;

  /**
   * Response metadata from the provider.
   * May contain multiple responses if multiple calls were made.
   */
  readonly responses: Array<VideoModelResponseMetadata>;

  /**
   * Provider-specific metadata passed through from the provider.
   */
  readonly providerMetadata: VideoModelProviderMetadata;
}
