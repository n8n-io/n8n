import type { AiGatewayModelCategoryResponse } from '@n8n/api-types';

export const AI_GATEWAY_CREDENTIAL_TYPE = 'n8nAiGatewayApi';

export const MODEL_CATEGORIES = [
	'balanced',
	'cheapest',
	'fastest',
	'best-quality',
	'reasoning',
] as const;

export type ModelCategory = (typeof MODEL_CATEGORIES)[number];

export const MODEL_CATEGORY_MAP: Record<ModelCategory, string> = {
	balanced: 'openai/gpt-4.1-nano',
	cheapest: 'openai/gpt-4.1-nano',
	fastest: 'google/gemini-2.0-flash-001',
	'best-quality': 'anthropic/claude-sonnet-4',
	reasoning: 'openai/o4-mini',
};

export const MODEL_CATEGORY_INFO: AiGatewayModelCategoryResponse[] = [
	{
		id: 'balanced',
		label: 'Balanced',
		description: 'Good quality at reasonable cost',
		model: MODEL_CATEGORY_MAP.balanced,
	},
	{
		id: 'cheapest',
		label: 'Cheapest',
		description: 'Minimize token spend',
		model: MODEL_CATEGORY_MAP.cheapest,
	},
	{
		id: 'fastest',
		label: 'Fastest',
		description: 'Lowest latency',
		model: MODEL_CATEGORY_MAP.fastest,
	},
	{
		id: 'best-quality',
		label: 'Best Quality',
		description: 'Maximum capability',
		model: MODEL_CATEGORY_MAP['best-quality'],
	},
	{
		id: 'reasoning',
		label: 'Reasoning',
		description: 'Complex multi-step tasks',
		model: MODEL_CATEGORY_MAP.reasoning,
	},
];

export function resolveModel(modelOrCategory: string): string {
	if (MODEL_CATEGORIES.includes(modelOrCategory as ModelCategory)) {
		return MODEL_CATEGORY_MAP[modelOrCategory as ModelCategory];
	}
	return modelOrCategory;
}
