import type { GuardrailsOptions } from '../actions/types';

const LLM_CHECKS = ['nsfw', 'topicalAlignment', 'custom', 'jailbreak'] as const satisfies Array<
	keyof GuardrailsOptions
>;

export const hasLLMGuardrails = (guardrails: GuardrailsOptions) => {
	const checks = Object.keys(guardrails ?? {});
	return checks.some((check) => (LLM_CHECKS as string[]).includes(check));
};

export const configureNodeInputsV2 = (parameters: { guardrails: GuardrailsOptions }) => {
	// typeof LLM_CHECKS guarantees that it's in sync with hasLLMGuardrails
	const CHECKS: typeof LLM_CHECKS = ['nsfw', 'topicalAlignment', 'custom', 'jailbreak'];
	const checks = Object.keys(parameters?.guardrails ?? {});
	const hasLLMChecks = checks.some((check) => (CHECKS as string[]).includes(check));
	if (!hasLLMChecks) {
		return ['main'];
	}

	return [
		'main',
		{
			type: 'ai_languageModel',
			displayName: 'Chat Model',
			maxConnections: 1,
			required: true,
			filter: {
				excludedNodes: [
					'@n8n/n8n-nodes-langchain.lmCohere',
					'@n8n/n8n-nodes-langchain.lmOllama',
					'n8n/n8n-nodes-langchain.lmOpenAi',
					'@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference',
				],
			},
		},
	];
};

export const configureNodeInputsV1 = (operation: 'classify' | 'sanitize') => {
	if (operation === 'sanitize') {
		// sanitize operations don't use a chat model
		return ['main'];
	}

	return [
		'main',
		{
			type: 'ai_languageModel',
			displayName: 'Chat Model',
			maxConnections: 1,
			required: true,
			filter: {
				excludedNodes: [
					'@n8n/n8n-nodes-langchain.lmCohere',
					'@n8n/n8n-nodes-langchain.lmOllama',
					'n8n/n8n-nodes-langchain.lmOpenAi',
					'@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference',
				],
			},
		},
	];
};
