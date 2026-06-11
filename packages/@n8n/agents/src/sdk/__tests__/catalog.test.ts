import { fetchProviderCatalog } from '../catalog';

describe('fetchProviderCatalog', () => {
	const originalFetch = global.fetch;

	afterEach(() => {
		global.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it('returns provider ids that match the agents runtime', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () =>
				await Promise.resolve({
					openai: {
						id: 'openai',
						name: 'OpenAI',
						models: {
							'gpt-5': {
								id: 'gpt-5',
								name: 'GPT-5',
								tool_call: true,
							},
						},
					},
					'amazon-bedrock': {
						id: 'amazon-bedrock',
						name: 'Amazon Bedrock',
						models: {
							'anthropic.claude-sonnet-4-5-v1:0': {
								id: 'anthropic.claude-sonnet-4-5-v1:0',
								name: 'Claude Sonnet 4.5',
							},
						},
					},
					azure: {
						id: 'azure',
						name: 'Azure',
						models: {
							'gpt-4o': {
								id: 'gpt-4o',
								name: 'GPT-4o',
							},
						},
					},
					'azure-cognitive-services': {
						id: 'azure-cognitive-services',
						name: 'Azure Cognitive Services',
						models: {
							'cohere-command-a': {
								id: 'cohere-command-a',
								name: 'Command A',
							},
						},
					},
				}),
		});
		global.fetch = fetchMock as typeof fetch;

		const catalog = await fetchProviderCatalog();

		expect(catalog.openai.models['gpt-5'].toolCall).toBe(true);
		expect(catalog['aws-bedrock'].models['anthropic.claude-sonnet-4-5-v1:0'].name).toBe(
			'Claude Sonnet 4.5',
		);
		expect(catalog['azure-openai'].models['gpt-4o'].name).toBe('GPT-4o');
		expect(catalog['azure-openai'].models['cohere-command-a'].name).toBe('Command A');
		expect(catalog['amazon-bedrock']).toBeUndefined();
		expect(catalog.azure).toBeUndefined();
		expect(catalog['azure-cognitive-services']).toBeUndefined();
	});
});
