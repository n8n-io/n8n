import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

/**
 * OpenRouter model row from GET /models — shared by AI Gateway LM and app node.
 */
export interface OpenRouterModel {
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

export const DEFAULT_N8N_AI_GATEWAY_BASE_URL = 'https://openrouter.ai/api/v1';

/** Default when no model is selected — must match LmChatN8nAiGateway */
export const FALLBACK_N8N_AI_GATEWAY_MODEL = 'openai/gpt-4.1-nano';

export function getN8nAiGatewayOpenRouterConfig(): { apiKey: string; baseUrl: string } {
	return {
		apiKey: process.env.N8N_AI_GATEWAY_OPENROUTER_API_KEY ?? '',
		baseUrl: process.env.N8N_AI_GATEWAY_OPENROUTER_BASE_URL ?? DEFAULT_N8N_AI_GATEWAY_BASE_URL,
	};
}

export async function fetchN8nAiGatewayOpenRouterModels(
	helpers: ILoadOptionsFunctions['helpers'],
): Promise<OpenRouterModel[]> {
	const { apiKey, baseUrl } = getN8nAiGatewayOpenRouterConfig();
	const url = `${baseUrl.replace(/\/$/, '')}/models`;
	const response = await helpers.httpRequest({
		method: 'GET',
		url,
		headers: { Authorization: `Bearer ${apiKey}` },
		json: true,
	});
	return (response?.data ?? []) as OpenRouterModel[];
}

/**
 * Maps OpenRouter models to NDV options — same shape as LmChatN8nAiGateway (model selector UI).
 */
export function mapOpenRouterModelsToLoadOptions(
	models: OpenRouterModel[],
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
