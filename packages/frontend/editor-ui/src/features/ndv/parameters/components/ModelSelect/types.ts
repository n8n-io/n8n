export type ModelCapability = 'vision' | 'function_calling' | 'json_mode';

export interface ModelInfo {
	value: string;
	name: string;
	provider: string;
	providerDisplayName: string;
	modelName: string;
	inputCost?: string;
	outputCost?: string;
	contextLength?: string;
	capabilities: ModelCapability[];
}

export const CAPABILITY_META: Record<ModelCapability, { label: string; icon: string }> = {
	vision: { label: 'Vision', icon: 'image' },
	function_calling: { label: 'Functions', icon: 'braces' },
	json_mode: { label: 'JSON', icon: 'file-text' },
};

export const ALL_CAPABILITIES: ModelCapability[] = ['vision', 'function_calling', 'json_mode'];

export const PROVIDER_COLORS: Record<string, string> = {
	ai21: '#6c47ff',
	'aion-labs': '#2563eb',
	alfredpros: '#4f46e5',
	alibaba: '#ff6a00',
	allenai: '#1d4ed8',
	alpindale: '#6b7280',
	amazon: '#ff9900',
	'anthracite-org': '#374151',
	anthropic: '#d97706',
	'arcee-ai': '#8b5cf6',
	baidu: '#2932e1',
	bytedance: '#008cff',
	'bytedance-seed': '#008cff',
	cognitivecomputations: '#0ea5e9',
	cohere: '#7c3aed',
	deepcogito: '#3b82f6',
	deepseek: '#4f6df5',
	eleutherai: '#1e3a5f',
	essentialai: '#059669',
	google: '#4285f4',
	gryphe: '#6b7280',
	'ibm-granite': '#0f62fe',
	inception: '#f59e0b',
	inflection: '#6366f1',
	kwaipilot: '#ff4500',
	liquid: '#06b6d4',
	mancer: '#dc2626',
	meituan: '#ffc107',
	'meta-llama': '#0668E1',
	microsoft: '#00a4ef',
	minimax: '#7c3aed',
	mistralai: '#f97316',
	moonshotai: '#1e293b',
	morph: '#10b981',
	'nex-agi': '#6366f1',
	nousresearch: '#4338ca',
	nvidia: '#76b900',
	openai: '#10a37f',
	openrouter: '#6366f1',
	perplexity: '#20808d',
	'prime-intellect': '#8b5cf6',
	qwen: '#7c3aed',
	relace: '#3b82f6',
	sao10k: '#ec4899',
	stepfun: '#0ea5e9',
	switchpoint: '#6b7280',
	tencent: '#00a3ff',
	thedrummer: '#dc2626',
	tngtech: '#1e40af',
	undi95: '#6b7280',
	upstage: '#f97316',
	writer: '#6366f1',
	'x-ai': '#1d1d1f',
	xiaomi: '#ff6900',
	'z-ai': '#3b82f6',
};

export const PROVIDER_LOGO_MAP: Record<string, string> = {
	openai: 'https://openrouter.ai/images/icons/OpenAI.svg',
	anthropic: 'https://openrouter.ai/images/icons/Anthropic.svg',
	google: 'https://openrouter.ai/images/icons/GoogleGemini.svg',
	'meta-llama': 'https://openrouter.ai/images/icons/Meta.png',
	mistralai: 'https://openrouter.ai/images/icons/Mistral.png',
	deepseek: 'https://openrouter.ai/images/icons/DeepSeek.png',
	cohere: 'https://openrouter.ai/images/icons/Cohere.png',
	perplexity: 'https://openrouter.ai/images/icons/Perplexity.svg',
	qwen: 'https://openrouter.ai/images/icons/Qwen.png',
	microsoft: 'https://openrouter.ai/images/icons/Microsoft.svg',
};

export type SortField = 'name' | 'inputCost' | 'outputCost';
export type SortDirection = 'asc' | 'desc';
