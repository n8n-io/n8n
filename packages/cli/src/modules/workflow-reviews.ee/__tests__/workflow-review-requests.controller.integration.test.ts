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
import { createAdmin, createMember, createOwner, createUser } from '@test-integration/db/users';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';

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
	test('creates a review request with its workflow reference and author', async () => {
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
	});

	test('persists deduplicated reviewer rows together with the request', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const reviewer = await createAdmin();

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'With a reviewer',
				workflows: [{ workflowId: workflow.id, workflowVersionId: versionId }],
				reviewerUserIds: [reviewer.id, reviewer.id],
			})
			.expect(201);

		const reviewerRows = await reviewerRepository.find();
		expect(reviewerRows).toHaveLength(1);
		expect(reviewerRows[0]).toMatchObject({ userId: reviewer.id });
	});

	test('returns 400 when the requester assigns themselves as reviewer', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [{ workflowId: workflow.id, workflowVersionId: versionId }],
				reviewerUserIds: [owner.id],
			})
			.expect(400);

		expect(await requestRepository.find()).toHaveLength(0);
	});

	test('returns 400 for an ineligible reviewer and writes nothing', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		// A plain member has no publish rights on the owner's personal project
		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [{ workflowId: workflow.id, workflowVersionId: versionId }],
				reviewerUserIds: [member.id],
			})
			.expect(400);

		expect(await requestRepository.find()).toHaveLength(0);
		expect(await reviewerRepository.find()).toHaveLength(0);
	});

	test('returns 400 for more than 10 reviewer ids', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [{ workflowId: workflow.id, workflowVersionId: versionId }],
				reviewerUserIds: Array.from({ length: 11 }, (_, i) => `user-${i}`),
			})
			.expect(400);
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

	test('returns 400 for a title exceeding 128 characters', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'a'.repeat(129),
				workflows: [{ workflowId: workflow.id, workflowVersionId: versionId }],
			})
			.expect(400);
	});

	test('returns 400 for a description exceeding 512 characters', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				description: 'a'.repeat(513),
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
		testServer.license.disable('feat:workflowReviews');

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [{ workflowId: 'wf-1', workflowVersionId: 'version-1' }],
			})
			.expect(403);

		testServer.license.enable('feat:workflowReviews');
	});
});

describe('GET /workflow-review-requests/eligible-reviewers', () => {
	test('returns publish-capable project and instance users, excluding everyone else', async () => {
		const project = await createTeamProject('team', owner);
		// The requester holds workflow:publish through project:editor
		await linkUserToProject(member, project, 'project:editor');

		const projectAdmin = await createUser();
		await linkUserToProject(projectAdmin, project, 'project:admin');
		const projectEditor = await createUser();
		await linkUserToProject(projectEditor, project, 'project:editor');
		const globalAdmin = await createAdmin();

		const projectViewer = await createUser();
		await linkUserToProject(projectViewer, project, 'project:viewer');
		const disabledEditor = await createUser({ disabled: true });
		await linkUserToProject(disabledEditor, project, 'project:editor');
		const pendingEditor = await createUser({ password: null });
		await linkUserToProject(pendingEditor, project, 'project:editor');
		await createUser(); // unrelated member

		const workflow = await createWorkflow({}, project);

		const response = await memberAgent
			.get('/workflow-review-requests/eligible-reviewers')
			.query({ workflowId: workflow.id })
			.expect(200);

		expect(response.body.data.count).toBe(4);
		const ids = response.body.data.data.map((reviewer: { id: string }) => reviewer.id);
		expect(ids.sort()).toEqual(
			[owner.id, projectAdmin.id, projectEditor.id, globalAdmin.id].sort(),
		);
	});

	test('returns a user holding both a project and a global qualifying role only once', async () => {
		const project = await createTeamProject('team', owner);
		await linkUserToProject(member, project, 'project:editor');
		const globalAdmin = await createAdmin();
		await linkUserToProject(globalAdmin, project, 'project:admin');
		const workflow = await createWorkflow({}, project);

		const response = await memberAgent
			.get('/workflow-review-requests/eligible-reviewers')
			.query({ workflowId: workflow.id })
			.expect(200);

		const ids = response.body.data.data.filter(
			(reviewer: { id: string }) => reviewer.id === globalAdmin.id,
		);
		expect(ids).toHaveLength(1);
	});

	test('exposes only id, email, and names for each reviewer', async () => {
		const globalAdmin = await createAdmin();
		const { workflow } = await createReviewableWorkflow();

		const response = await ownerAgent
			.get('/workflow-review-requests/eligible-reviewers')
			.query({ workflowId: workflow.id })
			.expect(200);

		expect(response.body.data.data).toEqual([
			{
				id: globalAdmin.id,
				email: globalAdmin.email,
				firstName: globalAdmin.firstName,
				lastName: globalAdmin.lastName,
			},
		]);
	});

	test('returns only instance-level reviewers for a personal-project workflow', async () => {
		const globalAdmin = await createAdmin();
		const { workflow } = await createReviewableWorkflow();

		const response = await ownerAgent
			.get('/workflow-review-requests/eligible-reviewers')
			.query({ workflowId: workflow.id })
			.expect(200);

		// The requesting owner is excluded; the plain member holds no publish rights
		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data[0].id).toBe(globalAdmin.id);
	});

	test('returns 400 without a workflowId', async () => {
		await ownerAgent.get('/workflow-review-requests/eligible-reviewers').expect(400);
	});

	test('returns 404 when the member has no access to the workflow', async () => {
		const { workflow } = await createReviewableWorkflow();

		await memberAgent
			.get('/workflow-review-requests/eligible-reviewers')
			.query({ workflowId: workflow.id })
			.expect(404);
	});

	test('returns 404 for a project:viewer (lacks workflow:publish)', async () => {
		const project = await createTeamProject('team', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const workflow = await createWorkflow({}, project);

		await memberAgent
			.get('/workflow-review-requests/eligible-reviewers')
			.query({ workflowId: workflow.id })
			.expect(404);
	});

	test('returns 403 when the instance policy is disabled', async () => {
		const { workflow } = await createReviewableWorkflow();
		await policyService.set(false);

		await ownerAgent
			.get('/workflow-review-requests/eligible-reviewers')
			.query({ workflowId: workflow.id })
			.expect(403);
	});

	test('returns 403 when the license lacks feat:workflowReviews', async () => {
		testServer.license.disable('feat:workflowReviews');

		await ownerAgent
			.get('/workflow-review-requests/eligible-reviewers')
			.query({ workflowId: 'wf-1' })
			.expect(403);

		testServer.license.enable('feat:workflowReviews');
	});
});

