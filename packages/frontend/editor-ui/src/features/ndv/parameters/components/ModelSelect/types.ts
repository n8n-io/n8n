export type ModelCapability = 'vision' | 'function_calling' | 'streaming' | 'json_mode';

export interface ModelInfo {
	value: string;
	name: string;
	provider: string;
	providerDisplayName: string;
	modelName: string;
	latency?: string;
	inputCost?: string;
	outputCost?: string;
	capabilities: ModelCapability[];
	badge?: 'flagship' | 'latest' | 'fastest' | 'cheapest';
}

export const CAPABILITY_META: Record<ModelCapability, { label: string; icon: string }> = {
	vision: { label: 'Vision', icon: 'image' },
	function_calling: { label: 'Functions', icon: 'braces' },
	streaming: { label: 'Streaming', icon: 'video' },
	json_mode: { label: 'JSON', icon: 'file-text' },
};

export const ALL_CAPABILITIES: ModelCapability[] = [
	'vision',
	'function_calling',
	'streaming',
	'json_mode',
];

export const PROVIDER_COLORS: Record<string, string> = {
	openai: '#10a37f',
	anthropic: '#d97706',
	google: '#4285f4',
	meta: '#0668E1',
	mistral: '#f97316',
	cohere: '#7c3aed',
	perplexity: '#20808d',
	deepseek: '#4f6df5',
	groq: '#f55036',
	xai: '#1d1d1f',
	amazon: '#ff9900',
};

export type SortField = 'name' | 'latency' | 'inputCost' | 'outputCost';
export type SortDirection = 'asc' | 'desc';
