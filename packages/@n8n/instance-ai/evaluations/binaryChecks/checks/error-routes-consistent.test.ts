import { errorRoutesConsistent } from './error-routes-consistent';
import type { WorkflowResponse } from '../../clients/n8n-client';

function reminderWorkflow(overrides: {
	markSentMain?: Array<Array<{ node: string; type: string; index: number }>>;
	gmailMain?: Array<Array<{ node: string; type: string; index: number }>>;
	gmailOnError?: 'continueErrorOutput';
}): WorkflowResponse {
	return {
		id: 'wf-1',
		name: 'Reminder sender',
		active: false,
		nodes: [
			{ name: 'Daily', type: 'n8n-nodes-base.scheduleTrigger', parameters: {} },
			{
				name: 'Send Gmail',
				type: 'n8n-nodes-base.gmail',
				parameters: {},
				...(overrides.gmailOnError ? { onError: overrides.gmailOnError } : {}),
			},
			{ name: 'Mark Sent', type: 'n8n-nodes-base.dataTable', parameters: {} },
			{ name: 'Mark Failed', type: 'n8n-nodes-base.dataTable', parameters: {} },
		],
		connections: {
			Daily: { main: [[{ node: 'Send Gmail', type: 'main', index: 0 }]] },
			'Send Gmail': {
				main: overrides.gmailMain ?? [[{ node: 'Mark Sent', type: 'main', index: 0 }]],
			},
			...(overrides.markSentMain ? { 'Mark Sent': { main: overrides.markSentMain } } : {}),
		},
	};
}

describe('errorRoutesConsistent', () => {
	it('fails when a connection leaves an output port the node does not have (INS-425 shape)', async () => {
		const workflow = reminderWorkflow({
			markSentMain: [[], [{ node: 'Mark Failed', type: 'main', index: 0 }]],
		});

		const result = await errorRoutesConsistent.run(workflow, { prompt: 'Send reminders' });

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Mark Sent');
		expect(result.comment).toContain('output index 1');
	});

	it('fails when an error output is enabled but wired to nothing', async () => {
		const workflow = reminderWorkflow({ gmailOnError: 'continueErrorOutput' });

		const result = await errorRoutesConsistent.run(workflow, { prompt: 'Send reminders' });

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Send Gmail');
		expect(result.comment).toContain('wired to nothing');
	});

	it('passes when the error route originates from the node that declares it', async () => {
		const workflow = reminderWorkflow({
			gmailOnError: 'continueErrorOutput',
			gmailMain: [
				[{ node: 'Mark Sent', type: 'main', index: 0 }],
				[{ node: 'Mark Failed', type: 'main', index: 0 }],
			],
		});

		const result = await errorRoutesConsistent.run(workflow, { prompt: 'Send reminders' });

		expect(result).toEqual({ pass: true });
	});

	it('does not flag natural multi-output nodes like IF', async () => {
		const workflow: WorkflowResponse = {
			id: 'wf-2',
			name: 'Branching',
			active: false,
			nodes: [
				{ name: 'Start', type: 'n8n-nodes-base.manualTrigger', parameters: {} },
				{ name: 'IF', type: 'n8n-nodes-base.if', parameters: {} },
				{ name: 'A', type: 'n8n-nodes-base.set', parameters: {} },
				{ name: 'B', type: 'n8n-nodes-base.set', parameters: {} },
			],
			connections: {
				Start: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
				IF: {
					main: [[{ node: 'A', type: 'main', index: 0 }], [{ node: 'B', type: 'main', index: 0 }]],
				},
			},
		};

		const result = await errorRoutesConsistent.run(workflow, { prompt: 'Branch' });

		expect(result).toEqual({ pass: true });
	});

	it('reports N/A when there are no connections or error outputs to inspect', async () => {
		const workflow: WorkflowResponse = {
			id: 'wf-3',
			name: 'Empty',
			active: false,
			nodes: [{ name: 'Start', type: 'n8n-nodes-base.manualTrigger', parameters: {} }],
			connections: {},
		};

		const result = await errorRoutesConsistent.run(workflow, { prompt: 'Nothing' });

		expect(result).toEqual({ pass: true, applicable: false });
	});
});
