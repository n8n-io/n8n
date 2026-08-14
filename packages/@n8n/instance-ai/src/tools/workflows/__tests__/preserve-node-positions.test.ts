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

		it('ignores a workflow whose nodes were all renamed, leaving the fresh layout', async () => {
			const saved = workflow([node('Old name', [4000, 900])]);
			const built = workflow([node('New name', [0, 0])]);

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			expect(positionsByName(built)).toEqual({ 'New name': [0, 0] });
		});
	});

	describe('added nodes', () => {
		it('places an added node one step right of its parent, on the parent row', async () => {
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

			expect(positionsByName(built)).toEqual({
				'Schedule Trigger': [320, 480],
				Settings: [528, 480],
				'Read Sheet': [752, 480],
			});
		});

		it('splices into the gap when there is room between parent and child', async () => {
			const saved = workflow([node('A', [96, 96]), node('B', [320, 96]), node('D', [800, 96])]);
			const built = workflow(
				[node('A', [0, 0]), node('B', [224, 0]), node('D', [448, 0]), node('C', [672, 0])],
				{ ...wire('B', 'C'), ...wire('C', 'D') },
			);

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			// C fits right of B without touching D, so nothing else moves.
			expect(positionsByName(built)).toEqual({
				A: [96, 96],
				B: [320, 96],
				C: [544, 96],
				D: [800, 96],
			});
		});

		it('slides the downstream block right when the insertion spot is occupied', async () => {
			const saved = workflow([node('A', [96, 96]), node('B', [320, 96]), node('E', [544, 96])]);
			const built = workflow(
				[node('A', [0, 0]), node('C', [224, 0]), node('B', [448, 0]), node('E', [672, 0])],
				{ ...wire('A', 'C'), ...wire('C', 'B'), ...wire('B', 'E') },
			);

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			// C takes B's old spot; B and E slide one step right, keeping their spacing.
			expect(positionsByName(built)).toEqual({
				A: [96, 96],
				C: [320, 96],
				B: [544, 96],
				E: [768, 96],
			});
		});

		it('fans branch children onto separate rows by output index', async () => {
			const saved = workflow([node('IF', [96, 96])]);
			const built = workflow(
				[node('IF', [0, 0]), node('True path', [224, 0]), node('False path', [224, 150])],
				{
					IF: {
						main: [
							[{ node: 'True path', type: 'main', index: 0 }],
							[{ node: 'False path', type: 'main', index: 0 }],
						],
					},
				},
			);

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			expect(positionsByName(built)).toEqual({
				IF: [96, 96],
				'True path': [320, 96],
				'False path': [320, 208],
			});
		});

		it('anchors a multi-parent node right of its rightmost parent at the median row', async () => {
			const saved = workflow([node('P1', [96, 96]), node('P2', [96, 304])]);
			const built = workflow([node('P1', [0, 0]), node('P2', [0, 150]), node('Merge', [224, 75])], {
				...wire('P1', 'Merge'),
				...wire('P2', 'Merge'),
			});

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			expect(positionsByName(built).Merge).toEqual([320, 208]);
		});

		it('anchors a chain of added nodes link by link', async () => {
			const saved = workflow([node('A', [96, 96])]);
			const built = workflow([node('A', [0, 0]), node('C1', [224, 0]), node('C2', [448, 0])], {
				...wire('A', 'C1'),
				...wire('C1', 'C2'),
			});

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			expect(positionsByName(built)).toEqual({
				A: [96, 96],
				C1: [320, 96],
				C2: [544, 96],
			});
		});

		it('hangs an added ai_* node below its host', async () => {
			const saved = workflow([node('Agent', [320, 96])]);
			const built = workflow([node('Agent', [0, 0]), node('Model', [0, 150])], {
				Model: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
			});

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			expect(positionsByName(built).Model).toEqual([320, 288]);
		});

		it('steps past a wide configurable parent instead of assuming standard width', async () => {
			// Agent hosts an ai_* sub-node, so the canvas renders it as a 224px-wide
			// card; the inserted node must clear that width, not the default 96px.
			const aiWire = {
				Model: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
			};
			const saved = workflow([node('Agent', [96, 96]), node('Model', [96, 288])], aiWire);
			const built = workflow(
				[node('Agent', [0, 0]), node('Model', [0, 150]), node('Send Email', [300, 0])],
				{ ...aiWire, ...wire('Agent', 'Send Email') },
			);

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			expect(positionsByName(built)['Send Email']).toEqual([448, 96]);
		});

		it('places a new predecessor one step left of its child', async () => {
			const saved = workflow([node('B', [320, 96])]);
			const built = workflow([node('Trigger', [0, 0]), node('B', [224, 0])], {
				...wire('Trigger', 'B'),
			});

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			expect(positionsByName(built).Trigger).toEqual([96, 96]);
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

		it('lets an added node land on a sticky note — stickies sit behind nodes', async () => {
			const saved = workflow([
				node('A', [96, 96]),
				sticky('Sticky Note', [320, 32], { width: 240, height: 240 }),
			]);
			const built = workflow(
				[node('A', [0, 0]), sticky('Sticky Note', [304, 0]), node('C', [224, 0])],
				wire('A', 'C'),
			);

			await preserveExistingNodePositions(built, 'wf-1', contextReturning(saved));

			expect(positionsByName(built).C).toEqual([320, 96]);
		});

		it('stretches a sticky spanning the insertion point instead of moving it', async () => {
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

			expect(positionsByName(built)).toMatchObject({
				A: [96, 96],
				C: [320, 96],
				B: [544, 96],
				'Sticky Note': [64, 32],
			});
			const stickyNode = built.nodes.find((n) => n.name === 'Sticky Note');
			expect(stickyNode?.parameters?.width).toBe(704);
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
