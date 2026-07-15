process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';

import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';

import { createMember, createOwner } from '@test-integration/db/users';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['workflow-reviews'],
	enabledFeatures: ['feat:workflowReviews'],
	modules: ['workflow-reviews'],
});

let owner: User;
let member: User;
let ownerProject: Project;
let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;

let requestRepository: WorkflowReviewRequestRepository;
let workflowRepository: WorkflowReviewRequestWorkflowRepository;
let authorRepository: WorkflowReviewRequestAuthorRepository;
let reviewerRepository: WorkflowReviewRequestReviewerRepository;
let policyService: WorkflowReviewPolicyService;

beforeAll(() => {
	requestRepository = Container.get(WorkflowReviewRequestRepository);
	workflowRepository = Container.get(WorkflowReviewRequestWorkflowRepository);
	authorRepository = Container.get(WorkflowReviewRequestAuthorRepository);
	reviewerRepository = Container.get(WorkflowReviewRequestReviewerRepository);
	policyService = Container.get(WorkflowReviewPolicyService);
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowReviewRequestAuthor',
		'WorkflowReviewRequestReviewer',
		'WorkflowReviewRequestWorkflow',
		'WorkflowReviewRequest',
		'SharedWorkflow',
		'WorkflowHistory',
		'WorkflowEntity',
		'ProjectRelation',
		'Project',
		'User',
	]);

	// The instance policy defaults to disabled; enable it so the feature is
	// available. Individual tests may disable it again to assert the gate.
	await policyService.set(true);

	owner = await createOwner();
	member = await createMember();
	ownerProject = await getPersonalProject(owner);
	ownerAgent = testServer.authAgentFor(owner);
	memberAgent = testServer.authAgentFor(member);
});

/** Create a workflow owned by `owner` with a pinned history version. */
async function createReviewableWorkflow(versionId = 'version-1') {
	const workflow = await createWorkflow({}, owner);
	await createWorkflowHistoryItem(workflow.id, { versionId });
	return { workflow, versionId };
}

