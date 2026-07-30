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

	describe('field-name drift', () => {
		const dataTableColumns = {
			'Get Posted Keys': [{ name: 'contact_email', type: 'string' }],
		};
		const conforming = JSON.stringify({
			'Get Posted Keys': [
				{ json: { id: 1, createdAt: 'x', updatedAt: 'x', contact_email: 'a@b.c' } },
			],
		});
		const drifted = JSON.stringify({
			'Get Posted Keys': [{ json: { id: 1, createdAt: 'x', updatedAt: 'x', email: 'a@b.c' } }],
		});

		it('embeds the real columns in the prompt and accepts conforming rows first try', async () => {
			respondWith(conforming);

			const result = await generatePinData({
				workflow,
				nodeNames: ['Get Posted Keys'],
				dataTableColumns,
			});

			expect(result['Get Posted Keys'][0].json).toMatchObject({ contact_email: 'a@b.c' });
			expect(generateMock).toHaveBeenCalledTimes(1);
			expect(generateMock.mock.calls[0][0]).toContain('REAL Data Table columns');
		});

		it('regenerates once with corrections when pinned keys drift', async () => {
			generateMock.mockResolvedValue({});
			extractTextMock.mockReturnValueOnce(drifted).mockReturnValueOnce(conforming);

			const result = await generatePinData({
				workflow,
				nodeNames: ['Get Posted Keys'],
				dataTableColumns,
			});

			expect(result['Get Posted Keys'][0].json).toMatchObject({ contact_email: 'a@b.c' });
			expect(generateMock).toHaveBeenCalledTimes(2);
			const retryPrompt = generateMock.mock.calls[1][0] as string;
			expect(retryPrompt).toContain('## Correction required');
			expect(retryPrompt).toContain('remove/rename these unknown fields: email');
		});

		it('fails loud instead of serving a still-drifted fixture after the retry', async () => {
			generateMock.mockResolvedValue({});
			extractTextMock.mockReturnValue(drifted);

			await expect(
				generatePinData({ workflow, nodeNames: ['Get Posted Keys'], dataTableColumns }),
			).rejects.toThrow('drifted from declared field names after retry');
			expect(generateMock).toHaveBeenCalledTimes(2);
		});
	});
});
