import { TranscriptionModelV2CallOptions } from './transcription-model-v2-call-options';

/**
 * Warning from the model provider for this call. The call will proceed, but e.g.
 * some settings might not be supported, which can lead to suboptimal results.
 */
export type TranscriptionModelV2CallWarning =
  | {
      type: 'unsupported-setting';
      setting: keyof TranscriptionModelV2CallOptions;
      details?: string;
    }
  | {
      type: 'other';
      message: string;
    };
