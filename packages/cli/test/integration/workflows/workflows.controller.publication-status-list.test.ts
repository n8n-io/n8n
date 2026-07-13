import { createWorkflow, createWorkflowHistory, testDb } from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import { WorkflowPublicationTriggerStatusRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const testServer = utils.setupTestServer({ endpointGroups: ['workflows'] });

type ListItem = { id: string; publicationStatus?: string };

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowPublicationTriggerStatus',
		'WorkflowHistory',
		'SharedWorkflow',
		'WorkflowEntity',
		'User',
	]);
});

describe('GET /workflows publicationStatus enrichment', () => {
	let triggerStatusRepo: WorkflowPublicationTriggerStatusRepository;
	let ownerAgent: SuperAgentTest;
	let owner: Awaited<ReturnType<typeof createOwner>>;

	beforeEach(async () => {
		triggerStatusRepo = Container.get(WorkflowPublicationTriggerStatusRepository);
		owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);
	});

	/** Creates a workflow, seeds its FK version row, and writes the given trigger statuses. */
	async function createWorkflowWithTriggerStatuses(
		name: string,
		statuses: Array<{ status: 'activated' | 'failed'; errorMessage: string | null }>,
	): Promise<string> {
		const workflow = await createWorkflow({ name }, owner);
		if (statuses.length > 0) {
			const versionId = uuid();
			await createWorkflowHistory(workflow, owner, undefined, { versionId });
			await triggerStatusRepo.replaceForWorkflow(
				workflow.id,
				statuses.map((s, i) => ({
					nodeId: `node-${i}`,
					versionId,
					status: s.status,
					errorMessage: s.errorMessage,
				})),
			);
		}
		return workflow.id;
	}

	test('attaches per-workflow publicationStatus when the publication service flag is on', async () => {
		const workflowsConfig = Container.get(WorkflowsConfig);
		const original = workflowsConfig.useWorkflowPublicationService;
		workflowsConfig.useWorkflowPublicationService = true;

		try {
			const publishedId = await createWorkflowWithTriggerStatuses('Published', [
				{ status: 'activated', errorMessage: null },
				{ status: 'activated', errorMessage: null },
			]);
			const partialId = await createWorkflowWithTriggerStatuses('Partial', [
				{ status: 'activated', errorMessage: null },
				{ status: 'failed', errorMessage: 'Could not register trigger' },
			]);
			const failedId = await createWorkflowWithTriggerStatuses('Failed', [
				{ status: 'failed', errorMessage: 'boom' },
				{ status: 'failed', errorMessage: 'boom' },
			]);
			const noneId = await createWorkflowWithTriggerStatuses('None', []);

			const response = await ownerAgent.get('/workflows').expect(200);
			const items = response.body.data as ListItem[];
			const byId = new Map(items.map((item) => [item.id, item]));

			expect(byId.get(publishedId)?.publicationStatus).toBe('published');
			expect(byId.get(partialId)?.publicationStatus).toBe('partial');
			expect(byId.get(failedId)?.publicationStatus).toBe('failed');
			// A workflow with no trigger rows keeps the legacy indicator: no field at all.
			expect(byId.get(noneId)).not.toHaveProperty('publicationStatus');
		} finally {
			workflowsConfig.useWorkflowPublicationService = original;
		}
	});

	test('omits publicationStatus on every item when the publication service flag is off', async () => {
		const workflowsConfig = Container.get(WorkflowsConfig);
		const original = workflowsConfig.useWorkflowPublicationService;
		workflowsConfig.useWorkflowPublicationService = false;

		try {
			const publishedId = await createWorkflowWithTriggerStatuses('Published', [
				{ status: 'activated', errorMessage: null },
			]);
			const failedId = await createWorkflowWithTriggerStatuses('Failed', [
				{ status: 'failed', errorMessage: 'boom' },
			]);

			const response = await ownerAgent.get('/workflows').expect(200);
			const items = response.body.data as ListItem[];
			const byId = new Map(items.map((item) => [item.id, item]));

			expect(byId.get(publishedId)).not.toHaveProperty('publicationStatus');
			expect(byId.get(failedId)).not.toHaveProperty('publicationStatus');
		} finally {
			workflowsConfig.useWorkflowPublicationService = original;
		}
	});
});
