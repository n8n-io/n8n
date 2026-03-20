import type { ModelCapability } from './types';

export interface ParsedModelMeta {
	inputCost?: string;
	outputCost?: string;
	contextLength?: string;
	capabilities: ModelCapability[];
}

function formatCost(perMillionTokens: number): string {
	if (perMillionTokens === 0) return 'Free';
	if (perMillionTokens < 0.01) return '<$0.01';
	if (perMillionTokens < 1) return `$${perMillionTokens.toFixed(2)}`;
	return `$${perMillionTokens.toFixed(2)}`;
}

function formatContextLength(tokens: number): string {
	if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
	if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
	return String(tokens);
}

/**
 * Parse the JSON-encoded metadata stored in an option's `description` field
 * by the backend `getModels` loadOptionsMethod.
 */
export function parseOptionMeta(description?: string): ParsedModelMeta {
	if (!description) return { capabilities: [] };

	try {
		const raw = JSON.parse(description) as {
			inputCost?: number;
			outputCost?: number;
			contextLength?: number;
			capabilities?: { vision?: boolean; function_calling?: boolean; json_mode?: boolean };
		};

		const capabilities: ModelCapability[] = [];
		if (raw.capabilities?.vision) capabilities.push('vision');
		if (raw.capabilities?.function_calling) capabilities.push('function_calling');
		if (raw.capabilities?.json_mode) capabilities.push('json_mode');

		return {
			inputCost: raw.inputCost != null ? formatCost(raw.inputCost) : undefined,
			outputCost: raw.outputCost != null ? formatCost(raw.outputCost) : undefined,
			contextLength: raw.contextLength ? formatContextLength(raw.contextLength) : undefined,
			capabilities,
		};
	} catch {
		return { capabilities: [] };
	}
}

export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
	ai21: 'AI21',
	'aion-labs': 'AionLabs',
	alfredpros: 'AlfredPros',
	alibaba: 'Alibaba',
	allenai: 'AllenAI',
	alpindale: 'Alpindale',
	amazon: 'Amazon',
	'anthracite-org': 'Anthracite',
	anthropic: 'Anthropic',
	'arcee-ai': 'Arcee AI',
	baidu: 'Baidu',
	bytedance: 'ByteDance',
	'bytedance-seed': 'ByteDance Seed',
	cognitivecomputations: 'Venice',
	cohere: 'Cohere',
	deepcogito: 'Deep Cogito',
	deepseek: 'DeepSeek',
	eleutherai: 'EleutherAI',
	essentialai: 'EssentialAI',
	google: 'Google',
	gryphe: 'Gryphe',
	'ibm-granite': 'IBM',
	inception: 'Inception',
	inflection: 'Inflection',
	kwaipilot: 'Kwaipilot',
	liquid: 'LiquidAI',
	mancer: 'Mancer',
	meituan: 'Meituan',
	'meta-llama': 'Meta',
	microsoft: 'Microsoft',
	minimax: 'MiniMax',
	mistralai: 'Mistral',
	moonshotai: 'MoonshotAI',
	morph: 'Morph',
	'nex-agi': 'Nex AGI',
	nousresearch: 'Nous',
	nvidia: 'NVIDIA',
	openai: 'OpenAI',
	openrouter: 'OpenRouter',
	perplexity: 'Perplexity',
	'prime-intellect': 'Prime Intellect',
	qwen: 'Qwen',
	relace: 'Relace',
	sao10k: 'Sao10K',
	stepfun: 'StepFun',
	switchpoint: 'Switchpoint',
	tencent: 'Tencent',
	thedrummer: 'TheDrummer',
	tngtech: 'TNG',
	undi95: 'Undi95',
	upstage: 'Upstage',
	writer: 'Writer',
	'x-ai': 'xAI',
	xiaomi: 'Xiaomi',
	'z-ai': 'Z.ai',
};

export function getProviderDisplayName(provider: string): string {
	return (
		PROVIDER_DISPLAY_NAMES[provider.toLowerCase()] ??
		provider.charAt(0).toUpperCase() + provider.slice(1)
	);
}
