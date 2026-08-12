import type { IConnections, INode, INodeExecutionData, INodeType, INodeTypes } from 'n8n-workflow';
import {
	EXECUTE_WORKFLOW_NODE_TYPE,
	NodeConnectionTypes,
	RESPOND_TO_WEBHOOK_NODE_TYPE,
	Workflow,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	firedOutputIndex,
	hasReachableResponder,
	resolveAutoResponseMode,
} from './webhook-response-mode';

const TRIGGER = 'Trigger';

const node = (name: string, type = 'n8n-nodes-base.noOp', disabled = false): INode => ({
	id: name,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...(disabled ? { disabled } : {}),
});

/** `from -> [to, outputIndex]` main connections. */
const connect = (edges: Array<[string, string, number?]>): IConnections => {
	const connections: IConnections = {};
	for (const [from, to, outputIndex = 0] of edges) {
		connections[from] ??= { [NodeConnectionTypes.Main]: [] };
		const main = connections[from][NodeConnectionTypes.Main];
		while (main.length <= outputIndex) main.push([]);
		main[outputIndex]!.push({ node: to, type: NodeConnectionTypes.Main, index: 0 });
	}
	return connections;
};

const SELF_RESPONDING_TYPE = 'n8n-nodes-base.uiBuilder';

const nodeTypes = mock<INodeTypes>();
nodeTypes.getByNameAndVersion.mockImplementation(
	(type: string) =>
		({
			description: {
				properties: [],
				respondsToWebhook: type === SELF_RESPONDING_TYPE || undefined,
			},
		}) as unknown as INodeType,
);

const buildWorkflow = (nodes: INode[], edges: Array<[string, string, number?]>) =>
	new Workflow({
		id: 'wf',
		nodes,
		connections: connect(edges),
		active: true,
		nodeTypes,
	});

const respond = (name: string, disabled = false) =>
	node(name, RESPOND_TO_WEBHOOK_NODE_TYPE, disabled);

describe('firedOutputIndex', () => {
	test('finds the only non-empty slot', () => {
		const data: INodeExecutionData[][] = [[], [{ json: {} }], []];
		expect(firedOutputIndex(data)).toBe(1);
	});

	test('defaults to 0 when nothing was emitted', () => {
		expect(firedOutputIndex([[], []])).toBe(0);
		expect(firedOutputIndex(undefined)).toBe(0);
	});
});

