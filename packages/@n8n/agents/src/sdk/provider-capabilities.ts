export interface ProviderCapability {
	field: string;
	type: 'number' | 'select';
	label: string;
	default: number | string;
	options?: string[];
}

export const providerCapabilities: Record<
	string,
	{
		thinking?: ProviderCapability;
	}
> = {
	anthropic: {
		thinking: { field: 'budgetTokens', type: 'number', label: 'Budget Tokens', default: 10000 },
	},
	openai: {
		thinking: {
			field: 'reasoningEffort',
			type: 'select',
			label: 'Reasoning Effort',
			default: 'medium',
			options: ['low', 'medium', 'high'],
		},
	},
	google: {},
	xai: {},
	groq: {},
	deepseek: {},
	mistral: {},
	openrouter: {},
	cohere: {},
	ollama: {},
};
