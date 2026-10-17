import { fetchProviderCatalog } from '@n8n/agents/catalog';

import { executeTool, parseToolInput } from '../../__tests__/tool-test-utils';
import { ModelCatalogService } from '../models/model-catalog.service';
import { searchModelsOutputSchema } from '../models/schemas';
import { createSearchModelsTool } from '../search-models.tool';

vi.mock('@n8n/agents/catalog', () => ({ fetchProviderCatalog: vi.fn() }));

describe('searchModels tool', () => {
	// INS-539: Keep external catalog results marked as untrusted.
	it('declares catalog output as untrusted', () => {
		expect(createSearchModelsTool().outputTrust).toBe('untrusted');
	});

	it('returns ten results by default and preserves the declared output contract', async () => {
		vi.mocked(fetchProviderCatalog).mockResolvedValue({
			openai: {
				id: 'openai',
				name: 'OpenAI',
				models: Object.fromEntries(
					Array.from({ length: 12 }, (_, index) => [
						`model-${index}`,
						{
							id: `model-${index}`,
							name: `Model ${index}`,
							toolCall: true,
							toolCallKnown: true,
							modalities: { input: ['text'], output: ['text'] },
							releaseDate: '2026-09-01',
						},
					]),
				),
			},
		});
		const tool = createSearchModelsTool(new ModelCatalogService());
		const input = parseToolInput(tool, { provider: 'openai' });
		expect(input.success).toBe(true);
		if (!input.success) throw new Error('Expected valid tool input');
		const result = searchModelsOutputSchema.parse(await executeTool(tool, input.data));
		expect(tool.name).toBe('searchModels');
		expect(result.models).toHaveLength(10);
		expect(result.hasMore).toBe(true);
		expect(result.credentialAccess).toBe('not_checked');

		const filteredInput = parseToolInput(tool, { provider: 'openai', query: ' Model 11 ' });
		if (!filteredInput.success) throw new Error('Expected valid query input');
		const filtered = searchModelsOutputSchema.parse(await executeTool(tool, filteredInput.data));
		expect(filtered.models.map(({ id }) => id)).toEqual(['model-11']);
		expect(filtered.hasMore).toBe(false);
	});

	it.each([
		{ provider: '' },
		{ provider: '  ' },
		{ provider: 'openai', limit: 0 },
		{ provider: 'openai', limit: 11 },
		{ provider: 'openai', limit: 1.5 },
		{ provider: 'openai', query: 123 },
		{ provider: 'openai', query: 'x'.repeat(101) },
		{ provider: 'openai', includePreview: true },
		{ provider: 'openai', requirements: {} },
	])('rejects invalid or unsupported inputs: %j', (input) => {
		expect(parseToolInput(createSearchModelsTool(), input).success).toBe(false);
	});
});
