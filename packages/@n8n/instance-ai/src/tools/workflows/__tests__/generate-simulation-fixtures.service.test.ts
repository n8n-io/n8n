import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { MockedFunction } from 'vitest';

vi.mock('../../../utils/eval-agents', async () => {
	const actual: object = await vi.importActual('../../../utils/eval-agents');
	return { ...actual, createEvalAgent: vi.fn(), extractText: vi.fn() };
});

import { SONNET_MODEL, createEvalAgent, extractText } from '../../../utils/eval-agents';
import type { NodeSimulationVerdict } from '../../../workflow-loop/workflow-loop-state';
import {
	buildPlaceholderFixtures,
	generateSimulationFixtures,
} from '../generate-simulation-fixtures.service';

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

	it('falls back to a placeholder for nodes the LLM omitted', async () => {
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

	it('falls back to a placeholder for every node on malformed LLM output', async () => {
		setupAgentMock('not json');
		const result = await generateSimulationFixtures({
			workflow: wf([{ name: 'A', type: 'n8n-nodes-base.slack' }]),
			plan: [simulateVerdict('A')],
		});
		expect(result).toEqual({ A: [{}] });
	});

	it('falls back to a placeholder for every node when the LLM call throws', async () => {
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

	it('warns on generation failure so the placeholder degrade is visible', async () => {
		mockCreateEvalAgent.mockImplementation(() => {
			throw new Error('Missing API key');
		});
		const warn = vi.fn();
		const logger = { info: vi.fn(), warn, error: vi.fn(), debug: vi.fn() };
		const result = await generateSimulationFixtures({
			workflow: wf([{ name: 'A', type: 'n8n-nodes-base.slack' }]),
			plan: [simulateVerdict('A')],
			logger,
		});
		expect(result).toEqual({ A: [{}] });
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('fixture generation failed'),
			expect.objectContaining({ reason: 'generation_failed', nodeCount: 1 }),
		);
	});

	it('forwards the fallback model config to the LLM call', async () => {
		setupAgentMock(JSON.stringify({ A: [{ json: { ok: true } }] }));
		const fallbackModelConfig = {
			id: 'anthropic/claude-opus-4-8' as const,
			url: 'https://proxy.example.com/anthropic/v1',
			apiKey: 'proxy-token',
		};
		await generateSimulationFixtures({
			workflow: wf([{ name: 'A', type: 'n8n-nodes-base.slack' }]),
			plan: [simulateVerdict('A')],
			fallbackModelConfig,
		});
		expect(mockCreateEvalAgent).toHaveBeenCalledWith(
			'verification-simulation-fixtures',
			expect.objectContaining({ fallbackModelConfig }),
		);
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

	it('shapes the fallback item from the node schema when generation fails', async () => {
		setupAgentMock('not json');
		const workflow = wf([{ name: 'Send Slack', type: 'n8n-nodes-base.slack' }]);

		const result = await generateSimulationFixtures({
			workflow,
			plan: [simulateVerdict('Send Slack')],
			outputSchemaLookup: () => ({
				type: 'object',
				properties: { ok: { type: 'boolean' }, channel: { type: 'string' } },
			}),
		});

		expect(result).toEqual({ 'Send Slack': [{ ok: true, channel: 'sample' }] });
	});

	it('shapes the fallback item from the node schema when the LLM omits the node', async () => {
		setupAgentMock(JSON.stringify({ A: [{ json: { id: 1 } }] }));

		const result = await generateSimulationFixtures({
			workflow: wf([
				{ name: 'A', type: 'n8n-nodes-base.slack' },
				{ name: 'B', type: 'n8n-nodes-base.gmail' },
			]),
			plan: [simulateVerdict('A'), simulateVerdict('B')],
			outputSchemaLookup: (node) =>
				node.type === 'n8n-nodes-base.gmail'
					? { type: 'object', properties: { messageId: { type: 'string' } } }
					: undefined,
		});

		expect(result.A).toEqual([{ id: 1 }]);
		expect(result.B).toEqual([{ messageId: 'sample' }]);
	});

	it('replaces items the LLM returned with no fields at all', async () => {
		// A phantom `{}` reaches downstream nodes with nothing to read, which is
		// the failure this floor exists to stop.
		setupAgentMock(JSON.stringify({ A: [{ json: {} }] }));

		const result = await generateSimulationFixtures({
			workflow: wf([{ name: 'A', type: 'n8n-nodes-base.slack' }]),
			plan: [simulateVerdict('A')],
			outputSchemaLookup: () => ({ type: 'object', properties: { ts: { type: 'string' } } }),
		});

		expect(result.A).toEqual([{ ts: 'sample' }]);
	});

	it('keeps the real items when only some of them are empty', async () => {
		setupAgentMock(JSON.stringify({ A: [{ json: {} }, { json: { id: 2 } }] }));

		const result = await generateSimulationFixtures({
			workflow: wf([{ name: 'A', type: 'n8n-nodes-base.slack' }]),
			plan: [simulateVerdict('A')],
		});

		expect(result.A).toEqual([{ id: 2 }]);
	});

	it('never emits zero items for a simulated node', async () => {
		setupAgentMock(JSON.stringify({ A: [], B: [] }));

		const result = await generateSimulationFixtures({
			workflow: wf([
				{ name: 'A', type: 'n8n-nodes-base.slack' },
				{ name: 'B', type: 'n8n-nodes-base.gmail' },
			]),
			plan: [simulateVerdict('A'), simulateVerdict('B')],
		});

		expect(result.A).toHaveLength(1);
		expect(result.B).toHaveLength(1);
	});

	it('anchors placeholder timestamps to the current clock, not training data', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-01T10:30:00.000Z'));
		setupAgentMock('not json');

		const result = await generateSimulationFixtures({
			workflow: wf([{ name: 'A', type: 'n8n-nodes-base.slack' }]),
			plan: [simulateVerdict('A')],
			outputSchemaLookup: () => ({
				type: 'object',
				properties: { sentAt: { type: 'string', format: 'date-time' } },
			}),
		});

		expect(result.A).toEqual([{ sentAt: '2026-09-01T10:30:00.000Z' }]);
		vi.useRealTimers();
	});

	it('gives a simulated Wait the shape of its upstream node, not an empty item', async () => {
		// Wait passes its input through, so pinning `{}` would wipe the fields
		// every node below it reads.
		setupAgentMock('not json');
		const workflow = wf([
			{ name: 'Get Contact', type: 'n8n-nodes-base.brevo' },
			{ name: 'Wait 2 Days', type: 'n8n-nodes-base.wait' },
		]);
		workflow.connections = {
			'Get Contact': { main: [[{ node: 'Wait 2 Days', type: 'main', index: 0 }]] },
		} as unknown as WorkflowJSON['connections'];

		const result = await generateSimulationFixtures({
			workflow,
			plan: [simulateVerdict('Get Contact'), simulateVerdict('Wait 2 Days')],
			outputSchemaLookup: (node) =>
				node.type === 'n8n-nodes-base.brevo'
					? { type: 'object', properties: { email: { type: 'string' } } }
					: undefined,
		});

		expect(result['Get Contact']).toEqual([{ email: 'sample' }]);
		expect(result['Wait 2 Days']).toEqual([{ email: 'sample' }]);
	});

	it('borrows from an upstream node that is not simulated itself', async () => {
		setupAgentMock('not json');
		const workflow = wf([
			{ name: 'Read Rows', type: 'n8n-nodes-base.brevo' },
			{ name: 'Wait 2 Days', type: 'n8n-nodes-base.wait' },
		]);
		workflow.connections = {
			'Read Rows': { main: [[{ node: 'Wait 2 Days', type: 'main', index: 0 }]] },
		} as unknown as WorkflowJSON['connections'];

		const result = await generateSimulationFixtures({
			workflow,
			// Only the Wait is simulated; the read runs for real.
			plan: [executeVerdict('Read Rows'), simulateVerdict('Wait 2 Days')],
			outputSchemaLookup: () => ({ type: 'object', properties: { id: { type: 'integer' } } }),
		});

		expect(result['Read Rows']).toBeUndefined();
		expect(result['Wait 2 Days']).toEqual([{ id: 1 }]);
	});

	it('walks past an upstream node that has no shape either', async () => {
		setupAgentMock('not json');
		const workflow = wf([
			{ name: 'Get Contact', type: 'n8n-nodes-base.brevo' },
			{ name: 'Edit Fields', type: 'n8n-nodes-base.noOp' },
			{ name: 'Wait 2 Days', type: 'n8n-nodes-base.wait' },
		]);
		workflow.connections = {
			'Get Contact': { main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]] },
			'Edit Fields': { main: [[{ node: 'Wait 2 Days', type: 'main', index: 0 }]] },
		} as unknown as WorkflowJSON['connections'];

		const result = await generateSimulationFixtures({
			workflow,
			plan: [simulateVerdict('Wait 2 Days')],
			outputSchemaLookup: (node) =>
				node.type === 'n8n-nodes-base.brevo'
					? { type: 'object', properties: { email: { type: 'string' } } }
					: undefined,
		});

		expect(result['Wait 2 Days']).toEqual([{ email: 'sample' }]);
	});

	it('layers the upstream shape under a partial pass-through, keeping its own marker', async () => {
		// sentimentAnalysis emits the input item PLUS a sentimentAnalysis object,
		// so its own placeholder is not empty and must not replace the input.
		setupAgentMock('not json');
		const workflow = wf([
			{ name: 'Get Contact', type: 'n8n-nodes-base.brevo' },
			{ name: 'Score Mood', type: '@n8n/n8n-nodes-langchain.sentimentAnalysis' },
		]);
		workflow.connections = {
			'Get Contact': { main: [[{ node: 'Score Mood', type: 'main', index: 0 }]] },
		} as unknown as WorkflowJSON['connections'];

		const result = await generateSimulationFixtures({
			workflow,
			plan: [simulateVerdict('Get Contact'), simulateVerdict('Score Mood')],
			outputSchemaLookup: (node) =>
				node.type === 'n8n-nodes-base.brevo'
					? { type: 'object', properties: { email: { type: 'string' } } }
					: undefined,
		});

		expect(result['Score Mood']).toEqual([
			{ email: 'sample', sentimentAnalysis: { category: 'sample' } },
		]);
	});

	it('drops a field the model invented for a pure pass-through node', async () => {
		// A Wait emits its input and nothing else, so an extra field is wrong by
		// construction — downstream would read something the real run never sees.
		setupAgentMock(JSON.stringify({ 'Wait 2 Days': [{ json: { onlyField: 'invented' } }] }));
		const workflow = wf([
			{ name: 'Get Contact', type: 'n8n-nodes-base.brevo' },
			{ name: 'Wait 2 Days', type: 'n8n-nodes-base.wait' },
		]);
		workflow.connections = {
			'Get Contact': { main: [[{ node: 'Wait 2 Days', type: 'main', index: 0 }]] },
		} as unknown as WorkflowJSON['connections'];

		const result = await generateSimulationFixtures({
			workflow,
			plan: [simulateVerdict('Wait 2 Days')],
			outputSchemaLookup: () => ({ type: 'object', properties: { email: { type: 'string' } } }),
		});

		expect(result['Wait 2 Days']).toEqual([{ email: 'sample' }]);
	});

	it('does not borrow upstream data for a node that has its own output shape', async () => {
		// A Slack post emits an API response, not its input. Borrowing would
		// fabricate fields the real node never returns.
		setupAgentMock('not json');
		const workflow = wf([
			{ name: 'Get Contact', type: 'n8n-nodes-base.brevo' },
			{ name: 'Send Slack', type: 'n8n-nodes-base.slack' },
		]);
		workflow.connections = {
			'Get Contact': { main: [[{ node: 'Send Slack', type: 'main', index: 0 }]] },
		} as unknown as WorkflowJSON['connections'];

		const result = await generateSimulationFixtures({
			workflow,
			plan: [simulateVerdict('Get Contact'), simulateVerdict('Send Slack')],
			outputSchemaLookup: (node) =>
				node.type === 'n8n-nodes-base.brevo'
					? { type: 'object', properties: { email: { type: 'string' } } }
					: { type: 'object', properties: { ok: { type: 'boolean' } } },
		});

		expect(result['Send Slack']).toEqual([{ ok: true }]);
	});

	it('rebuilds a pass-through AI root from its input', async () => {
		// textClassifier routes items to a branch without reshaping them, so the
		// `category` the model invented is not a field the real node emits.
		setupAgentMock(JSON.stringify({ 'Route Ticket': [{ json: { category: 'billing' } }] }));
		const workflow = wf([
			{ name: 'Get Contact', type: 'n8n-nodes-base.brevo' },
			{ name: 'Route Ticket', type: '@n8n/n8n-nodes-langchain.textClassifier' },
		]);
		workflow.connections = {
			'Get Contact': { main: [[{ node: 'Route Ticket', type: 'main', index: 0 }]] },
		} as unknown as WorkflowJSON['connections'];

		const result = await generateSimulationFixtures({
			workflow,
			plan: [simulateVerdict('Get Contact'), simulateVerdict('Route Ticket')],
			outputSchemaLookup: (node) =>
				node.type === 'n8n-nodes-base.brevo'
					? { type: 'object', properties: { email: { type: 'string' } } }
					: undefined,
		});

		expect(result['Route Ticket']).toEqual([{ email: 'sample' }]);
	});

	it('gives pass-through AI roots the upstream context their prompt block needs', async () => {
		const generate = vi.fn().mockResolvedValue({ messages: [] });
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockExtractText.mockReturnValue(JSON.stringify({ 'Route Ticket': [{ json: {} }] }));

		const workflow = wf([
			{ name: 'Get Contact', type: 'n8n-nodes-base.brevo' },
			{ name: 'Route Ticket', type: '@n8n/n8n-nodes-langchain.textClassifier' },
		]);
		workflow.connections = {
			'Get Contact': { main: [[{ node: 'Route Ticket', type: 'main', index: 0 }]] },
		} as unknown as WorkflowJSON['connections'];

		await generateSimulationFixtures({
			workflow,
			plan: [simulateVerdict('Route Ticket')],
		});

		const promptText = (generate.mock.calls[0][0] as Array<{ content: Array<{ text: string }> }>)[0]
			.content[0].text;
		expect(promptText).toContain('Immediate upstream nodes (this node passes their data through)');
		expect(promptText).toContain('"Get Contact" (n8n-nodes-base.brevo)');
	});

	it('emits one pass-through item per upstream item', async () => {
		setupAgentMock(
			JSON.stringify({
				'Get Contact': [{ json: { email: 'a@example.com' } }, { json: { email: 'b@example.com' } }],
			}),
		);
		const workflow = wf([
			{ name: 'Get Contact', type: 'n8n-nodes-base.brevo' },
			{ name: 'Wait 2 Days', type: 'n8n-nodes-base.wait' },
		]);
		workflow.connections = {
			'Get Contact': { main: [[{ node: 'Wait 2 Days', type: 'main', index: 0 }]] },
		} as unknown as WorkflowJSON['connections'];

		const result = await generateSimulationFixtures({
			workflow,
			plan: [simulateVerdict('Get Contact'), simulateVerdict('Wait 2 Days')],
		});

		expect(result['Wait 2 Days']).toEqual([{ email: 'a@example.com' }, { email: 'b@example.com' }]);
	});

	it("prefers the upstream value over the model's inconsistent copy", async () => {
		// Observed in a real run: the model invented a second Slack response for
		// the Wait, with a different channel id and message text than the Slack
		// node one hop up. The node cannot emit anything but its input.
		setupAgentMock(JSON.stringify({ 'Wait 2 Days': [{ json: { email: 'real@example.com' } }] }));
		const workflow = wf([
			{ name: 'Get Contact', type: 'n8n-nodes-base.brevo' },
			{ name: 'Wait 2 Days', type: 'n8n-nodes-base.wait' },
		]);
		workflow.connections = {
			'Get Contact': { main: [[{ node: 'Wait 2 Days', type: 'main', index: 0 }]] },
		} as unknown as WorkflowJSON['connections'];

		const result = await generateSimulationFixtures({
			workflow,
			plan: [simulateVerdict('Wait 2 Days')],
			outputSchemaLookup: () => ({ type: 'object', properties: { email: { type: 'string' } } }),
		});

		expect(result['Wait 2 Days']).toEqual([{ email: 'sample' }]);
	});

	it("keeps the model's value for a key the node genuinely adds", async () => {
		setupAgentMock(
			JSON.stringify({
				'Score Mood': [{ json: { sentimentAnalysis: { category: 'positive' } } }],
			}),
		);
		const workflow = wf([
			{ name: 'Get Contact', type: 'n8n-nodes-base.brevo' },
			{ name: 'Score Mood', type: '@n8n/n8n-nodes-langchain.sentimentAnalysis' },
		]);
		workflow.connections = {
			'Get Contact': { main: [[{ node: 'Score Mood', type: 'main', index: 0 }]] },
		} as unknown as WorkflowJSON['connections'];

		const result = await generateSimulationFixtures({
			workflow,
			plan: [simulateVerdict('Score Mood')],
			outputSchemaLookup: () => ({ type: 'object', properties: { email: { type: 'string' } } }),
		});

		expect(result['Score Mood']).toEqual([
			{ email: 'sample', sentimentAnalysis: { category: 'positive' } },
		]);
	});

	it('leaves a Wait empty rather than looping when its upstream cycles back', async () => {
		setupAgentMock('not json');
		const workflow = wf([
			{ name: 'Wait 2 Days', type: 'n8n-nodes-base.wait' },
			{ name: 'Edit Fields', type: 'n8n-nodes-base.noOp' },
		]);
		workflow.connections = {
			'Wait 2 Days': { main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]] },
			'Edit Fields': { main: [[{ node: 'Wait 2 Days', type: 'main', index: 0 }]] },
		} as unknown as WorkflowJSON['connections'];

		const result = await generateSimulationFixtures({
			workflow,
			plan: [simulateVerdict('Wait 2 Days')],
		});

		expect(result['Wait 2 Days']).toEqual([{}]);
	});

	it('gives a fixture-less simulated node a placeholder without an LLM call', () => {
		const workflow = wf([
			{ name: 'Send Slack', type: 'n8n-nodes-base.slack' },
			{ name: 'Unknown', type: 'n8n-nodes-base.noOp' },
		]);

		const result = buildPlaceholderFixtures(
			workflow,
			['Send Slack', 'Unknown', 'Not In Workflow'],
			(node) =>
				node.type === 'n8n-nodes-base.slack'
					? { type: 'object', properties: { ok: { type: 'boolean' } } }
					: undefined,
			new Date('2026-09-01T10:30:00.000Z'),
		);

		expect(result).toEqual({
			'Send Slack': [{ ok: true }],
			Unknown: [{}],
			'Not In Workflow': [{}],
		});
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
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
