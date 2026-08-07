process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';

import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	WorkflowReviewActivityRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { createMember, createOwner } from '@test-integration/db/users';
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
let teamProject: Project;
let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;
let viewerAgent: SuperAgentTest;

let requestRepository: WorkflowReviewRequestRepository;
let workflowRepository: WorkflowReviewRequestWorkflowRepository;
let authorRepository: WorkflowReviewRequestAuthorRepository;
let activityRepository: WorkflowReviewActivityRepository;
let policyService: WorkflowReviewPolicyService;

beforeAll(async () => {
	await utils.initNodeTypes();
	requestRepository = Container.get(WorkflowReviewRequestRepository);
	workflowRepository = Container.get(WorkflowReviewRequestWorkflowRepository);
	authorRepository = Container.get(WorkflowReviewRequestAuthorRepository);
	activityRepository = Container.get(WorkflowReviewActivityRepository);
	policyService = Container.get(WorkflowReviewPolicyService);
});

beforeEach(async () => {
	process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';
	testServer.license.enable('feat:workflowReviews');

	await testDb.truncate([
		'WorkflowReviewActivityComment',
		'WorkflowReviewActivity',
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

	await policyService.set(true);
	workflowValidationService.validateForActivation.mockReturnValue({ isValid: true });
	workflowValidationService.validateDynamicCredentials.mockResolvedValue({ isValid: true });
	workflowValidationService.validateSubWorkflowReferences.mockResolvedValue({ isValid: true });

	owner = await createOwner();
	member = await createMember();
	viewer = await createMember();
	teamProject = await createTeamProject('Reviews Project', owner);
	await linkUserToProject(member, teamProject, 'project:editor');
	await linkUserToProject(viewer, teamProject, 'project:viewer');

	ownerAgent = testServer.authAgentFor(owner);
	memberAgent = testServer.authAgentFor(member);
	viewerAgent = testServer.authAgentFor(viewer);
});

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
	await authorRepository.addAuthor({ workflowReviewRequestId: request.id, userId: author.id }, {});
	return request;
}

async function seedReviewInTeamProject(author: User) {
	const workflow = await createWorkflow({ name: 'Reviewed workflow' }, teamProject);
	await createWorkflowHistoryItem(workflow.id, { versionId: 'version-pinned' });
	const request = await seedRequest(workflow.id, 'version-pinned', author);
	return { workflow, request };
}

type FeedEntry = {
	id: string;
	type: string;
	data: unknown;
	createdBy: unknown;
	messages?: Array<{ body: string | null; createdBy: unknown; deletedAt: string | null }>;
};

async function getActivity(agent: SuperAgentTest, requestId: string, limit?: number) {
	const response = await agent
		.get(`/workflow-review-requests/${requestId}/activity`)
		.query(limit === undefined ? {} : { limit })
		.expect(200);
	return response.body.data as {
		data: FeedEntry[];
		nextCursor: string | null;
		hasMore: boolean;
	};
}

describe('Reading the activity feed', () => {
	/** Non-comment entries, cheap to seed and enough to pin the paging arithmetic. */
	async function seedEntries(workflowReviewRequestId: string, count: number) {
		const ids: string[] = [];
		for (let index = 0; index < count; index++) {
			const entry = await activityRepository.createActivity(
				{
					workflowReviewRequestId,
					type: 'review.opened',
					data: { index },
					createdById: owner.id,
				},
				{},
			);
			ids.push(String(entry.id));
		}
		return ids;
	}

	test('shows an empty feed for a review that has no activity — nothing is backfilled', async () => {
		const { request } = await seedReviewInTeamProject(owner);

		expect(await getActivity(ownerAgent, request.id)).toEqual({
			data: [],
			nextCursor: null,
			hasMore: false,
		});
	});

	test('pages backwards from the newest entry without skipping or repeating', async () => {
		const { request } = await seedReviewInTeamProject(owner);
		const ids = await seedEntries(request.id, 5);

		const pages: string[][] = [];
		let cursor: string | null = null;
		do {
			const page: { data: FeedEntry[]; nextCursor: string | null } = (
				await ownerAgent
					.get(`/workflow-review-requests/${request.id}/activity`)
					.query(cursor ? { limit: 2, cursor } : { limit: 2 })
					.expect(200)
			).body.data;
			pages.push(page.data.map((entry) => entry.id));
			cursor = page.nextCursor;
		} while (cursor);

		// Newest page first, ascending within each page
		expect(pages).toEqual([[ids[3], ids[4]], [ids[1], ids[2]], [ids[0]]]);
	});

	test('stops paging when the last page comes out exactly full', async () => {
		const { request } = await seedReviewInTeamProject(owner);
		const ids = await seedEntries(request.id, 4);

		const firstPage = await ownerAgent
			.get(`/workflow-review-requests/${request.id}/activity`)
			.query({ limit: 2 })
			.expect(200);
		expect(firstPage.body.data.hasMore).toBe(true);

		const secondPage = await ownerAgent
			.get(`/workflow-review-requests/${request.id}/activity`)
			.query({ limit: 2, cursor: firstPage.body.data.nextCursor })
			.expect(200);

		expect(secondPage.body.data.data.map((entry: { id: string }) => entry.id)).toEqual([
			ids[0],
			ids[1],
		]);
		expect(secondPage.body.data.hasMore).toBe(false);
		expect(secondPage.body.data.nextCursor).toBeNull();
	});

	test('hides the feed entirely from someone without access to the review', async () => {
		const { request } = await seedReviewInTeamProject(owner);

		// 404 rather than 403, matching getDetail's don't-confirm-existence policy
		await viewerAgent.get(`/workflow-review-requests/${request.id}/activity`).expect(404);
	});

	// The owner reaches every review through global `workflow:publish`, which short-circuits the
	// project lookup. Only a project member exercises the project-scoped path.
	test('shows the feed to a project member who can publish there', async () => {
		const { request } = await seedReviewInTeamProject(owner);
		const [id] = await seedEntries(request.id, 1);

		const feed = await getActivity(memberAgent, request.id);

		expect(feed.data.map((entry) => entry.id)).toEqual([id]);
	});

	test('shows a non-comment activity entry with its details intact and no messages', async () => {
		const { request } = await seedReviewInTeamProject(owner);
		const data = { workflowVersionIds: ['version-pinned'], note: 'needs work' };
		await activityRepository.createActivity(
			{
				workflowReviewRequestId: request.id,
				type: 'review.changes_requested',
				data,
				createdById: owner.id,
			},
			{},
		);

		const feed = await getActivity(ownerAgent, request.id);

		expect(feed.data).toHaveLength(1);
		expect(feed.data[0]).toMatchObject({ type: 'review.changes_requested' });
		// `toEqual`, not a partial match: a mapper that renamed or added a key inside `data`
		// would still pass `toMatchObject`.
		expect(feed.data[0].data).toEqual(data);
		expect(feed.data[0]).not.toHaveProperty('messages');
	});

	test.each([
		['a limit below the minimum', { limit: 0 }],
		['a limit above the maximum', { limit: 101 }],
		// A parseInt-based decode would silently accept this as id 12
		['a tampered cursor', { cursor: Buffer.from('12abc').toString('base64url') }],
	])('rejects %s', async (_label, query) => {
		const { request } = await seedReviewInTeamProject(owner);

		await ownerAgent
			.get(`/workflow-review-requests/${request.id}/activity`)
			.query(query)
			.expect(400);
	});

	test('refuses to read the feed when an admin has turned reviews off', async () => {
		const { request } = await seedReviewInTeamProject(owner);
		await policyService.set(false);

		await ownerAgent.get(`/workflow-review-requests/${request.id}/activity`).expect(403);
	});
});
