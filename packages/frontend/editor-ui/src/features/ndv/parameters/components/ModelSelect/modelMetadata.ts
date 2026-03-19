import type { ModelCapability } from './types';

interface ModelMetadataEntry {
	latency: string;
	inputCost: string;
	outputCost: string;
	capabilities: ModelCapability[];
	badge?: 'flagship' | 'latest' | 'fastest' | 'cheapest';
}

const STUB_METADATA: Record<string, ModelMetadataEntry> = {
	'openai/gpt-4o': {
		latency: '1.2s',
		inputCost: '$2.50',
		outputCost: '$10.00',
		capabilities: ['vision', 'function_calling', 'streaming', 'json_mode'],
		badge: 'flagship',
	},
	'openai/gpt-4o-mini': {
		latency: '0.5s',
		inputCost: '$0.15',
		outputCost: '$0.60',
		capabilities: ['vision', 'function_calling', 'streaming', 'json_mode'],
		badge: 'cheapest',
	},
	'openai/gpt-4-turbo': {
		latency: '1.8s',
		inputCost: '$10.00',
		outputCost: '$30.00',
		capabilities: ['vision', 'function_calling', 'streaming', 'json_mode'],
	},
	'openai/gpt-3.5-turbo': {
		latency: '0.4s',
		inputCost: '$0.50',
		outputCost: '$1.50',
		capabilities: ['function_calling', 'streaming', 'json_mode'],
	},
	'openai/o1': {
		latency: '8.5s',
		inputCost: '$15.00',
		outputCost: '$60.00',
		capabilities: ['vision', 'function_calling', 'streaming', 'json_mode'],
	},
	'openai/o1-mini': {
		latency: '3.2s',
		inputCost: '$3.00',
		outputCost: '$12.00',
		capabilities: ['function_calling', 'streaming', 'json_mode'],
	},
	'anthropic/claude-3.5-sonnet': {
		latency: '1.5s',
		inputCost: '$3.00',
		outputCost: '$15.00',
		capabilities: ['vision', 'function_calling', 'streaming', 'json_mode'],
	},
	'anthropic/claude-3-opus': {
		latency: '3.0s',
		inputCost: '$15.00',
		outputCost: '$75.00',
		capabilities: ['vision', 'function_calling', 'streaming', 'json_mode'],
	},
	'anthropic/claude-3-haiku': {
		latency: '0.4s',
		inputCost: '$0.25',
		outputCost: '$1.25',
		capabilities: ['vision', 'function_calling', 'streaming', 'json_mode'],
		badge: 'fastest',
	},
	'anthropic/claude-3-sonnet': {
		latency: '1.8s',
		inputCost: '$3.00',
		outputCost: '$15.00',
		capabilities: ['vision', 'function_calling', 'streaming'],
	},
	'google/gemini-2.0-flash': {
		latency: '0.6s',
		inputCost: '$0.10',
		outputCost: '$0.40',
		capabilities: ['vision', 'function_calling', 'streaming', 'json_mode'],
	},
	'google/gemini-1.5-pro': {
		latency: '1.4s',
		inputCost: '$1.25',
		outputCost: '$5.00',
		capabilities: ['vision', 'function_calling', 'streaming', 'json_mode'],
	},
	'google/gemini-1.5-flash': {
		latency: '0.3s',
		inputCost: '$0.075',
		outputCost: '$0.30',
		capabilities: ['vision', 'function_calling', 'streaming', 'json_mode'],
	},
	'google/gemini-3-flash-preview': {
		latency: '0.4s',
		inputCost: '$0.10',
		outputCost: '$0.40',
		capabilities: ['vision', 'function_calling', 'streaming', 'json_mode'],
		badge: 'latest',
	},
	'meta/llama-3.1-405b': {
		latency: '2.2s',
		inputCost: '$3.00',
		outputCost: '$3.00',
		capabilities: ['function_calling', 'streaming'],
	},
	'meta/llama-3.1-70b': {
		latency: '0.8s',
		inputCost: '$0.60',
		outputCost: '$0.60',
		capabilities: ['function_calling', 'streaming'],
	},
	'meta/llama-3.1-8b': {
		latency: '0.3s',
		inputCost: '$0.05',
		outputCost: '$0.05',
		capabilities: ['streaming'],
	},
	'mistral/mistral-large': {
		latency: '1.2s',
		inputCost: '$2.00',
		outputCost: '$6.00',
		capabilities: ['function_calling', 'streaming', 'json_mode'],
	},
	'mistral/mistral-small': {
		latency: '0.5s',
		inputCost: '$0.20',
		outputCost: '$0.60',
		capabilities: ['function_calling', 'streaming', 'json_mode'],
	},
	'cohere/command-r-plus': {
		latency: '1.6s',
		inputCost: '$2.50',
		outputCost: '$10.00',
		capabilities: ['function_calling', 'streaming'],
	},
	'perplexity/sonar-pro': {
		latency: '1.8s',
		inputCost: '$3.00',
		outputCost: '$15.00',
		capabilities: ['streaming'],
	},
	'deepseek/deepseek-chat': {
		latency: '1.0s',
		inputCost: '$0.14',
		outputCost: '$0.28',
		capabilities: ['function_calling', 'streaming', 'json_mode'],
	},
	'deepseek/deepseek-reasoner': {
		latency: '4.5s',
		inputCost: '$0.55',
		outputCost: '$2.19',
		capabilities: ['streaming'],
	},
	'groq/llama-3.1-70b': {
		latency: '0.2s',
		inputCost: '$0.59',
		outputCost: '$0.79',
		capabilities: ['function_calling', 'streaming', 'json_mode'],
	},
	'xai/grok-2': {
		latency: '1.1s',
		inputCost: '$2.00',
		outputCost: '$10.00',
		capabilities: ['vision', 'function_calling', 'streaming'],
	},
};

