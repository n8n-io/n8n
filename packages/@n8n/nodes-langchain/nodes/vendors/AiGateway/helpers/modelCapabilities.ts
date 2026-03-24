import type { OpenRouterModel } from '../../../../utils/n8nAiGatewayOpenRouter';

export type AiGatewayResource = 'text' | 'image' | 'file' | 'audio';

function isLikelyEmbeddingOnly(id: string): boolean {
	const lower = id.toLowerCase();
	return (
		(lower.includes('embed') && !lower.includes('embedding')) ||
		lower.includes('text-embedding') ||
		lower.endsWith('-embed')
	);
}

function hasInputModality(model: OpenRouterModel, modality: string): boolean {
	return model.architecture?.input_modalities?.includes(modality) ?? false;
}

function hasOutputModality(model: OpenRouterModel, modality: string): boolean {
	return model.architecture?.output_modalities?.includes(modality) ?? false;
}

function supportsResponseFormat(model: OpenRouterModel): boolean {
	return model.supported_parameters?.includes('response_format') ?? false;
}

function isImageGenerationCandidate(model: OpenRouterModel): boolean {
	if (hasOutputModality(model, 'image')) return true;
	const id = model.id.toLowerCase();
	const name = (model.name ?? '').toLowerCase();
	return (
		id.includes('flux') ||
		id.includes('dall-e') ||
		id.includes('dalle') ||
		id.includes('stable-diffusion') ||
		id.includes('imagen') ||
		name.includes('image generation') ||
		id.includes('/image')
	);
}

function isMultimodalChat(model: OpenRouterModel): boolean {
	return (
		hasInputModality(model, 'image') ||
		hasInputModality(model, 'file') ||
		hasInputModality(model, 'document')
	);
}

function isFileAnalysisCandidate(model: OpenRouterModel): boolean {
	return (
		hasInputModality(model, 'file') ||
		hasInputModality(model, 'document') ||
		isMultimodalChat(model)
	);
}

function isAudioCandidate(model: OpenRouterModel): boolean {
	if (hasInputModality(model, 'audio')) return true;
	const id = model.id.toLowerCase();
	return id.includes('whisper') || id.includes('transcribe') || id.includes('audio');
}

const MIN_FILTERED_RESULTS = 3;

/**
 * Filters OpenRouter models for the selected resource/operation.
 * Falls back to "general chat" models when a strict filter yields too few results.
 */
export function filterModelsForOperation(
	models: OpenRouterModel[],
	resource: string,
	operation: string,
): OpenRouterModel[] {
	const chatFallback = models.filter((m) => !isLikelyEmbeddingOnly(m.id));

	let filtered: OpenRouterModel[];

	switch (resource) {
		case 'text':
			switch (operation) {
				case 'message':
					filtered = chatFallback;
					break;
				case 'messageVision':
					filtered = chatFallback.filter(
						(m) => hasInputModality(m, 'image') || isMultimodalChat(m),
					);
					break;
				case 'json':
					filtered = chatFallback.filter((m) => supportsResponseFormat(m));
					break;
				default:
					filtered = chatFallback;
			}
			break;
		case 'image':
			filtered = chatFallback.filter((m) => isImageGenerationCandidate(m));
			break;
		case 'file':
			filtered = chatFallback.filter((m) => isFileAnalysisCandidate(m));
			break;
		case 'audio':
			filtered = chatFallback.filter((m) => isAudioCandidate(m));
			break;
		default:
			filtered = chatFallback;
	}

	if (filtered.length < MIN_FILTERED_RESULTS) {
		return chatFallback;
	}

	return filtered;
}

export function pickDefaultModelId(models: OpenRouterModel[], preferred: string): string {
	if (models.some((m) => m.id === preferred)) return preferred;
	return models[0]?.id ?? preferred;
}
