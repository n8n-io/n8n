/**
 * Determines whether a model should be included in the model list based on
 * whether it's a custom API and the model's ID.
 *
 * @param modelId - The ID of the model to check
 * @param isCustomAPI - Whether this is a custom API (not official OpenAI)
 * @returns true if the model should be included, false otherwise
 */
export function shouldIncludeModel(modelId: string, isCustomAPI: boolean): boolean {
	// For custom APIs, include all models
	if (isCustomAPI) {
		return true;
	}

	// For official OpenAI API, exclude certain model types
	return !(
		modelId.startsWith('babbage') ||
		modelId.startsWith('davinci') ||
		modelId.startsWith('computer-use') ||
		modelId.startsWith('dall-e') ||
		/*
			Newer non-chat families are named gpt-*, so they pass the gpt- prefix and
			have to be excluded by suffix. Only families OpenAI marks unsupported on
			both chat/completions and responses belong here — gpt-audio-* is
			deliberately absent, it does support chat/completions.
		*/
		modelId.includes('-image') ||
		modelId.includes('-transcribe') ||
		modelId.includes('-diarize') ||
		modelId.startsWith('text-embedding') ||
		modelId.startsWith('tts') ||
		modelId.includes('-tts') ||
		modelId.startsWith('whisper') ||
		modelId.startsWith('omni-moderation') ||
		modelId.startsWith('sora') ||
		modelId.includes('-realtime') ||
		(modelId.startsWith('gpt-') && modelId.includes('instruct'))
	);
}
