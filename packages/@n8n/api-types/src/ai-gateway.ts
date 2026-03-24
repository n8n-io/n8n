export const AI_GATEWAY_MODEL_CATEGORIES = [
	'balanced',
	'cheapest',
	'fastest',
	'best-quality',
	'reasoning',
] as const;

export type AiGatewayModelCategory = (typeof AI_GATEWAY_MODEL_CATEGORIES)[number];

export const AI_GATEWAY_CREDENTIAL_TYPE = 'n8nAiGatewayApi';

export const AI_GATEWAY_MODEL_CATEGORY_MAP: Record<AiGatewayModelCategory, string> = {
	balanced: 'openai/gpt-4.1-nano',
	cheapest: 'openai/gpt-4.1-nano',
	fastest: 'google/gemini-2.0-flash-001',
	'best-quality': 'anthropic/claude-sonnet-4',
	reasoning: 'openai/o4-mini',
};

export const AI_GATEWAY_MODEL_CATEGORY_INFO: AiGatewayModelCategoryResponse[] = [
	{
		id: 'balanced',
		label: 'Balanced',
		description: 'Good quality at reasonable cost',
		model: AI_GATEWAY_MODEL_CATEGORY_MAP.balanced,
	},
	{
		id: 'cheapest',
		label: 'Cheapest',
		description: 'Minimize token spend',
		model: AI_GATEWAY_MODEL_CATEGORY_MAP.cheapest,
	},
	{
		id: 'fastest',
		label: 'Fastest',
		description: 'Lowest latency',
		model: AI_GATEWAY_MODEL_CATEGORY_MAP.fastest,
	},
	{
		id: 'best-quality',
		label: 'Best Quality',
		description: 'Maximum capability',
		model: AI_GATEWAY_MODEL_CATEGORY_MAP['best-quality'],
	},
	{
		id: 'reasoning',
		label: 'Reasoning',
		description: 'Complex multi-step tasks',
		model: AI_GATEWAY_MODEL_CATEGORY_MAP.reasoning,
	},
];

/**
 * Resolve a model identifier to a concrete OpenRouter model ID.
 * If the identifier matches a known category name, it is mapped.
 * Otherwise it is passed through unchanged ("manual" mode).
 */
export function resolveAiGatewayModel(modelOrCategory: string): string {
	if (AI_GATEWAY_MODEL_CATEGORIES.includes(modelOrCategory as AiGatewayModelCategory)) {
		return AI_GATEWAY_MODEL_CATEGORY_MAP[modelOrCategory as AiGatewayModelCategory];
	}
	return modelOrCategory;
}

export interface AiGatewaySettingsResponse {
	enabled: boolean;
	defaultCategory: string;
	defaultModel?: string;
	/** Default model for the AI Gateway Chat Model node (`lmChatN8nAiGateway`). */
	defaultChatModel: string;
	/** Default model for the AI Gateway app node when resource is Text. */
	defaultTextModel: string;
	/** Default model when resource is Image. */
	defaultImageModel: string;
	/** Default model when resource is File. */
	defaultFileModel: string;
	/** Default model when resource is Audio. */
	defaultAudioModel: string;
	creditsRemaining?: number;
}

export interface AiGatewayModelCategoryResponse {
	id: string;
	label: string;
	description: string;
	model: string;
}

export interface AiGatewayUsageBucket {
	requests: number;
	inputTokens: number;
	outputTokens: number;
}

export interface AiGatewayUsageResponse {
	totalRequests: number;
	totalInputTokens: number;
	totalOutputTokens: number;
	byCategory: Record<string, AiGatewayUsageBucket>;
	/** Aggregated by resolved OpenRouter model id (e.g. openai/gpt-4.1-nano). */
	byModel: Record<string, AiGatewayUsageBucket>;
}

/** Response from POST /ai-gateway/prototype/record-call (prototype-only). */
export interface AiGatewayPrototypeRecordResponse {
	creditsRemaining: number;
	usage: AiGatewayUsageResponse;
}
