import type { INodePropertyOptions } from 'n8n-workflow';

/** Shape returned by OpenRouter `GET /models` (and our `/ai-gateway/models` proxy). */
export interface OpenRouterModelLike {
	id: string;
	name?: string;
	pricing?: { prompt?: string; completion?: string };
	context_length?: number;
	architecture?: {
		input_modalities?: string[];
		output_modalities?: string[];
	};
	supported_parameters?: string[];
}

/**
 * Normalizes `/ai-gateway/models` payloads: OpenRouter SDK and API versions may return
 * `{ data: Model[] }`, a bare `Model[]`, or (in theory) nested shapes. Prevents empty
 * model dropdowns when `response.data` is undefined.
 */
export function normalizeOpenRouterModelsResponse(modelsResponse: unknown): OpenRouterModelLike[] {
	if (Array.isArray(modelsResponse)) {
		return modelsResponse as OpenRouterModelLike[];
	}
	if (!modelsResponse || typeof modelsResponse !== 'object') {
		return [];
	}
	const mr = modelsResponse as Record<string, unknown>;
	if (Array.isArray(mr.data)) {
		return mr.data as OpenRouterModelLike[];
	}
	const inner = mr.data;
	if (
		inner &&
		typeof inner === 'object' &&
		Array.isArray((inner as Record<string, unknown>).data)
	) {
		return (inner as { data: OpenRouterModelLike[] }).data;
	}
	return [];
}

/**
 * Maps OpenRouter models to `INodePropertyOptions` for the shared ModelSelect component
 * (same metadata shape as LangChain node `mapOpenRouterModelsToLoadOptions`).
 */
export function mapOpenRouterModelsToSelectOptions(
	models: OpenRouterModelLike[],
): INodePropertyOptions[] {
	return models
		.map((m) => {
			const promptPrice = parseFloat(m.pricing?.prompt ?? '0');
			const completionPrice = parseFloat(m.pricing?.completion ?? '0');
			const inputModalities = m.architecture?.input_modalities ?? [];
			const supportedParams = m.supported_parameters ?? [];

			const meta = {
				inputCost: promptPrice * 1_000_000,
				outputCost: completionPrice * 1_000_000,
				contextLength: m.context_length ?? 0,
				capabilities: {
					vision: inputModalities.includes('image'),
					function_calling: supportedParams.includes('tools'),
					json_mode: supportedParams.includes('response_format'),
				},
			};

			return {
				name: m.name ?? m.id,
				value: m.id,
				description: JSON.stringify(meta),
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));
}
