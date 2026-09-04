// End-to-end execution of a group node, the boundary of a canvas group.
//
// A group is a node with one main input and one main output. Its interior is
// flat: every node that carries the group's id in `parentId`. The engine
// resolves the boundary once, when the `Workflow` builds its connection
// indices, so the group node itself is never a step in a run.
//
// Two rules cross the boundary:
// - fan-in: one group input broadcasts to every interior entry node.
// - collect: every interior exit node concatenates onto the group output.
//
// An empty group forwards its input unchanged.
//
// These tests run the real engine and assert on which nodes ran, in what order,
// and what reached the node after the group. See
// `.agents/specs/group-as-first-class-node.md`.

import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type {
	IConnections,
	IExecuteFunctions,
	INode,
	INodeTypeData,
	INodeTypeDescription,
	IRun,
} from 'n8n-workflow';
import { GROUP_NODE_TYPE, NodeConnectionTypes, Workflow } from 'n8n-workflow';

import * as Helpers from '@test/helpers';

import { DirectedGraph } from '../partial-execution-utils';
import { WorkflowExecute } from '../workflow-execute';

const TRIGGER = 'Trigger';

/** Records the order in which nodes ran, so a test can assert on it. */
let executed: string[] = [];

const passThrough: INodeTypeDescription = {
	displayName: 'Test Node',
	name: 'testNode',
	group: ['transform'],
	version: 1,
	description: '',
	defaults: { name: 'Test Node' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	properties: [],
};

const nodeTypeData: INodeTypeData = {
	testTrigger: {
		sourcePath: '',
		type: {
			description: { ...passThrough, name: 'trigger', inputs: [] },
			async execute(this: IExecuteFunctions) {
				executed.push(this.getNode().name);
				return [[{ json: { seed: true } }]];
			},
		},
	},
	// Stamps its own name onto every item, so the collect order is visible in
	// the data that reaches the node after the group.
	testStamp: {
		sourcePath: '',
		type: {
			description: { ...passThrough, name: 'stamp' },
			async execute(this: IExecuteFunctions) {
				const name = this.getNode().name;
				executed.push(name);
				return [this.getInputData().map((item) => ({ json: { ...item.json, [name]: true } }))];
			},
		},
	},
	// The group boundary. Registered so node-type lookups resolve, but the
	// rewrite removes it from the executed graph, so this must never run.
	[GROUP_NODE_TYPE]: {
		sourcePath: '',
		type: {
			description: { ...passThrough, name: 'group', group: ['organization'] },
			async execute(this: IExecuteFunctions) {
				executed.push(`RAN_GROUP:${this.getNode().name}`);
				return [this.getInputData()];
			},
		},
	},
};

function node(name: string, parentId?: string, type = 'testStamp'): INode {
	return {
		id: name.toLowerCase(),
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...(parentId === undefined ? {} : { parentId }),
	};
}

function group(id: string, name = id, parentId?: string): INode {
	return { ...node(name, parentId, GROUP_NODE_TYPE), id };
}

function connect(...edges: Array<[string, string]>): IConnections {
	const connections: IConnections = {};

	for (const [from, to] of edges) {
		const bySource = (connections[from] ??= {});
		const main = (bySource[NodeConnectionTypes.Main] ??= [[]]);
		(main[0] ??= []).push({ node: to, type: NodeConnectionTypes.Main, index: 0 });
	}

	return connections;
}

async function run(nodes: INode[], connections: IConnections): Promise<IRun> {
	const workflow = new Workflow({
		id: 'group-test',
		active: false,
		nodeTypes: Helpers.NodeTypes(nodeTypeData),
		settings: { executionOrder: 'v1' },
		nodes,
		connections,
	});
	const waitPromise = createDeferredPromise<IRun>();
	const workflowExecute = new WorkflowExecute(
		Helpers.WorkflowExecuteAdditionalData(waitPromise),
		'manual',
	);

	await workflowExecute.run({ workflow, startNode: workflow.getNode(TRIGGER)! });

	return await waitPromise.promise;
}

/**
 * The items the named node emitted on its first run. Every test node stamps its
 * own name onto each item, so this shows both what reached the node and which
 * interior nodes the item passed through.
 */
function itemsOutOf(result: IRun, nodeName: string) {
	return (
		result.data.resultData.runData[nodeName]?.[0]?.data?.[NodeConnectionTypes.Main]?.[0] ?? []
	).map((item) => item.json);
}

/** Every item the named node emitted, across all of its runs. */
function allItemsOutOf(result: IRun, nodeName: string) {
	return (result.data.resultData.runData[nodeName] ?? []).flatMap((taskData) =>
		(taskData.data?.[NodeConnectionTypes.Main]?.[0] ?? []).map((item) => item.json),
	);
}

beforeEach(() => {
	executed = [];
});

describe('group node execution', () => {
	it('forwards items through an empty group without running it', async () => {
		const nodes = [node(TRIGGER, undefined, 'testTrigger'), group('g'), node('After')];
		const result = await run(nodes, connect([TRIGGER, 'g'], ['g', 'After']));

		expect(result.data.resultData.error).toBeUndefined();
		// The group is a boundary, not a step.
		expect(executed).toEqual([TRIGGER, 'After']);
		// Nothing between the trigger and `After`: the item is unchanged apart
		// from `After`'s own stamp.
		expect(itemsOutOf(result, 'After')).toEqual([{ seed: true, After: true }]);
	});

	it('runs a single interior node between the group ports', async () => {
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g'),
			node('Mid', 'g'),
			node('After'),
		];
		const result = await run(nodes, connect([TRIGGER, 'g'], ['g', 'After']));

		expect(result.data.resultData.error).toBeUndefined();
		expect(executed).toEqual([TRIGGER, 'Mid', 'After']);
		expect(itemsOutOf(result, 'After')).toEqual([{ seed: true, Mid: true, After: true }]);
	});

	it('runs an interior chain in order', async () => {
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g'),
			node('Extract', 'g'),
			node('Transform', 'g'),
			node('Load', 'g'),
			node('After'),
		];
		const result = await run(
			nodes,
			connect([TRIGGER, 'g'], ['Extract', 'Transform'], ['Transform', 'Load'], ['g', 'After']),
		);

		expect(result.data.resultData.error).toBeUndefined();
		expect(executed).toEqual([TRIGGER, 'Extract', 'Transform', 'Load', 'After']);
		expect(itemsOutOf(result, 'After')).toEqual([
			{ seed: true, Extract: true, Transform: true, Load: true, After: true },
		]);
	});

	it('broadcasts the group input to every interior entry node', async () => {
		// Two unconnected interior nodes: both are an entry and an exit.
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g'),
			node('EntryA', 'g'),
			node('EntryB', 'g'),
		];
		const result = await run(nodes, connect([TRIGGER, 'g']));

		expect(result.data.resultData.error).toBeUndefined();
		expect(executed).toContain('EntryA');
		expect(executed).toContain('EntryB');
		// Each entry gets its own copy of the same input branch.
		expect(itemsOutOf(result, 'EntryA')).toEqual([{ seed: true, EntryA: true }]);
		expect(itemsOutOf(result, 'EntryB')).toEqual([{ seed: true, EntryB: true }]);
	});

	it('collects every interior exit onto the group output', async () => {
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g'),
			node('ExitA', 'g'),
			node('ExitB', 'g'),
			node('After'),
		];
		const result = await run(nodes, connect([TRIGGER, 'g'], ['g', 'After']));

		expect(result.data.resultData.error).toBeUndefined();
		// `After` runs once per collected exit branch, so both exits reach it.
		const collected = allItemsOutOf(result, 'After');

		expect(collected).toContainEqual({ seed: true, ExitA: true, After: true });
		expect(collected).toContainEqual({ seed: true, ExitB: true, After: true });
	});

	it('runs a multi-entry, multi-exit interior', async () => {
		// In -> Left and Right in parallel -> Out. One entry, one exit, a
		// diamond between them.
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g'),
			node('In', 'g'),
			node('Left', 'g'),
			node('Right', 'g'),
			node('After'),
		];
		const result = await run(
			nodes,
			connect([TRIGGER, 'g'], ['In', 'Left'], ['In', 'Right'], ['g', 'After']),
		);

		expect(result.data.resultData.error).toBeUndefined();
		expect(executed).toEqual(expect.arrayContaining([TRIGGER, 'In', 'Left', 'Right', 'After']));
		// Left and Right are the exits, so both collect onto the output.
		const collected = allItemsOutOf(result, 'After');

		expect(collected).toContainEqual({ seed: true, In: true, Left: true, After: true });
		expect(collected).toContainEqual({ seed: true, In: true, Right: true, After: true });
	});

	it('resolves through nested groups', async () => {
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g1'),
			group('g2', 'g2', 'g1'),
			node('Inner', 'g2'),
			node('After'),
		];
		const result = await run(nodes, connect([TRIGGER, 'g1'], ['g1', 'After']));

		expect(result.data.resultData.error).toBeUndefined();
		expect(executed).toEqual([TRIGGER, 'Inner', 'After']);
		expect(itemsOutOf(result, 'After')).toEqual([{ seed: true, Inner: true, After: true }]);
	});

	it('forwards through an empty group nested in a group', async () => {
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g1'),
			group('g2', 'g2', 'g1'),
			node('After'),
		];
		const result = await run(nodes, connect([TRIGGER, 'g1'], ['g1', 'After']));

		expect(result.data.resultData.error).toBeUndefined();
		expect(executed).toEqual([TRIGGER, 'After']);
		expect(itemsOutOf(result, 'After')).toEqual([{ seed: true, After: true }]);
	});

	it('runs a trigger that sits inside a group', async () => {
		// The trigger is an interior entry node with no incoming boundary edge.
		// The interior still runs, and its exit collects onto the group output.
		const nodes = [
			node(TRIGGER, 'g', 'testTrigger'),
			group('g'),
			node('Inside', 'g'),
			node('After'),
		];
		const result = await run(nodes, connect([TRIGGER, 'Inside'], ['g', 'After']));

		expect(result.data.resultData.error).toBeUndefined();
		expect(executed).toEqual([TRIGGER, 'Inside', 'After']);
		expect(itemsOutOf(result, 'After')).toEqual([{ seed: true, Inside: true, After: true }]);
	});

	it('never executes the group node itself', async () => {
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g'),
			node('Mid', 'g'),
			node('After'),
		];
		await run(nodes, connect([TRIGGER, 'g'], ['g', 'After']));

		expect(executed.some((name) => name.startsWith('RAN_GROUP'))).toBe(false);
	});

	it('leaves a workflow with no group untouched', async () => {
		const nodes = [node(TRIGGER, undefined, 'testTrigger'), node('A'), node('B')];
		const result = await run(nodes, connect([TRIGGER, 'A'], ['A', 'B']));

		expect(result.data.resultData.error).toBeUndefined();
		expect(executed).toEqual([TRIGGER, 'A', 'B']);
	});
});

