process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';

import type { WorkflowReviewInboxItem } from '@n8n/api-types';
import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	shareWorkflowWithUsers,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User, WorkflowReviewRequestState } from '@n8n/db';
import {
	UserRepository,
	WorkflowHistoryRepository,
	WorkflowPublishedVersionRepository,
	WorkflowPublishHistoryRepository,
	WorkflowRepository,
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
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';

const activeWorkflowManager = mockInstance(ActiveWorkflowManager);
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
let workflowHistoryRepository: WorkflowHistoryRepository;
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
	workflowHistoryRepository = Container.get(WorkflowHistoryRepository);
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

async function findVersionName(workflowId: string, versionId: string) {
	const version = await workflowHistoryRepository.findOneBy({ workflowId, versionId });
	return version?.name;
}

async function createOpenReview(
	workflowId: string,
	versionId: string,
	decision: 'pending' | 'changes_requested' = 'pending',
) {
	const request = await requestRepository.createRequest(
		{
			projectId: ownerProject.id,
			title: 'Review before publishing',
			createdById: owner.id,
			decision,
		},
		{},
	);
	await workflowRepository.createWorkflowRow(
		{
			workflowReviewRequestId: request.id,
			workflowId,
			workflowVersionId: versionId,
		},
		{},
	);
	await authorRepository.addAuthor(
		{
			workflowReviewRequestId: request.id,
			userId: owner.id,
		},
		{},
	);
	return request;
}

describe('POST /workflow-review-requests', () => {
	/** A global admin, so it is publish-capable on every project under test. */
	let reviewer: User;

	beforeEach(async () => {
		reviewer = await createAdmin();
	});

	/**
	 * A reviewer is mandatory, so default one in. Tests asserting on reviewers pass
	 * their own `reviewerUserIds`, which overrides the default.
	 */
	const postReview = (agent: SuperAgentTest, body: object) =>
		agent.post('/workflow-review-requests').send({ reviewerUserIds: [reviewer.id], ...body });

	test('creates a review request with its workflow reference and author', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		const response = await postReview(ownerAgent, {
			title: 'Please review my workflow',
			description: 'It is ready',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(201);

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

		await postReview(ownerAgent, {
			title: 'With a reviewer',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Release candidate',
				},
			],
			reviewerUserIds: [reviewer.id, reviewer.id],
		}).expect(201);

		const reviewerRows = await reviewerRepository.find();
		expect(reviewerRows).toHaveLength(1);
		expect(reviewerRows[0]).toMatchObject({ userId: reviewer.id });
	});

	test('returns 400 when the requester assigns themselves as reviewer', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await postReview(ownerAgent, {
			title: 'x',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Release candidate',
				},
			],
			reviewerUserIds: [owner.id],
		}).expect(400);

		expect(await requestRepository.find()).toHaveLength(0);
	});

	test('returns 400 for an ineligible reviewer and writes nothing', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		// A plain member has no publish rights on the owner's personal project
		await postReview(ownerAgent, {
			title: 'x',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Release candidate',
				},
			],
			reviewerUserIds: [member.id],
		}).expect(400);

		expect(await requestRepository.find()).toHaveLength(0);
		expect(await reviewerRepository.find()).toHaveLength(0);
	});

	test('returns 400 for more than 10 reviewer ids', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await postReview(ownerAgent, {
			title: 'x',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Release candidate',
				},
			],
			reviewerUserIds: Array.from({ length: 11 }, (_, i) => `user-${i}`),
		}).expect(400);
	});

	test.each([
		{ name: 'no reviewer is sent', reviewerUserIds: undefined },
		{ name: 'the reviewer list is empty', reviewerUserIds: [] },
	])('returns 400 and creates nothing when $name', async ({ reviewerUserIds }) => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [
					{
						workflowId: workflow.id,
						workflowVersionId: versionId,
						workflowVersionName: 'Release candidate',
					},
				],
				reviewerUserIds,
			})
			.expect(400);

		expect(await requestRepository.find()).toHaveLength(0);
		expect(await reviewerRepository.find()).toHaveLength(0);
	});

	test('returns 400 when the workflows array is empty', async () => {
		await postReview(ownerAgent, { title: 'x', workflows: [] }).expect(400);
	});

	test('returns 400 when more than one workflow is submitted', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await postReview(ownerAgent, {
			title: 'x',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Release candidate',
				},
				{
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(400);
	});

	test('returns 400 for a version belonging to a different workflow', async () => {
		const { workflow } = await createReviewableWorkflow('version-a');
		const other = await createWorkflow({}, owner);
		await createWorkflowHistoryItem(other.id, { versionId: 'version-b' });

		await postReview(ownerAgent, {
			title: 'x',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: 'version-b',
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(400);
	});

	test('returns 400 for a whitespace-only title', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await postReview(ownerAgent, {
			title: '   ',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(400);
	});

	test('returns 400 for a title exceeding 128 characters', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await postReview(ownerAgent, {
			title: 'a'.repeat(129),
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(400);
	});

	test('returns 400 for a description exceeding 512 characters', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await postReview(ownerAgent, {
			title: 'x',
			description: 'a'.repeat(513),
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(400);
	});

	test('returns 400 for an archived workflow', async () => {
		const workflow = await createWorkflow({ isArchived: true }, owner);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-1' });

		await postReview(ownerAgent, {
			title: 'x',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: 'version-1',
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(400);
	});

	test('returns 404 for an unknown workflow', async () => {
		await postReview(ownerAgent, {
			title: 'x',
			workflows: [
				{
					workflowId: 'unknown-workflow',
					workflowVersionId: 'version-1',
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(404);
	});

	test('returns 404 when the member has no access to the workflow', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await postReview(memberAgent, {
			title: 'x',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(404);
	});

	test('returns 404 for a project:viewer (lacks workflow:publish)', async () => {
		const project = await createTeamProject('team', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const workflow = await createWorkflow({}, project);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-1' });

		await postReview(memberAgent, {
			title: 'x',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: 'version-1',
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(404);
	});

	test('allows a project:editor (has workflow:publish) to request a review', async () => {
		const project = await createTeamProject('team', owner);
		await linkUserToProject(member, project, 'project:editor');
		const workflow = await createWorkflow({}, project);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-1' });

		await postReview(memberAgent, {
			title: 'x',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: 'version-1',
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(201);
	});

	test('returns 409 pointing at the existing open review (different version)', async () => {
		const { workflow } = await createReviewableWorkflow('version-1');
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });

		const existing = await requestRepository.createRequest(
			{
				projectId: ownerProject.id,
				title: 'Existing',
				createdById: owner.id,
			},
			{},
		);
		await workflowRepository.createWorkflowRow(
			{
				workflowReviewRequestId: existing.id,
				workflowId: workflow.id,
				workflowVersionId: 'version-1',
			},
			{},
		);

		const response = await postReview(ownerAgent, {
			title: 'New',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: 'version-2',
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(409);

		expect(response.body.meta.workflowReviewRequestId).toBe(existing.id);
		expect(JSON.stringify(response.body)).not.toMatch(/sync/i);
		// No new rows written.
		expect(await requestRepository.find()).toHaveLength(1);
		expect(await workflowRepository.find()).toHaveLength(1);
	});

	test('returns 409 when the existing open review is already approved', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		const existing = await requestRepository.createRequest(
			{
				projectId: ownerProject.id,
				state: 'open',
				decision: 'approved',
				title: 'Existing',
				createdById: owner.id,
			},
			{},
		);
		await workflowRepository.createWorkflowRow(
			{
				workflowReviewRequestId: existing.id,
				workflowId: workflow.id,
				workflowVersionId: versionId,
			},
			{},
		);

		const response = await postReview(ownerAgent, {
			title: 'New',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(409);

		expect(response.body.meta.workflowReviewRequestId).toBe(existing.id);
	});

	test('creates a new review when only a closed review exists', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		const closed = await requestRepository.createRequest(
			{
				projectId: ownerProject.id,
				state: 'closed',
				title: 'Closed',
				createdById: owner.id,
			},
			{},
		);
		await workflowRepository.createWorkflowRow(
			{
				workflowReviewRequestId: closed.id,
				workflowId: workflow.id,
				workflowVersionId: versionId,
			},
			{},
		);

		await postReview(ownerAgent, {
			title: 'New',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(201);

		const openRequests = await requestRepository.find({ where: { state: 'open' } });
		expect(openRequests).toHaveLength(1);
	});

	test('serializes concurrent creates: exactly one 201 and one 409', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		const body = {
			title: 'Race',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Release candidate',
				},
			],
		};

		const [first, second] = await Promise.all([
			postReview(ownerAgent, body),
			postReview(ownerAgent, body),
		]);

		expect([first.status, second.status].sort()).toEqual([201, 409]);

		const openRequests = await requestRepository.find({ where: { state: 'open' } });
		expect(openRequests).toHaveLength(1);
		expect(await workflowRepository.find()).toHaveLength(1);
	});

	test('returns 403 after an admin disables the policy at runtime', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		// Enabled (from beforeEach) → allowed.
		await postReview(ownerAgent, {
			title: 'First',
			workflows: [
				{
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(201);

		// Disabled → rejected, even for an otherwise valid request.
		await policyService.set(false);
		const other = await createWorkflow({}, owner);
		await createWorkflowHistoryItem(other.id, { versionId: 'v-other' });

		await postReview(ownerAgent, {
			title: 'Second',
			workflows: [
				{
					workflowId: other.id,
					workflowVersionId: 'v-other',
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(403);
	});

	test('returns 403 when the license lacks feat:workflowReviews', async () => {
		testServer.license.disable('feat:workflowReviews');

		await postReview(ownerAgent, {
			title: 'x',
			workflows: [
				{
					workflowId: 'wf-1',
					workflowVersionId: 'version-1',
					workflowVersionName: 'Release candidate',
				},
			],
		}).expect(403);

		testServer.license.enable('feat:workflowReviews');
	});

	describe('pinned version naming', () => {
		test('names the pinned version', async () => {
			const { workflow, versionId } = await createReviewableWorkflow();

			await postReview(ownerAgent, {
				title: 'Please review my workflow',
				workflows: [
					{
						workflowId: workflow.id,
						workflowVersionId: versionId,
						workflowVersionName: 'Release candidate',
					},
				],
			}).expect(201);

			expect(await findVersionName(workflow.id, versionId)).toBe('Release candidate');
		});

		test.each([
			{ name: 'no name is sent', workflowVersionName: undefined },
			{ name: 'the name is blank', workflowVersionName: '   ' },
		])('returns 400 and creates nothing when $name', async ({ workflowVersionName }) => {
			const { workflow, versionId } = await createReviewableWorkflow();

			await postReview(ownerAgent, {
				title: 'Please review my workflow',
				workflows: [{ workflowId: workflow.id, workflowVersionId: versionId, workflowVersionName }],
			}).expect(400);

			expect(await requestRepository.find()).toHaveLength(0);
			expect(await findVersionName(workflow.id, versionId)).toBeNull();
		});

		test('persists the version description alongside the name', async () => {
			const { workflow, versionId } = await createReviewableWorkflow();

			await postReview(ownerAgent, {
				title: 'Please review my workflow',
				workflows: [
					{
						workflowId: workflow.id,
						workflowVersionId: versionId,
						workflowVersionName: 'Release candidate',
						workflowVersionDescription: '  What changed in this version  ',
					},
				],
			}).expect(201);

			const version = await workflowHistoryRepository.findOneBy({
				workflowId: workflow.id,
				versionId,
			});
			expect(version?.name).toBe('Release candidate');
			expect(version?.description).toBe('What changed in this version');
		});

		test('returns 400 for a description longer than 2048 characters', async () => {
			const { workflow, versionId } = await createReviewableWorkflow();

			await postReview(ownerAgent, {
				title: 'Please review my workflow',
				workflows: [
					{
						workflowId: workflow.id,
						workflowVersionId: versionId,
						workflowVersionName: 'Release candidate',
						workflowVersionDescription: 'a'.repeat(2049),
					},
				],
			}).expect(400);

			expect(await requestRepository.find()).toHaveLength(0);
		});

		test('rolls the name back when the create conflicts with an open review', async () => {
			const { workflow, versionId } = await createReviewableWorkflow();
			await createOpenReview(workflow.id, versionId);

			await postReview(ownerAgent, {
				title: 'Second review',
				workflows: [
					{
						workflowId: workflow.id,
						workflowVersionId: versionId,
						workflowVersionName: 'Release candidate',
					},
				],
			}).expect(409);

			expect(await findVersionName(workflow.id, versionId)).toBeNull();
		});

		test('returns 400 for a name longer than 128 characters', async () => {
			const { workflow, versionId } = await createReviewableWorkflow();

			await postReview(ownerAgent, {
				title: 'Please review my workflow',
				workflows: [
					{
						workflowId: workflow.id,
						workflowVersionId: versionId,
						workflowVersionName: 'a'.repeat(129),
					},
				],
			}).expect(400);

			expect(await requestRepository.find()).toHaveLength(0);
			expect(await findVersionName(workflow.id, versionId)).toBeNull();
		});
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

	test('publishes the pinned version automatically when the review is approved', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await createOpenReview(workflow.id, versionId);

		const response = await ownerAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		expect(response.body.data.autoPublish).toEqual({ status: 'published' });
		expect(
			(await workflowEntityRepository.findOneByOrFail({ id: workflow.id })).activeVersionId,
		).toBe(versionId);
	});

	test('keeps the approval and allows manual publish when auto-publish fails', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await createOpenReview(workflow.id, versionId);

		// Activation fails once — after the approval has already committed.
		workflowValidationService.validateForActivation.mockReturnValueOnce({
			isValid: false,
			error: 'The workflow has issues',
		});

		const response = await ownerAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		expect(response.body.data).toMatchObject({
			state: 'closed',
			decision: 'approved',
			autoPublish: { status: 'failed', message: 'The workflow has issues' },
		});
		expect(
			(await workflowEntityRepository.findOneByOrFail({ id: workflow.id })).activeVersionId,
		).toBeNull();

		// Retry path: the review is closed, so the regular publish flow is unblocked.
		await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);

		expect(
			(await workflowEntityRepository.findOneByOrFail({ id: workflow.id })).activeVersionId,
		).toBe(versionId);
	});

	// R2 (P3): the previously covered case was a first publish, which fails safe.
	// A replacement does not. See .claude/plans/reviews/LIGO-787_review.md
	test('leaves an already published workflow deactivated when the approval publish fails at registration', async () => {
		const { workflow, versionId: firstVersionId } = await createReviewableWorkflow();

		// Publish once, so the approval below replaces a live version.
		await ownerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: firstVersionId })
			.expect(200);

		const secondVersionId = uuid();
		await createWorkflowHistoryItem(workflow.id, { versionId: secondVersionId });
		const request = await createOpenReview(workflow.id, secondVersionId);

		// Fails at trigger registration — after the live version was removed, so
		// activation rolls the row back to unpublished rather than restoring it.
		activeWorkflowManager.add.mockRejectedValueOnce(new Error('Webhook path already taken'));

		const response = await ownerAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		expect(response.body.data).toMatchObject({
			state: 'closed',
			decision: 'approved',
			autoPublish: { status: 'failed', message: 'Webhook path already taken' },
		});

		// The workflow that was live before the approval is now unpublished — which
		// is why the copy says so and the failure is logged at error level.
		const updated = await workflowEntityRepository.findOneByOrFail({ id: workflow.id });
		expect(updated.activeVersionId).toBeNull();
		expect(updated.active).toBe(false);
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
		overrides: {
			state?: 'open' | 'closed';
			decision?: 'pending' | 'changes_requested';
			description?: string | null;
		} = {},
	) {
		const request = await requestRepository.createRequest(
			{
				projectId,
				title: 'Existing review',
				createdById: author.id,
				...overrides,
			},
			{},
		);
		await workflowRepository.createWorkflowRow(
			{
				workflowReviewRequestId: request.id,
				workflowId,
				workflowVersionId: versionId,
			},
			{},
		);
		await authorRepository.addAuthor(
			{ workflowReviewRequestId: request.id, userId: author.id },
			{},
		);
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
			.send({
				workflowId: workflow.id,
				workflowVersionId: 'version-2',
				workflowVersionName: 'Release candidate',
			})
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

		const updated = await requestRepository.findById(request.id, {});
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
			.send({
				workflowId: workflow.id,
				workflowVersionId: 'version-2',
				workflowVersionName: 'Release candidate',
			})
			.expect(200);

		const authorRows = await authorRepository.find();
		expect(authorRows.map((row) => row.userId).sort()).toEqual([member.id, owner.id].sort());

		const updated = await requestRepository.findById(request.id, {});
		expect(updated).toMatchObject({ updatedById: member.id });

		// Both read surfaces expose every author while keeping the original requester
		// canonical. Author order is the frontend's concern, so only membership is asserted.
		const inbox = await ownerAgent.get('/workflow-review-requests/inbox').expect(200);
		const inboxItem = (inbox.body.data.data as WorkflowReviewInboxItem[]).find(
			(item) => item.id === request.id,
		)!;
		expect(inboxItem.requester).toMatchObject({ id: owner.id });
		expect(inboxItem.authors.map((author) => author.id).sort()).toEqual(
			[member.id, owner.id].sort(),
		);

		const detail = await ownerAgent.get(`/workflow-review-requests/${request.id}`).expect(200);
		expect(detail.body.data.requester).toMatchObject({ id: owner.id });
		expect(
			(detail.body.data as WorkflowReviewInboxItem).authors.map((author) => author.id).sort(),
		).toEqual([member.id, owner.id].sort());
	});

	test('returns 200 without writes when the version is unchanged', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await seedOpenRequest(workflow.id, versionId, owner, ownerProject.id, {
			decision: 'changes_requested',
		});

		const response = await ownerAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({
				workflowId: workflow.id,
				workflowVersionId: versionId,
				workflowVersionName: 'Release candidate',
			})
			.expect(200);

		// No-op: nothing new to review, so the decision is deliberately NOT reset.
		expect(response.body.data).toMatchObject({
			id: request.id,
			decision: 'changes_requested',
			workflowVersionId: versionId,
		});

		const unchanged = await requestRepository.findById(request.id, {});
		expect(unchanged?.updatedAt).toEqual(request.updatedAt);
		expect(unchanged?.decision).toBe('changes_requested');
	});

	test('updates the review description when re-pinning the version', async () => {
		const { workflow } = await createReviewableWorkflow('version-1');
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });
		const request = await seedOpenRequest(workflow.id, 'version-1', owner, ownerProject.id, {
			description: 'Original review description',
		});

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({
				workflowId: workflow.id,
				workflowVersionId: 'version-2',
				workflowVersionName: 'Release candidate',
				description: '  Updated review description  ',
			})
			.expect(200);

		const updated = await requestRepository.findById(request.id, {});
		expect(updated?.description).toBe('Updated review description');
	});

	test('updates the review description when the version is already pinned', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await seedOpenRequest(workflow.id, versionId, owner, ownerProject.id, {
			decision: 'changes_requested',
			description: 'Original review description',
		});

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({
				workflowId: workflow.id,
				workflowVersionId: versionId,
				workflowVersionName: 'Release candidate',
				description: 'Updated review description',
			})
			.expect(200);

		const updated = await requestRepository.findById(request.id, {});
		expect(updated).toMatchObject({
			description: 'Updated review description',
			decision: 'changes_requested',
		});
	});

	test('clears the review description when an empty string is sent', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await seedOpenRequest(workflow.id, versionId, owner, ownerProject.id, {
			description: 'Original review description',
		});

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({
				workflowId: workflow.id,
				workflowVersionId: versionId,
				workflowVersionName: 'Release candidate',
				description: '',
			})
			.expect(200);

		expect((await requestRepository.findById(request.id, {}))?.description).toBeNull();
	});

	test('returns 404 for an unknown review request id', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();

		await ownerAgent
			.post('/workflow-review-requests/unknown-request/update-version')
			.send({
				workflowId: workflow.id,
				workflowVersionId: versionId,
				workflowVersionName: 'Release candidate',
			})
			.expect(404);
	});

	test('returns 404 when the user has no access to the workflow', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await seedOpenRequest(workflow.id, versionId, owner);

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({
				workflowId: workflow.id,
				workflowVersionId: versionId,
				workflowVersionName: 'Release candidate',
			})
			.expect(404);
	});

	test('returns 404 when the request does not cover the given workflow', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const { workflow: otherWorkflow } = await createReviewableWorkflow('version-other');
		const request = await seedOpenRequest(workflow.id, versionId, owner);

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({
				workflowId: otherWorkflow.id,
				workflowVersionId: 'version-other',
				workflowVersionName: 'Release candidate',
			})
			.expect(404);
	});

	test('returns 409 for a closed review request', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await seedOpenRequest(workflow.id, versionId, owner, ownerProject.id, {
			state: 'closed',
		});

		const response = await ownerAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({
				workflowId: workflow.id,
				workflowVersionId: versionId,
				workflowVersionName: 'Release candidate',
			})
			.expect(409);

		expect(JSON.stringify(response.body)).not.toMatch(/sync/i);
	});

	test('returns 400 for an archived workflow', async () => {
		const workflow = await createWorkflow({ isArchived: true }, owner);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-1' });
		const request = await seedOpenRequest(workflow.id, 'version-1', owner);

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({
				workflowId: workflow.id,
				workflowVersionId: 'version-1',
				workflowVersionName: 'Release candidate',
			})
			.expect(400);
	});

	test('returns 400 for a version that does not exist for the workflow', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await seedOpenRequest(workflow.id, versionId, owner);

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({
				workflowId: workflow.id,
				workflowVersionId: 'unknown-version',
				workflowVersionName: 'Release candidate',
			})
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
			.send({
				workflowId: workflow.id,
				workflowVersionId: versionId,
				workflowVersionName: 'Release candidate',
			})
			.expect(403);
	});

	test('returns 403 when the license lacks feat:workflowReviews', async () => {
		testServer.license.disable('feat:workflowReviews');

		await ownerAgent
			.post('/workflow-review-requests/some-request/update-version')
			.send({
				workflowId: 'wf-1',
				workflowVersionId: 'version-1',
				workflowVersionName: 'Release candidate',
			})
			.expect(403);

		testServer.license.enable('feat:workflowReviews');
	});

	describe('pinned version naming', () => {
		test('names the newly pinned version', async () => {
			const { workflow } = await createReviewableWorkflow('version-1');
			await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });
			const request = await seedOpenRequest(workflow.id, 'version-1', owner);

			await ownerAgent
				.post(`/workflow-review-requests/${request.id}/update-version`)
				.send({
					workflowId: workflow.id,
					workflowVersionId: 'version-2',
					workflowVersionName: 'Release candidate',
				})
				.expect(200);

			expect(await findVersionName(workflow.id, 'version-2')).toBe('Release candidate');
			// The previously pinned version keeps whatever name it had.
			expect(await findVersionName(workflow.id, 'version-1')).toBeNull();
		});

		test('renames the version on a re-pin to the version already pinned', async () => {
			const { workflow, versionId } = await createReviewableWorkflow();
			const request = await seedOpenRequest(workflow.id, versionId, owner);

			await ownerAgent
				.post(`/workflow-review-requests/${request.id}/update-version`)
				.send({
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Renamed',
				})
				.expect(200);

			expect(await findVersionName(workflow.id, versionId)).toBe('Renamed');
			// Still a no-op for the review itself.
			const unchanged = await requestRepository.findById(request.id, {});
			expect(unchanged?.updatedAt).toEqual(request.updatedAt);
		});

		test('persists the version description on a re-pin', async () => {
			const { workflow } = await createReviewableWorkflow('version-1');
			await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });
			const request = await seedOpenRequest(workflow.id, 'version-1', owner);

			await ownerAgent
				.post(`/workflow-review-requests/${request.id}/update-version`)
				.send({
					workflowId: workflow.id,
					workflowVersionId: 'version-2',
					workflowVersionName: 'Release candidate',
					workflowVersionDescription: 'What changed in this version',
				})
				.expect(200);

			const version = await workflowHistoryRepository.findOneBy({
				workflowId: workflow.id,
				versionId: 'version-2',
			});
			expect(version?.description).toBe('What changed in this version');
		});

		test('updates the description of the version already pinned', async () => {
			const { workflow, versionId } = await createReviewableWorkflow();
			const request = await seedOpenRequest(workflow.id, versionId, owner);

			await ownerAgent
				.post(`/workflow-review-requests/${request.id}/update-version`)
				.send({
					workflowId: workflow.id,
					workflowVersionId: versionId,
					workflowVersionName: 'Release candidate',
					workflowVersionDescription: 'Description added later',
				})
				.expect(200);

			const version = await workflowHistoryRepository.findOneBy({
				workflowId: workflow.id,
				versionId,
			});
			expect(version?.description).toBe('Description added later');
			// Still a no-op for the review itself.
			const unchanged = await requestRepository.findById(request.id, {});
			expect(unchanged?.updatedAt).toEqual(request.updatedAt);
		});

		test.each([
			{ name: 'longer than 128 characters', workflowVersionName: 'a'.repeat(129) },
			{ name: 'missing', workflowVersionName: undefined },
			{ name: 'blank', workflowVersionName: '   ' },
		])(
			'returns 400 and re-pins nothing when the name is $name',
			async ({ workflowVersionName }) => {
				const { workflow } = await createReviewableWorkflow('version-1');
				await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });
				const request = await seedOpenRequest(workflow.id, 'version-1', owner);

				await ownerAgent
					.post(`/workflow-review-requests/${request.id}/update-version`)
					.send({
						workflowId: workflow.id,
						workflowVersionId: 'version-2',
						workflowVersionName,
					})
					.expect(400);

				const childRows = await workflowRepository.find();
				expect(childRows[0]).toMatchObject({ workflowVersionId: 'version-1' });
				expect(await findVersionName(workflow.id, 'version-2')).toBeNull();
			},
		);
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
		reviewerIds: string[] = [member.id],
	) {
		const workflow = await createWorkflow({}, teamProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-1' });
		const request = await requestRepository.createRequest(
			{
				projectId: teamProject.id,
				title: 'Review me',
				createdById: author.id,
				...overrides,
			},
			{},
		);
		await workflowRepository.createWorkflowRow(
			{
				workflowReviewRequestId: request.id,
				workflowId: workflow.id,
				workflowVersionId: 'version-1',
			},
			{},
		);
		await authorRepository.addAuthor(
			{ workflowReviewRequestId: request.id, userId: author.id },
			{},
		);
		if (reviewerIds.length > 0) {
			await reviewerRepository.addReviewers(
				{ workflowReviewRequestId: request.id, userIds: reviewerIds },
				{},
			);
		}
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
			autoPublish: { status: 'published' },
		});

		// the service relies on `save` (not `update`) so @BeforeUpdate bumps
		// updatedAt — assert the timestamp actually moves.
		expect(new Date(response.body.data.updatedAt).getTime()).toBeGreaterThan(seededUpdatedAt);

		const updated = await requestRepository.findById(request.id, {});
		expect(updated).toMatchObject({
			state: 'closed',
			decision: 'approved',
			updatedById: member.id,
			closedById: member.id,
		});
		expect(updated?.approvedAt).toBeInstanceOf(Date);
	});

	test('approval publishes the pinned version under the requester identity', async () => {
		const { request, workflow } = await seedRequest(owner);

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		expect(
			(await workflowEntityRepository.findOneByOrFail({ id: workflow.id })).activeVersionId,
		).toBe('version-1');
		// Publish history must record the requester, not the approving reviewer.
		const records = await publishHistoryRepository.findBy({ workflowId: workflow.id });
		expect(records).toEqual([
			expect.objectContaining({ event: 'activated', versionId: 'version-1', userId: owner.id }),
		]);
	});

	test('approval without a requester closes as system and reports the publish failure', async () => {
		const { request, workflow } = await seedRequest(owner);
		const current = await requestRepository.findById(request.id, {});
		current!.createdById = null;
		await requestRepository.saveRequest(current!, {});

		const response = await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		expect(response.body.data).toMatchObject({
			state: 'closed',
			decision: 'approved',
			autoPublish: {
				status: 'failed',
				message: 'The review requester is no longer available',
			},
		});
		expect(await requestRepository.findById(request.id, {})).toMatchObject({
			state: 'closed',
			decision: 'approved',
			closedById: null,
			updatedById: member.id,
		});
		expect(
			(await workflowEntityRepository.findOneByOrFail({ id: workflow.id })).activeVersionId,
		).toBeNull();
	});

	test('approval when the requester lost publish rights closes as system and reports the failure', async () => {
		const demotedRequester = await createUser();
		await linkUserToProject(demotedRequester, teamProject, 'project:editor');
		const { request, workflow } = await seedRequest(demotedRequester);
		// Downgrade after the review was opened — they can no longer publish.
		await linkUserToProject(demotedRequester, teamProject, 'project:viewer');

		const response = await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		expect(response.body.data).toMatchObject({
			state: 'closed',
			decision: 'approved',
			autoPublish: {
				status: 'failed',
				message: 'The review requester no longer has permission to publish this workflow',
			},
		});
		expect(await requestRepository.findById(request.id, {})).toMatchObject({
			state: 'closed',
			decision: 'approved',
			closedById: null,
		});
		expect(
			(await workflowEntityRepository.findOneByOrFail({ id: workflow.id })).activeVersionId,
		).toBeNull();
	});

	test('requests changes: the review stays open, unstamped and unpublished', async () => {
		const { request, workflow } = await seedRequest(owner);

		const response = await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'changes_requested' })
			.expect(200);

		expect(response.body.data).toMatchObject({
			state: 'open',
			decision: 'changes_requested',
		});
		expect(response.body.data.autoPublish).toBeUndefined();
		expect(
			(await workflowEntityRepository.findOneByOrFail({ id: workflow.id })).activeVersionId,
		).toBeNull();

		const updated = await requestRepository.findById(request.id, {});
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

		expect(await requestRepository.findById(request.id, {})).toMatchObject({
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

		expect(await requestRepository.findById(request.id, {})).toMatchObject({
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

		expect(await requestRepository.findById(request.id, {})).toMatchObject({
			state: 'open',
			decision: 'pending',
		});
	});

	test('returns 403 for a user who became an author via update-version', async () => {
		const { request, workflow } = await seedRequest(owner);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({
				workflowId: workflow.id,
				workflowVersionId: 'version-2',
				workflowVersionName: 'Release candidate',
			})
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

	test('returns 404 for a non-assigned editor', async () => {
		const { request } = await seedRequest(owner, {}, []);

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(404);
	});

	test('allows an assigned viewer to decide', async () => {
		const { request } = await seedRequest(owner, {}, [viewer.id]);

		await viewerAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'changes_requested' })
			.expect(200);

		expect(await requestRepository.findById(request.id, {})).toMatchObject({
			state: 'open',
			decision: 'changes_requested',
			updatedById: viewer.id,
		});
	});

	test('lets an assigned viewer approve and publishes under the requester identity', async () => {
		// The decider holds workflow:read only, so publishing can only work
		// because it runs as the requester.
		const { request, workflow } = await seedRequest(owner, {}, [viewer.id]);

		const response = await viewerAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		expect(response.body.data).toMatchObject({
			state: 'closed',
			decision: 'approved',
			autoPublish: { status: 'published' },
		});
		expect(await requestRepository.findById(request.id, {})).toMatchObject({
			state: 'closed',
			decision: 'approved',
			updatedById: viewer.id,
			closedById: viewer.id,
		});
		expect(
			(await workflowEntityRepository.findOneByOrFail({ id: workflow.id })).activeVersionId,
		).toBe('version-1');
		const records = await publishHistoryRepository.findBy({ workflowId: workflow.id });
		expect(records).toEqual([
			expect.objectContaining({ event: 'activated', versionId: 'version-1', userId: owner.id }),
		]);
	});

	test('returns 404 for a project:viewer who is not assigned', async () => {
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
		expect(await requestRepository.findById(request.id, {})).toMatchObject({
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
			ownerAgent.post(`/workflow-review-requests/${request.id}/update-version`).send({
				workflowId: workflow.id,
				workflowVersionId: 'version-2',
				workflowVersionName: 'Release candidate',
			}),
		]);

		// Whichever wins the lock, the loser must observe the winner's write:
		// either the sync lands first (both 200) or it conflicts on the closed request.
		expect(decide.status).toBe(200);
		expect([200, 409]).toContain(sync.status);

		const final = await requestRepository.findById(request.id, {});
		expect(final?.state === 'closed' && final?.decision === 'pending').toBe(false);
		expect(final).toMatchObject({ state: 'closed', decision: 'approved' });
	});
});

describe('GET /workflow-review-requests/eligible-reviewers', () => {
	test('returns project viewers, editors, and instance users, excluding everyone else', async () => {
		const project = await createTeamProject('team', owner);
		// The requester holds workflow:publish through project:editor
		await linkUserToProject(member, project, 'project:editor');

		const projectAdmin = await createUser();
		await linkUserToProject(projectAdmin, project, 'project:admin');
		const projectEditor = await createUser();
		await linkUserToProject(projectEditor, project, 'project:editor');
		const projectViewer = await createUser();
		await linkUserToProject(projectViewer, project, 'project:viewer');
		const globalAdmin = await createAdmin();

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

		expect(response.body.data.count).toBe(5);
		const ids = response.body.data.data.map((reviewer: { id: string }) => reviewer.id);
		expect(ids.sort()).toEqual(
			[owner.id, projectAdmin.id, projectEditor.id, projectViewer.id, globalAdmin.id].sort(),
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

		// The requesting owner is excluded; the plain member holds no read rights on this personal project
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
		await workflowRepository.createWorkflowRow(
			{
				workflowReviewRequestId: requestId,
				workflowId,
				workflowVersionId: versionId,
			},
			{},
		);
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
		const request = await requestRepository.createRequest(
			{
				projectId: ownerProject.id,
				title: 'Confidential title',
				description: 'Confidential description',
				createdById: owner.id,
			},
			{},
		);
		await linkRequestToWorkflow(request.id, workflow.id, versionId);
		await authorRepository.addAuthor({ workflowReviewRequestId: request.id, userId: owner.id }, {});

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
			// The owner can act on the review, so the description rides along; the
			// title stays off the workflow-scoped list entirely.
			description: 'Confidential description',
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			// Neither applies to a pending review
			decisionBy: null,
			approvedVersionPublicationState: null,
		});
	});

	test('withholds the description from a requester who cannot act on the review', async () => {
		const workflow = await createWorkflow({}, teamProject);
		const versionId = uuid();
		await createWorkflowHistoryItem(workflow.id, { versionId });
		const request = await requestRepository.createRequest(
			{
				projectId: teamProject.id,
				title: 'Confidential title',
				description: 'Confidential description',
				createdById: owner.id,
			},
			{},
		);
		await linkRequestToWorkflow(request.id, workflow.id, versionId);

		const viewerResponse = await viewerAgent
			.get('/workflow-review-requests')
			.query({ workflowId: workflow.id, take: 1 })
			.expect(200);
		expect(viewerResponse.body.data.data[0].description).toBeNull();

		const editorResponse = await memberAgent
			.get('/workflow-review-requests')
			.query({ workflowId: workflow.id, take: 1 })
			.expect(200);
		expect(editorResponse.body.data.data[0].description).toBe('Confidential description');
	});

	test('returns the newest review, closed included, with take=1 and no state filter', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const older = await requestRepository.createRequest(
			{
				projectId: ownerProject.id,
				state: 'closed',
				title: 'Older',
				createdById: owner.id,
			},
			{},
		);
		await linkRequestToWorkflow(older.id, workflow.id, versionId);
		const newest = await requestRepository.createRequest(
			{
				projectId: ownerProject.id,
				state: 'open',
				title: 'Newest',
				createdById: owner.id,
			},
			{},
		);
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
		const request = await requestRepository.createRequest(
			{
				projectId: ownerProject.id,
				decision: 'changes_requested',
				title: 'Needs work',
				createdById: owner.id,
				updatedById: member.id,
			},
			{},
		);
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
		const request = await requestRepository.createRequest(
			{
				projectId: ownerProject.id,
				decision: 'changes_requested',
				title: 'Needs work',
				createdById: owner.id,
				updatedById: reviewer.id,
			},
			{},
		);
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
		const request = await requestRepository.createRequest(
			{
				projectId: ownerProject.id,
				state: 'closed',
				decision: 'approved',
				title: 'Approved',
				createdById: owner.id,
				updatedById: member.id,
			},
			{},
		);
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
		const request = await requestRepository.createRequest(
			{
				projectId: ownerProject.id,
				state: 'closed',
				decision: 'approved',
				title: 'Approved',
				createdById: owner.id,
			},
			{},
		);
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
		const closed = await requestRepository.createRequest(
			{
				projectId: ownerProject.id,
				state: 'closed',
				title: 'Closed',
				createdById: owner.id,
			},
			{},
		);
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
		const request = await requestRepository.createRequest(
			{
				projectId: ownerProject.id,
				title: 'For the other workflow',
				createdById: owner.id,
			},
			{},
		);
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
		const request = await requestRepository.createRequest(
			{
				projectId: project.id,
				title: 'Open review',
				createdById: owner.id,
			},
			{},
		);
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

/** An open request only surfaces in the inbox while it covers a live workflow. */
async function linkToNewWorkflow(workflowReviewRequestId: string, project = teamProject) {
	const workflow = await createWorkflow({}, project);
	await workflowRepository.createWorkflowRow(
		{ workflowReviewRequestId, workflowId: workflow.id },
		{},
	);
	return workflow;
}

/** Seeds one open and one closed review, both with `member` as the assigned reviewer. */
async function seedInboxRequests() {
	const openRequest = await requestRepository.createRequest(
		{
			projectId: teamProject.id,
			title: 'Open review request',
			createdById: owner.id,
			state: 'open',
		},
		{},
	);
	const openWorkflow = await linkToNewWorkflow(openRequest.id);
	// No link row: a hard-deleted workflow leaves closed requests exactly like this
	const closedRequest = await requestRepository.createRequest(
		{
			projectId: teamProject.id,
			title: 'Closed review request',
			createdById: owner.id,
			state: 'closed',
		},
		{},
	);
	await reviewerRepository.addReviewers(
		{ workflowReviewRequestId: openRequest.id, userIds: [member.id] },
		{},
	);
	await reviewerRepository.addReviewers(
		{ workflowReviewRequestId: closedRequest.id, userIds: [member.id] },
		{},
	);
	return { openRequest, closedRequest, openWorkflow };
}

describe('GET /workflow-review-requests/summary', () => {
	test('returns open/closed counts for instance owner', async () => {
		await seedInboxRequests();

		const response = await ownerAgent.get('/workflow-review-requests/summary').expect(200);

		expect(response.body.data).toEqual({ open: 1, closed: 1 });
	});

	test('returns open/closed counts for an assigned reviewer', async () => {
		await seedInboxRequests();

		const response = await memberAgent.get('/workflow-review-requests/summary').expect(200);

		expect(response.body.data).toEqual({ open: 1, closed: 1 });
	});

	test('returns zero counts for an uninvolved project member', async () => {
		await seedInboxRequests();

		const response = await viewerAgent.get('/workflow-review-requests/summary').expect(200);

		expect(response.body.data).toEqual({ open: 0, closed: 0 });
	});

	test('counts a requester their own review even without publish scope', async () => {
		const ownRequest = await requestRepository.createRequest(
			{
				projectId: teamProject.id,
				title: 'Review submitted by viewer',
				createdById: viewer.id,
				state: 'open',
			},
			{},
		);
		// As the create endpoint does: a requester is always an author too.
		await authorRepository.addAuthor(
			{ workflowReviewRequestId: ownRequest.id, userId: viewer.id },
			{},
		);
		await linkToNewWorkflow(ownRequest.id);

		const response = await viewerAgent.get('/workflow-review-requests/summary').expect(200);

		expect(response.body.data).toEqual({ open: 1, closed: 0 });
	});

	test('still counts an open review orphaned by a workflow hard delete until a sweep closes it', async () => {
		await seedInboxRequests();
		const orphan = await requestRepository.createRequest(
			{
				projectId: teamProject.id,
				title: 'Orphaned review',
				createdById: owner.id,
				state: 'open',
			},
			{},
		);
		await reviewerRepository.addReviewers(
			{ workflowReviewRequestId: orphan.id, userIds: [member.id] },
			{},
		);
		const workflow = await linkToNewWorkflow(orphan.id);
		// Bypasses the auto-close hook and the sweep: the cascade removes the link
		// row and leaves the request open — visible until the next delete sweeps it
		await workflowEntityRepository.delete({ id: workflow.id });

		// Owner exercises the whole-inbox scope, member the involvement filter
		const ownerResponse = await ownerAgent.get('/workflow-review-requests/summary').expect(200);
		expect(ownerResponse.body.data).toEqual({ open: 2, closed: 1 });

		const memberResponse = await memberAgent.get('/workflow-review-requests/summary').expect(200);
		expect(memberResponse.body.data).toEqual({ open: 2, closed: 1 });
	});

	test('returns 403 when feature is disabled', async () => {
		await policyService.set(false);

		await ownerAgent.get('/workflow-review-requests/summary').expect(403);
	});
});

describe('GET /workflow-review-requests/inbox', () => {
	test('returns reviews for instance owner', async () => {
		const { openRequest, openWorkflow } = await seedInboxRequests();

		const response = await ownerAgent
			.get('/workflow-review-requests/inbox')
			.query({ state: 'open', limit: 15 })
			.expect(200);

		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0]).toMatchObject({
			id: openRequest.id,
			title: 'Open review request',
			state: 'open',
			workflowName: openWorkflow.name,
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

	test('still lists an open review orphaned by a workflow hard delete until a sweep closes it', async () => {
		const { openRequest } = await seedInboxRequests();
		const orphan = await requestRepository.createRequest(
			{
				projectId: teamProject.id,
				title: 'Orphaned review',
				createdById: owner.id,
				state: 'open',
			},
			{},
		);
		await reviewerRepository.addReviewers(
			{ workflowReviewRequestId: orphan.id, userIds: [member.id] },
			{},
		);
		const workflow = await linkToNewWorkflow(orphan.id);
		// Bypasses the auto-close hook and the sweep: the cascade removes the link
		// row and leaves the request open — visible until the next delete sweeps it
		await workflowEntityRepository.delete({ id: workflow.id });

		// Owner exercises the whole-inbox scope, member the involvement filter
		const ownerResponse = await ownerAgent
			.get('/workflow-review-requests/inbox')
			.query({ state: 'open', limit: 15 })
			.expect(200);
		expect(ownerResponse.body.data.data.map((row: { id: string }) => row.id).sort()).toEqual(
			[openRequest.id, orphan.id].sort(),
		);

		const memberResponse = await memberAgent
			.get('/workflow-review-requests/inbox')
			.query({ state: 'open', limit: 15 })
			.expect(200);
		expect(memberResponse.body.data.data.map((row: { id: string }) => row.id).sort()).toEqual(
			[openRequest.id, orphan.id].sort(),
		);
	});

	test('still lists a closed review whose workflow was hard-deleted', async () => {
		const { closedRequest } = await seedInboxRequests();

		const response = await ownerAgent
			.get('/workflow-review-requests/inbox')
			.query({ state: 'closed', limit: 15 })
			.expect(200);

		// The closed seed request has no link rows — deleted-workflow history stays visible
		expect(response.body.data.data).toEqual([
			expect.objectContaining({ id: closedRequest.id, state: 'closed', workflowName: null }),
		]);
	});

	test('returns 403 when license is disabled', async () => {
		testServer.license.disable('feat:workflowReviews');

		await ownerAgent.get('/workflow-review-requests/inbox').expect(403);
	});

	test('returns cursor pagination metadata', async () => {
		await seedInboxRequests();
		const secondRequest = await requestRepository.createRequest(
			{
				projectId: teamProject.id,
				title: 'Second open review',
				createdById: owner.id,
				state: 'open',
			},
			{},
		);
		await linkToNewWorkflow(secondRequest.id);

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
		const enrichedRequest = await requestRepository.createRequest(
			{
				projectId: teamProject.id,
				title: 'Enriched review request',
				createdById: owner.id,
				state: 'open',
			},
			{},
		);

		await workflowRepository.createWorkflowRow(
			{
				workflowReviewRequestId: enrichedRequest.id,
				workflowId: workflow.id,
			},
			{},
		);

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

	test('hides reviews from projects the member cannot read, even when assigned as reviewer', async () => {
		const otherProject = await createTeamProject('Other Reviews Project', owner);
		const privateRequest = await requestRepository.createRequest(
			{
				projectId: otherProject.id,
				title: 'Private other-project review',
				createdById: owner.id,
				state: 'open',
			},
			{},
		);
		await linkToNewWorkflow(privateRequest.id, otherProject);
		// Assignment alone must not widen visibility beyond readable projects
		await reviewerRepository.addReviewers(
			{ workflowReviewRequestId: privateRequest.id, userIds: [member.id] },
			{},
		);

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

	test("hides a requester's own review in a project they cannot read", async () => {
		const otherProject = await createTeamProject('Unrelated Project', owner);
		const ownRequest = await requestRepository.createRequest(
			{
				projectId: otherProject.id,
				title: 'Review I submitted',
				createdById: member.id,
				state: 'open',
			},
			{},
		);
		await linkToNewWorkflow(ownRequest.id, otherProject);

		const response = await memberAgent.get('/workflow-review-requests/inbox').expect(200);

		expect(response.body.data.data).toEqual([]);
	});

	test('shows a project admin every review in their project without involvement', async () => {
		const projectAdmin = await createMember();
		await linkUserToProject(projectAdmin, teamProject, 'project:admin');
		const { openRequest } = await seedInboxRequests();

		const response = await testServer
			.authAgentFor(projectAdmin)
			.get('/workflow-review-requests/inbox')
			.expect(200);

		expect(response.body.data.data).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: openRequest.id })]),
		);
	});

	test('does not truncate pagination when the cursor row is deleted', async () => {
		await seedInboxRequests();
		const secondRequest = await requestRepository.createRequest(
			{
				projectId: teamProject.id,
				title: 'Second open review',
				createdById: owner.id,
				state: 'open',
			},
			{},
		);
		await linkToNewWorkflow(secondRequest.id);

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
		const request = await requestRepository.createRequest(
			{
				projectId: teamProject.id,
				title: 'Needs review',
				createdById: owner.id,
				state: 'open',
			},
			{},
		);
		await linkToNewWorkflow(request.id);
		await reviewerRepository.addReviewers(
			{
				workflowReviewRequestId: request.id,
				userIds: [reviewer.id],
			},
			{},
		);

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
		const request = await requestRepository.createRequest(
			{
				projectId: teamProject.id,
				title: 'Authorless',
				createdById: null,
				state: 'open',
			},
			{},
		);
		await linkToNewWorkflow(request.id);

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
		const request = await requestRepository.createRequest(
			{
				projectId: teamProject.id,
				title: 'With departed users',
				createdById: departedCreator.id,
				state: 'open',
			},
			{},
		);
		await linkToNewWorkflow(request.id);
		await reviewerRepository.addReviewers(
			{
				workflowReviewRequestId: request.id,
				userIds: [survivingReviewer.id, departedReviewer.id],
			},
			{},
		);

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

	describe('category filter', () => {
		/** Mirrors the create endpoint: a requester always gets an author row too. */
		async function openReviewBy(
			createdById: string | null,
			title = 'Review',
			state: WorkflowReviewRequestState = 'open',
		) {
			const request = await requestRepository.createRequest(
				{ projectId: teamProject.id, title, createdById, state },
				{},
			);
			if (createdById) {
				await authorRepository.addAuthor(
					{ workflowReviewRequestId: request.id, userId: createdById },
					{},
				);
			}
			return request;
		}

		async function inbox(
			agent: SuperAgentTest,
			query: Record<string, unknown>,
		): Promise<{ ids: string[]; hasMore: boolean; nextCursor: string | null }> {
			const response = await agent
				.get('/workflow-review-requests/inbox')
				.query({ state: 'open', limit: 15, ...query })
				.expect(200);
			return {
				ids: response.body.data.data.map((row: { id: string }) => row.id),
				hasMore: response.body.data.hasMore,
				nextCursor: response.body.data.nextCursor,
			};
		}

		/** Assign `member` as reviewer so the review is visible to them at all. */
		async function assignMember(workflowReviewRequestId: string) {
			await reviewerRepository.addReviewers({ workflowReviewRequestId, userIds: [member.id] }, {});
		}

		test('splits the visible union by who authored each review', async () => {
			const mine = await openReviewBy(member.id, 'Submitted by me');
			const theirs = await openReviewBy(owner.id, 'Submitted by someone else');
			await assignMember(theirs.id);

			expect((await inbox(memberAgent, { category: 'authored' })).ids).toEqual([mine.id]);
			expect((await inbox(memberAgent, { category: 'waiting' })).ids).toEqual([theirs.id]);
		});

		test('the two categories add up to the unfiltered list', async () => {
			await openReviewBy(member.id, 'Mine');
			const theirs = await openReviewBy(owner.id, 'Theirs');
			await assignMember(theirs.id);
			const coAuthored = await openReviewBy(owner.id, 'Co-authored');
			await authorRepository.addAuthor(
				{ workflowReviewRequestId: coAuthored.id, userId: member.id },
				{},
			);

			const all = await inbox(memberAgent, {});
			const waiting = await inbox(memberAgent, { category: 'waiting' });
			const authored = await inbox(memberAgent, { category: 'authored' });

			expect([...waiting.ids, ...authored.ids].sort()).toEqual([...all.ids].sort());
			expect(waiting.ids.filter((id) => authored.ids.includes(id))).toEqual([]);
		});

		test('counts a co-author row as authorship, not just the creator', async () => {
			const request = await openReviewBy(owner.id, 'Created by owner');
			await authorRepository.addAuthor(
				{ workflowReviewRequestId: request.id, userId: member.id },
				{},
			);

			expect((await inbox(memberAgent, { category: 'authored' })).ids).toEqual([request.id]);
			expect((await inbox(memberAgent, { category: 'waiting' })).ids).toEqual([]);
		});

		test('keeps a review under waiting for its reviewer even after they submit a version to it', async () => {
			const workflow = await createWorkflow({}, teamProject);
			await createWorkflowHistoryItem(workflow.id, { versionId: 'version-1' });
			await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });
			const request = await openReviewBy(owner.id, 'Owner review');
			await workflowRepository.createWorkflowRow(
				{
					workflowReviewRequestId: request.id,
					workflowId: workflow.id,
					workflowVersionId: 'version-1',
				},
				{},
			);
			await authorRepository.addAuthor(
				{ workflowReviewRequestId: request.id, userId: owner.id },
				{},
			);
			await assignMember(request.id);

			expect((await inbox(memberAgent, { category: 'waiting' })).ids).toEqual([request.id]);

			await memberAgent
				.post(`/workflow-review-requests/${request.id}/update-version`)
				.send({
					workflowId: workflow.id,
					workflowVersionId: 'version-2',
					workflowVersionName: 'Release candidate',
				})
				.expect(200);

			// The reviewer assignment wins over the authorship the re-pin created:
			// a decision is still expected from them, so the review must not move.
			expect((await inbox(memberAgent, { category: 'waiting' })).ids).toEqual([request.id]);
			expect((await inbox(memberAgent, { category: 'authored' })).ids).toEqual([]);
		});

		test('puts an admin their own review under authored only, despite global scope', async () => {
			const admin = await createAdmin();
			const adminAgent = testServer.authAgentFor(admin);
			const adminReview = await openReviewBy(admin.id, 'Admin review');
			const otherReview = await openReviewBy(owner.id, 'Someone else review');

			expect((await inbox(adminAgent, { category: 'authored' })).ids).toEqual([adminReview.id]);
			expect((await inbox(adminAgent, { category: 'waiting' })).ids).toEqual([otherReview.id]);
		});

		// The inbox checks access to the covered workflow, so link one the member
		// really cannot reach. R1/R2 (P1/P3), see LIGO-949_review.md.
		async function openUnreachableReview(createdById: string, title: string) {
			const otherProject = await createTeamProject('Unreachable Project', owner);
			const unreachableWorkflow = await createWorkflow({}, otherProject);
			const request = await requestRepository.createRequest(
				{ projectId: otherProject.id, title, createdById, state: 'open' },
				{},
			);
			await workflowRepository.createWorkflowRow(
				{ workflowReviewRequestId: request.id, workflowId: unreachableWorkflow.id },
				{},
			);
			return request;
		}

		test("hides a creator's review once they cannot read the workflow it covers", async () => {
			await openUnreachableReview(member.id, 'Review I submitted elsewhere');

			expect((await inbox(memberAgent, { category: 'authored' })).ids).toEqual([]);
			expect((await inbox(memberAgent, { category: 'waiting' })).ids).toEqual([]);
			expect((await inbox(memberAgent, {})).ids).toEqual([]);
		});

		test('hides a co-authored review from both categories when its workflow is unreadable', async () => {
			const request = await openUnreachableReview(owner.id, 'Out of reach');
			await authorRepository.addAuthor(
				{ workflowReviewRequestId: request.id, userId: member.id },
				{},
			);

			expect((await inbox(memberAgent, { category: 'authored' })).ids).toEqual([]);
			expect((await inbox(memberAgent, { category: 'waiting' })).ids).toEqual([]);
			expect((await inbox(memberAgent, {})).ids).toEqual([]);
		});

		// Sharing a workflow grants read on it without joining any of the review's
		// projects. R1 (P1), see LIGO-949_review.md.
		test('shows a requester the review for a workflow shared only with them', async () => {
			const sharedWorkflow = await createWorkflow({}, owner);
			await shareWorkflowWithUsers(sharedWorkflow, [member]);
			const request = await requestRepository.createRequest(
				{
					projectId: ownerProject.id,
					title: 'Shared with me',
					createdById: member.id,
					state: 'open',
				},
				{},
			);
			await authorRepository.addAuthor(
				{ workflowReviewRequestId: request.id, userId: member.id },
				{},
			);
			await workflowRepository.createWorkflowRow(
				{ workflowReviewRequestId: request.id, workflowId: sharedWorkflow.id },
				{},
			);

			expect((await inbox(memberAgent, { category: 'authored' })).ids).toEqual([request.id]);
		});

		// The negation has to be NULL-safe: `createdById` is nullable once the creator
		// is deleted, and those reviews still need somewhere to show up.
		test('keeps a review whose creator is gone under waiting', async () => {
			const orphan = await openReviewBy(null, 'Creatorless');
			await assignMember(orphan.id);

			// The reviewer reaches it through their assignment; the owner through the
			// NULL-safe authorship negation (they see everything, and author nobody's).
			expect((await inbox(memberAgent, { category: 'waiting' })).ids).toEqual([orphan.id]);
			expect((await inbox(memberAgent, { category: 'authored' })).ids).toEqual([]);
			expect((await inbox(ownerAgent, { category: 'waiting' })).ids).toEqual([orphan.id]);
			expect((await inbox(ownerAgent, { category: 'authored' })).ids).toEqual([]);
		});

		test('paginates each category with its own independent cursor', async () => {
			const waitingOlder = await openReviewBy(owner.id, 'Waiting older');
			const waitingNewer = await openReviewBy(owner.id, 'Waiting newer');
			await assignMember(waitingOlder.id);
			await assignMember(waitingNewer.id);
			const authored = await openReviewBy(member.id, 'Authored only');

			const firstWaitingPage = await inbox(memberAgent, { category: 'waiting', limit: 1 });
			expect(firstWaitingPage.ids).toHaveLength(1);
			expect(firstWaitingPage.hasMore).toBe(true);

			const secondWaitingPage = await inbox(memberAgent, {
				category: 'waiting',
				limit: 1,
				cursor: firstWaitingPage.nextCursor,
			});
			expect(secondWaitingPage.hasMore).toBe(false);
			expect([...firstWaitingPage.ids, ...secondWaitingPage.ids].sort()).toEqual(
				[waitingOlder.id, waitingNewer.id].sort(),
			);

			// The authored section paginates on its own, unaffected by the waiting cursor.
			const authoredPage = await inbox(memberAgent, { category: 'authored', limit: 1 });
			expect(authoredPage.ids).toEqual([authored.id]);
			expect(authoredPage.hasMore).toBe(false);
			expect(authoredPage.nextCursor).toBeNull();
		});

		// The category filter ignores `state`, even though the editor sends it only
		// for open reviews.
		test('filters closed reviews by category too', async () => {
			const closedMine = await openReviewBy(member.id, 'Closed mine', 'closed');
			await openReviewBy(owner.id, 'Closed theirs', 'closed');

			expect((await inbox(memberAgent, { state: 'closed', category: 'authored' })).ids).toEqual([
				closedMine.id,
			]);
		});

		test('returns 400 for an unknown category', async () => {
			await ownerAgent
				.get('/workflow-review-requests/inbox')
				.query({ state: 'open', limit: 15, category: 'bogus' })
				.expect(400);
		});
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
		const request = await requestRepository.createRequest(
			{
				projectId,
				title: 'Please review',
				description: 'Some context',
				createdById: author.id,
			},
			{},
		);
		await workflowRepository.createWorkflowRow(
			{
				workflowReviewRequestId: request.id,
				workflowId,
				workflowVersionId: versionId,
			},
			{},
		);
		await authorRepository.addAuthor(
			{ workflowReviewRequestId: request.id, userId: author.id },
			{},
		);
		return request;
	}

	/**
	 * Seed a review in `teamProject` pinned to a workflow that has moved out of
	 * `author`'s reach, covering a second workflow that is still readable. Row ids
	 * are explicit — id ASC decides which row counts as pinned.
	 */
	async function seedTwoWorkflowRequest(author: User) {
		const destinationProject = await createTeamProject('Moved Away', owner);
		const movedWorkflow = await createWorkflow({}, destinationProject);
		await createWorkflowHistoryItem(movedWorkflow.id, { versionId: 'version-pinned' });
		const readableWorkflow = await createWorkflow({ name: 'Still readable' }, teamProject);
		const request = await requestRepository.createRequest(
			{ projectId: teamProject.id, title: 'Please review', createdById: author.id },
			{},
		);
		await workflowRepository.createWorkflowRow(
			{
				id: '1-pinned-row',
				workflowReviewRequestId: request.id,
				workflowId: movedWorkflow.id,
				workflowVersionId: 'version-pinned',
			},
			{},
		);
		await workflowRepository.createWorkflowRow(
			{ id: '2-extra-row', workflowReviewRequestId: request.id, workflowId: readableWorkflow.id },
			{},
		);
		await authorRepository.addAuthor(
			{ workflowReviewRequestId: request.id, userId: author.id },
			{},
		);
		return { request, movedWorkflow, readableWorkflow };
	}

	test('returns the review, the workflows it covers, and both versions to compare', async () => {
		const workflow = await createWorkflow({ name: 'Reviewed workflow' }, teamProject);
		const baseline = await createWorkflowHistoryItem(workflow.id, {
			versionId: 'version-published',
		});
		await createWorkflowHistoryItem(workflow.id, {
			versionId: 'version-pinned',
			name: 'Release candidate',
		});
		await publishedVersionRepository.setPublishedVersion(workflow.id, baseline.versionId);
		const reviewer = await createAdmin();
		const request = await seedRequest(workflow.id, 'version-pinned', owner);
		await reviewerRepository.addReviewers(
			{
				workflowReviewRequestId: request.id,
				userIds: [reviewer.id],
			},
			{},
		);

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
			// The diff labels each side by name, so it travels with the snapshot
			name: 'Release candidate',
			connections: {},
			nodeGroups: [],
		});
		expect(child.pinnedVersion.nodes).toHaveLength(1);
		expect(child.pinnedVersion.nodes[0]).toMatchObject({ name: 'Start' });
		expect(child.pinnedVersion).not.toHaveProperty('authors');
		expect(child.baselineVersion).toMatchObject({
			versionId: 'version-published',
			name: null,
		});
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

	test('still opens an open review after its workflow was hard-deleted', async () => {
		const workflow = await createWorkflow({}, teamProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-pinned' });
		const request = await seedRequest(workflow.id, 'version-pinned', owner);

		// Bypasses the auto-close hook and the sweep: the cascade removes the link
		// row and leaves the request open until the next delete sweeps it closed
		await workflowEntityRepository.delete({ id: workflow.id });

		const response = await ownerAgent.get(`/workflow-review-requests/${request.id}`).expect(200);

		expect(response.body.data.id).toBe(request.id);
		expect(response.body.data.state).toBe('open');
		expect(response.body.data.workflows).toEqual([]);
		expect(response.body.data.workflowName).toBeNull();
	});

	test('still opens a closed review after its workflow was deleted', async () => {
		const workflow = await createWorkflow({}, teamProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-pinned' });
		const request = await requestRepository.createRequest(
			{
				projectId: teamProject.id,
				title: 'Please review',
				createdById: owner.id,
				state: 'closed',
				decision: 'approved',
			},
			{},
		);
		await workflowRepository.createWorkflowRow(
			{
				workflowReviewRequestId: request.id,
				workflowId: workflow.id,
				workflowVersionId: 'version-pinned',
			},
			{},
		);

		// Deleting the workflow removes the review's reference, not its history
		await workflowEntityRepository.delete({ id: workflow.id });

		const response = await ownerAgent.get(`/workflow-review-requests/${request.id}`).expect(200);

		expect(response.body.data.id).toBe(request.id);
		expect(response.body.data.workflows).toEqual([]);
		expect(response.body.data.workflowName).toBeNull();
		expect(response.body.data.workflowVersionId).toBeNull();
	});

	test('lets an assigned reviewer in the review project open it', async () => {
		const workflow = await createWorkflow({}, teamProject);
		const request = await seedRequest(workflow.id, null, owner);
		await reviewerRepository.addReviewers(
			{ workflowReviewRequestId: request.id, userIds: [member.id] },
			{},
		);

		const response = await memberAgent.get(`/workflow-review-requests/${request.id}`).expect(200);

		expect(response.body.data.id).toBe(request.id);
	});

	test('lets a project admin open a review in their project without involvement', async () => {
		const projectAdmin = await createMember();
		await linkUserToProject(projectAdmin, teamProject, 'project:admin');
		const workflow = await createWorkflow({}, teamProject);
		const request = await seedRequest(workflow.id, null, owner);

		const response = await testServer
			.authAgentFor(projectAdmin)
			.get(`/workflow-review-requests/${request.id}`)
			.expect(200);

		expect(response.body.data.id).toBe(request.id);
	});

	test('hides the review from an uninvolved project member', async () => {
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

	test('hides the review once its workflow moves to a project the reviewer cannot see', async () => {
		// The review still points at `teamProject`, where member is assigned as reviewer,
		// while the workflow itself has moved to a project member has no access to
		const destinationProject = await createTeamProject('Destination Project', owner);
		const workflow = await createWorkflow({}, destinationProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-pinned' });
		const request = await seedRequest(workflow.id, 'version-pinned', owner, teamProject.id);
		await reviewerRepository.addReviewers(
			{ workflowReviewRequestId: request.id, userIds: [member.id] },
			{},
		);

		await memberAgent.get(`/workflow-review-requests/${request.id}`).expect(404);
	});

	test('hides the review from its requester once they can read none of its workflows', async () => {
		// Viewer asked for the review while the workflow was reachable; it has since
		// moved to a project they have no access to. Seeing a review requires still
		// holding read on what it reviews — requesters included.
		const destinationProject = await createTeamProject('Moved Away', owner);
		const workflow = await createWorkflow({}, destinationProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-pinned' });
		const request = await seedRequest(workflow.id, 'version-pinned', viewer, teamProject.id);

		await viewerAgent.get(`/workflow-review-requests/${request.id}`).expect(404);
	});

	test('leaves out a workflow the requester can no longer see while another keeps the review open', async () => {
		// The pinned workflow moved out of reach, but a second covered workflow is
		// still readable — the review opens without the unreadable content.
		const { request, readableWorkflow } = await seedTwoWorkflowRequest(viewer);

		const response = await viewerAgent.get(`/workflow-review-requests/${request.id}`).expect(200);

		expect(response.body.data.id).toBe(request.id);
		expect(response.body.data.workflows).toEqual([
			expect.objectContaining({ workflowId: readableWorkflow.id }),
		]);
	});

	test('shows requesters the review they asked for while they can read in its project', async () => {
		const workflow = await createWorkflow({}, teamProject);
		const request = await seedRequest(workflow.id, null, viewer);

		const response = await viewerAgent.get(`/workflow-review-requests/${request.id}`).expect(200);

		expect(response.body.data.id).toBe(request.id);
	});

	describe('viewer decision eligibility', () => {
		test('tells an assigned reviewer that they can decide', async () => {
			const workflow = await createWorkflow({}, teamProject);
			const request = await seedRequest(workflow.id, null, owner);
			await reviewerRepository.addReviewers(
				{ workflowReviewRequestId: request.id, userIds: [member.id] },
				{},
			);

			const response = await memberAgent.get(`/workflow-review-requests/${request.id}`).expect(200);

			expect(response.body.data.viewerCanDecide).toBe(true);
			expect(response.body.data.viewerDecisionIneligibilityReason).toBeNull();
		});

		// Nobody is left who is neither admin, author, nor reviewer, so
		// `missing_reviewer_permission` cannot happen over HTTP. The eligibility service
		// unit tests cover that branch.

		test('tells an assigned author why they cannot decide their own review', async () => {
			const workflow = await createWorkflow({}, teamProject);
			const request = await seedRequest(workflow.id, null, member);
			await reviewerRepository.addReviewers(
				{ workflowReviewRequestId: request.id, userIds: [member.id] },
				{},
			);

			const response = await memberAgent.get(`/workflow-review-requests/${request.id}`).expect(200);

			expect(response.body.data.viewerCanDecide).toBe(false);
			expect(response.body.data.viewerDecisionIneligibilityReason).toBe('author');
		});

		test('lets an instance admin decide a review they authored', async () => {
			const workflow = await createWorkflow({}, teamProject);
			const request = await seedRequest(workflow.id, null, owner);

			const response = await ownerAgent.get(`/workflow-review-requests/${request.id}`).expect(200);

			expect(response.body.data.viewerCanDecide).toBe(true);
			expect(response.body.data.viewerDecisionIneligibilityReason).toBeNull();
		});

		test('reports missing permission once the pinned workflow moved out of the requester reach', async () => {
			// The pinned workflow moved away while a second one keeps the review
			// readable: the requester keeps the record, but could no longer decide —
			// and the reason says why.
			const { request } = await seedTwoWorkflowRequest(viewer);

			const response = await viewerAgent.get(`/workflow-review-requests/${request.id}`).expect(200);

			expect(response.body.data.viewerCanDecide).toBe(false);
			expect(response.body.data.viewerDecisionIneligibilityReason).toBe('missing_permission');
		});
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
