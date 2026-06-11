import type { Mock } from 'vitest';

import type { N8nClient, WorkflowResponse } from '../clients/n8n-client';
import { buildAgentOutcome } from '../outcome/workflow-discovery';
import type { EventOutcome } from '../types';

const emptyEventOutcome: EventOutcome = {
	workflowIds: [],
	executionIds: [],
	dataTableIds: [],
	finalText: '',
	toolCalls: [],
	agentActivities: [],
};

function workflow(id: string): WorkflowResponse {
	return {
		id,
		name: `Workflow ${id}`,
		active: false,
		versionId: `version-${id}`,
		nodes: [],
		connections: {},
	};
}

function clientWithWorkflows(workflows: WorkflowResponse[]): {
	client: N8nClient;
	listWorkflows: Mock;
	getWorkflow: Mock;
} {
	const listWorkflows = vi.fn().mockResolvedValue(workflows);
	const getWorkflow = vi
		.fn()
		.mockImplementation(
			async (id: string) =>
				await Promise.resolve(workflows.find((wf) => wf.id === id) ?? workflow(id)),
		);

	return {
		client: {
			listWorkflows,
			getWorkflow,
			listExecutions: vi.fn().mockResolvedValue([]),
		} as unknown as N8nClient,
		listWorkflows,
		getWorkflow,
	};
}

describe('buildAgentOutcome', () => {
	it('does not claim diff-only workflows when list-diff fallback is disabled', async () => {
		const { client, getWorkflow } = clientWithWorkflows([workflow('other-run-workflow')]);

		const outcome = await buildAgentOutcome(client, emptyEventOutcome, new Set(), new Set(), {
			allowListDiffFallback: false,
		});

		expect(outcome.workflowsCreated).toEqual([]);
		expect(getWorkflow).not.toHaveBeenCalled();
	});

	it('can still use list-diff fallback when explicitly enabled', async () => {
		const { client } = clientWithWorkflows([workflow('fallback-workflow')]);
		const claimedWorkflowIds = new Set<string>();

		const outcome = await buildAgentOutcome(
			client,
			emptyEventOutcome,
			new Set(),
			claimedWorkflowIds,
			{ allowListDiffFallback: true },
		);

		expect(outcome.workflowsCreated).toEqual([
			{
				id: 'fallback-workflow',
				name: 'Workflow fallback-workflow',
				nodeCount: 0,
				active: false,
			},
		]);
		expect(claimedWorkflowIds.has('fallback-workflow')).toBe(true);
	});

	it('uses thread-scoped workflow ids without list-diffing visible workflows', async () => {
		const { client, listWorkflows } = clientWithWorkflows([
			workflow('thread-workflow'),
			workflow('other-workflow'),
		]);

		const outcome = await buildAgentOutcome(
			client,
			{ ...emptyEventOutcome, workflowIds: ['thread-workflow'] },
			new Set(),
			new Set(),
			{ allowListDiffFallback: true },
		);

		expect(outcome.workflowsCreated.map((wf) => wf.id)).toEqual(['thread-workflow']);
		expect(listWorkflows).not.toHaveBeenCalled();
	});
});