function generateDefaultMetadata(modelId: string): ModelMetadataEntry {
	const hash = modelId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
	const latencyValues = ['0.5s', '0.8s', '1.0s', '1.3s', '1.8s', '2.5s'];
	const inputCosts = ['$0.10', '$0.25', '$0.50', '$1.00', '$2.00', '$5.00'];
	const outputCosts = ['$0.40', '$1.00', '$2.00', '$4.00', '$8.00', '$20.00'];

	const allCaps: ModelCapability[] = ['vision', 'function_calling', 'streaming', 'json_mode'];
	const capCount = 1 + (hash % 4);
	const capabilities = allCaps.slice(0, capCount);

	return {
		latency: latencyValues[hash % latencyValues.length],
		inputCost: inputCosts[hash % inputCosts.length],
		outputCost: outputCosts[hash % outputCosts.length],
		capabilities,
	};
}

export function getModelMetadata(modelId: string): ModelMetadataEntry {
	const normalized = modelId.toLowerCase();

	if (STUB_METADATA[normalized]) {
		return STUB_METADATA[normalized];
	}

	for (const [key, value] of Object.entries(STUB_METADATA)) {
		if (normalized.includes(key.split('/')[1])) {
			return value;
		}
	}

	return generateDefaultMetadata(modelId);
}

export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
	openai: 'OpenAI',
	anthropic: 'Anthropic',
	google: 'Google',
	meta: 'Meta',
	mistral: 'Mistral',
	cohere: 'Cohere',
	perplexity: 'Perplexity',
	deepseek: 'DeepSeek',
	groq: 'Groq',
	xai: 'xAI',
	amazon: 'Amazon',
	'together-ai': 'Together AI',
	fireworks: 'Fireworks',
	azure: 'Azure',
};

export function getProviderDisplayName(provider: string): string {
	return (
		PROVIDER_DISPLAY_NAMES[provider.toLowerCase()] ??
		provider.charAt(0).toUpperCase() + provider.slice(1)
	);
}
