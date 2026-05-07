import { BlueprintAccumulator } from '../blueprint-accumulator';

describe('BlueprintAccumulator', () => {
	let accumulator: BlueprintAccumulator;

	beforeEach(() => {
		accumulator = new BlueprintAccumulator();
	});

	describe('typed task conversion', () => {
		it('converts data table items into manage-data-tables handoffs with schema details', () => {
			const task = accumulator.addItem({
				kind: 'data-table',
				id: 'table-1',
				name: 'Leads',
				purpose: 'Store qualified leads',
				columns: [
					{ name: 'email', type: 'string' },
					{ name: 'score', type: 'number' },
				],
				dependsOn: [],
			});

			expect(task).toEqual({
				id: 'table-1',
				title: "Create 'Leads' data table",
				kind: 'manage-data-tables',
				deps: [],
				handoff: {
					taskKey: 'table-1',
					kind: 'manage-data-tables',
					input: {
						goal: "Create a data table named 'Leads'. Purpose: Store qualified leads\nColumns: email (string), score (number)",
					},
				},
			});
		});

		it('converts workflow items into build-workflow handoffs with inferred table deps', () => {
			accumulator.updateMeta('Build a reporting flow', ['The Slack credential already exists']);
			accumulator.addItem({
				kind: 'data-table',
				id: 'table-1',
				name: 'Leads',
				purpose: 'Store qualified leads',
				columns: [{ name: 'email', type: 'string' }],
				dependsOn: [],
			});

			const task = accumulator.addItem({
				kind: 'workflow',
				id: 'workflow-1',
				name: 'Lead report',
				purpose: 'Read Leads and send a weekly report to Slack',
				triggerDescription: 'Every Friday',
				integrations: ['Slack'],
				existingWorkflowId: 'wf-existing',
				dependsOn: [],
			});

			expect(task.deps).toEqual(['table-1']);
			expect(task).toMatchObject({
				id: 'workflow-1',
				title: "Build 'Lead report' workflow",
				kind: 'build-workflow',
				handoff: {
					taskKey: 'workflow-1',
					kind: 'build-workflow',
					input: {
						workflowId: 'wf-existing',
						workItemId: 'wi_workflow-1',
						sandboxMode: true,
					},
				},
			});
			expect(task.kind === 'build-workflow' ? task.handoff.input.goal : '').toContain(
				"Table 'Leads': email (string)",
			);
			expect(task.kind === 'build-workflow' ? task.handoff.input.goal : '').toContain(
				'The Slack credential already exists',
			);
		});

		it('converts research and delegate items into handoffs consumed by planned dispatch', () => {
			const research = accumulator.addItem({
				kind: 'research',
				id: 'research-1',
				question: 'Which Slack scopes are required?',
				constraints: 'Focus on chat.postMessage',
				dependsOn: [],
			});
			const delegate = accumulator.addItem({
				kind: 'delegate',
				id: 'delegate-1',
				title: 'Inspect Slack node',
				description: 'Return the operation and credential fields.',
				requiredTools: ['nodes'],
				dependsOn: ['research-1'],
			});

			expect(research).toMatchObject({
				id: 'research-1',
				kind: 'research',
				handoff: {
					taskKey: 'research-1',
					kind: 'research',
					input: {
						goal: 'Which Slack scopes are required?',
						constraints: 'Focus on chat.postMessage',
					},
				},
			});
			expect(delegate).toMatchObject({
				id: 'delegate-1',
				kind: 'delegate',
				tools: ['nodes'],
			});
			if (delegate.kind !== 'delegate') throw new Error('Expected delegate task');
			expect(delegate.handoff.input).toMatchObject({
				role: 'Inspect Slack node',
				goal: 'Return the operation and credential fields.',
				toolNames: ['nodes'],
			});
		});
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
