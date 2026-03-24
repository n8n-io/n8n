/**
 * Single shared model field name across all resources.
 * The model list is filtered by resource/operation via loadOptions;
 * the frontend resets the value when resource changes.
 */
export const MODEL_PARAM = 'model';

/** Default model per resource — used by execute fallbacks and frontend reset. */
export const DEFAULT_MODEL_FOR_RESOURCE: Record<string, string> = {
	text: 'openai/gpt-4.1-mini',
	image: 'google/gemini-2.5-flash-image',
	file: 'anthropic/claude-sonnet-4',
	audio: 'openai/gpt-4o-mini-transcribe',
};

/** Text sub-operation override: vision needs a multimodal default. */
export const DEFAULT_TEXT_VISION_MODEL = 'google/gemini-2.0-flash-001';

export function getDefaultModelForResourceOperation(resource: string, operation: string): string {
	if (resource === 'text' && operation === 'messageVision') {
		return DEFAULT_TEXT_VISION_MODEL;
	}
	return DEFAULT_MODEL_FOR_RESOURCE[resource] ?? DEFAULT_MODEL_FOR_RESOURCE.text;
}
