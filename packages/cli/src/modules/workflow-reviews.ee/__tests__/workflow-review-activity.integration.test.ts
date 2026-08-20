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
	UserRepository,
	WorkflowRepository,
	WorkflowReviewActivityCommentRepository,
	WorkflowReviewActivityRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
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
let activityCommentRepository: WorkflowReviewActivityCommentRepository;
let userRepository: UserRepository;
let workflowEntityRepository: WorkflowRepository;
let policyService: WorkflowReviewPolicyService;

beforeAll(async () => {
	await utils.initNodeTypes();
	requestRepository = Container.get(WorkflowReviewRequestRepository);
	workflowRepository = Container.get(WorkflowReviewRequestWorkflowRepository);
	authorRepository = Container.get(WorkflowReviewRequestAuthorRepository);
	activityRepository = Container.get(WorkflowReviewActivityRepository);
	activityCommentRepository = Container.get(WorkflowReviewActivityCommentRepository);
	userRepository = Container.get(UserRepository);
	workflowEntityRepository = Container.get(WorkflowRepository);
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

describe('Commenting on a review', () => {
	test('shows a comment in the feed the instant its writer posts it', async () => {
		const { request } = await seedReviewInTeamProject(member);

		const post = await memberAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body: 'Looks good to me' })
			.expect(201);

		const detail = await memberAgent.get(`/workflow-review-requests/${request.id}`).expect(200);
		expect(detail.body.data.viewerCanComment).toBe(true);
		expect(detail.body.data.viewerCanDecide).toBe(false);
		expect(detail.body.data.viewerDecisionIneligibilityReason).toBe('author');

		// POST and GET must agree, or a comment visibly changes on reload
		const feed = await getActivity(memberAgent, request.id);
		expect(typeof post.body.data.id).toBe('string');
		expect(post.body.data).toEqual(feed.data[0]);
		expect(feed.data[0]).toMatchObject({
			type: 'comment.created',
			typeVersion: 1,
			data: null,
			createdBy: expect.objectContaining({ id: member.id }),
			messages: [expect.objectContaining({ body: 'Looks good to me' })],
		});
	});

	test('lets a reviewer who can approve the review comment on it', async () => {
		const { request } = await seedReviewInTeamProject(owner);
		await Container.get(WorkflowReviewRequestReviewerRepository).addReviewers(
			{ workflowReviewRequestId: request.id, userIds: [member.id] },
			{},
		);

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body: 'One question' })
			.expect(201);

		const detail = await memberAgent.get(`/workflow-review-requests/${request.id}`).expect(200);
		expect(detail.body.data.viewerCanComment).toBe(true);
		expect(detail.body.data.viewerCanDecide).toBe(true);
	});

	// Every viewer is an admin, an author, or an assigned reviewer, so a reader who
	// cannot comment cannot reach a review either. The eligibility service unit tests
	// cover what such a viewer would get.

	test('hides the review from a requester who can no longer read the workflow under review', async () => {
		const destinationProject = await createTeamProject('Out Of Reach', owner);
		const workflow = await createWorkflow({}, destinationProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-pinned' });
		const request = await seedRequest(workflow.id, 'version-pinned', viewer);

		// Seeing a review requires still holding read on what it reviews — the feed
		// and the comment box disappear together with the review itself.
		await viewerAgent.get(`/workflow-review-requests/${request.id}`).expect(404);
		await viewerAgent.get(`/workflow-review-requests/${request.id}/activity`).expect(404);
		await viewerAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body: 'Still here' })
			.expect(404);
	});

	test('lets a requester downgraded to view-only keep commenting on their own review', async () => {
		// Opening a review needs workflow:publish, so this state is only reachable by a
		// downgrade. project:viewer keeps workflow:read, and read is the scope that gates
		// commenting, so this must pass while deciding does not (author block).
		const { request } = await seedReviewInTeamProject(viewer);

		const detail = await viewerAgent.get(`/workflow-review-requests/${request.id}`).expect(200);
		expect(detail.body.data.viewerCanComment).toBe(true);
		expect(detail.body.data.viewerCanDecide).toBe(false);
		expect(detail.body.data.viewerDecisionIneligibilityReason).toBe('author');

		await viewerAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body: 'From the author' })
			.expect(201);
	});

	test('refuses everyone once the reviewed workflow is deleted, but keeps the feed readable', async () => {
		const { workflow, request } = await seedReviewInTeamProject(owner);
		// Member reads through their reviewer assignment; owner through the admin scope
		await Container.get(WorkflowReviewRequestReviewerRepository).addReviewers(
			{ workflowReviewRequestId: request.id, userIds: [member.id] },
			{},
		);
		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body: 'Before the deletion' })
			.expect(201);

		// The linked-workflow row cascades away with the workflow; nothing closes the review
		await workflowEntityRepository.delete({ id: workflow.id });

		for (const agent of [ownerAgent, memberAgent]) {
			const feed = await getActivity(agent, request.id);
			expect(feed.data).toHaveLength(1);

			const detail = await agent.get(`/workflow-review-requests/${request.id}`).expect(200);
			expect(detail.body.data.viewerCanComment).toBe(false);

			await agent
				.post(`/workflow-review-requests/${request.id}/comments`)
				.send({ body: 'Anyone there?' })
				.expect(403);
		}
	});

	test('hides the feed entirely from someone without access to the review', async () => {
		const { request } = await seedReviewInTeamProject(owner);

		// 404 rather than 403 on both, matching getDetail's don't-confirm-existence policy
		await viewerAgent.get(`/workflow-review-requests/${request.id}/activity`).expect(404);
		await viewerAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body: 'Hello?' })
			.expect(404);
	});

	test.each(['approved', 'closed'] as const)(
		'keeps existing comments visible and still accepts new ones on a %s review',
		async (settled) => {
			const { request } = await seedReviewInTeamProject(owner);
			await ownerAgent
				.post(`/workflow-review-requests/${request.id}/comments`)
				.send({ body: 'Before it settled' })
				.expect(201);
			await requestRepository.update(
				request.id,
				settled === 'approved' ? { decision: 'approved' } : { state: 'closed' },
			);

			const feed = await getActivity(ownerAgent, request.id);
			expect(feed.data).toHaveLength(1);

			await ownerAgent
				.post(`/workflow-review-requests/${request.id}/comments`)
				.send({ body: 'After it settled' })
				.expect(201);
		},
	);

	test('leaves no empty comment behind when the write fails halfway', async () => {
		const { request } = await seedReviewInTeamProject(owner);
		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body: 'The one that sticks' })
			.expect(201);

		const createComment = vi
			.spyOn(activityCommentRepository, 'createComment')
			.mockRejectedValueOnce(new Error('write failed'));

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body: 'The one that rolls back' })
			.expect(500);

		expect(createComment).toHaveBeenCalled();
		expect(await activityRepository.count()).toBe(1);
		expect(await activityCommentRepository.count()).toBe(1);
	});

	test.each([
		['rejects an empty comment', '', 400],
		['rejects a comment that is only whitespace', '   \n  ', 400],
		['accepts a comment at the length limit', 'x'.repeat(10_000), 201],
		['rejects a comment over the length limit', 'x'.repeat(10_001), 400],
		// A C0 control character reaches the Postgres driver as a 500 unless rejected here
		['rejects a comment containing a control character', 'oops \x00 here', 400],
	])('%s', async (_label, body, status) => {
		const { request } = await seedReviewInTeamProject(owner);

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body })
			.expect(status);
	});

	test('trims the body it stores and keeps newlines intact', async () => {
		const { request } = await seedReviewInTeamProject(owner);

		const response = await ownerAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body: '  first line\nsecond line  ' })
			.expect(201);

		expect(response.body.data.messages[0].body).toBe('first line\nsecond line');
	});
});

