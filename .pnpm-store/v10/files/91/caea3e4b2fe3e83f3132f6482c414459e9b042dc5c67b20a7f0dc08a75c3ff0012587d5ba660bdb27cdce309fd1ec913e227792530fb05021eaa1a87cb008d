export type OpenAISpeechAPITypes = {
  /**
   * The voice to use when generating the audio.
   * Supported voices are alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer, and verse.
   * @default 'alloy'
   */
  voice?:
    | 'alloy'
    | 'ash'
    | 'ballad'
    | 'coral'
    | 'echo'
    | 'fable'
    | 'onyx'
    | 'nova'
    | 'sage'
    | 'shimmer'
    | 'verse';

  /**
   * The speed of the generated audio.
   * Select a value from 0.25 to 4.0.
   * @default 1.0
   */
  speed?: number;

  /**
   * The format of the generated audio.
   * @default 'mp3'
   */
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';

  /**
   * Instructions for the speech generation e.g. "Speak in a slow and steady tone".
   * Does not work with tts-1 or tts-1-hd.
   */
  instructions?: string;
};
