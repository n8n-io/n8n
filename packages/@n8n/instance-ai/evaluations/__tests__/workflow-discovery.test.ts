import type { Mock } from 'vitest';

import { N8nApiError, type N8nClient, type WorkflowResponse } from '../clients/n8n-client';
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

describe('buildAgentOutcome phantom-id handling', () => {
	/** Client whose getWorkflow resolves per id: a WorkflowResponse, or a thrown error. */
	function clientWith(byId: Record<string, WorkflowResponse | Error>): N8nClient {
		return {
			getWorkflow: vi.fn(async (id: string) => {
				const entry = byId[id];
				if (entry === undefined) throw new N8nApiError(`Workflow ${id} not found`, 404);
				if (entry instanceof Error) throw entry;
				return await Promise.resolve(entry);
			}),
			listExecutions: vi.fn().mockResolvedValue([]),
		} as unknown as N8nClient;
	}

	function outcomeWithIds(workflowIds: string[]): EventOutcome {
		return { ...emptyEventOutcome, workflowIds };
	}

	it('drops phantom ids (404) so a real workflow becomes workflowsCreated[0]', async () => {
		// An agent-invented id echoed by a failed build-workflow bind, then the real save.
		const client = clientWith({ 'real-id': workflow('real-id') });

		const outcome = await buildAgentOutcome(client, outcomeWithIds(['pokemon-digest', 'real-id']));

		expect(outcome.workflowsCreated.map((wf) => wf.id)).toEqual(['real-id']);
		expect(outcome.workflowJsons.map((wf) => wf.id)).toEqual(['real-id']);
	});

	it('drops inaccessible ids (403)', async () => {
		const client = clientWith({
			forbidden: new N8nApiError('Workflow forbidden not accessible', 403),
			'real-id': workflow('real-id'),
		});

		const outcome = await buildAgentOutcome(client, outcomeWithIds(['forbidden', 'real-id']));

		expect(outcome.workflowsCreated.map((wf) => wf.id)).toEqual(['real-id']);
	});

	it('keeps a stub for transport-level fetch failures, ordered after real workflows', async () => {
		const client = clientWith({
			flaky: new TypeError('fetch failed'),
			'real-id': workflow('real-id'),
		});

		const outcome = await buildAgentOutcome(client, outcomeWithIds(['flaky', 'real-id']));

		expect(outcome.workflowsCreated.map((wf) => wf.id)).toEqual(['real-id', 'flaky']);
		expect(outcome.workflowsCreated[1].name).toBe('(fetch failed)');
		expect(outcome.workflowJsons.map((wf) => wf.id)).toEqual(['real-id']);
	});

	it('returns no workflows when every candidate id is phantom', async () => {
		const outcome = await buildAgentOutcome(
			clientWith({}),
			outcomeWithIds(['made-up', 'also-fake']),
		);

		expect(outcome.workflowsCreated).toEqual([]);
	});

	it('logs dropped phantom ids when a logger is provided', async () => {
		const logger = { warn: vi.fn() };
		const client = clientWith({ 'real-id': workflow('real-id') });

		await buildAgentOutcome(
			client,
			outcomeWithIds(['phantom-slug', 'real-id']),
			undefined,
			undefined,
			{
				logger,
			},
		);

		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('phantom-slug'));
	});
});
