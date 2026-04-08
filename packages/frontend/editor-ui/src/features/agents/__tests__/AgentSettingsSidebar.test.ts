import { describe, it, expect } from 'vitest';

/**
 * Unit tests for the provider mapping logic used in AgentSettingsSidebar.
 * Tests the ChatHub <-> Catalog provider ID mapping without mounting components.
 */

// Replicate the mapping from the component
const CHATHUB_TO_CATALOG: Record<string, string> = {
	openai: 'openai',
	anthropic: 'anthropic',
	google: 'google',
	ollama: 'ollama',
	azureOpenAi: 'azure-openai',
	azureEntraId: 'azure-openai',
	awsBedrock: 'aws-bedrock',
	vercelAiGateway: 'vercel',
	xAiGrok: 'xai',
	groq: 'groq',
	openRouter: 'openrouter',
	deepSeek: 'deepseek',
	cohere: 'cohere',
	mistralCloud: 'mistral',
};

const CATALOG_TO_CHATHUB: Record<string, string> = {};
for (const [chatHub, catalog] of Object.entries(CHATHUB_TO_CATALOG)) {
	if (!(catalog in CATALOG_TO_CHATHUB)) {
		CATALOG_TO_CHATHUB[catalog] = chatHub;
	}
}

describe('Provider ID mapping', () => {
	it('maps all ChatHub providers to catalog IDs', () => {
		expect(CHATHUB_TO_CATALOG.openai).toBe('openai');
		expect(CHATHUB_TO_CATALOG.anthropic).toBe('anthropic');
		expect(CHATHUB_TO_CATALOG.xAiGrok).toBe('xai');
		expect(CHATHUB_TO_CATALOG.deepSeek).toBe('deepseek');
		expect(CHATHUB_TO_CATALOG.mistralCloud).toBe('mistral');
		expect(CHATHUB_TO_CATALOG.openRouter).toBe('openrouter');
		expect(CHATHUB_TO_CATALOG.awsBedrock).toBe('aws-bedrock');
	});

	it('reverse maps catalog IDs back to ChatHub IDs', () => {
		expect(CATALOG_TO_CHATHUB.openai).toBe('openai');
		expect(CATALOG_TO_CHATHUB.anthropic).toBe('anthropic');
		expect(CATALOG_TO_CHATHUB.xai).toBe('xAiGrok');
		expect(CATALOG_TO_CHATHUB.deepseek).toBe('deepSeek');
		expect(CATALOG_TO_CHATHUB.mistral).toBe('mistralCloud');
		expect(CATALOG_TO_CHATHUB.openrouter).toBe('openRouter');
		expect(CATALOG_TO_CHATHUB['aws-bedrock']).toBe('awsBedrock');
	});

	it('prefers azureOpenAi over azureEntraId for azure-openai reverse mapping', () => {
		// Both azureOpenAi and azureEntraId map to 'azure-openai'
		// The reverse should pick azureOpenAi (first one wins)
		expect(CATALOG_TO_CHATHUB['azure-openai']).toBe('azureOpenAi');
	});

	it('has a reverse mapping for every unique catalog ID', () => {
		const uniqueCatalogIds = new Set(Object.values(CHATHUB_TO_CATALOG));
		for (const catalogId of uniqueCatalogIds) {
			expect(CATALOG_TO_CHATHUB[catalogId]).toBeDefined();
		}
	});
});
