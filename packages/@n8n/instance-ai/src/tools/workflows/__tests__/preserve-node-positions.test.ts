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

const sticky = (name: string, position: [number, number]): NodeJSON =>
	node(name, position, 'n8n-nodes-base.stickyNote');

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

describe('preserveExistingNodePositions', () => {
	describe('surviving nodes', () => {
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

		it('leaves positions untouched when the build already matched the saved canvas', async () => {
			const saved = workflow([node('A', [320, 480]), node('B', [528, 480])]);
			const built = workflow([node('A', [320, 480]), node('B', [528, 480])]);

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			expect(positionsByName(built)).toEqual({ A: [320, 480], B: [528, 480] });
		});

		it('ignores a workflow whose nodes were all replaced, leaving the fresh layout', async () => {
			const saved = workflow([node('Old name', [4000, 900])]);
			const built = workflow([node('New name', [0, 0])]);

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			expect(positionsByName(built)).toEqual({ 'New name': [0, 0] });
		});

		it('follows a renamed node by its id', async () => {
			const saved = workflow([node('Old name', [4000, 900]), node('Other', [4208, 900])]);
			const built = workflow([
				{ ...node('New name', [0, 0]), id: 'old-name' },
				node('Other', [208, 0]),
			]);

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			expect(positionsByName(built)).toEqual({ 'New name': [4000, 900], Other: [4208, 900] });
		});

		it('does not hand a position claimed by id out again by name', async () => {
			// "A" was renamed to "B" (same id) and a new node took the name "A".
			const saved = workflow([node('A', [4000, 900])]);
			const built = workflow([
				{ ...node('B', [0, 0]), id: 'a' },
				{ ...node('A', [208, 0]), id: 'fresh' },
			]);

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			expect(positionsByName(built).B).toEqual([4000, 900]);
			expect(positionsByName(built).A).not.toEqual([4000, 900]);
		});
	});

	describe('added nodes', () => {
		it('translates a node added by a full re-layout into the saved frame', async () => {
			const saved = workflow([node('Schedule Trigger', [320, 480]), node('Settings', [528, 480])]);
			const built = workflow(
				[
					node('Schedule Trigger', [0, 0]),
					node('Settings', [208, 0]),
					node('Read Sheet', [416, 0]),
				],
				{ ...wire('Schedule Trigger', 'Settings'), ...wire('Settings', 'Read Sheet') },
			);

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			// Both survivors shifted by [320, 480], so the added node shifts with them.
			expect(positionsByName(built)).toEqual({
				'Schedule Trigger': [320, 480],
				Settings: [528, 480],
				'Read Sheet': [736, 480],
			});
		});

		it('anchors on a wired neighbour when the build kept the survivors in place', async () => {
			// The layout engine skips nodes that already carry a position, so the added
			// node is the only one it placed — in a frame unrelated to the saved canvas.
			const saved = workflow([node('Schedule Trigger', [320, 480]), node('Settings', [528, 480])]);
			const built = workflow(
				[
					node('Schedule Trigger', [320, 480]),
					node('Settings', [528, 480]),
					node('Read Sheet', [416, 0]),
				],
				{ ...wire('Schedule Trigger', 'Settings'), ...wire('Settings', 'Read Sheet') },
			);

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			// One full step to the right of its parent, not back at the layout origin.
			expect(positionsByName(built)['Read Sheet']).toEqual([752, 480]);
		});

		it('parks an added node below the saved graph when nothing wires it to a survivor', async () => {
			const saved = workflow([node('Schedule Trigger', [320, 480]), node('Settings', [528, 480])]);
			const built = workflow([
				node('Schedule Trigger', [320, 480]),
				node('Settings', [528, 480]),
				node('Orphan', [0, 0]),
			]);

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			expect(positionsByName(built).Orphan).toEqual([320, 672]);
		});

		it('pushes an added node clear of a survivor it would have landed on', async () => {
			// D was dragged well to the right, so the median translation drops the new
			// node right on top of it.
			const saved = workflow([node('A', [100, 100]), node('B', [300, 100]), node('D', [780, 100])]);
			const built = workflow(
				[node('A', [0, 0]), node('B', [224, 0]), node('D', [448, 0]), node('C', [672, 0])],
				{ ...wire('B', 'C'), ...wire('C', 'D') },
			);

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			expect(positionsByName(built).D).toEqual([780, 100]);
			// Translated to x=772, snapped to the 16px grid, then pushed below D.
			expect(positionsByName(built).C).toEqual([768, 288]);
		});

		it('does not push an added node off a sticky note', async () => {
			const saved = workflow([node('A', [96, 96]), sticky('Sticky Note', [400, 96])]);
			const built = workflow([
				node('A', [0, 0]),
				sticky('Sticky Note', [304, 0]),
				node('C', [304, 0]),
			]);

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			// C lands on the sticky and stays there — stickies sit behind nodes.
			expect(positionsByName(built).C).toEqual([400, 96]);
		});
	});

	describe('guards', () => {
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
});
