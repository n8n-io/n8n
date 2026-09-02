process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';

import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	WorkflowRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import { WorkflowService } from '@/workflows/workflow.service';
import { createOwner } from '@test-integration/db/users';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

mockInstance(ActiveWorkflowManager);

const testServer = utils.setupTestServer({
	endpointGroups: ['workflow-reviews', 'workflows'],
	enabledFeatures: ['feat:workflowReviews'],
	modules: ['workflow-reviews'],
});

let owner: User;
let ownerProject: Project;
let ownerAgent: SuperAgentTest;

let requestRepository: WorkflowReviewRequestRepository;
let linkRepository: WorkflowReviewRequestWorkflowRepository;
let authorRepository: WorkflowReviewRequestAuthorRepository;

beforeAll(async () => {
	await utils.initNodeTypes();
	requestRepository = Container.get(WorkflowReviewRequestRepository);
	linkRepository = Container.get(WorkflowReviewRequestWorkflowRepository);
	authorRepository = Container.get(WorkflowReviewRequestAuthorRepository);
});

beforeEach(async () => {
	process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';
	testServer.license.enable('feat:workflowReviews');

	await testDb.truncate([
		'WorkflowReviewRequestAuthor',
		'WorkflowReviewRequestReviewer',
		'WorkflowReviewRequestWorkflow',
		'WorkflowReviewRequest',
		'SharedWorkflow',
		'WorkflowPublishedVersion',
		'WorkflowPublicationOutbox',
		'WorkflowPublishHistory',
		'WorkflowEntity',
		'WorkflowHistory',
		'ProjectRelation',
		'Project',
		'User',
	]);

	await Container.get(WorkflowReviewPolicyService).set(true);

	owner = await createOwner();
	ownerProject = await getPersonalProject(owner);
	ownerAgent = testServer.authAgentFor(owner);
});

/** Create a workflow owned by `owner` with a pinned history version. */
async function createReviewableWorkflow() {
	const versionId = uuid();
	const workflow = await createWorkflow({ versionId }, owner);
	await createWorkflowHistoryItem(workflow.id, { versionId });
	return { workflow, versionId };
}

async function createOpenReview(
	workflowId: string,
	versionId: string,
	overrides: {
		state?: 'open' | 'closed';
		decision?: 'pending' | 'changes_requested' | 'approved';
	} = {},
) {
	const request = await requestRepository.createRequest(
		{
			projectId: ownerProject.id,
			title: 'Review before publishing',
			createdById: owner.id,
			state: overrides.state,
			decision: overrides.decision,
		},
		{},
	);
	await linkRepository.createWorkflowRow(
		{ workflowReviewRequestId: request.id, workflowId, workflowVersionId: versionId },
		{},
	);
	await authorRepository.addAuthor({ workflowReviewRequestId: request.id, userId: owner.id }, {});
	return request;
}

describe('auto-close on workflow archive', () => {
	test('archiving closes the open review, leaving the decision unchanged', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await createOpenReview(workflow.id, versionId, {
			decision: 'changes_requested',
		});

		await ownerAgent.post(`/workflows/${workflow.id}/archive`).expect(200);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(closed?.decision).toBe('changes_requested');
		expect(closed?.closedById).toBeNull();
		expect(closed?.approvedAt).toBeNull();
	});

	test('unarchiving does not reopen the review, and the workflow is no longer publish-blocked', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await createOpenReview(workflow.id, versionId);

		await ownerAgent.post(`/workflows/${workflow.id}/archive`).expect(200);
		await ownerAgent.post(`/workflows/${workflow.id}/unarchive`).expect(200);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(await requestRepository.findOpenRequestForWorkflow(workflow.id, {})).toBeNull();
	});

	test('an already-closed (approved) review is untouched by archiving', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await createOpenReview(workflow.id, versionId, {
			state: 'closed',
			decision: 'approved',
		});

		await ownerAgent.post(`/workflows/${workflow.id}/archive`).expect(200);

		const untouched = await requestRepository.findById(request.id, {});
		expect(untouched?.state).toBe('closed');
		expect(untouched?.decision).toBe('approved');
		expect(untouched?.updatedAt).toEqual(request.updatedAt);
	});
});

describe('auto-close on workflow transfer', () => {
	test('moving the workflow to another project closes the open review', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await createOpenReview(workflow.id, versionId);
		const destination = await createTeamProject('Destination', owner);

		await Container.get(EnterpriseWorkflowService).transferWorkflow(
			owner,
			workflow.id,
			destination.id,
		);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(closed?.decision).toBe('pending');
		expect(await requestRepository.findOpenRequestForWorkflow(workflow.id, {})).toBeNull();
	});
});

describe('auto-close on workflow hard delete', () => {
	test('force-deleting a non-archived workflow closes the review instead of orphaning it open', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await createOpenReview(workflow.id, versionId);

		await Container.get(WorkflowService).delete(owner, workflow.id, true);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		// The link row cascaded away with the workflow; the request itself remains, closed.
		expect(await linkRepository.findByRequestId(request.id, {})).toHaveLength(0);
	});

	// A review opened after the pre-delete hook ran loses its link row to the cascade and
	// can no longer be found by workflow id. The post-delete sweep is what catches it.
	test('a review orphaned by a delete that skipped the hooks is closed by the next delete', async () => {
		const orphaned = await createReviewableWorkflow();
		const request = await createOpenReview(orphaned.workflow.id, orphaned.versionId);

		// Delete the row straight from the repository, as a folder-hierarchy cascade does:
		// no hook fires, so the request is left open with its link row cascaded away.
		await Container.get(WorkflowRepository).delete(orphaned.workflow.id);
		expect((await requestRepository.findById(request.id, {}))?.state).toBe('open');
		expect(await linkRepository.findByRequestId(request.id, {})).toHaveLength(0);

		const unrelated = await createReviewableWorkflow();
		await Container.get(WorkflowService).delete(owner, unrelated.workflow.id, true);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(closed?.closedById).toBeNull();
	});

	test('leaves a review whose workflow still exists open', async () => {
		const live = await createReviewableWorkflow();
		const request = await createOpenReview(live.workflow.id, live.versionId);

		const other = await createReviewableWorkflow();
		await Container.get(WorkflowService).delete(owner, other.workflow.id, true);

		expect((await requestRepository.findById(request.id, {}))?.state).toBe('open');
	});
});

describe('auto-close with the instance policy disabled', () => {
	test('cleanup still runs when the policy toggle is off', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await createOpenReview(workflow.id, versionId);

		await Container.get(WorkflowReviewPolicyService).set(false);

		await ownerAgent.post(`/workflows/${workflow.id}/archive`).expect(200);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
	});
});
