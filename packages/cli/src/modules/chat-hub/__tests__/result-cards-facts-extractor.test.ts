import type { Logger } from '@n8n/backend-common';
import type { IRun, IWorkflowBase, INodeTypeDescription } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ResultCardFactsExtractor } from '@/modules/chat-hub/result-cards/facts-extractor';
import type { NodeTypes } from '@/node-types';

// A real-shaped mini description: `new Workflow()` runs `NodeHelpers.getNodeParameters` with these
// properties, which KEEPS the listed parameters and ADDS the defaults (resource/operation). An empty
// `properties: []` would wipe the parameters instead — so list every parameter the test relies on.
const gmailDescription = {
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			default: 'message',
			options: [{ name: 'Message', value: 'message' }],
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			default: 'send',
			options: [{ name: 'Send', value: 'send' }],
			displayOptions: { show: { resource: ['message'] } },
		},
		{ displayName: 'To', name: 'sendTo', type: 'string', default: '' },
		{ displayName: 'Subject', name: 'subject', type: 'string', default: '' },
		{ displayName: 'Message', name: 'message', type: 'string', default: '' },
	],
} as unknown as INodeTypeDescription;

function taskData(
	items: Array<Record<string, unknown>>,
	source?: Array<{ previousNode: string; previousNodeOutput?: number; previousNodeRun?: number }>,
) {
	return {
		startTime: 1,
		executionTime: 1,
		executionIndex: 0,
		source: source ?? [],
		data: { main: [items.map((json) => ({ json }))] },
	};
}

function runWith(runData: Record<string, unknown>, lastNodeExecuted: string): IRun {
	return {
		status: 'success',
		finished: true,
		data: { resultData: { lastNodeExecuted, runData } },
	} as unknown as IRun;
}

