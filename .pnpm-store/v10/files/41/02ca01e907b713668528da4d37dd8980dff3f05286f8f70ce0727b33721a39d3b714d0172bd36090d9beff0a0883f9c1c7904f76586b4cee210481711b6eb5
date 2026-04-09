import { SpeechModelV2CallOptions } from './speech-model-v2-call-options';

/**
 * Warning from the model provider for this call. The call will proceed, but e.g.
 * some settings might not be supported, which can lead to suboptimal results.
 */
export type SpeechModelV2CallWarning =
  | {
      type: 'unsupported-setting';
      setting: keyof SpeechModelV2CallOptions;
      details?: string;
    }
  | {
      type: 'other';
      message: string;
    };