describe('Recording the review lifecycle in the feed', () => {
	/** Two history versions so the review can be re-pinned from one to the other. */
	async function createReviewableWorkflow() {
		const workflow = await createWorkflow({ name: 'Reviewed workflow' }, teamProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-1' });
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });
		return workflow;
	}

	/** Opened by `member`, so `owner` is free to decide on it without an admin override. */
	async function openReview(workflowId: string, workflowVersionId = 'version-1') {
		const response = await memberAgent
			.post('/workflow-review-requests')
			.send({
				title: 'Please review',
				workflows: [{ workflowId, workflowVersionId, workflowVersionName: 'Release candidate' }],
				reviewerUserIds: [owner.id],
			})
			.expect(201);
		return response.body.data.id as string;
	}

	const entryTypes = (feed: { data: FeedEntry[] }) => feed.data.map((entry) => entry.type);

	test('shows who opened the review and which version they submitted', async () => {
		const workflow = await createReviewableWorkflow();

		const requestId = await openReview(workflow.id);

		const feed = await getActivity(memberAgent, requestId);
		expect(feed.data).toHaveLength(1);
		expect(feed.data[0]).toMatchObject({
			type: 'review.opened',
			typeVersion: 1,
			createdBy: expect.objectContaining({ id: member.id }),
		});
		expect(feed.data[0].data).toEqual({
			workflowVersions: [{ workflowId: workflow.id, workflowVersionId: 'version-1' }],
		});
	});

	test('records the note and the reviewed version when a reviewer requests changes', async () => {
		const workflow = await createReviewableWorkflow();
		const requestId = await openReview(workflow.id);

		await ownerAgent
			.post(`/workflow-review-requests/${requestId}/decision`)
			.send({ decision: 'changes_requested', note: 'Please rename the node' })
			.expect(200);

		const feed = await getActivity(ownerAgent, requestId);
		expect(entryTypes(feed)).toEqual(['review.opened', 'review.changes_requested']);
		expect(feed.data[1]).toMatchObject({
			createdBy: expect.objectContaining({ id: owner.id }),
		});
		expect(feed.data[1].data).toEqual({
			workflowVersions: [{ workflowId: workflow.id, workflowVersionId: 'version-1' }],
			note: 'Please rename the node',
		});
	});

	test('refuses to request changes without a note, and records nothing', async () => {
		const workflow = await createReviewableWorkflow();
		const requestId = await openReview(workflow.id);

		await ownerAgent
			.post(`/workflow-review-requests/${requestId}/decision`)
			.send({ decision: 'changes_requested' })
			.expect(400);

		expect(entryTypes(await getActivity(ownerAgent, requestId))).toEqual(['review.opened']);
		expect(await requestRepository.findById(requestId, {})).toMatchObject({
			state: 'open',
			decision: 'pending',
		});
	});

	test('records the note a reviewer leaves when they approve', async () => {
		const workflow = await createReviewableWorkflow();
		const requestId = await openReview(workflow.id);

		await ownerAgent
			.post(`/workflow-review-requests/${requestId}/decision`)
			.send({ decision: 'approved', note: 'Ships as is' })
			.expect(200);

		const feed = await getActivity(ownerAgent, requestId);
		expect(entryTypes(feed)).toEqual(['review.opened', 'review.approved']);
		expect(feed.data[1].data).toEqual({
			workflowVersions: [{ workflowId: workflow.id, workflowVersionId: 'version-1' }],
			note: 'Ships as is',
		});
	});

	test('records an approval left without a note as having none', async () => {
		const workflow = await createReviewableWorkflow();
		const requestId = await openReview(workflow.id);

		await ownerAgent
			.post(`/workflow-review-requests/${requestId}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		const feed = await getActivity(ownerAgent, requestId);
		// `null`, not a missing key: "no note given" and "the payload did not parse" are
		// different things on an audit record.
		expect(feed.data[1].data).toEqual({
			workflowVersions: [{ workflowId: workflow.id, workflowVersionId: 'version-1' }],
			note: null,
		});
	});

	test('still names the workflow an approved version came from after that workflow is deleted', async () => {
		const workflow = await createReviewableWorkflow();
		const requestId = await openReview(workflow.id);

		await ownerAgent
			.post(`/workflow-review-requests/${requestId}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		await workflowEntityRepository.delete(workflow.id);

		// The pin cascades away with the workflow, so the entry is the only record left of which
		// version was approved.
		expect(await workflowRepository.findByRequestId(requestId, {})).toEqual([]);

		const feed = await getActivity(ownerAgent, requestId);
		expect(feed.data[1].data).toEqual({
			workflowVersions: [{ workflowId: workflow.id, workflowVersionId: 'version-1' }],
			note: null,
		});
	});

	test('records the version a re-pinned review moved from and to, scoped to that workflow', async () => {
		const workflow = await createReviewableWorkflow();
		const requestId = await openReview(workflow.id);

		await memberAgent
			.post(`/workflow-review-requests/${requestId}/update-version`)
			.send({
				workflowId: workflow.id,
				workflowVersionId: 'version-2',
				workflowVersionName: 'Second attempt',
			})
			.expect(200);

		const feed = await getActivity(memberAgent, requestId);
		expect(entryTypes(feed)).toEqual(['review.opened', 'review.version_updated']);
		// In `data`, never a column: a scoping column would cascade, so a workflow delete would
		// take the entry with it.
		expect(feed.data[1].data).toEqual({
			workflowId: workflow.id,
			fromWorkflowVersionId: 'version-1',
			toWorkflowVersionId: 'version-2',
		});
	});

	test('keeps a version update in the feed after its workflow is deleted', async () => {
		const workflow = await createReviewableWorkflow();
		const requestId = await openReview(workflow.id);

		await memberAgent
			.post(`/workflow-review-requests/${requestId}/update-version`)
			.send({
				workflowId: workflow.id,
				workflowVersionId: 'version-2',
				workflowVersionName: 'Second attempt',
			})
			.expect(200);

		// Straight from the repository, as a folder-hierarchy cascade does, so nothing but the
		// database's own cascades decides what survives.
		await workflowEntityRepository.delete(workflow.id);

		const feed = await getActivity(memberAgent, requestId);
		expect(entryTypes(feed)).toEqual(['review.opened', 'review.version_updated']);
		expect(feed.data[1].data).toMatchObject({ workflowId: workflow.id });
	});

	test('records nothing when a review is re-pinned to the version it already covers', async () => {
		const workflow = await createReviewableWorkflow();
		const requestId = await openReview(workflow.id);

		await memberAgent
			.post(`/workflow-review-requests/${requestId}/update-version`)
			.send({
				workflowId: workflow.id,
				workflowVersionId: 'version-1',
				workflowVersionName: 'Renamed only',
			})
			.expect(200);

		expect(entryTypes(await getActivity(memberAgent, requestId))).toEqual(['review.opened']);
	});

	test('leaves the review undecided when its feed entry cannot be written', async () => {
		const workflow = await createReviewableWorkflow();
		const requestId = await openReview(workflow.id);
		vi.spyOn(activityRepository, 'createActivity').mockRejectedValueOnce(new Error('write failed'));

		await ownerAgent
			.post(`/workflow-review-requests/${requestId}/decision`)
			.send({ decision: 'approved' })
			.expect(500);

		expect(await requestRepository.findById(requestId, {})).toMatchObject({
			state: 'open',
			decision: 'pending',
		});
		expect(entryTypes(await getActivity(ownerAgent, requestId))).toEqual(['review.opened']);
	});

	// Only a stored row can be malformed, so these are seeded past the write union.
	test.each([
		['a decision whose payload is not an object', 'review.changes_requested', 'oops'],
		['a close with a reason this version does not know', 'review.closed', { reason: 'nope' }],
		['a version update missing its version ids', 'review.version_updated', { from: 1 }],
		['an opening entry written in an older shape', 'review.opened', { index: 1 }],
	])('serves %s without its details rather than failing the feed', async (_label, type, data) => {
		const { request } = await seedReviewInTeamProject(owner);
		await activityRepository.createActivity(
			{ workflowReviewRequestId: request.id, type, data, createdById: owner.id } as never,
			{},
		);

		const feed = await getActivity(ownerAgent, request.id);

		expect(feed.data).toHaveLength(1);
		expect(feed.data[0].type).toBe(type);
		expect(feed.data[0].data).toBeNull();
	});
});

