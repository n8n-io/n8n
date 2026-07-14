import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { MockedFunction } from 'vitest';

vi.mock('../../../utils/eval-agents', async () => {
	const actual: object = await vi.importActual('../../../utils/eval-agents');
	return { ...actual, createEvalAgent: vi.fn(), extractText: vi.fn() };
});

import { SONNET_MODEL, createEvalAgent, extractText } from '../../../utils/eval-agents';
import type { NodeSimulationVerdict } from '../../../workflow-loop/workflow-loop-state';
import { generateSimulationFixtures } from '../generate-simulation-fixtures.service';

const mockCreateEvalAgent = createEvalAgent as MockedFunction<typeof createEvalAgent>;
const mockExtractText = extractText as MockedFunction<typeof extractText>;

function setupAgentMock(responseText: string) {
	const generate = vi.fn().mockResolvedValue({ messages: [] });
	mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
		typeof createEvalAgent
	>);
	mockExtractText.mockReturnValue(responseText);
}

const wf = (nodes: Array<{ name: string; type: string }>): WorkflowJSON =>
	({
		name: 'test',
		nodes: nodes.map((n, i) => ({
			id: `id-${i}`,
			name: n.name,
			type: n.type,
			typeVersion: 1,
			position: [i * 100, 0],
			parameters: {},
		})),
		connections: {},
		pinData: {},
		settings: {},
	}) as unknown as WorkflowJSON;

const simulateVerdict = (nodeName: string): NodeSimulationVerdict => ({
	nodeName,
	verdict: 'simulate',
	reason: 'Sends a message',
	confidence: 'high',
	source: 'deterministic',
});

const executeVerdict = (nodeName: string): NodeSimulationVerdict => ({
	nodeName,
	verdict: 'execute',
	reason: 'Reads data',
	confidence: 'high',
	source: 'deterministic',
});

describe('generateSimulationFixtures', () => {
	beforeEach(() => vi.clearAllMocks());

	it('returns {} when the plan has no simulate verdicts', async () => {
		const result = await generateSimulationFixtures({
			workflow: wf([{ name: 'Get', type: 'n8n-nodes-base.slack' }]),
			plan: [executeVerdict('Get')],
		});
		expect(result).toEqual({});
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
	});

	it('returns LLM fixtures for simulated nodes only', async () => {
		setupAgentMock(
			JSON.stringify({
				'Send Slack': [{ json: { ok: true, ts: '1718000000.000100', channel: 'C123' } }],
			}),
		);
		const result = await generateSimulationFixtures({
			workflow: wf([
				{ name: 'Send Slack', type: 'n8n-nodes-base.slack' },
				{ name: 'Get Rows', type: 'n8n-nodes-base.dataTable' },
			]),
			plan: [simulateVerdict('Send Slack'), executeVerdict('Get Rows')],
		});
		expect(Object.keys(result)).toEqual(['Send Slack']);
		expect(result['Send Slack'][0]).toMatchObject({ ok: true });
		expect(mockCreateEvalAgent).toHaveBeenCalledWith(
			'verification-simulation-fixtures',
			expect.objectContaining({ model: SONNET_MODEL }),
		);
	});

	it('fills empty fixtures for nodes the LLM omitted', async () => {
		setupAgentMock(JSON.stringify({ A: [{ json: { id: 1 } }] }));
		const result = await generateSimulationFixtures({
			workflow: wf([
				{ name: 'A', type: 'n8n-nodes-base.slack' },
				{ name: 'B', type: 'n8n-nodes-base.gmail' },
			]),
			plan: [simulateVerdict('A'), simulateVerdict('B')],
		});
		expect(result.A).toEqual([{ id: 1 }]);
		expect(result.B).toEqual([{}]);
	});

	it('returns empty fixtures for every node on malformed LLM output', async () => {
		setupAgentMock('not json');
		const result = await generateSimulationFixtures({
			workflow: wf([{ name: 'A', type: 'n8n-nodes-base.slack' }]),
			plan: [simulateVerdict('A')],
		});
		expect(result).toEqual({ A: [{}] });
	});

	it('returns empty fixtures for every node when the LLM call throws', async () => {
		const generate = vi.fn().mockRejectedValue(new Error('boom'));
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		const result = await generateSimulationFixtures({
			workflow: wf([{ name: 'A', type: 'n8n-nodes-base.slack' }]),
			plan: [simulateVerdict('A')],
		});
		expect(result).toEqual({ A: [{}] });
	});

	it('strips markdown fences around the JSON output', async () => {
		setupAgentMock('```json\n{"A":[{"json":{"ok":true}}]}\n```');
		const result = await generateSimulationFixtures({
			workflow: wf([{ name: 'A', type: 'n8n-nodes-base.slack' }]),
			plan: [simulateVerdict('A')],
		});
		expect(result.A).toEqual([{ ok: true }]);
	});

	it('includes upstream context in the prompt for user-action nodes', async () => {
		const generate = vi.fn().mockResolvedValue({ messages: [] });
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockExtractText.mockReturnValue(JSON.stringify({ Wait: [{ json: { email: 'a@b.c' } }] }));

		const workflow = wf([
			{ name: 'Fetch User', type: 'n8n-nodes-base.httpRequest' },
			{ name: 'Wait', type: 'n8n-nodes-base.wait' },
		]);
		(workflow.connections as Record<string, unknown>)['Fetch User'] = {
			main: [[{ node: 'Wait', type: 'main', index: 0 }]],
		};

		await generateSimulationFixtures({
			workflow,
			plan: [
				{
					nodeName: 'Wait',
					verdict: 'simulate',
					reason: 'Pauses the workflow',
					confidence: 'high',
					source: 'deterministic',
				},
			],
		});

		const promptText = (generate.mock.calls[0][0] as Array<{ content: Array<{ text: string }> }>)[0]
			.content[0].text;
		expect(promptText).toContain('Immediate upstream nodes');
		expect(promptText).toContain('"Fetch User" (n8n-nodes-base.httpRequest)');
	});

	it('ignores plan entries whose node is missing from the workflow', async () => {
		const result = await generateSimulationFixtures({
			workflow: wf([{ name: 'A', type: 'n8n-nodes-base.slack' }]),
			plan: [simulateVerdict('Ghost')],
		});
		expect(result).toEqual({});
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
	});
});
