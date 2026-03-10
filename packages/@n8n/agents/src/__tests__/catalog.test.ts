/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/require-await */
import { fetchProviderCatalog } from '../catalog';

const mockResponse = {
	anthropic: {
		id: 'anthropic',
		name: 'Anthropic',
		models: {
			'claude-sonnet-4-5': {
				id: 'claude-sonnet-4-5',
				name: 'Claude Sonnet 4.5',
				reasoning: true,
				tool_call: true,
			},
			'claude-haiku-4-5': {
				id: 'claude-haiku-4-5',
				name: 'Claude Haiku 4.5',
				reasoning: false,
				tool_call: true,
			},
		},
	},
	openai: {
		id: 'openai',
		name: 'OpenAI',
		models: {
			'gpt-4o': {
				id: 'gpt-4o',
				name: 'GPT-4o',
				tool_call: true,
			},
		},
	},
	'empty-provider': {
		id: 'empty-provider',
		name: 'Empty',
		models: {},
	},
	'no-models': {
		id: 'no-models',
		name: 'No Models',
	},
};

beforeEach(() => {
	jest.spyOn(globalThis, 'fetch').mockResolvedValue({
		ok: true,
		json: async () => mockResponse,
	} as Response);
});

afterEach(() => {
	jest.restoreAllMocks();
});

describe('fetchProviderCatalog', () => {
	it('should parse providers and models from the API response', async () => {
		const catalog = await fetchProviderCatalog();

		expect(Object.keys(catalog)).toEqual(['anthropic', 'openai']);
		expect(catalog.anthropic.id).toBe('anthropic');
		expect(catalog.anthropic.name).toBe('Anthropic');
		expect(catalog.openai.id).toBe('openai');
	});

	it('should map model fields correctly', async () => {
		const catalog = await fetchProviderCatalog();
		const sonnet = catalog.anthropic.models['claude-sonnet-4-5'];

		expect(sonnet).toEqual({
			id: 'claude-sonnet-4-5',
			name: 'Claude Sonnet 4.5',
			reasoning: true,
			toolCall: true,
		});
	});

	it('should default reasoning and toolCall to false when missing', async () => {
		const catalog = await fetchProviderCatalog();
		const gpt4o = catalog.openai.models['gpt-4o'];

		expect(gpt4o.reasoning).toBe(false);
		expect(gpt4o.toolCall).toBe(true);
	});

	it('should exclude providers with no models', async () => {
		const catalog = await fetchProviderCatalog();

		expect(catalog['empty-provider']).toBeUndefined();
		expect(catalog['no-models']).toBeUndefined();
	});

	it('should throw on fetch failure', async () => {
		jest.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: false,
			statusText: 'Service Unavailable',
		} as Response);

		await expect(fetchProviderCatalog()).rejects.toThrow(
			'Failed to fetch provider catalog: Service Unavailable',
		);
	});
});
