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

	it('accepts unwrapped items without zeroing the whole batch', async () => {
		// One node wrapped, one flat — the old strict schema rejected the batch.
		setupAgentMock(
			JSON.stringify({
				A: [{ json: { ok: true } }],
				B: [{ id: 'row-1' }],
			}),
		);
		const result = await generateSimulationFixtures({
			workflow: wf([
				{ name: 'A', type: 'n8n-nodes-base.slack' },
				{ name: 'B', type: 'n8n-nodes-base.gmail' },
			]),
			plan: [simulateVerdict('A'), simulateVerdict('B')],
		});
		expect(result.A).toEqual([{ ok: true }]);
		expect(result.B).toEqual([{ id: 'row-1' }]);
	});

	it('keeps other fixtures when the LLM returns an empty array for one node', async () => {
		// The old .min(1) schema rejected the WHOLE batch on one empty array.
		setupAgentMock(JSON.stringify({ A: [], B: [{ json: { id: 1 } }] }));
		const result = await generateSimulationFixtures({
			workflow: wf([
				{ name: 'A', type: 'n8n-nodes-base.slack' },
				{ name: 'B', type: 'n8n-nodes-base.gmail' },
			]),
			plan: [simulateVerdict('A'), simulateVerdict('B')],
		});
		expect(result.A).toEqual([{}]);
		expect(result.B).toEqual([{ id: 1 }]);
	});

	it('repairs the output envelope for simulated Agent roots with a structured parser', async () => {
		setupAgentMock(
			// Failure mode: parsed fields spread flat with no `output` envelope.
			JSON.stringify({ 'AI Root': [{ json: { summary: 'hi' } }] }),
		);

		const workflow = wf([
			{ name: 'AI Root', type: '@n8n/n8n-nodes-langchain.agent' },
			{ name: 'Parser', type: '@n8n/n8n-nodes-langchain.outputParserStructured' },
		]);
		(workflow.connections as Record<string, unknown>).Parser = {
			ai_outputParser: [[{ node: 'AI Root', type: 'ai_outputParser', index: 0 }]],
		};

		const result = await generateSimulationFixtures({
			workflow,
			plan: [simulateVerdict('AI Root')],
			// The envelope is derived from the with-parser `__schema__` variant —
			// in the product the adapter always injects this lookup.
			outputSchemaLookup: ({ hasOutputParser }) =>
				hasOutputParser
					? { type: 'object', required: ['output'], properties: { output: { type: 'object' } } }
					: undefined,
		});

		expect(result['AI Root']).toEqual([{ output: { summary: 'hi' } }]);
	});

	it('embeds the node output schema in the prompt when the lookup resolves one', async () => {
		const generate = vi.fn().mockResolvedValue({ messages: [] });
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockExtractText.mockReturnValue(JSON.stringify({ 'Send Slack': [{ json: { ok: true } }] }));

		const workflow = wf([{ name: 'Send Slack', type: 'n8n-nodes-base.slack' }]);
		const node = workflow.nodes[0];
		node.parameters = { resource: 'message', operation: 'post' };
		node.typeVersion = 2.3;

		const outputSchemaLookup = vi
			.fn()
			.mockReturnValue({ type: 'object', properties: { ok: { type: 'boolean' } } });

		await generateSimulationFixtures({
			workflow,
			plan: [simulateVerdict('Send Slack')],
			outputSchemaLookup,
		});

		expect(outputSchemaLookup).toHaveBeenCalledWith({
			type: 'n8n-nodes-base.slack',
			typeVersion: 2.3,
			resource: 'message',
			operation: 'post',
			hasOutputParser: false,
		});
		const promptText = (generate.mock.calls[0][0] as Array<{ content: Array<{ text: string }> }>)[0]
			.content[0].text;
		expect(promptText).toContain('Output JSON Schema:');
		// Shared buildNodeSchemaSection embeds the schema pretty-printed.
		expect(promptText).toContain('"type": "boolean"');
	});

	it('always appends a date-anchors block to the prompt', async () => {
		const generate = vi.fn().mockResolvedValue({ messages: [] });
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockExtractText.mockReturnValue(JSON.stringify({ A: [{ json: { ok: true } }] }));

		await generateSimulationFixtures({
			workflow: wf([{ name: 'A', type: 'n8n-nodes-base.slack' }]),
			plan: [simulateVerdict('A')],
		});

		const promptText = (generate.mock.calls[0][0] as Array<{ content: Array<{ text: string }> }>)[0]
			.content[0].text;
		expect(promptText).toContain('## Date anchors');
		expect(promptText).toContain('- today:');
	});

	it('marks simulated trigger nodes as the event source in their prompt block', async () => {
		const generate = vi.fn().mockResolvedValue({ messages: [] });
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockExtractText.mockReturnValue(
			JSON.stringify({ 'On New Email': [{ json: { id: 'msg-1' } }] }),
		);

		await generateSimulationFixtures({
			workflow: wf([{ name: 'On New Email', type: 'n8n-nodes-base.gmailTrigger' }]),
			plan: [simulateVerdict('On New Email')],
		});

		const promptText = (generate.mock.calls[0][0] as Array<{ content: Array<{ text: string }> }>)[0]
			.content[0].text;
		expect(promptText).toContain('simulated event source — emit the event payload it delivers');
	});

	it('omits the schema block when the lookup finds nothing or is absent', async () => {
		const generate = vi.fn().mockResolvedValue({ messages: [] });
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockExtractText.mockReturnValue(JSON.stringify({ A: [{ json: { ok: true } }] }));

		await generateSimulationFixtures({
			workflow: wf([{ name: 'A', type: 'n8n-nodes-base.slack' }]),
			plan: [simulateVerdict('A')],
			outputSchemaLookup: vi.fn().mockReturnValue(undefined),
		});

		const promptText = (generate.mock.calls[0][0] as Array<{ content: Array<{ text: string }> }>)[0]
			.content[0].text;
		expect(promptText).not.toContain('Output JSON Schema:');
	});
});
