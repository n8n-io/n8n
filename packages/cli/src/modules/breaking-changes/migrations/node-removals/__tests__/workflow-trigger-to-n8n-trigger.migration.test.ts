import { createNode } from '../../../__tests__/test-helpers';
import { workflowTriggerToN8nTrigger } from '../workflow-trigger-to-n8n-trigger.migration';

const trigger = (parameters: Record<string, unknown>) =>
	createNode('Trigger', 'n8n-nodes-base.workflowTrigger', parameters);

describe('workflowTriggerToN8nTrigger migration', () => {
	it('is keyed by the Workflow Trigger rule id', () => {
		expect(workflowTriggerToN8nTrigger.ruleId).toBe('workflow-trigger-removed-v3');
	});

	it('keeps the update event with no note', () => {
		const result = workflowTriggerToN8nTrigger.migrate(trigger({ events: ['update'] }));

		expect(result.node).toEqual({
			type: 'n8n-nodes-base.n8nTrigger',
			typeVersion: 1,
			parameters: { events: ['update'] },
		});
		expect(result.notes).toBeUndefined();
	});

	it('keeps the activate event and reports the new event text', () => {
		const result = workflowTriggerToN8nTrigger.migrate(trigger({ events: ['activate', 'update'] }));

		expect(result.node.parameters).toEqual({ events: ['activate', 'update'] });
		expect(result.notes).toEqual([expect.stringContaining('Workflow published')]);
	});

	it('keeps an empty event list', () => {
		expect(workflowTriggerToN8nTrigger.migrate(trigger({})).node.parameters).toEqual({
			events: [],
		});
	});

	it.each([['={{ $json.events }}'], ['activate'], [['init']]])(
		'refuses events that it cannot check (%j)',
		(events) => {
			expect(() => workflowTriggerToN8nTrigger.migrate(trigger({ events }))).toThrow('Events');
		},
	);
});