describe('hasReachableResponder', () => {
	test('finds a responder directly on the output', () => {
		const workflow = buildWorkflow([node(TRIGGER), respond('Respond')], [[TRIGGER, 'Respond', 0]]);
		expect(hasReachableResponder(workflow, TRIGGER, 0)).toBe(true);
	});

	test('scopes to the fired output', () => {
		const workflow = buildWorkflow(
			[node(TRIGGER), respond('Respond'), node('Other')],
			[
				[TRIGGER, 'Respond', 0],
				[TRIGGER, 'Other', 1],
			],
		);

		expect(hasReachableResponder(workflow, TRIGGER, 0)).toBe(true);
		expect(hasReachableResponder(workflow, TRIGGER, 1)).toBe(false);
	});

	test('follows a chain', () => {
		const workflow = buildWorkflow(
			[node(TRIGGER), node('A'), node('B'), respond('Respond')],
			[
				[TRIGGER, 'A', 0],
				['A', 'B'],
				['B', 'Respond'],
			],
		);
		expect(hasReachableResponder(workflow, TRIGGER, 0)).toBe(true);
	});

	test('counts a responder behind a conditional as reachable', () => {
		const workflow = buildWorkflow(
			[node(TRIGGER), node('If', 'n8n-nodes-base.if'), respond('Respond'), node('Else')],
			[
				[TRIGGER, 'If', 0],
				['If', 'Respond', 0],
				['If', 'Else', 1],
			],
		);
		expect(hasReachableResponder(workflow, TRIGGER, 0)).toBe(true);
	});

	test('counts a responder on an error output', () => {
		const workflow = buildWorkflow(
			[node(TRIGGER), node('A'), respond('Respond')],
			[
				[TRIGGER, 'A', 0],
				['A', 'Respond', 1],
			],
		);
		expect(hasReachableResponder(workflow, TRIGGER, 0)).toBe(true);
	});

	test('terminates on a cycle', () => {
		const workflow = buildWorkflow(
			[node(TRIGGER), node('Loop'), node('Body')],
			[
				[TRIGGER, 'Loop', 0],
				['Loop', 'Body', 1],
				['Body', 'Loop'],
			],
		);
		expect(hasReachableResponder(workflow, TRIGGER, 0)).toBe(false);
	});

	test('finds a responder inside a cycle', () => {
		const workflow = buildWorkflow(
			[node(TRIGGER), node('Loop'), respond('Respond')],
			[
				[TRIGGER, 'Loop', 0],
				['Loop', 'Respond', 1],
				['Respond', 'Loop'],
			],
		);
		expect(hasReachableResponder(workflow, TRIGGER, 0)).toBe(true);
	});

	test('ignores a disabled responder', () => {
		const workflow = buildWorkflow(
			[node(TRIGGER), respond('Respond', true)],
			[[TRIGGER, 'Respond', 0]],
		);
		expect(hasReachableResponder(workflow, TRIGGER, 0)).toBe(false);
	});

	test('sees through a disabled intermediate node', () => {
		const workflow = buildWorkflow(
			[node(TRIGGER), node('Skipped', 'n8n-nodes-base.noOp', true), respond('Respond')],
			[
				[TRIGGER, 'Skipped', 0],
				['Skipped', 'Respond'],
			],
		);
		expect(hasReachableResponder(workflow, TRIGGER, 0)).toBe(true);
	});

	test('does not descend into a sub-workflow', () => {
		const workflow = buildWorkflow(
			[node(TRIGGER), node('Sub', EXECUTE_WORKFLOW_NODE_TYPE), respond('Respond')],
			[
				[TRIGGER, 'Sub', 0],
				['Sub', 'Respond'],
			],
		);
		expect(hasReachableResponder(workflow, TRIGGER, 0)).toBe(false);
	});

	test('counts a responder reachable only through a merge from another branch', () => {
		const workflow = buildWorkflow(
			[node(TRIGGER), node('A'), node('Merge'), respond('Respond')],
			[
				[TRIGGER, 'A', 0],
				['A', 'Merge'],
				['Merge', 'Respond'],
			],
		);
		expect(hasReachableResponder(workflow, TRIGGER, 0)).toBe(true);
	});

	test('counts a node type that responds itself', () => {
		const workflow = buildWorkflow(
			[node(TRIGGER), node('Page', SELF_RESPONDING_TYPE)],
			[[TRIGGER, 'Page', 0]],
		);
		expect(hasReachableResponder(workflow, TRIGGER, 0)).toBe(true);
	});

	test('returns false for an unknown trigger', () => {
		const workflow = buildWorkflow([node(TRIGGER)], []);
		expect(hasReachableResponder(workflow, 'Nope', 0)).toBe(false);
	});
});

describe('resolveAutoResponseMode', () => {
	const workflow = buildWorkflow(
		[node(TRIGGER), respond('Respond'), node('Plain')],
		[
			[TRIGGER, 'Respond', 0],
			[TRIGGER, 'Plain', 1],
		],
	);

	test('picks responseNode for a branch with a responder', () => {
		expect(resolveAutoResponseMode('auto', workflow, TRIGGER, [[{ json: {} }], []])).toBe(
			'responseNode',
		);
	});

	test('picks lastNode for a branch without one', () => {
		expect(resolveAutoResponseMode('auto', workflow, TRIGGER, [[], [{ json: {} }]])).toBe(
			'lastNode',
		);
	});

	test.each(['onReceived', 'lastNode', 'responseNode', 'streaming'] as const)(
		'leaves %s untouched',
		(mode) => {
			expect(resolveAutoResponseMode(mode, workflow, TRIGGER, [[], [{ json: {} }]])).toBe(mode);
		},
	);
});