describe('ResultCardFactsExtractor', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const nodeTypes = mock<NodeTypes>();
	// Unknown types return `undefined`, so `new Workflow()` leaves their parameters untouched.
	nodeTypes.getByNameAndVersion.mockImplementation((type: string) =>
		type === 'n8n-nodes-base.gmail'
			? ({ description: gmailDescription } as never)
			: (undefined as never),
	);

	beforeEach(() => {
		logger.debug.mockClear();
	});

	const workflow = {
		id: 'wf',
		name: 'Inbox assistant',
		description: 'Replies to emails',
		nodes: [
			{
				id: '1',
				name: 'When chat message received',
				type: '@n8n/n8n-nodes-langchain.chatTrigger',
				typeVersion: 1.5,
				position: [0, 0],
				parameters: {},
			},
			{
				id: '2',
				name: 'Extract',
				type: '@n8n/n8n-nodes-langchain.informationExtractor',
				typeVersion: 1.2,
				position: [0, 0],
				parameters: {},
			},
			{
				id: '3',
				name: 'Gmail',
				type: 'n8n-nodes-base.gmail',
				typeVersion: 2.1,
				position: [0, 0],
				parameters: {
					sendTo: '={{ $json.output.to }}',
					subject: '={{ $json.output.subject }}',
					message: '={{ $json.output.body }}',
				},
			},
			{
				id: '4',
				name: 'Reply',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [0, 0],
				parameters: {},
			},
		],
		connections: {
			'When chat message received': { main: [[{ node: 'Extract', type: 'main', index: 0 }]] },
			Extract: { main: [[{ node: 'Gmail', type: 'main', index: 0 }]] },
			Gmail: { main: [[{ node: 'Reply', type: 'main', index: 0 }]] },
		},
		settings: {},
	} as unknown as IWorkflowBase;

	// Same workflow plus a non-registry Code node that tests use as the final node.
	const workflowWithSummary = {
		...workflow,
		nodes: [
			...workflow.nodes,
			{
				id: '5',
				name: 'Summary',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [0, 0],
				parameters: {},
			},
		],
	} as unknown as IWorkflowBase;

	const runData = {
		'When chat message received': [taskData([{ chatInput: 'reply to anna' }])],
		Extract: [
			taskData(
				[{ output: { to: 'anna@example.com', subject: 'Invoice', body: 'Approved.' } }],
				[{ previousNode: 'When chat message received' }],
			),
		],
		Gmail: [
			taskData(
				[{ id: '19a1', threadId: '19a1', labelIds: ['SENT'] }],
				[{ previousNode: 'Extract' }],
			),
		],
		Reply: [taskData([{ output: 'Sent.' }], [{ previousNode: 'Gmail' }])],
	};

	const run = runWith(runData, 'Reply');

	it('extracts registry side-effect nodes with resolved parameters and skips text-only final output', async () => {
		const extractor = new ResultCardFactsExtractor(logger, nodeTypes);
		const facts = await extractor.extract(workflow, run);

		expect(facts).toHaveLength(1);
		expect(facts[0]).toMatchObject({
			nodeName: 'Gmail',
			nodeType: 'n8n-nodes-base.gmail',
			resource: 'message',
			operation: 'send',
			runIndex: 0,
			itemCount: 1,
			isFinalOutput: false,
			params: { sendTo: 'anna@example.com', subject: 'Invoice', message: 'Approved.' },
			workflow: { name: 'Inbox assistant', description: 'Replies to emails' },
		});
		expect(facts[0].fields.map((f) => f.path)).toEqual(['id', 'threadId', 'labelIds']);
	});

	it('includes a structured final output as a generic candidate and skips declared cards', async () => {
		const extractor = new ResultCardFactsExtractor(logger, nodeTypes);
		const structured = runWith(
			{ Reply: [taskData([{ total: 12, bySource: { LinkedIn: 7 } }])] },
			'Reply',
		);
		const facts = await extractor.extract(workflow, structured);
		expect(facts).toHaveLength(1);
		expect(facts[0]).toMatchObject({ nodeName: 'Reply', isFinalOutput: true, params: {} });

		const declared = runWith(
			{
				Reply: [taskData([{ type: 'keyValue', title: 'x', pairs: [{ key: 'a', value: 'b' }] }])],
			},
			'Reply',
		);
		expect(await extractor.extract(workflow, declared)).toEqual([]);
	});

	it('only treats the last run of the final node as a generic candidate', async () => {
		const extractor = new ResultCardFactsExtractor(logger, nodeTypes);
		const twoRuns = runWith(
			{ Summary: [taskData([{ total: 1 }]), taskData([{ total: 2 }])] },
			'Summary',
		);
		const facts = await extractor.extract(workflowWithSummary, twoRuns);
		expect(facts).toHaveLength(1);
		expect(facts[0]).toMatchObject({
			nodeName: 'Summary',
			runIndex: 1,
			items: [{ total: 2 }],
			isFinalOutput: true,
		});
	});

	it('orders side effects before the generic final output regardless of runData order', async () => {
		const extractor = new ResultCardFactsExtractor(logger, nodeTypes);
		const mixed = runWith(
			{
				// Listed first on purpose: the sort, not the iteration order, must put it last.
				Summary: [
					taskData([{ total: 12, bySource: { LinkedIn: 7 } }], [{ previousNode: 'Gmail' }]),
				],
				...runData,
			},
			'Summary',
		);
		const facts = await extractor.extract(workflowWithSummary, mixed);
		expect(facts.map((f) => f.nodeName)).toEqual(['Gmail', 'Summary']);
	});

	it('falls back to the description default when a parameter is an unresolved expression', async () => {
		const extractor = new ResultCardFactsExtractor(logger, nodeTypes);
		const unresolved = {
			...workflow,
			nodes: workflow.nodes.map((node) =>
				node.name === 'Gmail'
					? { ...node, parameters: { ...node.parameters, operation: '={{ $json.output.op }}' } }
					: node,
			),
		} as unknown as IWorkflowBase;
		const facts = await extractor.extract(unresolved, run);
		expect(facts).toHaveLength(1);
		expect(facts[0]).toMatchObject({ nodeName: 'Gmail', resource: 'message', operation: 'send' });
	});

	describe('per-node failure isolation', () => {
		it('keeps the other facts when the final node emits items without a json object', async () => {
			const extractor = new ResultCardFactsExtractor(logger, nodeTypes);
			const nullJson = runWith(
				{ ...runData, Reply: [{ ...taskData([]), data: { main: [[{ json: null }]] } }] },
				'Reply',
			);
			const facts = await extractor.extract(workflow, nullJson);
			expect(facts.map((f) => f.nodeName)).toEqual(['Gmail']);
		});

		it('skips a malformed node run, logs it, and keeps the other facts', async () => {
			const extractor = new ResultCardFactsExtractor(logger, nodeTypes);
			const workflowWithBroken = {
				...workflow,
				nodes: [
					...workflow.nodes,
					{
						id: '9',
						name: 'Broken',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.3,
						position: [0, 0],
						parameters: {},
					},
				],
			} as unknown as IWorkflowBase;
			const facts = await extractor.extract(
				workflowWithBroken,
				runWith({ ...runData, Broken: [null] }, 'Reply'),
			);
			expect(facts.map((f) => f.nodeName)).toEqual(['Gmail']);
			expect(logger.debug).toHaveBeenCalledWith(
				expect.stringContaining('"Broken" run 0'),
				expect.anything(),
			);
		});
	});

	it('never throws into the chat flow', async () => {
		const extractor = new ResultCardFactsExtractor(logger, nodeTypes);
		const noNodes = { ...workflow, nodes: undefined } as unknown as IWorkflowBase;
		expect(await extractor.extract(noNodes, run)).toEqual([]);
		expect(logger.debug).toHaveBeenCalledWith('Result card facts extraction failed', {
			error: expect.any(TypeError),
		});

		expect(
			await extractor.extract(workflow, { status: 'success', data: {} } as unknown as IRun),
		).toEqual([]);
	});
});
