import {
  GeneratedFile,
  DefaultGeneratedFile,
} from '../generate-text/generated-file';

/**
 * A generated audio file.
 */
export interface GeneratedAudioFile extends GeneratedFile {
  /**
   * Audio format of the file (e.g., 'mp3', 'wav', etc.)
   */
  readonly format: string;
}

export class DefaultGeneratedAudioFile
  extends DefaultGeneratedFile
  implements GeneratedAudioFile
{
  readonly format: string;

  constructor({
    data,
    mediaType,
  }: {
    data: string | Uint8Array;
    mediaType: string;
  }) {
    super({ data, mediaType });
    let format = 'mp3';

    // If format is not provided, try to determine it from the media type
    if (mediaType) {
      const mediaTypeParts = mediaType.split('/');

      if (mediaTypeParts.length === 2) {
        // Handle special cases for audio formats
        if (mediaType !== 'audio/mpeg') {
          format = mediaTypeParts[1];
        }
      }
    }

    if (!format) {
      // TODO this should be an AI SDK error
      throw new Error(
        'Audio format must be provided or determinable from media type',
      );
    }

    this.format = format;
  }
}

export class DefaultGeneratedAudioFileWithType extends DefaultGeneratedAudioFile {
  readonly type = 'audio';

  constructor(options: {
    data: string | Uint8Array;
    mediaType: string;
    format: string;
  }) {
    super(options);
  }
}
