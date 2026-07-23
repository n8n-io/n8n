import type { WorkflowJSON } from '@n8n/workflow-sdk';

vi.mock('@n8n/instance-ai', () => ({
	createEvalAgent: vi.fn(),
	extractText: vi.fn(),
}));

import { createEvalAgent, extractText } from '@n8n/instance-ai';

import { generatePinData } from '../pin-data-generator';

const createEvalAgentMock = vi.mocked(createEvalAgent);
const extractTextMock = vi.mocked(extractText);

const workflow = {
	nodes: [
		{
			name: 'Get Posted Keys',
			type: 'n8n-nodes-base.dataTable',
			typeVersion: 1,
			parameters: { resource: 'row', operation: 'get' },
		},
		{
			name: 'AI Root',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 1,
			parameters: {},
		},
	],
	connections: {},
} as unknown as WorkflowJSON;

const generateMock = vi.fn();

function respondWith(text: string) {
	generateMock.mockResolvedValue({});
	extractTextMock.mockReturnValue(text);
}

beforeEach(() => {
	vi.clearAllMocks();
	createEvalAgentMock.mockReturnValue({ generate: generateMock } as unknown as ReturnType<
		typeof createEvalAgent
	>);
});

describe('generatePinData', () => {
	it('keeps empty-array pins for "no stored data" states', async () => {
		respondWith(JSON.stringify({ 'Get Posted Keys': [] }));

		const result = await generatePinData({ workflow, nodeNames: ['Get Posted Keys'] });

		expect(result).toEqual({ 'Get Posted Keys': [] });
	});

	it('keeps empty-array pins inside code fences', async () => {
		respondWith('```json\n{ "Get Posted Keys": [] }\n```');

		const result = await generatePinData({ workflow, nodeNames: ['Get Posted Keys'] });

		expect(result).toEqual({ 'Get Posted Keys': [] });
	});

	it('wraps raw items and passes json-wrapped items through', async () => {
		respondWith(
			JSON.stringify({
				'Get Posted Keys': [{ lead_key: 'a@b.c' }, { json: { lead_key: 'd@e.f' } }],
			}),
		);

		const result = await generatePinData({ workflow, nodeNames: ['Get Posted Keys'] });

		expect(result['Get Posted Keys']).toEqual([
			{ json: { lead_key: 'a@b.c' } },
			{ json: { lead_key: 'd@e.f' } },
		]);
	});

	it('throws when the response misses a requested node', async () => {
		respondWith(JSON.stringify({ 'Get Posted Keys': [] }));

		await expect(
			generatePinData({ workflow, nodeNames: ['Get Posted Keys', 'AI Root'] }),
		).rejects.toThrow('Pin data generation returned no data for node(s): AI Root');
	});

	it('throws with all requested nodes when the response is not valid JSON', async () => {
		respondWith('sorry, I cannot help with that');

		await expect(
			generatePinData({ workflow, nodeNames: ['Get Posted Keys', 'AI Root'] }),
		).rejects.toThrow('Get Posted Keys, AI Root');
	});

	it('propagates agent errors instead of swallowing them', async () => {
		generateMock.mockRejectedValue(new Error('model overloaded'));

		await expect(generatePinData({ workflow, nodeNames: ['Get Posted Keys'] })).rejects.toThrow(
			'model overloaded',
		);
	});

	it('returns {} without calling the LLM when no nodes are requested', async () => {
		const result = await generatePinData({ workflow, nodeNames: [] });

		expect(result).toEqual({});
		expect(createEvalAgentMock).not.toHaveBeenCalled();
	});
});