describe('partial execution inherits the boundary', () => {
	// `DirectedGraph.fromWorkflow` reads `connectionsBySourceNode`, which is the
	// resolved graph, so partial runs need no group handling of their own. This
	// pins that inheritance: the group node must not reach the graph, and the
	// interior must be reachable from the trigger.
	it('builds a graph of runnable nodes only', () => {
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g'),
			node('Mid', 'g'),
			node('After'),
		];
		const workflow = new Workflow({
			id: 'partial',
			active: false,
			nodeTypes: Helpers.NodeTypes(nodeTypeData),
			settings: { executionOrder: 'v1' },
			nodes,
			connections: connect([TRIGGER, 'g'], ['g', 'After']),
		});

		const graph = DirectedGraph.fromWorkflow(workflow);
		const edges = graph
			.getConnections()
			.map((connection) => `${connection.from.name}->${connection.to.name}`)
			.sort();

		expect(edges).toEqual(['Mid->After', 'Trigger->Mid']);
		// The group node is still a node of the workflow, so the canvas can draw
		// it, but no connection touches it.
		expect(graph.hasNode('g')).toBe(true);
		expect(
			graph
				.getConnections()
				.some((connection) => connection.from.name === 'g' || connection.to.name === 'g'),
		).toBe(false);
	});
});