describe('Reading the activity feed', () => {
	/** Non-comment entries, cheap to seed and enough to pin the paging arithmetic. */
	async function seedEntries(workflowReviewRequestId: string, count: number) {
		const ids: string[] = [];
		for (let index = 0; index < count; index++) {
			const entry = await activityRepository.createActivity(
				{
					workflowReviewRequestId,
					type: 'review.opened',
					data: { workflowVersions: [] },
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

	test('does not shift the older pages when someone comments while you scroll back', async () => {
		const { request } = await seedReviewInTeamProject(owner);
		const ids = await seedEntries(request.id, 4);

		const firstPage = await ownerAgent
			.get(`/workflow-review-requests/${request.id}/activity`)
			.query({ limit: 2 })
			.expect(200);

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body: 'Arrived between pages' })
			.expect(201);

		const secondPage = await ownerAgent
			.get(`/workflow-review-requests/${request.id}/activity`)
			.query({ limit: 2, cursor: firstPage.body.data.nextCursor })
			.expect(200);

		expect(firstPage.body.data.data.map((entry: { id: string }) => entry.id)).toEqual([
			ids[2],
			ids[3],
		]);
		expect(secondPage.body.data.data.map((entry: { id: string }) => entry.id)).toEqual([
			ids[0],
			ids[1],
		]);
	});

	test("never shows one review's comments on another review", async () => {
		const first = await seedReviewInTeamProject(owner);
		const second = await seedReviewInTeamProject(owner);
		const firstIds = await seedEntries(first.request.id, 1);
		const secondIds = await seedEntries(second.request.id, 1);
		firstIds.push(...(await seedEntries(first.request.id, 1)));
		// A comment in each pins that messages land on their own thread when several reviews
		// hold messages.
		async function comment(requestId: string, body: string) {
			const response = await ownerAgent
				.post(`/workflow-review-requests/${requestId}/comments`)
				.send({ body })
				.expect(201);
			return response.body.data.id as string;
		}
		firstIds.push(await comment(first.request.id, 'First review comment'));
		secondIds.push(await comment(second.request.id, 'Second review comment'));

		const firstFeed = await getActivity(ownerAgent, first.request.id);
		const secondFeed = await getActivity(ownerAgent, second.request.id);

		expect(firstFeed.data.map((e) => e.id)).toEqual(firstIds);
		expect(secondFeed.data.map((e) => e.id)).toEqual(secondIds);
		expect(firstFeed.data.at(-1)?.messages).toEqual([
			expect.objectContaining({ body: 'First review comment' }),
		]);
		expect(secondFeed.data.at(-1)?.messages).toEqual([
			expect.objectContaining({ body: 'Second review comment' }),
		]);
	});

	// The owner reaches every review through the admin scope, which short-circuits the
	// project lookup. Only an assigned reviewer exercises the involvement path.
	test('shows the feed to an assigned reviewer', async () => {
		const { request } = await seedReviewInTeamProject(owner);
		await Container.get(WorkflowReviewRequestReviewerRepository).addReviewers(
			{ workflowReviewRequestId: request.id, userIds: [member.id] },
			{},
		);
		const [id] = await seedEntries(request.id, 1);

		const feed = await getActivity(memberAgent, request.id);

		expect(feed.data.map((entry) => entry.id)).toEqual([id]);
	});

	test('shows a non-comment activity entry with its details intact and no messages', async () => {
		const { request } = await seedReviewInTeamProject(owner);
		const data = {
			workflowVersions: [{ workflowId: 'workflow-reviewed', workflowVersionId: 'version-pinned' }],
			note: 'needs work',
		};
		await activityRepository.createActivity(
			{
				workflowReviewRequestId: request.id,
				type: 'review.changes_requested',
				data,
				createdById: owner.id,
			},
			{},
		);
		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body: 'On it' })
			.expect(201);

		const feed = await getActivity(ownerAgent, request.id, 2);

		expect(feed.hasMore).toBe(false);
		expect(feed.data).toHaveLength(2);
		expect(feed.data[0]).toMatchObject({ type: 'review.changes_requested' });
		// `toEqual`, not a partial match: a mapper that renamed or added a key inside `data`
		// would still pass `toMatchObject`.
		expect(feed.data[0].data).toEqual(data);
		expect(feed.data[0]).not.toHaveProperty('messages');
		expect(feed.data[1]).toMatchObject({ type: 'comment.created' });
	});

	test('keeps each comment with its own body and author', async () => {
		const { request } = await seedReviewInTeamProject(owner);
		await Container.get(WorkflowReviewRequestReviewerRepository).addReviewers(
			{ workflowReviewRequestId: request.id, userIds: [member.id] },
			{},
		);
		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body: 'From the owner' })
			.expect(201);
		await memberAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body: 'From the member' })
			.expect(201);

		const feed = await getActivity(ownerAgent, request.id);

		// A grouping bug that attaches one thread's messages to every entry renders every
		// comment with the same body, so both entries are asserted individually.
		expect(feed.data).toHaveLength(2);
		expect(feed.data[0].messages).toEqual([
			expect.objectContaining({
				body: 'From the owner',
				createdBy: expect.objectContaining({ id: owner.id }),
			}),
		]);
		expect(feed.data[1].messages).toEqual([
			expect.objectContaining({
				body: 'From the member',
				createdBy: expect.objectContaining({ id: member.id }),
			}),
		]);
	});

	test('keeps a comment readable after its author is deleted from the instance', async () => {
		const { request } = await seedReviewInTeamProject(owner);
		await Container.get(WorkflowReviewRequestReviewerRepository).addReviewers(
			{ workflowReviewRequestId: request.id, userIds: [member.id] },
			{},
		);
		await memberAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body: 'Written before leaving' })
			.expect(201);

		await userRepository.delete({ id: member.id });

		const [entry] = (await getActivity(ownerAgent, request.id)).data;
		// `undefined` would be dropped from the JSON; the client checks for `null`
		expect('createdBy' in entry).toBe(true);
		expect(entry.createdBy).toBeNull();
		expect(entry.messages?.[0].createdBy).toBeNull();
		expect(entry.messages?.[0].body).toBe('Written before leaving');
	});

	test('hides the text of a deleted comment but keeps its place in the feed', async () => {
		const { request } = await seedReviewInTeamProject(owner);
		const post = await ownerAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body: 'Written then deleted' })
			.expect(201);
		await activityCommentRepository.update(Number(post.body.data.messages[0].id), {
			deletedAt: new Date(),
		});

		const [entry] = (await getActivity(ownerAgent, request.id)).data;

		expect(entry.messages?.[0].body).toBeNull();
		expect(entry.messages?.[0].deletedAt).not.toBeNull();
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

	test('refuses to post a comment when an admin has turned reviews off', async () => {
		const { request } = await seedReviewInTeamProject(owner);
		await policyService.set(false);

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/comments`)
			.send({ body: 'Blocked' })
			.expect(403);
	});
});
