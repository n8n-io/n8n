import { describe, it, expect } from 'vitest';
import { CHATHUB_TO_CATALOG, CATALOG_TO_CHATHUB } from '../provider-mapping';

/**
 * Tests the shared provider mapping used by AgentSettingsSidebar
 * to translate between ChatHub provider IDs and Agent SDK catalog IDs.
 */
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
		expect(CATALOG_TO_CHATHUB['azure-openai']).toBe('azureOpenAi');
	});

	it('has a reverse mapping for every unique catalog ID', () => {
		const uniqueCatalogIds = new Set(Object.values(CHATHUB_TO_CATALOG));
		for (const catalogId of uniqueCatalogIds) {
			expect(CATALOG_TO_CHATHUB[catalogId]).toBeDefined();
		}
	});
});
