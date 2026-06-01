import { BlueprintAccumulator } from '../blueprint-accumulator';

describe('BlueprintAccumulator', () => {
	let accumulator: BlueprintAccumulator;

	beforeEach(() => {
		accumulator = new BlueprintAccumulator();
	});

	describe('addItem with kind=checkpoint', () => {
		it('produces a PlannedTaskInput with kind=checkpoint', () => {
			accumulator.addItem({
				kind: 'workflow',
				id: 'wf-1',
				name: 'Daily Email',
				purpose: 'Send a daily summary email',
				integrations: [],
				dependsOn: [],
			});

			const task = accumulator.addItem({
				kind: 'checkpoint',
				id: 'verify-1',
				title: "Verify 'Daily Email' workflow runs without errors",
				instructions:
					'Call verify-built-workflow with the workItemId from wf-1. Assert success===true.',
				dependsOn: ['wf-1'],
			});

			expect(task).toEqual({
				id: 'verify-1',
				title: "Verify 'Daily Email' workflow runs without errors",
				kind: 'checkpoint',
				spec: 'Call verify-built-workflow with the workItemId from wf-1. Assert success===true.',
				deps: ['wf-1'],
			});
		});

		it('includes the checkpoint in getTaskList and getTaskItemsForEvent', () => {
			accumulator.addItem({
				kind: 'workflow',
				id: 'wf-1',
				name: 'WF',
				purpose: 'p',
				integrations: [],
				dependsOn: [],
			});
			accumulator.addItem({
				kind: 'checkpoint',
				id: 'verify-1',
				title: 'Verify WF',
				instructions: 'Verify it',
				dependsOn: ['wf-1'],
			});

			const list = accumulator.getTaskList();
			const items = accumulator.getTaskItemsForEvent();

			expect(list.map((t) => t.kind)).toEqual(['build-workflow', 'checkpoint']);
			expect(items.map((t) => t.id)).toEqual(['wf-1', 'verify-1']);
		});

		it('removeItem drops the checkpoint and dangling dep references', () => {
			accumulator.addItem({
				kind: 'workflow',
				id: 'wf-1',
				name: 'WF',
				purpose: 'p',
				integrations: [],
				dependsOn: [],
			});
			accumulator.addItem({
				kind: 'checkpoint',
				id: 'verify-1',
				title: 'Verify WF',
				instructions: 'Verify it',
				dependsOn: ['wf-1'],
			});

			expect(accumulator.removeItem('verify-1')).toBe(true);
			expect(accumulator.getTaskList().map((t) => t.id)).toEqual(['wf-1']);
		});

		it('cascade-removes a checkpoint when its only build-workflow dep is removed', () => {
			accumulator.addItem({
				kind: 'workflow',
				id: 'wf-1',
				name: 'WF',
				purpose: 'p',
				integrations: [],
				dependsOn: [],
			});
			accumulator.addItem({
				kind: 'checkpoint',
				id: 'verify-1',
				title: 'Verify WF',
				instructions: 'Verify it',
				dependsOn: ['wf-1'],
			});

			accumulator.removeItem('wf-1');

			// Checkpoint must not survive as an orphan — createPlan would reject
			// it at submit-plan time because checkpoint deps must reference a
			// build-workflow task.
			const list = accumulator.getTaskList();
			expect(list.find((t) => t.id === 'verify-1')).toBeUndefined();
			expect(list.find((t) => t.id === 'wf-1')).toBeUndefined();
			expect(list).toHaveLength(0);
		});

		it('keeps a checkpoint that still depends on at least one remaining workflow', () => {
			accumulator.addItem({
				kind: 'workflow',
				id: 'wf-1',
				name: 'WF1',
				purpose: 'p',
				integrations: [],
				dependsOn: [],
			});
			accumulator.addItem({
				kind: 'workflow',
				id: 'wf-2',
				name: 'WF2',
				purpose: 'p',
				integrations: [],
				dependsOn: [],
			});
			accumulator.addItem({
				kind: 'checkpoint',
				id: 'verify-both',
				title: 'Verify both',
				instructions: 'Verify both',
				dependsOn: ['wf-1', 'wf-2'],
			});

			accumulator.removeItem('wf-1');

			const checkpoint = accumulator.getTaskList().find((t) => t.id === 'verify-both');
			expect(checkpoint).toBeDefined();
			expect(checkpoint?.deps).toEqual(['wf-2']);
		});
	});

	describe('loadFromTasks (revision flow)', () => {
		const originalTasks = [
			{
				id: 'wf-1',
				title: "Build 'A' workflow",
				kind: 'build-workflow',
				spec: 'Build A',
				deps: [],
			},
			{
				id: 'wf-2',
				title: "Build 'B' workflow",
				kind: 'build-workflow',
				spec: 'Build B',
				deps: [],
			},
			{
				id: 'verify-1',
				title: 'Verify A',
				kind: 'checkpoint',
				spec: 'Verify A',
				deps: ['wf-1'],
			},
		];

		it('seeds the accumulator with the persisted plan', () => {
			accumulator.loadFromTasks(originalTasks);

			expect(accumulator.isEmpty()).toBe(false);
			expect(accumulator.getTaskList().map((t) => t.id)).toEqual(['wf-1', 'wf-2', 'verify-1']);
		});

		it('preserves original items across an ask-for-edits revision (remove + add + resubmit)', () => {
			// Simulates the resume path: the parent handler rebuilt a fresh
			// accumulator, then rehydrated it from the persisted graph before
			// the planner revised the plan.
			accumulator.loadFromTasks(originalTasks);

			// Planner revises: drop one original, add a new one.
			expect(accumulator.removeItem('wf-2')).toBe(true);
			accumulator.addItem({
				kind: 'workflow',
				id: 'wf-3',
				name: 'C',
				purpose: 'Build C',
				integrations: [],
				dependsOn: [],
			});

			// The resubmitted plan keeps the surviving originals plus the new item,
			// rather than collapsing to only the newly-added one.
			expect(accumulator.getTaskList().map((t) => t.id)).toEqual(['wf-1', 'verify-1', 'wf-3']);
		});

		it('upserts by id so a revised original replaces in place', () => {
			accumulator.loadFromTasks(originalTasks);

			accumulator.addItem({
				kind: 'workflow',
				id: 'wf-1',
				name: 'A (revised)',
				purpose: 'Build A differently',
				integrations: [],
				dependsOn: [],
			});

			const list = accumulator.getTaskList();
			expect(list.map((t) => t.id)).toEqual(['wf-1', 'wf-2', 'verify-1']);
			expect(list.find((t) => t.id === 'wf-1')?.title).toBe("Build 'A (revised)' workflow");
		});
	});
});
