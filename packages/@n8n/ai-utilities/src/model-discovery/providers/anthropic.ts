import { baseUrl, getJson } from '../request';
import {
	MODEL_EFFORT_LEVELS,
	type ListModelsFn,
	type ListModelsOptions,
	type ModelEffort,
	type ProviderModel,
} from '../types';

const ANTHROPIC_BASE_URL = 'https://api.anthropic.com';

function anthropicHeaders(options: ListModelsOptions): Record<string, string> {
	return { 'x-api-key': options.apiKey, 'anthropic-version': '2023-06-01' };
}

interface AnthropicModelResponse {
	id: string;
	display_name?: string;
	created_at?: string;
	capabilities?: {
		effort?: {
			low?: { supported?: boolean };
			medium?: { supported?: boolean };
			high?: { supported?: boolean };
			xhigh?: { supported?: boolean };
			max?: { supported?: boolean };
		};
		thinking?: {
			types?: {
				adaptive?: { supported?: boolean };
				enabled?: { supported?: boolean };
			};
		};
	};
}

function toProviderModel(model: AnthropicModelResponse): ProviderModel {
	const effort = model.capabilities?.effort;
	const thinkingTypes = model.capabilities?.thinking?.types;
	const capabilities = {
		...(effort && {
			effort: {
				low: effort.low?.supported === true,
				medium: effort.medium?.supported === true,
				high: effort.high?.supported === true,
				xhigh: effort.xhigh?.supported === true,
				max: effort.max?.supported === true,
			},
		}),
		...(thinkingTypes && {
			thinking: {
				adaptive: thinkingTypes.adaptive?.supported === true,
				enabled: thinkingTypes.enabled?.supported === true,
			},
		}),
	};
	return {
		id: model.id,
		name: model.display_name ?? model.id,
		...((effort || thinkingTypes) && { capabilities }),
	};
}

/** Source: LMChatAnthropic `methods/searchModels.ts` (GET /v1/models, newest first). */
export const listAnthropicModels: ListModelsFn = async (options) => {
	const data = (await getJson(
		`${baseUrl(options, ANTHROPIC_BASE_URL)}/v1/models`,
		anthropicHeaders(options),
		options,
		'anthropic',
	)) as { data?: AnthropicModelResponse[] };

	return (data.data ?? [])
		.slice()
		.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
		.map(toProviderModel);
};

export async function getAnthropicModel(
	modelId: string,
	options: ListModelsOptions,
): Promise<ProviderModel> {
	const model = (await getJson(
		`${baseUrl(options, ANTHROPIC_BASE_URL)}/v1/models/${encodeURIComponent(modelId)}`,
		anthropicHeaders(options),
		options,
		'anthropic',
	)) as AnthropicModelResponse;

	return toProviderModel(model);
}

export function resolveAnthropicThinkingMode(
	model: ProviderModel,
): 'adaptive' | 'enabled' | undefined {
	const thinking = model.capabilities?.thinking;
	if (thinking?.adaptive) return 'adaptive';
	if (thinking?.enabled) return 'enabled';
	return undefined;
}

export function getSupportedAnthropicEfforts(model: ProviderModel): ModelEffort[] | undefined {
	const effort = model.capabilities?.effort;
	if (!effort) return undefined;
	return MODEL_EFFORT_LEVELS.filter((level) => effort[level]);
}

export function resolveAnthropicEffort(
	model: ProviderModel,
	requested: ModelEffort = 'medium',
): ModelEffort | undefined {
	const supported = getSupportedAnthropicEfforts(model);
	if (!supported) return requested;
	if (supported.includes(requested)) return requested;
	if (supported.includes('medium')) return 'medium';
	return supported[0];
}
