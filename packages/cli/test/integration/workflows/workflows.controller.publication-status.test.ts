import { createWorkflow, createWorkflowHistory, testDb } from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import { WorkflowPublicationTriggerStatusRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { nanoid } from 'nanoid';
import { v4 as uuid } from 'uuid';

import { createOwner, createMember } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const testServer = utils.setupTestServer({ endpointGroups: ['workflows'] });

// The endpoint is gated behind the publication service flag; enable it for the suite.
let originalUseWorkflowPublicationService: boolean;
beforeAll(() => {
	const workflowsConfig = Container.get(WorkflowsConfig);
	originalUseWorkflowPublicationService = workflowsConfig.useWorkflowPublicationService;
	workflowsConfig.useWorkflowPublicationService = true;
});
afterAll(() => {
	Container.get(WorkflowsConfig).useWorkflowPublicationService =
		originalUseWorkflowPublicationService;
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowPublicationTriggerStatus',
		'WorkflowHistory',
		'SharedWorkflow',
		'WorkflowEntity',
		'User',
	]);
});

describe('GET /workflows/:workflowId/publication-status', () => {
	let triggerStatusRepo: WorkflowPublicationTriggerStatusRepository;
	let ownerAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;
	let owner: Awaited<ReturnType<typeof createOwner>>;
	let member: Awaited<ReturnType<typeof createMember>>;

	beforeEach(async () => {
		triggerStatusRepo = Container.get(WorkflowPublicationTriggerStatusRepository);
		owner = await createOwner();
		member = await createMember();
		ownerAgent = testServer.authAgentFor(owner);
		memberAgent = testServer.authAgentFor(member);
	});

	test('returns partial status when workflow has mixed activated/failed trigger rows', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const versionId = uuid();
		// Seed the workflow_history version the trigger-status rows reference (FK).
		await createWorkflowHistory(workflow, owner, undefined, { versionId });

		await triggerStatusRepo.replaceForWorkflow(workflow.id, [
			{
				nodeId: 'node-1',
				versionId,
				status: 'activated',
				errorMessage: null,
			},
			{
				nodeId: 'node-2',
				versionId,
				status: 'failed',
				errorMessage: 'Could not register trigger',
			},
		]);

		const res = await ownerAgent.get(`/workflows/${workflow.id}/publication-status`).expect(200);

		expect(res.body.data).toMatchObject({
			status: 'partial',
			liveVersionId: versionId,
			pendingVersionId: null,
			triggers: expect.arrayContaining([
				expect.objectContaining({ nodeId: 'node-1', status: 'activated', errorMessage: null }),
				expect.objectContaining({
					nodeId: 'node-2',
					status: 'failed',
					errorMessage: 'Could not register trigger',
				}),
			]),
		});
		expect(res.body.data.triggers).toHaveLength(2);
	});

	test('returns not_published status when workflow has no trigger rows', async () => {
		const workflow = await createWorkflow(undefined, owner);

		const res = await ownerAgent.get(`/workflows/${workflow.id}/publication-status`).expect(200);

		expect(res.body.data).toMatchObject({
			status: 'not_published',
			liveVersionId: null,
			pendingVersionId: null,
			triggers: [],
		});
	});

	test('returns 403 when member cannot access the workflow', async () => {
		const workflow = await createWorkflow(undefined, owner);

		await memberAgent.get(`/workflows/${workflow.id}/publication-status`).expect(403);
	});

	test('returns 404 for a non-existent workflow id', async () => {
		const nonExistentId = nanoid();

		await ownerAgent.get(`/workflows/${nonExistentId}/publication-status`).expect(404);
	});

	test('returns 404 when the publication service is disabled', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const workflowsConfig = Container.get(WorkflowsConfig);
		workflowsConfig.useWorkflowPublicationService = false;
		try {
			await ownerAgent.get(`/workflows/${workflow.id}/publication-status`).expect(404);
		} finally {
			workflowsConfig.useWorkflowPublicationService = true;
		}
	});
});
