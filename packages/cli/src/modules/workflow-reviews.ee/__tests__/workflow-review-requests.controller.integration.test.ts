process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';

import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	UserRepository,
	WorkflowPublishHistoryRepository,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { createAdmin, createMember, createOwner, createUser } from '@test-integration/db/users';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

mockInstance(ActiveWorkflowManager);
const workflowValidationService = mockInstance(WorkflowValidationService);

const testServer = utils.setupTestServer({
	endpointGroups: ['workflow-reviews', 'workflows'],
	enabledFeatures: ['feat:workflowReviews'],
	modules: ['workflow-reviews'],
});

let owner: User;
let member: User;
let viewer: User;
let ownerProject: Project;
let teamProject: Project;
let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;
let viewerAgent: SuperAgentTest;

let requestRepository: WorkflowReviewRequestRepository;
let workflowRepository: WorkflowReviewRequestWorkflowRepository;
let authorRepository: WorkflowReviewRequestAuthorRepository;
let reviewerRepository: WorkflowReviewRequestReviewerRepository;
let userRepository: UserRepository;
let publishedVersionRepository: WorkflowPublishedVersionRepository;
let publishHistoryRepository: WorkflowPublishHistoryRepository;
let workflowEntityRepository: WorkflowRepository;
let policyService: WorkflowReviewPolicyService;

beforeAll(async () => {
	await utils.initNodeTypes();
	requestRepository = Container.get(WorkflowReviewRequestRepository);
	workflowRepository = Container.get(WorkflowReviewRequestWorkflowRepository);
	authorRepository = Container.get(WorkflowReviewRequestAuthorRepository);
	reviewerRepository = Container.get(WorkflowReviewRequestReviewerRepository);
	userRepository = Container.get(UserRepository);
	publishedVersionRepository = Container.get(WorkflowPublishedVersionRepository);
	publishHistoryRepository = Container.get(WorkflowPublishHistoryRepository);
	workflowEntityRepository = Container.get(WorkflowRepository);
	policyService = Container.get(WorkflowReviewPolicyService);
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
		// Before WorkflowHistory: the published pointer FKs onto it with onDelete RESTRICT
		'WorkflowPublishedVersion',
		'WorkflowPublicationOutbox',
		'WorkflowPublishHistory',
		'WorkflowEntity',
		'WorkflowHistory',
		'ProjectRelation',
		'Project',
		'User',
	]);

	// The instance policy defaults to disabled; enable it so the feature is
	// available. Individual tests may disable it again to assert the gate.
	await policyService.set(true);
	workflowValidationService.validateForActivation.mockReturnValue({ isValid: true });
	workflowValidationService.validateDynamicCredentials.mockResolvedValue({ isValid: true });
	workflowValidationService.validateSubWorkflowReferences.mockResolvedValue({ isValid: true });

	owner = await createOwner();
	member = await createMember();
	viewer = await createMember();
	ownerProject = await getPersonalProject(owner);
	teamProject = await createTeamProject('Reviews Project', owner);
	await linkUserToProject(member, teamProject, 'project:editor');
	await linkUserToProject(viewer, teamProject, 'project:viewer');

	ownerAgent = testServer.authAgentFor(owner);
	memberAgent = testServer.authAgentFor(member);
	viewerAgent = testServer.authAgentFor(viewer);
});

/** Create a workflow owned by `owner` with a pinned history version. */
async function createReviewableWorkflow(versionId = uuid()) {
	const workflow = await createWorkflow({}, owner);
	await createWorkflowHistoryItem(workflow.id, { versionId });
	return { workflow, versionId };
}

async function createOpenReview(
	workflowId: string,
	versionId: string,
	decision: 'pending' | 'changes_requested' = 'pending',
) {
	const request = await requestRepository.createRequest({
		projectId: ownerProject.id,
		title: 'Review before publishing',
		createdById: owner.id,
		decision,
	});
	await workflowRepository.createWorkflowRow({
		workflowReviewRequestId: request.id,
		workflowId,
		workflowVersionId: versionId,
	});
	await authorRepository.addAuthor({
		workflowReviewRequestId: request.id,
		userId: owner.id,
	});
	return request;
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
		expect(JSON.stringify(response.body)).not.toMatch(/sync/i);
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

describe('publishing a workflow under review', () => {
	test.each([
		['waiting for a decision', 'pending', 'review_pending'],
		['waiting for requested changes', 'changes_requested', 'changes_requested'],
	] as const)(
		'blocks publication while the review is %s',
		async (_reviewState, decision, expectedReason) => {
			const { workflow, versionId } = await createReviewableWorkflow();
			const request = await createOpenReview(workflow.id, versionId, decision);

			const response = await ownerAgent
				.post(`/workflows/${workflow.id}/activate`)
				.send({ versionId })
				.expect(409);

			expect(response.body.meta).toEqual({
				reason: expectedReason,
				workflowReviewRequestId: request.id,
				validationError: true,
			});
			expect(
				(await workflowEntityRepository.findOneByOrFail({ id: workflow.id })).activeVersionId,
			).toBeNull();
		},
	);

	test('allows publication after the review is approved and closed', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await createOpenReview(workflow.id, versionId);

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);

		expect(
			(await workflowEntityRepository.findOneByOrFail({ id: workflow.id })).activeVersionId,
		).toBe(versionId);
	});

	test.each(['policy disabled', 'license unavailable'] as const)(
		'allows publication when workflow reviews are %s',
		async (unavailableReason) => {
			const { workflow, versionId } = await createReviewableWorkflow();
			await createOpenReview(workflow.id, versionId);

			if (unavailableReason === 'policy disabled') {
				await policyService.set(false);
			} else {
				testServer.license.disable('feat:workflowReviews');
			}

			await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);

			expect(
				(await workflowEntityRepository.findOneByOrFail({ id: workflow.id })).activeVersionId,
			).toBe(versionId);
		},
	);

	test('allows unpublishing while a review is open', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);
		await createOpenReview(workflow.id, versionId);

		await ownerAgent.post(`/workflows/${workflow.id}/deactivate`).send({}).expect(200);

		expect(
			(await workflowEntityRepository.findOneByOrFail({ id: workflow.id })).activeVersionId,
		).toBeNull();
	});
});