describe('GET /workflow-review-requests', () => {
	/** Link an existing review request to a workflow. */
	async function linkRequestToWorkflow(requestId: string, workflowId: string, versionId: string) {
		await workflowRepository.createWorkflowRow({
			workflowReviewRequestId: requestId,
			workflowId,
			workflowVersionId: versionId,
		});
	}

	test('returns 400 without a workflowId', async () => {
		await ownerAgent.get('/workflow-review-requests').expect(400);
	});

	test('returns an empty list when no request exists', async () => {
		const { workflow } = await createReviewableWorkflow();

		const response = await ownerAgent
			.get('/workflow-review-requests')
			.query({ workflowId: workflow.id, state: 'open', take: 1 })
			.expect(200);

		expect(response.body.data).toEqual({ count: 0, data: [] });
	});

	test('returns the open request as a minimal summary with state=open&take=1', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await requestRepository.createRequest({
			projectId: ownerProject.id,
			title: 'Confidential title',
			description: 'Confidential description',
			createdById: owner.id,
		});
		await linkRequestToWorkflow(request.id, workflow.id, versionId);
		await authorRepository.addAuthor({ workflowReviewRequestId: request.id, userId: owner.id });

		const response = await ownerAgent
			.get('/workflow-review-requests')
			.query({ workflowId: workflow.id, state: 'open', take: 1 })
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);

		expect(response.body.data.data[0]).toEqual({
			id: request.id,
			state: 'open',
			decision: 'pending',
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
		});
	});

	test('excludes closed-only history with state=open, includes it without the filter', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const closed = await requestRepository.createRequest({
			projectId: ownerProject.id,
			state: 'closed',
			title: 'Closed',
			createdById: owner.id,
		});
		await linkRequestToWorkflow(closed.id, workflow.id, versionId);

		const openResponse = await ownerAgent
			.get('/workflow-review-requests')
			.query({ workflowId: workflow.id, state: 'open', take: 1 })
			.expect(200);
		expect(openResponse.body.data).toEqual({ count: 0, data: [] });

		const allResponse = await ownerAgent
			.get('/workflow-review-requests')
			.query({ workflowId: workflow.id })
			.expect(200);
		expect(allResponse.body.data.count).toBe(1);
		expect(allResponse.body.data.data[0]).toMatchObject({ id: closed.id, state: 'closed' });
	});

	test('does not include requests of other workflows', async () => {
		const { workflow } = await createReviewableWorkflow();
		const { workflow: otherWorkflow } = await createReviewableWorkflow('version-other');
		const request = await requestRepository.createRequest({
			projectId: ownerProject.id,
			title: 'For the other workflow',
			createdById: owner.id,
		});
		await linkRequestToWorkflow(request.id, otherWorkflow.id, 'version-other');

		const response = await ownerAgent
			.get('/workflow-review-requests')
			.query({ workflowId: workflow.id })
			.expect(200);

		expect(response.body.data).toEqual({ count: 0, data: [] });
	});

	test('returns 404 when the member has no access to the workflow', async () => {
		const { workflow } = await createReviewableWorkflow();

		await memberAgent
			.get('/workflow-review-requests')
			.query({ workflowId: workflow.id, state: 'open', take: 1 })
			.expect(404);
	});

	test('allows a project:viewer (has workflow:read) to list requests', async () => {
		const project = await createTeamProject('team', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const workflow = await createWorkflow({}, project);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-1' });
		const request = await requestRepository.createRequest({
			projectId: project.id,
			title: 'Open review',
			createdById: owner.id,
		});
		await linkRequestToWorkflow(request.id, workflow.id, 'version-1');

		const response = await memberAgent
			.get('/workflow-review-requests')
			.query({ workflowId: workflow.id, state: 'open', take: 1 })
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data[0].id).toBe(request.id);
	});

	test('returns 403 when the instance policy is disabled', async () => {
		const { workflow } = await createReviewableWorkflow();
		await policyService.set(false);

		await ownerAgent
			.get('/workflow-review-requests')
			.query({ workflowId: workflow.id })
			.expect(403);
	});

	test('returns 403 when the license lacks feat:workflowReviews', async () => {
		testServer.license.disable('feat:workflowReviews');

		await ownerAgent.get('/workflow-review-requests').query({ workflowId: 'wf-1' }).expect(403);

		testServer.license.enable('feat:workflowReviews');
	});
});
