import { fetchProviderCatalog } from '@n8n/agents/catalog';

import { executeTool, parseToolInput } from '../../__tests__/tool-test-utils';
import { ModelCatalogService } from '../models/model-catalog.service';
import { searchModelsOutputSchema } from '../models/schemas';
import { createSearchModelsTool } from '../search-models.tool';

vi.mock('@n8n/agents/catalog', () => ({ fetchProviderCatalog: vi.fn() }));

describe('searchModels tool', () => {
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
	});

	it.each([
		{ provider: '' },
		{ provider: '  ' },
		{ provider: 'openai', limit: 0 },
		{ provider: 'openai', limit: 11 },
		{ provider: 'openai', limit: 1.5 },
		{ provider: 'openai', includePreview: true },
		{ provider: 'openai', requirements: {} },
	])('rejects invalid or unsupported inputs: %j', (input) => {
		expect(parseToolInput(createSearchModelsTool(), input).success).toBe(false);
	});
});
