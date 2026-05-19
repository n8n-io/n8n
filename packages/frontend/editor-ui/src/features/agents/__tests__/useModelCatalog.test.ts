import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentModelOption } from '../model-providers';

const mocks = vi.hoisted(() => ({
	getModelCatalog: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: {},
	}),
}));

vi.mock('../composables/useAgentApi', () => ({
	getModelCatalog: mocks.getModelCatalog,
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

describe('useModelCatalog', () => {
	beforeEach(() => {
		vi.resetModules();
		mocks.getModelCatalog.mockReset();
	});

	it('returns models for the agent providers without requiring selected credentials', async () => {
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

		const result = getModelsForPicker();

		expect(modelIds(result.openai?.models ?? [])).toEqual(['gpt-5']);
		expect(modelIds(result['azure-openai']?.models ?? [])).toEqual(['cohere-command-a', 'gpt-4o']);
		expect(modelIds(result['aws-bedrock']?.models ?? [])).toEqual([
			'anthropic.claude-sonnet-4-5-v1:0',
		]);
		expect(modelIds(result.nvidia?.models ?? [])).toEqual([
			'nvidia/llama-3.3-nemotron-super-49b-v1',
		]);
		expect(result.anthropic?.models).toEqual([]);
	});
});
