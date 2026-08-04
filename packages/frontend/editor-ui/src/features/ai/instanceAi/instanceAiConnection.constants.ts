import type {
	INSTANCE_AI_MODEL_CREDENTIAL_TYPES,
	INSTANCE_AI_SEARCH_CREDENTIAL_TYPES,
	InstanceAiSandboxProvider,
} from '@n8n/api-types';

import { SANDBOX_PROVIDER_LABELS } from './constants';

export type InstanceAiModelProvider = 'anthropic' | 'openai' | 'openrouter' | 'custom';
export type InstanceAiSearchProvider = 'searxng' | 'brave' | 'disabled';

export const INSTANCE_AI_MODEL_PROVIDERS = [
	{
		id: 'anthropic',
		credentialType: 'anthropicApi',
		label: 'Anthropic',
		models: ['claude-sonnet-4-6', 'claude-opus-4-8'],
		placeholder: 'sk-ant-…',
	},
	{
		id: 'openai',
		credentialType: 'openAiApi',
		label: 'OpenAI',
		models: ['gpt-5.4', 'gpt-5-mini'],
		placeholder: 'sk-…',
	},
	{
		id: 'openrouter',
		credentialType: 'openRouterApi',
		label: 'OpenRouter',
		models: ['anthropic/claude-sonnet-4.6', 'openai/gpt-5.4'],
		placeholder: 'sk-or-…',
	},
	{
		id: 'custom',
		credentialType: 'openAiApi',
		label: null,
		models: [],
		placeholder: 'Leave empty for Ollama',
	},
] as const satisfies ReadonlyArray<{
	id: InstanceAiModelProvider;
	credentialType: (typeof INSTANCE_AI_MODEL_CREDENTIAL_TYPES)[number];
	label: string | null;
	models: readonly string[];
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