describe('POST /workflow-review-requests/:workflowReviewRequestId/update-version', () => {
	/** Seed an open review request pinned to `versionId`, authored by `author`. */
	async function seedOpenRequest(
		workflowId: string,
		versionId: string,
		author: User,
		projectId = ownerProject.id,
		overrides: { state?: 'open' | 'closed'; decision?: 'pending' | 'changes_requested' } = {},
	) {
		const request = await requestRepository.createRequest({
			projectId,
			title: 'Existing review',
			createdById: author.id,
			...overrides,
		});
		await workflowRepository.createWorkflowRow({
			workflowReviewRequestId: request.id,
			workflowId,
			workflowVersionId: versionId,
		});
		await authorRepository.addAuthor({ workflowReviewRequestId: request.id, userId: author.id });
		return request;
	}

	test('re-pins the version, resets the decision, and keeps the author list deduplicated', async () => {
		const { workflow } = await createReviewableWorkflow('version-1');
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });
		const request = await seedOpenRequest(workflow.id, 'version-1', owner, ownerProject.id, {
			decision: 'changes_requested',
		});

		const response = await ownerAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({ workflowId: workflow.id, workflowVersionId: 'version-2' })
			.expect(200);

		expect(response.body.data).toEqual({
			id: request.id,
			state: 'open',
			decision: 'pending',
			workflowVersionId: 'version-2',
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
		});
		expect(JSON.stringify(response.body)).not.toMatch(/sync/i);

		const childRows = await workflowRepository.find();
		expect(childRows).toHaveLength(1);
		expect(childRows[0]).toMatchObject({ workflowVersionId: 'version-2' });

		const updated = await requestRepository.findById(request.id);
		expect(updated).toMatchObject({ decision: 'pending', updatedById: owner.id });

		const authorRows = await authorRepository.find();
		expect(authorRows).toHaveLength(1);
		expect(authorRows[0]).toMatchObject({ userId: owner.id });
	});

	test('appends a second publish-capable user to the authors', async () => {
		const workflow = await createWorkflow({}, teamProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-1' });
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });
		const request = await seedOpenRequest(workflow.id, 'version-1', owner, teamProject.id);

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({ workflowId: workflow.id, workflowVersionId: 'version-2' })
			.expect(200);

		const authorRows = await authorRepository.find();
		expect(authorRows.map((row) => row.userId).sort()).toEqual([member.id, owner.id].sort());

		const updated = await requestRepository.findById(request.id);
		expect(updated).toMatchObject({ updatedById: member.id });
	});

	test('returns 200 without writes when the version is unchanged', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await seedOpenRequest(workflow.id, versionId, owner, ownerProject.id, {
			decision: 'changes_requested',
		});

		const response = await ownerAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({ workflowId: workflow.id, workflowVersionId: versionId })
			.expect(200);

		// No-op: nothing new to review, so the decision is deliberately NOT reset.
		expect(response.body.data).toMatchObject({
			id: request.id,
			decision: 'changes_requested',
			workflowVersionId: versionId,
		});

		const unchanged = await requestRepository.findById(request.id);
		expect(unchanged?.updatedAt).toEqual(request.updatedAt);
		expect(unchanged?.decision).toBe('changes_requested');
	});

	test('returns 404 for an unknown review request id', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await ownerAgent
			.post('/workflow-review-requests/unknown-request/update-version')
			.send({ workflowId: workflow.id, workflowVersionId: versionId })
			.expect(404);
	});

	test('returns 404 when the user has no access to the workflow', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await seedOpenRequest(workflow.id, versionId, owner);

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({ workflowId: workflow.id, workflowVersionId: versionId })
			.expect(404);
	});

	test('returns 404 when the request does not cover the given workflow', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const { workflow: otherWorkflow } = await createReviewableWorkflow('version-other');
		const request = await seedOpenRequest(workflow.id, versionId, owner);

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({ workflowId: otherWorkflow.id, workflowVersionId: 'version-other' })
			.expect(404);
	});

	test('returns 409 for a closed review request', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await seedOpenRequest(workflow.id, versionId, owner, ownerProject.id, {
			state: 'closed',
		});

		const response = await ownerAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({ workflowId: workflow.id, workflowVersionId: versionId })
			.expect(409);

		expect(JSON.stringify(response.body)).not.toMatch(/sync/i);
	});

	test('returns 400 for an archived workflow', async () => {
		const workflow = await createWorkflow({ isArchived: true }, owner);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-1' });
		const request = await seedOpenRequest(workflow.id, 'version-1', owner);

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({ workflowId: workflow.id, workflowVersionId: 'version-1' })
			.expect(400);
	});

	test('returns 400 for a version that does not exist for the workflow', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await seedOpenRequest(workflow.id, versionId, owner);

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({ workflowId: workflow.id, workflowVersionId: 'unknown-version' })
			.expect(400);
	});

	test('returns 400 for an invalid body', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await seedOpenRequest(workflow.id, versionId, owner);

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({ workflowId: workflow.id })
			.expect(400);
	});

	test('returns 403 when the instance policy is disabled', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await seedOpenRequest(workflow.id, versionId, owner);
		await policyService.set(false);

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({ workflowId: workflow.id, workflowVersionId: versionId })
			.expect(403);
	});

	test('returns 403 when the license lacks feat:workflowReviews', async () => {
		testServer.license.disable('feat:workflowReviews');

		await ownerAgent
			.post('/workflow-review-requests/some-request/update-version')
			.send({ workflowId: 'wf-1', workflowVersionId: 'version-1' })
			.expect(403);

		testServer.license.enable('feat:workflowReviews');
	});
});