describe('POST /workflow-review-requests', () => {
	test('creates a review request with parent, child and author rows', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		const response = await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'Please review my workflow',
				description: 'It is ready',
				workflows: [{ workflowId: workflow.id, workflowVersionId: versionId }],
			})
			.expect(201);

		expect(response.body.data.state).toBe('open');
		expect(response.body.data.decision).toBe('pending');

		const requests = await requestRepository.find();
		expect(requests).toHaveLength(1);
		expect(requests[0]).toMatchObject({
			state: 'open',
			decision: 'pending',
			title: 'Please review my workflow',
			description: 'It is ready',
			projectId: ownerProject.id,
			createdById: owner.id,
		});

		const childRows = await workflowRepository.find();
		expect(childRows).toHaveLength(1);
		expect(childRows[0]).toMatchObject({
			workflowReviewRequestId: requests[0].id,
			workflowId: workflow.id,
			workflowVersionId: versionId,
		});

		const authorRows = await authorRepository.find();
		expect(authorRows).toHaveLength(1);
		expect(authorRows[0]).toMatchObject({
			workflowReviewRequestId: requests[0].id,
			userId: owner.id,
		});

		expect(await reviewerRepository.find()).toHaveLength(0);
	});

	test('returns 400 when the workflows array is empty', async () => {
		await ownerAgent
			.post('/workflow-review-requests')
			.send({ title: 'x', workflows: [] })
			.expect(400);
	});

	test('returns 400 when more than one workflow is submitted', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [
					{ workflowId: workflow.id, workflowVersionId: versionId },
					{ workflowId: workflow.id, workflowVersionId: versionId },
				],
			})
			.expect(400);
	});

	test('returns 400 for a version belonging to a different workflow', async () => {
		const { workflow } = await createReviewableWorkflow('version-a');
		const other = await createWorkflow({}, owner);
		await createWorkflowHistoryItem(other.id, { versionId: 'version-b' });

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [{ workflowId: workflow.id, workflowVersionId: 'version-b' }],
			})
			.expect(400);
	});

	test('returns 400 for an unknown version', async () => {
		const { workflow } = await createReviewableWorkflow();

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [{ workflowId: workflow.id, workflowVersionId: 'does-not-exist' }],
			})
			.expect(400);
	});

	test('returns 400 for a whitespace-only title', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: '   ',
				workflows: [{ workflowId: workflow.id, workflowVersionId: versionId }],
			})
			.expect(400);
	});

	test('returns 400 for a title exceeding 512 characters', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'a'.repeat(513),
				workflows: [{ workflowId: workflow.id, workflowVersionId: versionId }],
			})
			.expect(400);
	});

	test('returns 400 for an archived workflow', async () => {
		const workflow = await createWorkflow({ isArchived: true }, owner);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-1' });

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [{ workflowId: workflow.id, workflowVersionId: 'version-1' }],
			})
			.expect(400);
	});

	test('returns 404 for an unknown workflow', async () => {
		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [{ workflowId: 'unknown-workflow', workflowVersionId: 'version-1' }],
			})
			.expect(404);
	});

	test('returns 404 when the member has no access to the workflow', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await memberAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [{ workflowId: workflow.id, workflowVersionId: versionId }],
			})
			.expect(404);
	});

	test('returns 404 for a project:viewer (lacks workflow:publish)', async () => {
		const project = await createTeamProject('team', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const workflow = await createWorkflow({}, project);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-1' });

		await memberAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [{ workflowId: workflow.id, workflowVersionId: 'version-1' }],
			})
			.expect(404);
	});

	test('allows a project:editor (has workflow:publish) to request a review', async () => {
		const project = await createTeamProject('team', owner);
		await linkUserToProject(member, project, 'project:editor');
		const workflow = await createWorkflow({}, project);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-1' });

		await memberAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [{ workflowId: workflow.id, workflowVersionId: 'version-1' }],
			})
			.expect(201);
	});

	test('returns 409 pointing at the existing open review (different version)', async () => {
		const { workflow } = await createReviewableWorkflow('version-1');
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });

		const existing = await requestRepository.createRequest({
			projectId: ownerProject.id,
			title: 'Existing',
			createdById: owner.id,
		});
		await workflowRepository.createWorkflowRow({
			workflowReviewRequestId: existing.id,
			workflowId: workflow.id,
			workflowVersionId: 'version-1',
		});

		const response = await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'New',
				workflows: [{ workflowId: workflow.id, workflowVersionId: 'version-2' }],
			})
			.expect(409);

		expect(response.body.meta.workflowReviewRequestId).toBe(existing.id);
		// No new rows written.
		expect(await requestRepository.find()).toHaveLength(1);
		expect(await workflowRepository.find()).toHaveLength(1);
	});

	test('returns 409 when the existing open review is already approved', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		const existing = await requestRepository.createRequest({
			projectId: ownerProject.id,
			state: 'open',
			decision: 'approved',
			title: 'Existing',
			createdById: owner.id,
		});
		await workflowRepository.createWorkflowRow({
			workflowReviewRequestId: existing.id,
			workflowId: workflow.id,
			workflowVersionId: versionId,
		});

		const response = await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'New',
				workflows: [{ workflowId: workflow.id, workflowVersionId: versionId }],
			})
			.expect(409);

		expect(response.body.meta.workflowReviewRequestId).toBe(existing.id);
	});

	test('creates a new review when only a closed review exists', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		const closed = await requestRepository.createRequest({
			projectId: ownerProject.id,
			state: 'closed',
			title: 'Closed',
			createdById: owner.id,
		});
		await workflowRepository.createWorkflowRow({
			workflowReviewRequestId: closed.id,
			workflowId: workflow.id,
			workflowVersionId: versionId,
		});

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'New',
				workflows: [{ workflowId: workflow.id, workflowVersionId: versionId }],
			})
			.expect(201);

		const openRequests = await requestRepository.find({ where: { state: 'open' } });
		expect(openRequests).toHaveLength(1);
	});

	test('serializes concurrent creates: exactly one 201 and one 409', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		const body = {
			title: 'Race',
			workflows: [{ workflowId: workflow.id, workflowVersionId: versionId }],
		};

		const [first, second] = await Promise.all([
			ownerAgent.post('/workflow-review-requests').send(body),
			ownerAgent.post('/workflow-review-requests').send(body),
		]);

		expect([first.status, second.status].sort()).toEqual([201, 409]);

		const openRequests = await requestRepository.find({ where: { state: 'open' } });
		expect(openRequests).toHaveLength(1);
		expect(await workflowRepository.find()).toHaveLength(1);
	});

	test('returns 403 when the instance policy is disabled by default', async () => {
		// Undo the beforeEach enable to mimic the shipped default (no policy row).
		await policyService.set(false);
		const { workflow, versionId } = await createReviewableWorkflow();

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [{ workflowId: workflow.id, workflowVersionId: versionId }],
			})
			.expect(403);

		expect(await requestRepository.find()).toHaveLength(0);
	});

	test('returns 403 after an admin disables the policy at runtime', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		// Enabled (from beforeEach) → allowed.
		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'First',
				workflows: [{ workflowId: workflow.id, workflowVersionId: versionId }],
			})
			.expect(201);

		// Disabled → rejected, even for an otherwise valid request.
		await policyService.set(false);
		const other = await createWorkflow({}, owner);
		await createWorkflowHistoryItem(other.id, { versionId: 'v-other' });

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'Second',
				workflows: [{ workflowId: other.id, workflowVersionId: 'v-other' }],
			})
			.expect(403);
	});

	test('returns 403 when the license lacks feat:workflowReviews', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		testServer.license.disable('feat:workflowReviews');

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [{ workflowId: workflow.id, workflowVersionId: versionId }],
			})
			.expect(403);

		testServer.license.enable('feat:workflowReviews');
	});
});
