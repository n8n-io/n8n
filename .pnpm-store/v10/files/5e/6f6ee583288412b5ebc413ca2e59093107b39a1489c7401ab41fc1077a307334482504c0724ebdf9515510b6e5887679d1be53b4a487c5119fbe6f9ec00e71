import { LanguageModelV2CallOptions } from './language-model-v2-call-options';
import { LanguageModelV2FunctionTool } from './language-model-v2-function-tool';
import { LanguageModelV2ProviderDefinedTool } from './language-model-v2-provider-defined-tool';

/**
 * Warning from the model provider for this call. The call will proceed, but e.g.
 * some settings might not be supported, which can lead to suboptimal results.
 */
export type LanguageModelV2CallWarning =
  | {
      type: 'unsupported-setting';
      setting: Omit<keyof LanguageModelV2CallOptions, 'prompt'>;
      details?: string;
    }
  | {
      type: 'unsupported-tool';
      tool: LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool;
      details?: string;
    }
  | {
      type: 'other';
      message: string;
    };
