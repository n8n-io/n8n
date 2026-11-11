import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	WorkflowHistoryRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { createAdmin } from '@test-integration/db/users';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import {
	createReviewableWorkflow,
	findVersionName,
	REVIEW_TABLES,
	reviewPayload,
	seedReview,
	seedReviewActors,
	stubWorkflowValidation,
} from './support/workflow-review-test-data';

mockInstance(ActiveWorkflowManager);
const workflowValidationService = mockInstance(WorkflowValidationService);

const testServer = utils.setupTestServer({
	endpointGroups: ['workflow-reviews', 'workflows'],
	enabledFeatures: ['feat:workflowReviews'],
	modules: ['workflow-reviews'],
});

let owner: User;
let member: User;
let ownerProject: Project;
let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;
/** A global admin, so it is publish-capable on every project under test. */
let reviewer: User;

let requestRepository: WorkflowReviewRequestRepository;
let workflowRepository: WorkflowReviewRequestWorkflowRepository;
let authorRepository: WorkflowReviewRequestAuthorRepository;
let reviewerRepository: WorkflowReviewRequestReviewerRepository;
let workflowHistoryRepository: WorkflowHistoryRepository;
let policyService: WorkflowReviewPolicyService;

beforeAll(async () => {
	await utils.initNodeTypes();
	requestRepository = Container.get(WorkflowReviewRequestRepository);
	workflowRepository = Container.get(WorkflowReviewRequestWorkflowRepository);
	authorRepository = Container.get(WorkflowReviewRequestAuthorRepository);
	reviewerRepository = Container.get(WorkflowReviewRequestReviewerRepository);
	workflowHistoryRepository = Container.get(WorkflowHistoryRepository);
	policyService = Container.get(WorkflowReviewPolicyService);
});

beforeEach(async () => {
	testServer.license.enable('feat:workflowReviews');
	await testDb.truncate([...REVIEW_TABLES]);
	await policyService.set(true);
	stubWorkflowValidation(workflowValidationService);

	({ owner, member, ownerProject, ownerAgent, memberAgent } = await seedReviewActors(
		testServer.authAgentFor,
	));
	reviewer = await createAdmin();
});

/**
 * A reviewer is mandatory, so default one in. Tests asserting on reviewers pass
 * their own `reviewerUserIds`, which overrides the default.
 */
const postReview = (agent: SuperAgentTest, body: object) =>
	agent.post('/workflow-review-requests').send({ reviewerUserIds: [reviewer.id], ...body });

