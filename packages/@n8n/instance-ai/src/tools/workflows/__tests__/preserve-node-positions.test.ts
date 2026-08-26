import type { NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import { preserveExistingNodePositions } from '../preserve-node-positions';

const node = (name: string, position: [number, number], type = 'n8n-nodes-base.set'): NodeJSON => ({
	id: name.toLowerCase().replaceAll(' ', '-'),
	name,
	type,
	typeVersion: 1,
	position,
	parameters: {},
});

const sticky = (
	name: string,
	position: [number, number],
	size?: { width: number; height: number },
): NodeJSON => ({
	...node(name, position, 'n8n-nodes-base.stickyNote'),
	parameters: size ? { ...size } : {},
});

const workflow = (nodes: NodeJSON[], connections: WorkflowJSON['connections'] = {}): WorkflowJSON =>
	({ name: 'Workflow', nodes, connections }) as WorkflowJSON;

/** `A → B` on the main output. */
const wire = (from: string, to: string) => ({
	[from]: { main: [[{ node: to, type: 'main', index: 0 }]] },
});

const contextReturning = (existing: WorkflowJSON) =>
	({
		workflowService: { getAsWorkflowJSON: vi.fn().mockResolvedValue(existing) },
	}) as unknown as InstanceAiContext;

const positionsByName = (json: WorkflowJSON): Record<string, [number, number]> =>
	Object.fromEntries(json.nodes.map((n) => [n.name ?? '', n.position]));

/**
 * Placement contract, one row per behaviour: run the build against the saved
 * canvas and assert where the listed nodes end up.
 */
const placementCases: Array<{
	name: string;
	saved: WorkflowJSON;
	built: WorkflowJSON;
	expected: Record<string, [number, number]>;
}> = [
	{
		name: 'places an added node one step right of its parent, on the parent row',
		saved: workflow([node('Schedule Trigger', [320, 480]), node('Settings', [528, 480])]),
		built: workflow(
			[node('Schedule Trigger', [0, 0]), node('Settings', [208, 0]), node('Read Sheet', [416, 0])],
			{ ...wire('Schedule Trigger', 'Settings'), ...wire('Settings', 'Read Sheet') },
		),
		expected: {
			'Schedule Trigger': [320, 480],
			Settings: [528, 480],
			'Read Sheet': [752, 480],
		},
	},
	{
		// C lands midway between B and D; nothing else moves.
		name: 'centres an inserted node in the gap between its parent and child',
		saved: workflow([node('A', [96, 96]), node('B', [320, 96]), node('D', [800, 96])]),
		built: workflow(
			[node('A', [0, 0]), node('B', [224, 0]), node('D', [448, 0]), node('C', [672, 0])],
			{ ...wire('B', 'C'), ...wire('C', 'D') },
		),
		expected: { A: [96, 96], B: [320, 96], C: [560, 96], D: [800, 96] },
	},
	{
		// Standard spacing leaves a node-plus-gutters gap, so C slots between A and B
		// and the survivors stay exactly where the user put them.
		name: 'splices between adjacent nodes without moving them when it fits the gutters',
		saved: workflow([node('A', [96, 96]), node('B', [320, 96]), node('E', [544, 96])]),
		built: workflow(
			[node('A', [0, 0]), node('C', [224, 0]), node('B', [448, 0]), node('E', [672, 0])],
			{ ...wire('A', 'C'), ...wire('C', 'B'), ...wire('B', 'E') },
		),
		expected: { A: [96, 96], C: [208, 96], B: [320, 96], E: [544, 96] },
	},
	{
		// No room between A and B: preservation ends at the insertion frontier.
		// C and the downstream B rejoin the fresh frame carried by A, so the flow
		// continues on A's row at standard spacing.
		name: 're-flows the downstream from the frontier when the spliced node cannot fit',
		saved: workflow([node('A', [96, 96]), node('B', [224, 96])]),
		built: workflow([node('A', [0, 0]), node('C', [224, 0]), node('B', [448, 0])], {
			...wire('A', 'C'),
			...wire('C', 'B'),
		}),
		expected: { A: [96, 96], C: [320, 96], B: [544, 96] },
	},
	{
		// The fan tidy-up produces: one branch above the IF row, one below.
		name: 'fans branch children symmetrically around the branching node',
		saved: workflow([node('IF', [96, 96])]),
		built: workflow(
			[node('IF', [0, 0]), node('True path', [224, 0]), node('False path', [224, 150])],
			{
				IF: {
					main: [
						[{ node: 'True path', type: 'main', index: 0 }],
						[{ node: 'False path', type: 'main', index: 0 }],
					],
				},
			},
		),
		expected: { IF: [96, 96], 'True path': [320, 0], 'False path': [320, 192] },
	},
	{
		name: 'centres a multi-parent node between its parents, one step right',
		saved: workflow([node('P1', [96, 96]), node('P2', [96, 304])]),
		built: workflow([node('P1', [0, 0]), node('P2', [0, 150]), node('Merge', [224, 75])], {
			...wire('P1', 'Merge'),
			...wire('P2', 'Merge'),
		}),
		expected: { Merge: [320, 200] },
	},
	{
		// Two flows the user parked far apart, each getting its own new node.
		name: 'anchors each added cluster to its own neighbourhood',
		saved: workflow([
			node('X', [96, 96]),
			node('Y', [320, 96]),
			node('P', [2000, 1000]),
			node('Q', [2224, 1000]),
		]),
		built: workflow(
			[
				node('X', [0, 0]),
				node('Y', [224, 0]),
				node('C1', [448, 0]),
				node('P', [0, 300]),
				node('Q', [224, 300]),
				node('C2', [448, 300]),
			],
			{ ...wire('X', 'Y'), ...wire('Y', 'C1'), ...wire('P', 'Q'), ...wire('Q', 'C2') },
		),
		expected: { C1: [544, 96], C2: [2448, 1000] },
	},
	{
		// The chain stays where its anchor puts it; the unrelated occupant makes
		// way, sliding right past the cluster.
		name: 'pushes an occupying node aside as a block, keeping the cluster at its anchor',
		saved: workflow([node('A', [96, 96]), node('Blocker', [320, 96])]),
		built: workflow(
			[node('A', [0, 0]), node('Blocker', [0, 300]), node('C1', [224, 0]), node('C2', [448, 0])],
			{ ...wire('A', 'C1'), ...wire('C1', 'C2') },
		),
		expected: { A: [96, 96], C1: [320, 96], C2: [544, 96], Blocker: [768, 96] },
	},
	{
		name: 'hangs an added ai_* node below the centre of its host card',
		saved: workflow([node('Agent', [320, 96])]),
		built: workflow([node('Agent', [0, 0]), node('Model', [0, 150])], {
			Model: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
		}),
		expected: { Model: [400, 320] },
	},
	{
		// Agent hosts an ai_* sub-node, so the canvas renders it as a 224px-wide
		// card; the inserted node must clear that width, not the default 96px.
		name: 'steps past a wide configurable parent instead of assuming standard width',
		saved: workflow([node('Agent', [96, 96]), node('Model', [96, 288])], {
			Model: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
		}),
		built: workflow(
			[node('Agent', [0, 0]), node('Model', [0, 150]), node('Send Email', [300, 0])],
			{
				Model: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
				...wire('Agent', 'Send Email'),
			},
		),
		expected: { 'Send Email': [448, 96] },
	},
	{
		name: 'places a new predecessor one step left of its child',
		saved: workflow([node('B', [320, 96])]),
		built: workflow([node('Trigger', [0, 0]), node('B', [224, 0])], wire('Trigger', 'B')),
		expected: { Trigger: [96, 96] },
	},
	{
		name: 'parks an added node below the saved graph when nothing wires it to a survivor',
		saved: workflow([node('Schedule Trigger', [320, 480]), node('Settings', [528, 480])]),
		built: workflow([
			node('Schedule Trigger', [320, 480]),
			node('Settings', [528, 480]),
			node('Orphan', [0, 0]),
		]),
		expected: { Orphan: [320, 672] },
	},
	{
		name: 'lets an added node land on a sticky note — stickies sit behind nodes',
		saved: workflow([
			node('A', [96, 96]),
			sticky('Sticky Note', [320, 32], { width: 240, height: 240 }),
		]),
		built: workflow(
			[node('A', [0, 0]), sticky('Sticky Note', [304, 0]), node('C', [224, 0])],
			wire('A', 'C'),
		),
		expected: { C: [320, 96] },
	},
];

describe('preserveExistingNodePositions', () => {
	it.each(placementCases)('$name', async ({ saved, built, expected }) => {
		await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

		expect(positionsByName(built)).toMatchObject(expected);
	});

	it('restores every saved position when the build re-laid out the whole canvas', async () => {
		// Two disconnected nodes parked to the right of the flow, which the layout
		// engine treats as their own components and collapses onto its origin column.
		const saved = workflow([
			node('Schedule Trigger', [320, 480]),
			node('Settings', [528, 480]),
			node('Notify owner', [4480, 800]),
			node('Notify team', [4480, 592]),
			sticky('Sticky Note', [1584, 160]),
		]);
		const built = workflow(
			[
				node('Schedule Trigger', [0, 0]),
				node('Settings', [208, 0]),
				node('Notify owner', [0, 300]),
				node('Notify team', [0, 450]),
				sticky('Sticky Note', [0, 600]),
			],
			wire('Schedule Trigger', 'Settings'),
		);

		await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

		expect(positionsByName(built)).toEqual(positionsByName(saved));
	});

	it('ignores a workflow whose nodes were all renamed, leaving the fresh layout', async () => {
		const saved = workflow([node('Old name', [4000, 900])]);
		const built = workflow([node('New name', [0, 0])]);

		await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

		expect(positionsByName(built)).toEqual({ 'New name': [0, 0] });
	});

	it('stretches a sticky over the opened gap when the splice pushes its nodes', async () => {
		const saved = workflow(
			[
				node('A', [96, 96]),
				node('B', [224, 96]),
				sticky('Sticky Note', [64, 32], { width: 320, height: 240 }),
			],
			wire('A', 'B'),
		);
		const built = workflow(
			[
				node('A', [0, 0]),
				node('C', [224, 0]),
				node('B', [448, 0]),
				sticky('Sticky Note', [0, 600], { width: 320, height: 240 }),
			],
			{ ...wire('A', 'C'), ...wire('C', 'B') },
		);

		await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

		// Node placement is pinned by the re-flow row above; here only the sticky
		// matters: it spans the old tail start, so it widens by the tail's shift
		// instead of moving, and keeps wrapping A, C and B.
		const stickyNode = built.nodes.find((n) => n.name === 'Sticky Note');
		expect(stickyNode?.position).toEqual([64, 32]);
		expect(stickyNode?.parameters?.width).toBe(640);
	});

	it('splices inside a sticky span without moving or resizing the sticky', async () => {
		const saved = workflow(
			[
				node('A', [96, 96]),
				node('B', [320, 96]),
				sticky('Sticky Note', [64, 32], { width: 480, height: 240 }),
			],
			wire('A', 'B'),
		);
		const built = workflow(
			[
				node('A', [0, 0]),
				node('C', [224, 0]),
				node('B', [448, 0]),
				sticky('Sticky Note', [0, 600], { width: 480, height: 240 }),
			],
			{ ...wire('A', 'C'), ...wire('C', 'B') },
		);

		await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

		// C fits between A and B, so the sticky still wraps all three untouched.
		const stickyNode = built.nodes.find((n) => n.name === 'Sticky Note');
		expect(stickyNode?.position).toEqual([64, 32]);
		expect(stickyNode?.parameters?.width).toBe(480);
	});

	it('keeps an added sticky glued to the added nodes it was laid out around', async () => {
		const saved = workflow([node('A', [96, 96])]);
		const built = workflow(
			[
				node('A', [0, 0]),
				node('C', [224, 0]),
				sticky('New Sticky', [192, -64], { width: 240, height: 240 }),
			],
			wire('A', 'C'),
		);

		await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

		// C moved from [224, 0] to [320, 96]; the sticky follows by the same offset.
		expect(positionsByName(built)['New Sticky']).toEqual([288, 32]);
	});

	it('sizes an added host from its resolved inputs and re-flows around the wider card', async () => {
		const saved = workflow([node('A', [96, 96]), node('B', [320, 96])]);
		const built = workflow(
			[node('A', [0, 0]), node('C', [224, 0], 'n8n-nodes-base.someVendor'), node('B', [448, 0])],
			{ ...wire('A', 'C'), ...wire('C', 'B') },
		);
		const ctx = {
			workflowService: { getAsWorkflowJSON: vi.fn().mockResolvedValue(saved) },
			nodeService: {
				// The adapter's NodeHelpers.getNodeInputs equivalent: C's type
				// declares a sub-input slot, so it renders as a 224px host.
				getResolvedNodeInputs: vi.fn(
					async (_json: WorkflowJSON, name: string) =>
						await Promise.resolve(
							name === 'C' ? ['main', { type: 'ai_tool', displayName: 'Tools' }] : ['main'],
						),
				),
			},
		} as unknown as InstanceAiContext;

		await preserveExistingNodePositions(built, 'wf-1', ctx);

		// C occupies a full host card right of A, and the re-flowed B clears its
		// rendered width plus spacing — not just a standard 96px card.
		expect(positionsByName(built)).toMatchObject({ A: [96, 96], C: [320, 96], B: [672, 96] });
	});

	it('skips new workflows without reading anything', async () => {
		const getAsWorkflowJSON = vi.fn();
		const context = { workflowService: { getAsWorkflowJSON } } as unknown as InstanceAiContext;
		const built = workflow([node('A', [0, 0])]);

		await preserveExistingNodePositions(built, undefined, context);

		expect(getAsWorkflowJSON).not.toHaveBeenCalled();
		expect(positionsByName(built)).toEqual({ A: [0, 0] });
	});

	it('fails the update when the saved workflow cannot be loaded', async () => {
		const context = {
			workflowService: {
				getAsWorkflowJSON: vi.fn().mockRejectedValue(new Error('Workflow not found')),
			},
		} as unknown as InstanceAiContext;

		await expect(
			preserveExistingNodePositions(workflow([node('A', [0, 0])]), 'wf-1', context),
		).rejects.toThrow(
			'Failed to load existing workflow wf-1 to preserve node positions: Workflow not found',
		);
	});
});
