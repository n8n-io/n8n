import { LlmJudgeProviderRegistry } from '../llm-judge-provider-registry';

describe('LlmJudgeProviderRegistry (fixed-list)', () => {
	const registry = new LlmJudgeProviderRegistry();

	it('exposes the canonical chat-model providers shipped by @n8n/n8n-nodes-langchain', () => {
		const expectedNodeTypes = [
			'@n8n/n8n-nodes-langchain.lmChatOpenAi',
			'@n8n/n8n-nodes-langchain.lmChatAnthropic',
			'@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			'@n8n/n8n-nodes-langchain.lmChatGoogleVertex',
			'@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
			'@n8n/n8n-nodes-langchain.lmChatAwsBedrock',
			'@n8n/n8n-nodes-langchain.lmChatOllama',
			'@n8n/n8n-nodes-langchain.lmChatVercelAiGateway',
			'@n8n/n8n-nodes-langchain.lmChatXAiGrok',
			'@n8n/n8n-nodes-langchain.lmChatGroq',
			'@n8n/n8n-nodes-langchain.lmChatOpenRouter',
			'@n8n/n8n-nodes-langchain.lmChatDeepSeek',
			'@n8n/n8n-nodes-langchain.lmChatCohere',
			'@n8n/n8n-nodes-langchain.lmChatMistralCloud',
			'@n8n/n8n-nodes-langchain.lmChatAlibabaCloud',
			'@n8n/n8n-nodes-langchain.lmChatMinimax',
			'@n8n/n8n-nodes-langchain.lmChatMoonshot',
			'@n8n/n8n-nodes-langchain.lmChatLemonade',
		];
		const actual = registry.listProviders().map((p) => p.nodeType);
		expect(actual.sort()).toEqual([...expectedNodeTypes].sort());
	});

	describe('shape', () => {
		it('every entry has nodeType, displayName, and a non-empty credentialTypes array', () => {
			for (const entry of registry.listProviders()) {
				expect(entry.nodeType).toMatch(/^@n8n\/n8n-nodes-langchain\./);
				expect(typeof entry.displayName).toBe('string');
				expect(entry.displayName.length).toBeGreaterThan(0);
				expect(Array.isArray(entry.credentialTypes)).toBe(true);
				expect(entry.credentialTypes.length).toBeGreaterThan(0);
				for (const cred of entry.credentialTypes) {
					expect(typeof cred.name).toBe('string');
					expect(cred.name.length).toBeGreaterThan(0);
					expect(typeof cred.displayName).toBe('string');
					expect(cred.displayName.length).toBeGreaterThan(0);
				}
			}
		});
	});

	describe('get(nodeType)', () => {
		it('returns the matching entry for a known provider', () => {
			const entry = registry.get('@n8n/n8n-nodes-langchain.lmChatOpenAi');
			expect(entry).toBeDefined();
			expect(entry?.displayName).toBe('OpenAI Chat Model');
			expect(entry?.credentialTypes.map((c) => c.name)).toContain('openAiApi');
		});

		it('returns undefined for unknown providers', () => {
			expect(registry.get('@n8n/n8n-nodes-langchain.lmChatNotARealNode')).toBeUndefined();
		});

		it('exposes Azure OpenAI with both api-key and Entra credential variants', () => {
			const entry = registry.get('@n8n/n8n-nodes-langchain.lmChatAzureOpenAi');
			const credNames = entry?.credentialTypes.map((c) => c.name) ?? [];
			expect(credNames).toEqual(
				expect.arrayContaining(['azureOpenAiApi', 'azureEntraCognitiveServicesOAuth2Api']),
			);
		});
	});

	describe('listProviders() referential stability', () => {
		it('returns the same array reference across calls (cheap snapshot)', () => {
			expect(registry.listProviders()).toBe(registry.listProviders());
		});
	});
});