describe('POST /workflow-review-requests', () => {
	test('opens a review with its workflow reference and author', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);

		const response = await postReview(
			ownerAgent,
			reviewPayload({
				workflowId: workflow.id,
				versionId,
				title: 'Please review my workflow',
				description: 'It is ready',
			}),
		).expect(201);

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
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const secondReviewer = await createAdmin();

		await postReview(ownerAgent, {
			...reviewPayload({ workflowId: workflow.id, versionId, title: 'With a reviewer' }),
			reviewerUserIds: [secondReviewer.id, secondReviewer.id],
		}).expect(201);

		const reviewerRows = await reviewerRepository.find();
		expect(reviewerRows).toHaveLength(1);
		expect(reviewerRows[0]).toMatchObject({ userId: secondReviewer.id });
	});

	test('refuses a requester who assigns themselves as reviewer', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);

		await postReview(ownerAgent, {
			...reviewPayload({ workflowId: workflow.id, versionId }),
			reviewerUserIds: [owner.id],
		}).expect(400);

		expect(await requestRepository.find()).toHaveLength(0);
	});

	test('refuses a reviewer who cannot read the workflow, and writes nothing', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);

		// A plain member has no publish rights on the owner's personal project
		await postReview(ownerAgent, {
			...reviewPayload({ workflowId: workflow.id, versionId }),
			reviewerUserIds: [member.id],
		}).expect(400);

		expect(await requestRepository.find()).toHaveLength(0);
		expect(await reviewerRepository.find()).toHaveLength(0);
	});

	test('refuses a version that belongs to another workflow', async () => {
		const { workflow } = await createReviewableWorkflow(owner, { versionId: 'version-a' });
		const other = await createWorkflow({}, owner);
		await createWorkflowHistoryItem(other.id, { versionId: 'version-b' });

		await postReview(
			ownerAgent,
			reviewPayload({ workflowId: workflow.id, versionId: 'version-b' }),
		).expect(400);
	});

	test('trims the review description on create', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);

		await postReview(
			ownerAgent,
			reviewPayload({ workflowId: workflow.id, versionId, description: '  It is ready  ' }),
		).expect(201);

		const requests = await requestRepository.find();
		expect(requests[0].description).toBe('It is ready');
	});

	test.each([
		{ name: 'an empty', description: '' },
		{ name: 'a whitespace-only', description: '   ' },
	])('stores $name review description as null on create', async ({ description }) => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);

		await postReview(
			ownerAgent,
			reviewPayload({ workflowId: workflow.id, versionId, description }),
		).expect(201);

		const requests = await requestRepository.find();
		expect(requests[0].description).toBeNull();
	});

	test('refuses an archived workflow', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner, { isArchived: true });

		await postReview(ownerAgent, reviewPayload({ workflowId: workflow.id, versionId })).expect(400);
	});

	test('hides a workflow that does not exist', async () => {
		await postReview(
			ownerAgent,
			reviewPayload({ workflowId: 'unknown-workflow', versionId: 'version-1' }),
		).expect(404);
	});

	test('hides a workflow the caller cannot access', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);

		await postReview(memberAgent, reviewPayload({ workflowId: workflow.id, versionId })).expect(
			404,
		);
	});

	test('hides a workflow the caller can only view', async () => {
		const project = await createTeamProject('team', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const { workflow, versionId } = await createReviewableWorkflow(project);

		await postReview(memberAgent, reviewPayload({ workflowId: workflow.id, versionId })).expect(
			404,
		);
	});

	test('lets anyone who can publish the workflow ask for a review', async () => {
		const project = await createTeamProject('team', owner);
		await linkUserToProject(member, project, 'project:editor');
		const { workflow, versionId } = await createReviewableWorkflow(project);

		await postReview(memberAgent, reviewPayload({ workflowId: workflow.id, versionId })).expect(
			201,
		);
	});

	test('refuses a second review and points at the one already open', async () => {
		const { workflow } = await createReviewableWorkflow(owner, { versionId: 'version-1' });
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });

		const existing = await seedReview({
			projectId: ownerProject.id,
			workflowId: workflow.id,
			versionId: 'version-1',
			author: owner,
			title: 'Existing',
		});

		const response = await postReview(
			ownerAgent,
			reviewPayload({ workflowId: workflow.id, versionId: 'version-2', title: 'New' }),
		).expect(409);

		expect(response.body.meta.workflowReviewRequestId).toBe(existing.id);
		expect(JSON.stringify(response.body)).not.toMatch(/sync/i);
		// No new rows written.
		expect(await requestRepository.find()).toHaveLength(1);
		expect(await workflowRepository.find()).toHaveLength(1);
	});

	test('refuses a second review while the approved one is still open', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);

		const existing = await seedReview({
			projectId: ownerProject.id,
			workflowId: workflow.id,
			versionId,
			author: owner,
			state: 'open',
			decision: 'approved',
			title: 'Existing',
		});

		const response = await postReview(
			ownerAgent,
			reviewPayload({ workflowId: workflow.id, versionId, title: 'New' }),
		).expect(409);

		expect(response.body.meta.workflowReviewRequestId).toBe(existing.id);
	});

	test('opens a new review once the previous one is closed', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);

		await seedReview({
			projectId: ownerProject.id,
			workflowId: workflow.id,
			versionId,
			author: owner,
			state: 'closed',
			title: 'Closed',
		});

		await postReview(
			ownerAgent,
			reviewPayload({ workflowId: workflow.id, versionId, title: 'New' }),
		).expect(201);

		const openRequests = await requestRepository.find({ where: { state: 'open' } });
		expect(openRequests).toHaveLength(1);
	});

	test('lets only one of two simultaneous submissions win', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const body = reviewPayload({ workflowId: workflow.id, versionId, title: 'Race' });

		const [first, second] = await Promise.all([
			postReview(ownerAgent, body),
			postReview(ownerAgent, body),
		]);

		expect([first.status, second.status].sort()).toEqual([201, 409]);

		const openRequests = await requestRepository.find({ where: { state: 'open' } });
		expect(openRequests).toHaveLength(1);
		expect(await workflowRepository.find()).toHaveLength(1);
	});

	test('stops accepting reviews the moment an admin turns them off', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);

		// Enabled (from beforeEach) → allowed.
		await postReview(
			ownerAgent,
			reviewPayload({ workflowId: workflow.id, versionId, title: 'First' }),
		).expect(201);

		// Disabled → rejected, even for an otherwise valid request.
		await policyService.set(false);
		const other = await createReviewableWorkflow(owner, { versionId: 'v-other' });

		await postReview(
			ownerAgent,
			reviewPayload({
				workflowId: other.workflow.id,
				versionId: other.versionId,
				title: 'Second',
			}),
		).expect(403);
	});

	test('refuses everything on an instance without a workflow reviews licence', async () => {
		testServer.license.disable('feat:workflowReviews');

		await postReview(
			ownerAgent,
			reviewPayload({ workflowId: 'wf-1', versionId: 'version-1' }),
		).expect(403);

		testServer.license.enable('feat:workflowReviews');
	});

	describe('pinned version naming', () => {
		test('names the pinned version', async () => {
			const { workflow, versionId } = await createReviewableWorkflow(owner);

			await postReview(ownerAgent, reviewPayload({ workflowId: workflow.id, versionId })).expect(
				201,
			);

			expect(await findVersionName(workflow.id, versionId)).toBe('Release candidate');
		});

		test('persists the version description alongside the name', async () => {
			const { workflow, versionId } = await createReviewableWorkflow(owner);

			await postReview(
				ownerAgent,
				reviewPayload({
					workflowId: workflow.id,
					versionId,
					versionDescription: '  What changed in this version  ',
				}),
			).expect(201);

			const version = await workflowHistoryRepository.findOneBy({
				workflowId: workflow.id,
				versionId,
			});
			expect(version?.name).toBe('Release candidate');
			expect(version?.description).toBe('What changed in this version');
		});

		test('rolls the name back when the create conflicts with an open review', async () => {
			const { workflow, versionId } = await createReviewableWorkflow(owner);
			await seedReview({
				projectId: ownerProject.id,
				workflowId: workflow.id,
				versionId,
				author: owner,
			});

			await postReview(
				ownerAgent,
				reviewPayload({ workflowId: workflow.id, versionId, title: 'Second review' }),
			).expect(409);

			expect(await findVersionName(workflow.id, versionId)).toBeNull();
		});
	});
});