describe('POST /workflow-review-requests/:workflowReviewRequestId/decision', () => {
	/** Seed a review request on a team-project workflow, authored by `author`. */
	async function seedRequest(
		author: User,
		overrides: {
			state?: 'open' | 'closed';
			decision?: 'pending' | 'changes_requested' | 'approved';
		} = {},
	) {
		const workflow = await createWorkflow({}, teamProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-1' });
		const request = await requestRepository.createRequest({
			projectId: teamProject.id,
			title: 'Review me',
			createdById: author.id,
			...overrides,
		});
		await workflowRepository.createWorkflowRow({
			workflowReviewRequestId: request.id,
			workflowId: workflow.id,
			workflowVersionId: 'version-1',
		});
		await authorRepository.addAuthor({ workflowReviewRequestId: request.id, userId: author.id });
		return { request, workflow };
	}

	test('approves: closes the request and stamps decision fields', async () => {
		const { request } = await seedRequest(owner);
		const seededUpdatedAt = request.updatedAt.getTime();

		const response = await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		expect(response.body.data).toEqual({
			id: request.id,
			state: 'closed',
			decision: 'approved',
			workflowVersionId: 'version-1',
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
		});

		// the service relies on `save` (not `update`) so @BeforeUpdate bumps
		// updatedAt — assert the timestamp actually moves.
		expect(new Date(response.body.data.updatedAt).getTime()).toBeGreaterThan(seededUpdatedAt);

		const updated = await requestRepository.findById(request.id);
		expect(updated).toMatchObject({
			state: 'closed',
			decision: 'approved',
			updatedById: member.id,
			closedById: member.id,
		});
		expect(updated?.approvedAt).toBeInstanceOf(Date);
	});

	test('requests changes: the review stays open and unstamped', async () => {
		const { request } = await seedRequest(owner);

		const response = await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'changes_requested' })
			.expect(200);

		expect(response.body.data).toMatchObject({
			state: 'open',
			decision: 'changes_requested',
		});

		const updated = await requestRepository.findById(request.id);
		expect(updated).toMatchObject({
			state: 'open',
			decision: 'changes_requested',
			updatedById: member.id,
			closedById: null,
			approvedAt: null,
		});
	});

	test('allows approving a changes_requested review', async () => {
		const { request } = await seedRequest(owner, { decision: 'changes_requested' });

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		expect(await requestRepository.findById(request.id)).toMatchObject({
			state: 'closed',
			decision: 'approved',
		});
	});

	test('allows repeating changes_requested', async () => {
		const { request } = await seedRequest(owner, { decision: 'changes_requested' });

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'changes_requested' })
			.expect(200);

		expect(await requestRepository.findById(request.id)).toMatchObject({
			state: 'open',
			decision: 'changes_requested',
			updatedById: member.id,
		});
	});

	test('returns 403 for the requesting author without admin override', async () => {
		const { request } = await seedRequest(member);

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(403);

		expect(await requestRepository.findById(request.id)).toMatchObject({
			state: 'open',
			decision: 'pending',
		});
	});

	test('returns 403 for a user who became an author via update-version', async () => {
		const { request, workflow } = await seedRequest(owner);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({ workflowId: workflow.id, workflowVersionId: 'version-2' })
			.expect(200);

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(403);
	});

	test('allows the instance owner to decide their own review (admin override)', async () => {
		const { request } = await seedRequest(owner);

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);
	});

	test('allows a global admin to decide their own review (admin override)', async () => {
		const admin = await createAdmin();
		const { request } = await seedRequest(admin);

		await testServer
			.authAgentFor(admin)
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);
	});

	test('allows a project admin to decide their own review in that project (admin override)', async () => {
		const projectAdmin = await createUser();
		await linkUserToProject(projectAdmin, teamProject, 'project:admin');
		const { request } = await seedRequest(projectAdmin);

		await testServer
			.authAgentFor(projectAdmin)
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);
	});

	test('returns 404 for a project:viewer (lacks workflow:publish)', async () => {
		const { request } = await seedRequest(owner);

		await viewerAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(404);
	});

	test('returns 404 for an unknown review request id', async () => {
		await memberAgent
			.post('/workflow-review-requests/unknown-request/decision')
			.send({ decision: 'approved' })
			.expect(404);
	});

	test('returns 409 for a closed review request', async () => {
		const { request } = await seedRequest(owner, { state: 'closed' });

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(409);
	});

	test('returns 409 for an already approved review request', async () => {
		const { request } = await seedRequest(owner, { decision: 'approved' });

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'changes_requested' })
			.expect(409);
	});

	test('returns 400 for a pending decision', async () => {
		const { request } = await seedRequest(owner);

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'pending' })
			.expect(400);
	});

	test('returns 400 for an unknown decision', async () => {
		const { request } = await seedRequest(owner);

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'rejected' })
			.expect(400);
	});

	test('returns 403 when the instance policy is disabled', async () => {
		const { request } = await seedRequest(owner);
		await policyService.set(false);

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(403);
	});

	test('returns 403 when the license lacks feat:workflowReviews', async () => {
		testServer.license.disable('feat:workflowReviews');

		await memberAgent
			.post('/workflow-review-requests/some-request/decision')
			.send({ decision: 'approved' })
			.expect(403);

		testServer.license.enable('feat:workflowReviews');
	});

	test('serializes concurrent approvals: exactly one 200 and one 409', async () => {
		const { request } = await seedRequest(owner);

		const [first, second] = await Promise.all([
			memberAgent
				.post(`/workflow-review-requests/${request.id}/decision`)
				.send({ decision: 'approved' }),
			memberAgent
				.post(`/workflow-review-requests/${request.id}/decision`)
				.send({ decision: 'approved' }),
		]);

		expect([first.status, second.status].sort()).toEqual([200, 409]);
		expect(await requestRepository.findById(request.id)).toMatchObject({
			state: 'closed',
			decision: 'approved',
		});
	});

	test('never produces a closed request with a pending decision when racing update-version', async () => {
		const { request, workflow } = await seedRequest(owner);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });

		const [decide, sync] = await Promise.all([
			memberAgent
				.post(`/workflow-review-requests/${request.id}/decision`)
				.send({ decision: 'approved' }),
			ownerAgent
				.post(`/workflow-review-requests/${request.id}/update-version`)
				.send({ workflowId: workflow.id, workflowVersionId: 'version-2' }),
		]);

		// Whichever wins the lock, the loser must observe the winner's write:
		// either the sync lands first (both 200) or it conflicts on the closed request.
		expect(decide.status).toBe(200);
		expect([200, 409]).toContain(sync.status);

		const final = await requestRepository.findById(request.id);
		expect(final?.state === 'closed' && final?.decision === 'pending').toBe(false);
		expect(final).toMatchObject({ state: 'closed', decision: 'approved' });
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
			workflowVersionId: versionId,
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			// Neither applies to a pending review
			decisionBy: null,
			approvedVersionPublicationState: null,
		});
	});

	test('returns the newest review, closed included, with take=1 and no state filter', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const older = await requestRepository.createRequest({
			projectId: ownerProject.id,
			state: 'closed',
			title: 'Older',
			createdById: owner.id,
		});
		await linkRequestToWorkflow(older.id, workflow.id, versionId);
		const newest = await requestRepository.createRequest({
			projectId: ownerProject.id,
			state: 'open',
			title: 'Newest',
			createdById: owner.id,
		});
		await linkRequestToWorkflow(newest.id, workflow.id, versionId);
		// Both rows are created within the same millisecond, so state the age
		// explicitly instead of asserting against a timestamp tie.
		await requestRepository.update(older.id, { createdAt: new Date('2026-01-01T00:00:00.000Z') });
		await requestRepository.update(newest.id, { createdAt: new Date('2026-01-02T00:00:00.000Z') });

		const response = await ownerAgent
			.get('/workflow-review-requests')
			.query({ workflowId: workflow.id, take: 1 })
			.expect(200);

		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0]).toMatchObject({ id: newest.id, state: 'open' });
	});

	test('resolves the actor of a changes-requested decision', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await requestRepository.createRequest({
			projectId: ownerProject.id,
			decision: 'changes_requested',
			title: 'Needs work',
			createdById: owner.id,
			updatedById: member.id,
		});
		await linkRequestToWorkflow(request.id, workflow.id, versionId);

		const response = await ownerAgent
			.get('/workflow-review-requests')
			.query({ workflowId: workflow.id, take: 1 })
			.expect(200);

		expect(response.body.data.data[0]).toMatchObject({
			decision: 'changes_requested',
			decisionBy: {
				id: member.id,
				email: member.email,
				firstName: member.firstName,
				lastName: member.lastName,
			},
			approvedVersionPublicationState: null,
		});
	});

	test('returns no actor when the deciding user was deleted', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const reviewer = await createMember();
		const request = await requestRepository.createRequest({
			projectId: ownerProject.id,
			decision: 'changes_requested',
			title: 'Needs work',
			createdById: owner.id,
			updatedById: reviewer.id,
		});
		await linkRequestToWorkflow(request.id, workflow.id, versionId);
		await userRepository.delete(reviewer.id);

		const response = await ownerAgent
			.get('/workflow-review-requests')
			.query({ workflowId: workflow.id, take: 1 })
			.expect(200);

		expect(response.body.data.data[0]).toMatchObject({
			decision: 'changes_requested',
			decisionBy: null,
		});
	});

	test('reports an approved version that was never published', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await requestRepository.createRequest({
			projectId: ownerProject.id,
			state: 'closed',
			decision: 'approved',
			title: 'Approved',
			createdById: owner.id,
			updatedById: member.id,
		});
		await linkRequestToWorkflow(request.id, workflow.id, versionId);

		const response = await ownerAgent
			.get('/workflow-review-requests')
			.query({ workflowId: workflow.id, take: 1 })
			.expect(200);

		expect(response.body.data.data[0]).toMatchObject({
			state: 'closed',
			decision: 'approved',
			// Approval is never attributed in the canvas banner
			decisionBy: null,
			approvedVersionPublicationState: 'not_published',
		});
	});

	test('reports an approved version that has been published', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await requestRepository.createRequest({
			projectId: ownerProject.id,
			state: 'closed',
			decision: 'approved',
			title: 'Approved',
			createdById: owner.id,
		});
		await linkRequestToWorkflow(request.id, workflow.id, versionId);
		await publishHistoryRepository.addRecord({
			workflowId: workflow.id,
			versionId,
			event: 'activated',
			userId: owner.id,
		});

		const response = await ownerAgent
			.get('/workflow-review-requests')
			.query({ workflowId: workflow.id, take: 1 })
			.expect(200);

		expect(response.body.data.data[0]).toMatchObject({
			approvedVersionPublicationState: 'published',
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

async function seedInboxRequests() {
	const openRequest = await requestRepository.createRequest({
		projectId: teamProject.id,
		title: 'Open review request',
		createdById: owner.id,
		state: 'open',
	});
	const closedRequest = await requestRepository.createRequest({
		projectId: teamProject.id,
		title: 'Closed review request',
		createdById: owner.id,
		state: 'closed',
	});
	return { openRequest, closedRequest };
}

describe('GET /workflow-review-requests/summary', () => {
	test('returns open/closed counts for instance owner', async () => {
		await seedInboxRequests();

		const response = await ownerAgent.get('/workflow-review-requests/summary').expect(200);

		expect(response.body.data).toEqual({ open: 1, closed: 1 });
	});

	test('returns open/closed counts for project editor', async () => {
		await seedInboxRequests();

		const response = await memberAgent.get('/workflow-review-requests/summary').expect(200);

		expect(response.body.data).toEqual({ open: 1, closed: 1 });
	});

	test('returns zero counts for project viewer with nothing visible', async () => {
		await seedInboxRequests();

		const response = await viewerAgent.get('/workflow-review-requests/summary').expect(200);

		expect(response.body.data).toEqual({ open: 0, closed: 0 });
	});

	test('counts a requester their own review regardless of project scope', async () => {
		await requestRepository.createRequest({
			projectId: teamProject.id,
			title: 'Review submitted by viewer',
			createdById: viewer.id,
			state: 'open',
		});

		const response = await viewerAgent.get('/workflow-review-requests/summary').expect(200);

		expect(response.body.data).toEqual({ open: 1, closed: 0 });
	});

	test('returns 403 when feature is disabled', async () => {
		await policyService.set(false);

		await ownerAgent.get('/workflow-review-requests/summary').expect(403);
	});
});

describe('GET /workflow-review-requests/inbox', () => {
	test('returns reviews for instance owner', async () => {
		const { openRequest } = await seedInboxRequests();

		const response = await ownerAgent
			.get('/workflow-review-requests/inbox')
			.query({ state: 'open', limit: 15 })
			.expect(200);

		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0]).toMatchObject({
			id: openRequest.id,
			title: 'Open review request',
			state: 'open',
			workflowName: null,
			workflowVersionId: null,
		});
		expect(response.body.data.hasMore).toBe(false);
		expect(response.body.data.nextCursor).toBeNull();
	});

	test('returns empty list for project viewer', async () => {
		await seedInboxRequests();

		const response = await viewerAgent.get('/workflow-review-requests/inbox').expect(200);

		expect(response.body.data.data).toEqual([]);
		expect(response.body.data.hasMore).toBe(false);
	});

	test('returns 403 when license is disabled', async () => {
		testServer.license.disable('feat:workflowReviews');

		await ownerAgent.get('/workflow-review-requests/inbox').expect(403);
	});

	test('returns cursor pagination metadata', async () => {
		await seedInboxRequests();
		await requestRepository.createRequest({
			projectId: teamProject.id,
			title: 'Second open review',
			createdById: owner.id,
			state: 'open',
		});

		const firstPage = await ownerAgent
			.get('/workflow-review-requests/inbox')
			.query({ state: 'open', limit: 1 })
			.expect(200);

		expect(firstPage.body.data.data).toHaveLength(1);
		expect(firstPage.body.data.hasMore).toBe(true);
		expect(firstPage.body.data.nextCursor).toBeTruthy();

		const secondPage = await ownerAgent
			.get('/workflow-review-requests/inbox')
			.query({
				state: 'open',
				limit: 1,
				cursor: firstPage.body.data.nextCursor,
			})
			.expect(200);

		expect(secondPage.body.data.data).toHaveLength(1);
		expect(secondPage.body.data.data[0].id).not.toBe(firstPage.body.data.data[0].id);
	});

	test('includes workflow name on list items', async () => {
		const workflow = await createWorkflow({ name: 'Inbox Workflow' }, teamProject);
		const enrichedRequest = await requestRepository.createRequest({
			projectId: teamProject.id,
			title: 'Enriched review request',
			createdById: owner.id,
			state: 'open',
		});

		await workflowRepository.createWorkflowRow({
			workflowReviewRequestId: enrichedRequest.id,
			workflowId: workflow.id,
		});

		const response = await ownerAgent
			.get('/workflow-review-requests/inbox')
			.query({ state: 'open', limit: 15 })
			.expect(200);

		expect(response.body.data.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: enrichedRequest.id,
					title: 'Enriched review request',
					workflowName: 'Inbox Workflow',
					workflowVersionId: null,
				}),
			]),
		);
	});

	test('hides reviews from projects the member cannot access', async () => {
		const otherProject = await createTeamProject('Other Reviews Project', owner);
		await requestRepository.createRequest({
			projectId: otherProject.id,
			title: 'Private other-project review',
			createdById: owner.id,
			state: 'open',
		});

		const memberResponse = await memberAgent.get('/workflow-review-requests/inbox').expect(200);
		expect(memberResponse.body.data.data).toEqual([]);

		const ownerResponse = await ownerAgent.get('/workflow-review-requests/inbox').expect(200);
		expect(ownerResponse.body.data.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					title: 'Private other-project review',
				}),
			]),
		);
	});

	test('shows requesters their own reviews even without project access', async () => {
		const otherProject = await createTeamProject('Unrelated Project', owner);
		const ownRequest = await requestRepository.createRequest({
			projectId: otherProject.id,
			title: 'Review I submitted',
			createdById: member.id,
			state: 'open',
		});

		const response = await memberAgent.get('/workflow-review-requests/inbox').expect(200);

		expect(response.body.data.data).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: ownRequest.id })]),
		);
	});

	test('does not truncate pagination when the cursor row is deleted', async () => {
		await seedInboxRequests();
		await requestRepository.createRequest({
			projectId: teamProject.id,
			title: 'Second open review',
			createdById: owner.id,
			state: 'open',
		});

		const firstPage = await ownerAgent
			.get('/workflow-review-requests/inbox')
			.query({ state: 'open', limit: 1 })
			.expect(200);
		const cursor = firstPage.body.data.nextCursor as string;
		const firstId = firstPage.body.data.data[0].id as string;

		// Delete the anchor row before requesting the next page.
		await requestRepository.delete({ id: firstId });

		const secondPage = await ownerAgent
			.get('/workflow-review-requests/inbox')
			.query({ state: 'open', limit: 1, cursor })
			.expect(200);

		expect(secondPage.body.data.data).toHaveLength(1);
		expect(secondPage.body.data.data[0].id).not.toBe(firstId);
	});

	test('hydrates the requester and requested reviewers on list items', async () => {
		const reviewer = await createUser();
		const request = await requestRepository.createRequest({
			projectId: teamProject.id,
			title: 'Needs review',
			createdById: owner.id,
			state: 'open',
		});
		await reviewerRepository.addReviewers({
			workflowReviewRequestId: request.id,
			userIds: [reviewer.id],
		});

		const response = await ownerAgent
			.get('/workflow-review-requests/inbox')
			.query({ state: 'open', limit: 15 })
			.expect(200);

		const item = response.body.data.data.find((row: { id: string }) => row.id === request.id);
		expect(item.requester).toEqual({
			id: owner.id,
			email: owner.email,
			firstName: owner.firstName,
			lastName: owner.lastName,
		});
		expect(item.reviewers).toEqual([
			{
				id: reviewer.id,
				email: reviewer.email,
				firstName: reviewer.firstName,
				lastName: reviewer.lastName,
			},
		]);
	});

	test('sets the requester to null when the request has no creator', async () => {
		const request = await requestRepository.createRequest({
			projectId: teamProject.id,
			title: 'Authorless',
			createdById: null,
			state: 'open',
		});

		const response = await ownerAgent
			.get('/workflow-review-requests/inbox')
			.query({ state: 'open', limit: 15 })
			.expect(200);

		const item = response.body.data.data.find((row: { id: string }) => row.id === request.id);
		expect(item.requester).toBeNull();
		expect(item.reviewers).toEqual([]);
	});

	test('drops a requester and reviewers whose accounts were deleted', async () => {
		// No FK on these rows, so a deleted user leaves a dangling id that must resolve to null.
		const departedCreator = await createUser();
		const survivingReviewer = await createUser();
		const departedReviewer = await createUser();
		const request = await requestRepository.createRequest({
			projectId: teamProject.id,
			title: 'With departed users',
			createdById: departedCreator.id,
			state: 'open',
		});
		await reviewerRepository.addReviewers({
			workflowReviewRequestId: request.id,
			userIds: [survivingReviewer.id, departedReviewer.id],
		});

		await userRepository.delete({ id: departedCreator.id });
		await userRepository.delete({ id: departedReviewer.id });

		const response = await ownerAgent
			.get('/workflow-review-requests/inbox')
			.query({ state: 'open', limit: 15 })
			.expect(200);

		const item = response.body.data.data.find((row: { id: string }) => row.id === request.id);
		expect(item.requester).toBeNull();
		expect(item.reviewers).toEqual([
			{
				id: survivingReviewer.id,
				email: survivingReviewer.email,
				firstName: survivingReviewer.firstName,
				lastName: survivingReviewer.lastName,
			},
		]);
	});

	test('returns 400 for a malformed cursor', async () => {
		const cursor = Buffer.from('not-a-valid-cursor', 'utf8').toString('base64url');

		await ownerAgent
			.get('/workflow-review-requests/inbox')
			.query({ state: 'open', limit: 15, cursor })
			.expect(400);
	});
});

