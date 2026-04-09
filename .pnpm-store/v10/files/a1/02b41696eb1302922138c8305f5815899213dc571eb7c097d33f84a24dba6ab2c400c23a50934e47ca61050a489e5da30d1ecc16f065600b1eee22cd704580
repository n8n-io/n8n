export type OpenAILanguageModelCapabilities = {
  isReasoningModel: boolean;
  systemMessageMode: 'remove' | 'system' | 'developer';
  supportsFlexProcessing: boolean;
  supportsPriorityProcessing: boolean;

  /**
   * Allow temperature, topP, logProbs when reasoningEffort is none.
   */
  supportsNonReasoningParameters: boolean;
};

export function getOpenAILanguageModelCapabilities(
  modelId: string,
): OpenAILanguageModelCapabilities {
  const supportsFlexProcessing =
    modelId.startsWith('o3') ||
    modelId.startsWith('o4-mini') ||
    (modelId.startsWith('gpt-5') && !modelId.startsWith('gpt-5-chat'));

  const supportsPriorityProcessing =
    modelId.startsWith('gpt-4') ||
    (modelId.startsWith('gpt-5') &&
      !modelId.startsWith('gpt-5-nano') &&
      !modelId.startsWith('gpt-5-chat') &&
      !modelId.startsWith('gpt-5.4-nano')) ||
    modelId.startsWith('o3') ||
    modelId.startsWith('o4-mini');

  // Use allowlist approach: only known reasoning models should use 'developer' role
  // This prevents issues with fine-tuned models, third-party models, and custom models
  const isReasoningModel =
    modelId.startsWith('o1') ||
    modelId.startsWith('o3') ||
    modelId.startsWith('o4-mini') ||
    (modelId.startsWith('gpt-5') && !modelId.startsWith('gpt-5-chat'));

  // https://platform.openai.com/docs/guides/latest-model#gpt-5-1-parameter-compatibility
  // GPT-5.1, GPT-5.2, and GPT-5.4 support temperature, topP, logProbs when reasoningEffort is none
  const supportsNonReasoningParameters =
    modelId.startsWith('gpt-5.1') ||
    modelId.startsWith('gpt-5.2') ||
    modelId.startsWith('gpt-5.3') ||
    modelId.startsWith('gpt-5.4');

  const systemMessageMode = isReasoningModel ? 'developer' : 'system';

  return {
    supportsFlexProcessing,
    supportsPriorityProcessing,
    isReasoningModel,
    systemMessageMode,
    supportsNonReasoningParameters,
  };
}
