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
	withPassThroughFloor,
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

/** `wf` plus main-flow connections, given as source -> target node names. */
const connected = (
	nodes: Array<{ name: string; type: string }>,
	edges: Record<string, string>,
): WorkflowJSON => {
	const workflow = wf(nodes);
	workflow.connections = Object.fromEntries(
		Object.entries(edges).map(([source, target]) => [
			source,
			{ main: [[{ node: target, type: 'main', index: 0 }]] },
		]),
	) as unknown as WorkflowJSON['connections'];
	return workflow;
};

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

	it('gives pass-through AI roots the upstream context their prompt block needs', async () => {
		const generate = vi.fn().mockResolvedValue({ messages: [] });
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockExtractText.mockReturnValue(JSON.stringify({ 'Route Ticket': [{ json: {} }] }));

		await generateSimulationFixtures({
			workflow: connected(
				[
					{ name: 'Get Contact', type: 'n8n-nodes-base.brevo' },
					{ name: 'Route Ticket', type: '@n8n/n8n-nodes-langchain.textClassifier' },
				],
				{ 'Get Contact': 'Route Ticket' },
			),
			plan: [simulateVerdict('Route Ticket')],
		});

		const promptText = (generate.mock.calls[0][0] as Array<{ content: Array<{ text: string }> }>)[0]
			.content[0].text;
		expect(promptText).toContain('Immediate upstream nodes (this node passes their data through)');
		expect(promptText).toContain('"Get Contact" (n8n-nodes-base.brevo)');
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

describe('withPassThroughFloor', () => {
	const brevoSchema = { type: 'object', properties: { email: { type: 'string' } } };
	const lookupBrevoOnly = (node: { type: string }) =>
		node.type === 'n8n-nodes-base.brevo' ? brevoSchema : undefined;

	const chain = (waitType = 'n8n-nodes-base.wait') =>
		connected(
			[
				{ name: 'Get Contact', type: 'n8n-nodes-base.brevo' },
				{ name: 'Hold', type: waitType },
			],
			{ 'Get Contact': 'Hold' },
		);

	it("rebuilds a pure pass-through from its parent's real fixture", () => {
		// The regression this precedence exists for: a declared-output parent's
		// items are merged in above the generator, so the floor must prefer them
		// over the parent's schema placeholder.
		const result = withPassThroughFloor(
			{
				'Get Contact': [{ email: 'ada@example.com', id: 7 }],
				Hold: [{ invented: 'wrong' }],
			},
			chain(),
			{ outputSchemaLookup: lookupBrevoOnly },
		);

		expect(result.Hold).toEqual([{ email: 'ada@example.com', id: 7 }]);
	});

	it('leaves a declared fixture on a pass-through node exactly as the source wrote it', () => {
		// A declared fixture is explicit author intent — the scenario the run is
		// meant to exercise — so it outranks anything derived from upstream.
		const result = withPassThroughFloor(
			{
				'Get Contact': [{ email: 'ada@example.com' }],
				Hold: [{ approved: true, decidedBy: 'ops' }],
			},
			chain(),
			{ outputSchemaLookup: lookupBrevoOnly, declaredNodeNames: new Set(['Hold']) },
		);

		expect(result.Hold).toEqual([{ approved: true, decidedBy: 'ops' }]);
	});

	it.each([
		['webhook', 'a webhook call'],
		['form', 'a form submission'],
	])('does not rebuild a wait that resumes on %s', (resume) => {
		// Such a wait emits whatever resumed it — the request body, or the values
		// submitted to its own formFields — never its input. Both modes are
		// always simulated, so rebuilding would destroy their only real output.
		const workflow = chain();
		workflow.nodes[1].parameters = { resume };

		const result = withPassThroughFloor(
			{
				'Get Contact': [{ email: 'ada@example.com' }],
				Hold: [{ submittedAt: '2026-09-01T10:30:00.000Z', decision: 'approve' }],
			},
			workflow,
			{ outputSchemaLookup: lookupBrevoOnly },
		);

		expect(result.Hold).toEqual([{ submittedAt: '2026-09-01T10:30:00.000Z', decision: 'approve' }]);
	});

	it.each(['timeInterval', 'specificTime', undefined])(
		'still rebuilds a timer wait (resume=%s)',
		(resume) => {
			const workflow = chain();
			workflow.nodes[1].parameters = resume ? { resume } : {};

			const result = withPassThroughFloor(
				{ 'Get Contact': [{ email: 'ada@example.com' }], Hold: [{ invented: 'wrong' }] },
				workflow,
				{ outputSchemaLookup: lookupBrevoOnly },
			);

			expect(result.Hold).toEqual([{ email: 'ada@example.com' }]);
		},
	);

	it("falls back to the parent's schema placeholder when the node has nothing", () => {
		const result = withPassThroughFloor({ Hold: [{}] }, chain(), {
			outputSchemaLookup: lookupBrevoOnly,
		});

		expect(result.Hold).toEqual([{ email: 'sample' }]);
	});

	it("keeps the node's own items rather than downgrading to a placeholder", () => {
		// A placeholder is neither realistic nor consistent, so swapping a
		// model-written fixture for one would make the run worse.
		const result = withPassThroughFloor({ Hold: [{ email: 'ada@example.com' }] }, chain(), {
			outputSchemaLookup: lookupBrevoOnly,
		});

		expect(result.Hold).toEqual([{ email: 'ada@example.com' }]);
	});

	it('walks past an upstream node that has no shape of its own', () => {
		const workflow = connected(
			[
				{ name: 'Get Contact', type: 'n8n-nodes-base.brevo' },
				{ name: 'Edit Fields', type: 'n8n-nodes-base.noOp' },
				{ name: 'Hold', type: 'n8n-nodes-base.wait' },
			],
			{ 'Get Contact': 'Edit Fields', 'Edit Fields': 'Hold' },
		);

		const result = withPassThroughFloor({ Hold: [{}] }, workflow, {
			outputSchemaLookup: lookupBrevoOnly,
		});

		expect(result.Hold).toEqual([{ email: 'sample' }]);
	});

	it('rebuilds a pass-through AI root from its input', () => {
		// textClassifier routes items to a branch without reshaping them, so a
		// `category` field is not something the real node emits.
		const result = withPassThroughFloor(
			{
				'Get Contact': [{ email: 'ada@example.com' }],
				Hold: [{ category: 'billing' }],
			},
			chain('@n8n/n8n-nodes-langchain.textClassifier'),
			{ outputSchemaLookup: lookupBrevoOnly },
		);

		expect(result.Hold).toEqual([{ email: 'ada@example.com' }]);
	});

	it('keeps the marker object a partial pass-through adds on top', () => {
		const result = withPassThroughFloor(
			{
				'Get Contact': [{ email: 'ada@example.com' }],
				Hold: [{ sentimentAnalysis: { category: 'positive' }, channel: 'invented' }],
			},
			chain('@n8n/n8n-nodes-langchain.sentimentAnalysis'),
			{ outputSchemaLookup: lookupBrevoOnly },
		);

		expect(result.Hold).toEqual([
			{ email: 'ada@example.com', sentimentAnalysis: { category: 'positive' } },
		]);
	});

	it('synthesizes the marker object when the model left it out', () => {
		const result = withPassThroughFloor(
			{ 'Get Contact': [{ email: 'ada@example.com' }], Hold: [{}] },
			chain('@n8n/n8n-nodes-langchain.sentimentAnalysis'),
			{ outputSchemaLookup: lookupBrevoOnly },
		);

		expect(result.Hold).toEqual([
			{ email: 'ada@example.com', sentimentAnalysis: { category: 'sample' } },
		]);
	});

	it('emits one item per upstream item', () => {
		const result = withPassThroughFloor(
			{
				'Get Contact': [{ email: 'a@example.com' }, { email: 'b@example.com' }],
				Hold: [{}],
			},
			chain(),
			{ outputSchemaLookup: lookupBrevoOnly },
		);

		expect(result.Hold).toEqual([{ email: 'a@example.com' }, { email: 'b@example.com' }]);
	});

	it('leaves a pass-through node on a cycle alone instead of spinning', () => {
		const workflow = connected(
			[
				{ name: 'Hold', type: 'n8n-nodes-base.wait' },
				{ name: 'Edit Fields', type: 'n8n-nodes-base.noOp' },
			],
			{ Hold: 'Edit Fields', 'Edit Fields': 'Hold' },
		);

		const result = withPassThroughFloor({ Hold: [{}] }, workflow);

		expect(result.Hold).toEqual([{}]);
	});

	it('never touches a node that has its own output shape', () => {
		// A Slack post emits an API response, not its input.
		const result = withPassThroughFloor(
			{
				'Get Contact': [{ email: 'ada@example.com' }],
				'Send Slack': [{ ok: true }],
			},
			connected(
				[
					{ name: 'Get Contact', type: 'n8n-nodes-base.brevo' },
					{ name: 'Send Slack', type: 'n8n-nodes-base.slack' },
				],
				{ 'Get Contact': 'Send Slack' },
			),
			{ outputSchemaLookup: lookupBrevoOnly },
		);

		expect(result['Send Slack']).toEqual([{ ok: true }]);
	});
});