describe('GET /workflow-review-requests/:workflowReviewRequestId', () => {
	/** Seed a review request in `projectId` pinned to `versionId`, authored by `author`. */
	async function seedRequest(
		workflowId: string,
		versionId: string | null,
		author: User,
		projectId = teamProject.id,
	) {
		const request = await requestRepository.createRequest({
			projectId,
			title: 'Please review',
			description: 'Some context',
			createdById: author.id,
		});
		await workflowRepository.createWorkflowRow({
			workflowReviewRequestId: request.id,
			workflowId,
			workflowVersionId: versionId,
		});
		await authorRepository.addAuthor({ workflowReviewRequestId: request.id, userId: author.id });
		return request;
	}

	test('returns the review, the workflows it covers, and both versions to compare', async () => {
		const workflow = await createWorkflow({ name: 'Reviewed workflow' }, teamProject);
		const baseline = await createWorkflowHistoryItem(workflow.id, {
			versionId: 'version-published',
		});
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-pinned' });
		await publishedVersionRepository.setPublishedVersion(workflow.id, baseline.versionId);
		const reviewer = await createAdmin();
		const request = await seedRequest(workflow.id, 'version-pinned', owner);
		await reviewerRepository.addReviewers({
			workflowReviewRequestId: request.id,
			userIds: [reviewer.id],
		});

		const response = await ownerAgent.get(`/workflow-review-requests/${request.id}`).expect(200);

		expect(response.body.data).toMatchObject({
			id: request.id,
			projectId: teamProject.id,
			state: 'open',
			decision: 'pending',
			title: 'Please review',
			description: 'Some context',
			workflowName: 'Reviewed workflow',
			workflowVersionId: 'version-pinned',
			requester: { id: owner.id, email: owner.email },
			reviewers: [{ id: reviewer.id, email: reviewer.email }],
		});

		expect(response.body.data.workflows).toHaveLength(1);
		const [child] = response.body.data.workflows;
		expect(child).toMatchObject({
			workflowId: workflow.id,
			workflowName: 'Reviewed workflow',
			workflowVersionId: 'version-pinned',
		});
		expect(child.pinnedVersion).toMatchObject({
			versionId: 'version-pinned',
			connections: {},
			nodeGroups: [],
		});
		expect(child.pinnedVersion.nodes).toHaveLength(1);
		expect(child.pinnedVersion.nodes[0]).toMatchObject({ name: 'Start' });
		expect(child.pinnedVersion).not.toHaveProperty('authors');
		expect(child.baselineVersion).toMatchObject({ versionId: 'version-published' });
	});

	test('has nothing to compare against when the workflow was never published', async () => {
		const workflow = await createWorkflow({}, teamProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-pinned' });
		const request = await seedRequest(workflow.id, 'version-pinned', owner);

		const response = await ownerAgent.get(`/workflow-review-requests/${request.id}`).expect(200);

		expect(response.body.data.workflows[0].pinnedVersion).toMatchObject({
			versionId: 'version-pinned',
		});
		expect(response.body.data.workflows[0].baselineVersion).toBeNull();
	});

	test('returns no version under review when the review does not point at one', async () => {
		const workflow = await createWorkflow({}, teamProject);
		const request = await seedRequest(workflow.id, null, owner);

		const response = await ownerAgent.get(`/workflow-review-requests/${request.id}`).expect(200);

		expect(response.body.data.workflows[0]).toMatchObject({
			workflowVersionId: null,
			pinnedVersion: null,
			baselineVersion: null,
		});
	});

	test('still opens the review after its workflow was deleted', async () => {
		const workflow = await createWorkflow({}, teamProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-pinned' });
		const request = await seedRequest(workflow.id, 'version-pinned', owner);

		// Deleting the workflow removes the review's reference to it as well
		await workflowEntityRepository.delete({ id: workflow.id });

		const response = await ownerAgent.get(`/workflow-review-requests/${request.id}`).expect(200);

		expect(response.body.data.id).toBe(request.id);
		expect(response.body.data.workflows).toEqual([]);
		expect(response.body.data.workflowName).toBeNull();
		expect(response.body.data.workflowVersionId).toBeNull();
	});

	test('lets an editor in the review project open it', async () => {
		const workflow = await createWorkflow({}, teamProject);
		const request = await seedRequest(workflow.id, null, owner);

		const response = await memberAgent.get(`/workflow-review-requests/${request.id}`).expect(200);

		expect(response.body.data.id).toBe(request.id);
	});

	test('hides the review from a viewer who cannot publish in the project', async () => {
		const workflow = await createWorkflow({}, teamProject);
		const request = await seedRequest(workflow.id, null, owner);

		await viewerAgent.get(`/workflow-review-requests/${request.id}`).expect(404);
	});

	test('hides the review from someone outside its project', async () => {
		const otherProject = await createTeamProject('Unrelated Project', owner);
		const workflow = await createWorkflow({}, otherProject);
		const request = await seedRequest(workflow.id, null, owner, otherProject.id);

		await memberAgent.get(`/workflow-review-requests/${request.id}`).expect(404);
	});

	test('hides the review once its workflow moves to a project the user cannot see', async () => {
		// The review still points at `teamProject`, where member is allowed to publish,
		// while the workflow itself has moved to a project member has no access to
		const destinationProject = await createTeamProject('Destination Project', owner);
		const workflow = await createWorkflow({}, destinationProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-pinned' });
		const request = await seedRequest(workflow.id, 'version-pinned', owner, teamProject.id);

		await memberAgent.get(`/workflow-review-requests/${request.id}`).expect(404);
	});

	test('leaves out a workflow the requester can no longer see, but still opens the review', async () => {
		// Viewer asked for the review while the workflow was reachable; it has since moved
		// to a project they have no access to, so the content must not come back with it
		const destinationProject = await createTeamProject('Moved Away', owner);
		const workflow = await createWorkflow({}, destinationProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-pinned' });
		const request = await seedRequest(workflow.id, 'version-pinned', viewer, teamProject.id);

		const response = await viewerAgent.get(`/workflow-review-requests/${request.id}`).expect(200);

		expect(response.body.data.id).toBe(request.id);
		expect(response.body.data.workflows).toEqual([]);
		expect(response.body.data.workflowName).toBeNull();
		expect(response.body.data.workflowVersionId).toBeNull();
	});

	test('always shows people the review they asked for themselves', async () => {
		const workflow = await createWorkflow({}, teamProject);
		const request = await seedRequest(workflow.id, null, viewer);

		const response = await viewerAgent.get(`/workflow-review-requests/${request.id}`).expect(200);

		expect(response.body.data.id).toBe(request.id);
	});

	test('reports a review that does not exist as not found', async () => {
		await ownerAgent.get('/workflow-review-requests/unknown-request').expect(404);
	});

	test('does not shadow the inbox, summary, and eligible-reviewers endpoints', async () => {
		const workflow = await createWorkflow({}, teamProject);
		await seedRequest(workflow.id, null, owner);

		await ownerAgent.get('/workflow-review-requests/inbox').expect(200);
		await ownerAgent.get('/workflow-review-requests/summary').expect(200);
		// 400 (missing workflowId), not 404 — proves it still reaches its own handler
		await ownerAgent.get('/workflow-review-requests/eligible-reviewers').expect(400);
	});

	test('refuses to open a review when an admin has turned reviews off', async () => {
		const workflow = await createWorkflow({}, teamProject);
		const request = await seedRequest(workflow.id, null, owner);
		await policyService.set(false);

		await ownerAgent.get(`/workflow-review-requests/${request.id}`).expect(403);
	});

	test('refuses to open a review on an instance without a workflow reviews licence', async () => {
		testServer.license.disable('feat:workflowReviews');

		await ownerAgent.get('/workflow-review-requests/some-request').expect(403);

		testServer.license.enable('feat:workflowReviews');
	});
});
