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
});
