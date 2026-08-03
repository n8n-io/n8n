import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentModelOption } from '../model-providers';

const mocks = vi.hoisted(() => ({
	getModelCatalog: vi.fn(),
	getProviderModels: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: {},
	}),
}));

vi.mock('../composables/useAgentApi', () => ({
	getModelCatalog: mocks.getModelCatalog,
	getProviderModels: mocks.getProviderModels,
}));

function model(id: string, name = id) {
	return {
		id,
		name,
		reasoning: false,
		toolCall: true,
	};
}

function provider(id: string, models: Record<string, ReturnType<typeof model>>) {
	return {
		id,
		name: id,
		models,
	};
}

function modelIds(models: AgentModelOption[]) {
	return models.map((entry) => entry.model);
}

async function flushAsync() {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('useModelCatalog', () => {
	beforeEach(() => {
		vi.resetModules();
		mocks.getModelCatalog.mockReset();
		mocks.getProviderModels.mockReset();
		// Default: no live verification available — fall back to the catalog.
		mocks.getProviderModels.mockRejectedValue(new Error('not available'));
	});

	it('returns models for the agent providers that have selected credentials', async () => {
		mocks.getModelCatalog.mockResolvedValue({
			openai: provider('openai', {
				'gpt-5': model('gpt-5', 'GPT-5'),
			}),
			'azure-openai': provider('azure-openai', {
				'gpt-4o': model('gpt-4o', 'GPT-4o'),
				'cohere-command-a': model('cohere-command-a', 'Command A'),
			}),
			'aws-bedrock': provider('aws-bedrock', {
				'anthropic.claude-sonnet-4-5-v1:0': model(
					'anthropic.claude-sonnet-4-5-v1:0',
					'Claude Sonnet 4.5',
				),
			}),
			nvidia: provider('nvidia', {
				'nvidia/llama-3.3-nemotron-super-49b-v1': model(
					'nvidia/llama-3.3-nemotron-super-49b-v1',
					'Nemotron Super',
				),
			}),
		});

		const { useModelCatalog } = await import('../composables/useModelCatalog');
		const { ensureLoaded, getModelsForPicker } = useModelCatalog();

		await ensureLoaded('project-1');

		const resultWithoutCredentials = getModelsForPicker(null);

		expect(resultWithoutCredentials.openai?.models).toEqual([]);
		expect(resultWithoutCredentials['azure-openai']?.models).toEqual([]);
		expect(resultWithoutCredentials['aws-bedrock']?.models).toEqual([]);
		expect(resultWithoutCredentials.nvidia?.models).toEqual([]);

		const result = getModelsForPicker({
			openai: 'openai-credential-id',
			nvidia: 'nvidia-credential-id',
			'azure-openai': null,
		});

		expect(modelIds(result.openai?.models ?? [])).toEqual(['gpt-5']);
		expect(result['azure-openai']?.models).toEqual([]);
		expect(result['aws-bedrock']?.models).toEqual([]);
		expect(modelIds(result.nvidia?.models ?? [])).toEqual([
			'nvidia/llama-3.3-nemotron-super-49b-v1',
		]);
		expect(result.anthropic?.models).toEqual([]);
	});

	it('prefers the provider-verified model list over the static catalog', async () => {
		mocks.getModelCatalog.mockResolvedValue({
			anthropic: provider('anthropic', {
				'claude-sonnet-4-6': model('claude-sonnet-4-6', 'Claude Sonnet 4.6'),
				'claude-opus-4-0': model('claude-opus-4-0', 'Claude Opus 4'),
			}),
		});
		mocks.getProviderModels.mockResolvedValue({
			provider: 'anthropic',
			verified: true,
			models: [model('claude-sonnet-4-6', 'Claude Sonnet 4.6')],
		});

		const { useModelCatalog } = await import('../composables/useModelCatalog');
		const { ensureLoaded, getModelsForPicker } = useModelCatalog();
		await ensureLoaded('project-1');
		const credentials = { anthropic: 'anthropic-credential-id' };

		// First read triggers the verification fetch; once it lands, only the
		// provider-confirmed models remain.
		getModelsForPicker(credentials);
		await flushAsync();

		expect(modelIds(getModelsForPicker(credentials).anthropic?.models ?? [])).toEqual([
			'claude-sonnet-4-6',
		]);
		expect(mocks.getProviderModels).toHaveBeenCalledWith(
			{},
			'project-1',
			'anthropic',
			'anthropic-credential-id',
		);
	});

	it('fetches the verified list only once per provider and credential', async () => {
		mocks.getModelCatalog.mockResolvedValue({
			anthropic: provider('anthropic', {
				'claude-sonnet-4-6': model('claude-sonnet-4-6'),
			}),
		});
		mocks.getProviderModels.mockResolvedValue({
			provider: 'anthropic',
			verified: true,
			models: [model('claude-sonnet-4-6')],
		});

		const { useModelCatalog } = await import('../composables/useModelCatalog');
		const { ensureLoaded, getModelsForPicker } = useModelCatalog();
		await ensureLoaded('project-1');
		const credentials = { anthropic: 'anthropic-credential-id' };

		getModelsForPicker(credentials);
		getModelsForPicker(credentials);
		await flushAsync();
		getModelsForPicker(credentials);
		await flushAsync();

		expect(mocks.getProviderModels).toHaveBeenCalledTimes(1);
	});

	it('falls back to the catalog list when verification fails or is unverified', async () => {
		mocks.getModelCatalog.mockResolvedValue({
			anthropic: provider('anthropic', {
				'claude-sonnet-4-6': model('claude-sonnet-4-6'),
				'claude-opus-4-0': model('claude-opus-4-0'),
			}),
			openai: provider('openai', {
				'gpt-5': model('gpt-5'),
			}),
		});
		mocks.getProviderModels.mockImplementation(async (_ctx, _projectId, providerId) => {
			if (providerId === 'anthropic') throw new Error('provider is down');
			return { provider: providerId, verified: false, models: [model('gpt-5')] };
		});

		const { useModelCatalog } = await import('../composables/useModelCatalog');
		const { ensureLoaded, getModelsForPicker } = useModelCatalog();
		await ensureLoaded('project-1');
		const credentials = { anthropic: 'anthropic-cred', openai: 'openai-cred' };

		getModelsForPicker(credentials);
		await flushAsync();

		const result = getModelsForPicker(credentials);
		expect(modelIds(result.anthropic?.models ?? []).sort()).toEqual([
			'claude-opus-4-0',
			'claude-sonnet-4-6',
		]);
		expect(modelIds(result.openai?.models ?? [])).toEqual(['gpt-5']);
	});
});
