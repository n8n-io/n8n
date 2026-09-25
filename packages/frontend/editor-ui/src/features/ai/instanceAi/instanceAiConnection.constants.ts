import type {
	INSTANCE_AI_MODEL_CREDENTIAL_TYPES,
	INSTANCE_AI_SEARCH_CREDENTIAL_TYPES,
	InstanceAiSandboxProvider,
} from '@n8n/api-types';

import { SANDBOX_PROVIDER_LABELS } from './constants';

export type InstanceAiModelProvider = 'anthropic' | 'openai' | 'openrouter' | 'custom';
export type InstanceAiSearchProvider = 'searxng' | 'brave' | 'disabled';

export const INSTANCE_AI_CURATED_MODELS = {
	anthropic: ['claude-opus-5', 'claude-sonnet-5'],
	openai: ['gpt-5.6-sol', 'gpt-5.6-terra'],
	openrouter: [
		'anthropic/claude-opus-5',
		'anthropic/claude-sonnet-5',
		'openai/gpt-5.6-sol',
		'openai/gpt-5.6-terra',
		'moonshotai/kimi-k3',
	],
	custom: [],
} as const satisfies Record<InstanceAiModelProvider, readonly string[]>;

export const INSTANCE_AI_MODEL_PROVIDERS = [
	{
		id: 'anthropic',
		credentialType: 'anthropicApi',
		label: 'Anthropic',
		placeholder: 'sk-ant-…',
	},
	{
		id: 'openai',
		credentialType: 'openAiApi',
		label: 'OpenAI',
		placeholder: 'sk-…',
	},
	{
		id: 'openrouter',
		credentialType: 'openRouterApi',
		label: 'OpenRouter',
		placeholder: 'sk-or-…',
	},
	{
		id: 'custom',
		credentialType: 'openAiApi',
		label: null,
		placeholder: 'Leave empty for Ollama',
	},
] as const satisfies ReadonlyArray<{
	id: InstanceAiModelProvider;
	credentialType: (typeof INSTANCE_AI_MODEL_CREDENTIAL_TYPES)[number];
	label: string | null;
	placeholder: string;
}>;

export const INSTANCE_AI_SANDBOX_PROVIDERS = [
	{
		id: 'n8n-sandbox',
		label: SANDBOX_PROVIDER_LABELS['n8n-sandbox'],
		onboardingLabel: 'n8n Sandbox',
	},
	{ id: 'daytona', label: SANDBOX_PROVIDER_LABELS.daytona, onboardingLabel: 'Daytona' },
] as const satisfies ReadonlyArray<{
	id: InstanceAiSandboxProvider;
	label: string;
	onboardingLabel: string;
}>;

export const INSTANCE_AI_SEARCH_PROVIDERS = [
	{ id: 'searxng', credentialType: 'searXngApi', label: 'SearXNG' },
	{ id: 'brave', credentialType: 'braveSearchApi', label: 'Brave Search' },
] as const satisfies ReadonlyArray<{
	id: Exclude<InstanceAiSearchProvider, 'disabled'>;
	credentialType: (typeof INSTANCE_AI_SEARCH_CREDENTIAL_TYPES)[number];
	label: string;
}>;
