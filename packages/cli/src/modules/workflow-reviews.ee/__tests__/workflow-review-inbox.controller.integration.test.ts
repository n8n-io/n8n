import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	shareWorkflowWithUsers,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User, WorkflowReviewRequestState } from '@n8n/db';
import {
	UserRepository,
	WorkflowRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { createAdmin, createMember, createUser } from '@test-integration/db/users';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import {
	REVIEW_TABLES,
	seedReview,
	seedReviewActors,
	stubWorkflowValidation,
	versionUpdatePayload,
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
let workflowEntityRepository: WorkflowRepository;
let policyService: WorkflowReviewPolicyService;

beforeAll(async () => {
	await utils.initNodeTypes();
	requestRepository = Container.get(WorkflowReviewRequestRepository);
	workflowRepository = Container.get(WorkflowReviewRequestWorkflowRepository);
	authorRepository = Container.get(WorkflowReviewRequestAuthorRepository);
	reviewerRepository = Container.get(WorkflowReviewRequestReviewerRepository);
	userRepository = Container.get(UserRepository);
	workflowEntityRepository = Container.get(WorkflowRepository);
	policyService = Container.get(WorkflowReviewPolicyService);
});

beforeEach(async () => {
	testServer.license.enable('feat:workflowReviews');
	await testDb.truncate([...REVIEW_TABLES]);
	await policyService.set(true);
	stubWorkflowValidation(workflowValidationService);

	({ owner, member, viewer, ownerProject, teamProject, ownerAgent, memberAgent, viewerAgent } =
		await seedReviewActors(testServer.authAgentFor));
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

/** A review orphaned by a hard delete: the cascade drops the link row, the request stays open. */
async function seedOrphanedOpenReview() {
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
	return orphan;
}

describe('GET /workflow-review-requests/summary', () => {
	test('counts open and closed reviews for the instance owner', async () => {
		await seedInboxRequests();

		const response = await ownerAgent.get('/workflow-review-requests/summary').expect(200);

		expect(response.body.data).toEqual({ open: 1, closed: 1 });
	});

	test('counts the reviews an assigned reviewer was asked to look at', async () => {
		await seedInboxRequests();

		const response = await memberAgent.get('/workflow-review-requests/summary').expect(200);

		expect(response.body.data).toEqual({ open: 1, closed: 1 });
	});

	test('counts nothing for an uninvolved project member', async () => {
		await seedInboxRequests();

		const response = await viewerAgent.get('/workflow-review-requests/summary').expect(200);

		expect(response.body.data).toEqual({ open: 0, closed: 0 });
	});

	test('counts a requester their own review even without publish scope', async () => {
		const ownRequest = await seedReview({
			projectId: teamProject.id,
			author: viewer,
			title: 'Review submitted by viewer',
		});
		await linkToNewWorkflow(ownRequest.id);

		const response = await viewerAgent.get('/workflow-review-requests/summary').expect(200);

		expect(response.body.data).toEqual({ open: 1, closed: 0 });
	});

	test('still counts an open review orphaned by a workflow hard delete until a sweep closes it', async () => {
		await seedInboxRequests();
		await seedOrphanedOpenReview();

		// Owner exercises the whole-inbox scope, member the involvement filter
		const ownerResponse = await ownerAgent.get('/workflow-review-requests/summary').expect(200);
		expect(ownerResponse.body.data).toEqual({ open: 2, closed: 1 });

		const memberResponse = await memberAgent.get('/workflow-review-requests/summary').expect(200);
		expect(memberResponse.body.data).toEqual({ open: 2, closed: 1 });
	});

	test('refuses the counts once an admin turns reviews off', async () => {
		await policyService.set(false);

		await ownerAgent.get('/workflow-review-requests/summary').expect(403);
	});
});

describe('GET /workflow-review-requests/inbox', () => {
	test('shows the instance owner every open review', async () => {
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

	test('shows nothing to an uninvolved project member', async () => {
		await seedInboxRequests();

		const response = await viewerAgent.get('/workflow-review-requests/inbox').expect(200);

		expect(response.body.data.data).toEqual([]);
		expect(response.body.data.hasMore).toBe(false);
	});

	test('still lists an open review orphaned by a workflow hard delete until a sweep closes it', async () => {
		const { openRequest } = await seedInboxRequests();
		const orphan = await seedOrphanedOpenReview();

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

	test('refuses everything once an admin turns reviews off', async () => {
		await policyService.set(false);

		await ownerAgent.get('/workflow-review-requests/inbox').expect(403);
	});

	test('pages through the inbox with a cursor', async () => {
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
		const request = await seedReview({
			projectId: teamProject.id,
			author: owner,
			reviewerIds: [reviewer.id],
			title: 'Needs review',
		});
		await linkToNewWorkflow(request.id);

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

	test('drops a requester and reviewers whose accounts were deleted, and leaves a creatorless review with no requester', async () => {
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

		// A review whose `createdById` was never set at all.
		const authorless = await requestRepository.createRequest(
			{ projectId: teamProject.id, title: 'Authorless', createdById: null, state: 'open' },
			{},
		);
		await linkToNewWorkflow(authorless.id);

		await userRepository.delete({ id: departedCreator.id });
		await userRepository.delete({ id: departedReviewer.id });

		const response = await ownerAgent
			.get('/workflow-review-requests/inbox')
			.query({ state: 'open', limit: 15 })
			.expect(200);

		const rows = response.body.data.data as Array<{
			id: string;
			requester: unknown;
			reviewers: unknown[];
		}>;
		const withDeparted = rows.find((row) => row.id === request.id)!;
		expect(withDeparted.requester).toBeNull();
		expect(withDeparted.reviewers).toEqual([
			{
				id: survivingReviewer.id,
				email: survivingReviewer.email,
				firstName: survivingReviewer.firstName,
				lastName: survivingReviewer.lastName,
			},
		]);

		const withoutCreator = rows.find((row) => row.id === authorless.id)!;
		expect(withoutCreator.requester).toBeNull();
		expect(withoutCreator.reviewers).toEqual([]);
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
			await assignMember(request.id);

			expect((await inbox(memberAgent, { category: 'waiting' })).ids).toEqual([request.id]);

			await memberAgent
				.post(`/workflow-review-requests/${request.id}/update-version`)
				.send(versionUpdatePayload({ workflowId: workflow.id, versionId: 'version-2' }))
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

		test('shows a requester the review for a workflow shared only with them', async () => {
			const sharedWorkflow = await createWorkflow({}, owner);
			await shareWorkflowWithUsers(sharedWorkflow, [member]);
			const request = await seedReview({
				projectId: ownerProject.id,
				workflowId: sharedWorkflow.id,
				author: member,
				title: 'Shared with me',
			});

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
	});
});
