import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { applyWorkflowJsonEdits } from '../workflow-json-edits';

const workflow: WorkflowJSON = {
	name: 'Candidate journey',
	nodes: [
		{
			id: 'wait',
			name: 'Reminder',
			type: 'n8n-nodes-base.wait',
			typeVersion: 1.1,
			position: [0, 0],
			parameters: { resume: 'timeInterval', amount: 24, unit: 'hours' },
			retryOnFail: true,
		},
		{
			id: 'send',
			name: 'Send email',
			type: 'n8n-nodes-base.gmail',
			typeVersion: 2.2,
			position: [200, 0],
			parameters: { resource: 'message', operation: 'send' },
			credentials: { gmailOAuth2: { id: 'mail', name: 'Test mail' } },
			onError: 'continueErrorOutput',
		},
	],
	connections: { Reminder: { main: [[{ node: 'Send email', type: 'main', index: 0 }]] } },
	nodeGroups: [{ id: 'reminder', name: 'Reminder delivery', nodeIds: ['wait', 'send'] }],
};

describe('targeted workflow edits', () => {
	it('repairs a draft by exact name and preserves its generated id and unrelated content', () => {
		const original = structuredClone(workflow);
		const result = applyWorkflowJsonEdits(
			workflow,
			JSON.stringify({ nodes: [{ name: 'Reminder', parameters: { amount: 12 } }] }),
			{ allowNameLookup: true },
		);
		expect(result.nodes[0]).toEqual({
			...original.nodes[0],
			parameters: { ...original.nodes[0].parameters, amount: 12 },
		});
		expect(result.nodes[1]).toEqual(original.nodes[1]);
		expect(result.connections).toEqual(original.connections);
		expect(result.nodeGroups).toEqual(original.nodeGroups);
		expect(workflow).toEqual(original);
	});

	it.each(['Missing', 'reminder'])('rejects an unknown or inexact draft name: %s', (name) => {
		expect(() =>
			applyWorkflowJsonEdits(
				workflow,
				JSON.stringify({ nodes: [{ name, parameters: { amount: 12 } }] }),
				{ allowNameLookup: true },
			),
		).toThrow('exactly one existing node');
	});

	it('rejects ambiguous draft names', () => {
		const duplicate = structuredClone(workflow);
		duplicate.nodes.push({ ...duplicate.nodes[0], id: 'other-wait' });
		expect(() =>
			applyWorkflowJsonEdits(
				duplicate,
				JSON.stringify({ nodes: [{ name: 'Reminder', parameters: { amount: 12 } }] }),
				{ allowNameLookup: true },
			),
		).toThrow('exactly one existing node');
	});

	it('rejects duplicate edits that address the same node by id and name', () => {
		expect(() =>
			applyWorkflowJsonEdits(
				workflow,
				JSON.stringify({
					nodes: [
						{ id: 'wait', parameters: { amount: 12 } },
						{ name: 'Reminder', parameters: { unit: 'minutes' } },
					],
				}),
				{ allowNameLookup: true },
			),
		).toThrow('unique, nonempty id');
	});

	it('requires saved node ids when draft name lookup is not enabled', () => {
		expect(() =>
			applyWorkflowJsonEdits(
				workflow,
				JSON.stringify({ nodes: [{ name: 'Reminder', parameters: { amount: 12 } }] }),
			),
		).toThrow('unique, nonempty id');
	});

	it('accepts a node-edit array without changing unrelated content', () => {
		const result = applyWorkflowJsonEdits(
			workflow,
			JSON.stringify([{ id: 'wait', alwaysOutputData: true }]),
		);
		expect(result.nodes[0].alwaysOutputData).toBe(true);
		expect(result.nodes[0].parameters).toEqual(workflow.nodes[0].parameters);
		expect(result.nodes[1]).toEqual(workflow.nodes[1]);
		expect(result.connections).toEqual(workflow.connections);
		expect(result.nodeGroups).toEqual(workflow.nodeGroups);
	});

	it('keeps unrelated nodes, credentials, connections, and groups unchanged', () => {
		const original = structuredClone(workflow);
		const result = applyWorkflowJsonEdits(
			workflow,
			JSON.stringify({ nodes: [{ id: 'wait', parameters: { amount: 12 } }] }),
		);
		expect(result.nodes[0].parameters).toEqual({
			resume: 'timeInterval',
			amount: 12,
			unit: 'hours',
		});
		expect(result.nodes[0].retryOnFail).toBe(true);
		expect(result.nodes[1]).toEqual(original.nodes[1]);
		expect(result.connections).toEqual(original.connections);
		expect(result.nodeGroups).toEqual(original.nodeGroups);
		expect(workflow).toEqual(original);
	});

	it('removes old mode fields only when parameter replacement is explicit', () => {
		const parameters = { resume: 'specificTime', dateTime: '={{ $json.start }}' };
		const result = applyWorkflowJsonEdits(
			workflow,
			JSON.stringify({ nodes: [{ id: 'wait', replaceParameters: true, parameters }] }),
		);
		expect(result.nodes[0].parameters).toEqual(parameters);
		expect(result.nodes[0].retryOnFail).toBe(true);
	});

	it('replaces only named connection sources', () => {
		const result = applyWorkflowJsonEdits(
			workflow,
			JSON.stringify({ connections: { 'Send email': { main: [[]] } } }),
		);
		expect(result.connections.Reminder).toEqual(workflow.connections.Reminder);
		expect(result.connections['Send email']).toEqual({ main: [[]] });
	});

	it('rejects renames that would leave existing references stale', () => {
		expect(() =>
			applyWorkflowJsonEdits(
				workflow,
				JSON.stringify({ nodes: [{ id: 'wait', name: 'Other name' }] }),
			),
		).toThrow('rename a node');
	});
});
