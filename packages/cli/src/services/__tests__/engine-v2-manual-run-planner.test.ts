import type {
	IConnections,
	IDataObject,
	INode,
	INodeExecutionData,
	INodeType,
	IPinData,
	IRunData,
	ITaskData,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { NodeConnectionTypes, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';
import { EngineV2ManualRunPlanner } from '@/services/engine-v2-manual-run-planner';

const node = (
	id: string,
	name: string,
	type = 'n8n-nodes-base.set',
	extra: Partial<INode> = {},
): INode => ({
	id,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...extra,
});

const TRIGGER = node('t-uuid', 'Trigger', 'n8n-nodes-base.manualTrigger');
const A = node('a-uuid', 'A');
const B = node('b-uuid', 'B');
const C = node('c-uuid', 'C');

/** Trigger -> A -> B -> C */
const chain = (...pairs: Array<[INode, INode]>): IConnections =>
	Object.fromEntries(
		pairs.map(([from, to]) => [
			from.name,
			{ main: [[{ node: to.name, type: NodeConnectionTypes.Main, index: 0 }]] },
		]),
	);

const CHAIN = chain([TRIGGER, A], [A, B], [B, C]);

function workflow(overrides: Partial<IWorkflowBase> = {}): IWorkflowBase {
	return {
		id: 'wf-1',
		name: 'Test',
		active: false,
		isArchived: false,
		nodes: [TRIGGER, A, B, C],
		connections: CHAIN,
		settings: { engineType: 'v2' },
		...overrides,
	} as IWorkflowBase;
}

const item = (json: IDataObject): INodeExecutionData => ({ json });

function taskData(items: INodeExecutionData[]): ITaskData {
	return {
		startTime: 0,
		executionTime: 0,
		executionIndex: 0,
		source: [],
		data: { main: [items] },
	};
}

/** Run data of a full run: one pass per node, each with one item naming the node. */
function fullRunData(...nodes: INode[]): IRunData {
	return Object.fromEntries(nodes.map((n) => [n.name, [taskData([item({ from: n.name })])]]));
}

function runData(
	overrides: Partial<IWorkflowExecutionDataProcess> = {},
): IWorkflowExecutionDataProcess {
	return {
		executionMode: 'manual',
		workflowData: workflow(),
		...overrides,
	};
}

const nodeNames = (plan: { workflow: IWorkflowBase }) => plan.workflow.nodes.map((n) => n.name);

describe('EngineV2ManualRunPlanner', () => {
	const nodeTypes = mock<NodeTypes>();
	let planner: EngineV2ManualRunPlanner;

	beforeEach(() => {
		// Trigger detection reads the node type group; parameters stay as given.
		nodeTypes.getByNameAndVersion.mockImplementation((type) =>
			mock<INodeType>({
				description: { group: type.endsWith('Trigger') ? ['trigger'] : [], properties: [] },
			}),
		);
		planner = new EngineV2ManualRunPlanner(nodeTypes);
	});

	describe('applies', () => {
		it('is false for a full manual run from the trigger', () => {
			expect(planner.applies(runData({ triggerToStartFrom: { name: TRIGGER.name } }))).toBe(false);
		});

		it('is false when only the trigger is pinned', () => {
			const pinData: IPinData = { [TRIGGER.name]: [item({ pinned: true })] };
			expect(
				planner.applies(runData({ triggerToStartFrom: { name: TRIGGER.name }, pinData })),
			).toBe(false);
		});

		it.each([
			{ name: 'run data', data: { runData: fullRunData(TRIGGER, A) } },
			{
				name: 'a destination',
				data: { destinationNode: { nodeName: B.name, mode: 'inclusive' as const } },
			},
			{
				name: 'a pinned non-trigger node',
				data: { pinData: { [A.name]: [item({ pinned: true })] } },
			},
		])('is true for a manual run with $name', ({ data }) => {
			expect(planner.applies(runData(data))).toBe(true);
		});

		it('is false outside manual mode', () => {
			expect(
				planner.applies(runData({ executionMode: 'trigger', pinData: { [A.name]: [item({})] } })),
			).toBe(false);
		});
	});

	describe('a run to a destination', () => {
		it('trims the workflow to the nodes between the trigger and the destination', () => {
			const plan = planner.plan(
				runData({
					destinationNode: { nodeName: B.name, mode: 'inclusive' },
					runData: fullRunData(TRIGGER, A, B, C),
				}),
			);

			expect(nodeNames(plan)).toEqual([TRIGGER.name, A.name, B.name]);
			expect(plan.workflow.connections).toEqual(chain([TRIGGER, A], [A, B]));
			expect(plan.triggerName).toBe(TRIGGER.name);
		});

		it('seeds the nodes before the destination from their run data and takes the trigger payload from it', () => {
			const plan = planner.plan(
				runData({
					destinationNode: { nodeName: B.name, mode: 'inclusive' },
					runData: fullRunData(TRIGGER, A, B, C),
				}),
			);

			expect(plan.triggerOutputs).toEqual([[item({ from: TRIGGER.name })]]);
			expect(plan.seeded).toEqual([{ nodeId: A.id, outputs: [[item({ from: A.name })]] }]);
		});

		it('seeds nothing after a dirty node', () => {
			const plan = planner.plan(
				runData({
					destinationNode: { nodeName: C.name, mode: 'inclusive' },
					runData: fullRunData(TRIGGER, A, B, C),
					dirtyNodeNames: [A.name],
				}),
			);

			expect(plan.seeded).toEqual([]);
		});

		it('lets pinned data win over run data', () => {
			const plan = planner.plan(
				runData({
					destinationNode: { nodeName: B.name, mode: 'inclusive' },
					runData: fullRunData(TRIGGER, A, B),
					pinData: { [A.name]: [item({ pinned: true })] },
				}),
			);

			expect(plan.seeded).toEqual([
				{ nodeId: A.id, outputs: [[{ json: { pinned: true }, pairedItem: { item: 0 } }]] },
			]);
		});

		it('drops the destination for an exclusive run and runs its parent', () => {
			// B has no run data, so it runs; C is what the caller does not want run.
			const plan = planner.plan(
				runData({
					destinationNode: { nodeName: C.name, mode: 'exclusive' },
					runData: fullRunData(TRIGGER, A),
				}),
			);

			expect(nodeNames(plan)).toEqual([TRIGGER.name, A.name, B.name]);
			expect(plan.seeded).toEqual([{ nodeId: A.id, outputs: [[item({ from: A.name })]] }]);
		});

		it('roots the run at the nearest node with run data when the trigger is disabled', () => {
			const plan = planner.plan(
				runData({
					workflowData: workflow({ nodes: [{ ...TRIGGER, disabled: true }, A, B, C] }),
					destinationNode: { nodeName: C.name, mode: 'inclusive' },
					runData: fullRunData(A, B, C),
				}),
			);

			expect(plan.triggerName).toBe(A.name);
			expect(plan.triggerOutputs).toEqual([[item({ from: A.name })]]);
			expect(nodeNames(plan)).toEqual([A.name, B.name, C.name]);
			expect(plan.seeded).toEqual([{ nodeId: B.id, outputs: [[item({ from: B.name })]] }]);
		});

		it('refuses a disabled destination', () => {
			expect(() =>
				planner.plan(
					runData({
						workflowData: workflow({ nodes: [TRIGGER, A, { ...B, disabled: true }, C] }),
						destinationNode: { nodeName: B.name, mode: 'inclusive' },
						runData: fullRunData(TRIGGER, A),
					}),
				),
			).toThrow(UserError);
		});
	});

	describe('a full run with pinned nodes', () => {
		it('keeps the whole workflow and seeds the pinned nodes', () => {
			const plan = planner.plan(
				runData({
					triggerToStartFrom: { name: TRIGGER.name },
					pinData: { [B.name]: [item({ pinned: true })] },
				}),
			);

			expect(nodeNames(plan)).toEqual([TRIGGER.name, A.name, B.name, C.name]);
			expect(plan.triggerOutputs).toEqual([[{ json: {} }]]);
			expect(plan.seeded).toEqual([
				{ nodeId: B.id, outputs: [[{ json: { pinned: true }, pairedItem: { item: 0 } }]] },
			]);
		});

		it('pairs each pinned item with the input item of the same index, keeping lineage it already has', () => {
			const plan = planner.plan(
				runData({
					triggerToStartFrom: { name: TRIGGER.name },
					pinData: {
						[B.name]: [item({ i: 0 }), { json: { i: 1 }, pairedItem: { item: 5 } }, item({ i: 2 })],
					},
				}),
			);

			expect(plan.seeded[0].outputs[0].map((i) => i.pairedItem)).toEqual([
				{ item: 0 },
				{ item: 5 },
				{ item: 2 },
			]);
		});

		it('prefers the fired trigger payload over pinned data on the trigger', () => {
			const plan = planner.plan(
				runData({
					triggerToStartFrom: { name: TRIGGER.name, data: taskData([item({ fired: true })]) },
					pinData: { [TRIGGER.name]: [item({ pinned: true })], [A.name]: [item({ a: 1 })] },
				}),
			);

			expect(plan.triggerOutputs).toEqual([[item({ fired: true })]]);
		});
	});

	describe('refusals', () => {
		it('refuses to seed a node that ran more than once', () => {
			const twice = {
				...fullRunData(TRIGGER, A, B),
				[A.name]: [taskData([item({})]), taskData([item({})])],
			};

			expect(() =>
				planner.plan(
					runData({ destinationNode: { nodeName: B.name, mode: 'inclusive' }, runData: twice }),
				),
			).toThrow(/"A" ran more than once/);
		});

		it('refuses to seed outputs that contain binary data', () => {
			const withBinary = {
				...fullRunData(TRIGGER, A, B),
				[A.name]: [
					taskData([{ json: {}, binary: { data: { data: '', mimeType: 'text/plain' } } }]),
				],
			};

			expect(() =>
				planner.plan(
					runData({
						destinationNode: { nodeName: B.name, mode: 'inclusive' },
						runData: withBinary,
					}),
				),
			).toThrow(/"A" .*binary/);
		});
	});
});
