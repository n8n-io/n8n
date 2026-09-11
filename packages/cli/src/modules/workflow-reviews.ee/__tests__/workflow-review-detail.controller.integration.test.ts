import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	WorkflowRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { createAdmin, createMember } from '@test-integration/db/users';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import {
	REVIEW_TABLES,
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
let viewer: User;
let teamProject: Project;
let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;
let viewerAgent: SuperAgentTest;

let workflowRepository: WorkflowReviewRequestWorkflowRepository;
let reviewerRepository: WorkflowReviewRequestReviewerRepository;
let workflowEntityRepository: WorkflowRepository;
let policyService: WorkflowReviewPolicyService;

beforeAll(async () => {
	await utils.initNodeTypes();
	workflowRepository = Container.get(WorkflowReviewRequestWorkflowRepository);
	reviewerRepository = Container.get(WorkflowReviewRequestReviewerRepository);
	workflowEntityRepository = Container.get(WorkflowRepository);
	policyService = Container.get(WorkflowReviewPolicyService);
});

beforeEach(async () => {
	testServer.license.enable('feat:workflowReviews');
	await testDb.truncate([...REVIEW_TABLES]);
	await policyService.set(true);
	stubWorkflowValidation(workflowValidationService);

	({ owner, member, viewer, teamProject, ownerAgent, memberAgent, viewerAgent } =
		await seedReviewActors(testServer.authAgentFor));
});

/** Seed a review in `projectId` pinned to `versionId`, authored by `author`. */
async function seedRequest(
	workflowId: string,
	versionId: string | null,
	author: User,
	projectId = teamProject.id,
) {
	return await seedReview({
		projectId,
		workflowId,
		versionId,
		author,
		title: 'Please review',
		description: 'Some context',
	});
}

/**
 * Seed a review in `teamProject` pinned to a workflow that has moved out of
 * `author`'s reach, covering a second workflow that is still readable. Row ids
 * are set explicitly because generated nanoids would leave it to chance which
 * row the query's id ordering puts first, i.e. which one counts as pinned.
 */
async function seedTwoWorkflowRequest(author: User) {
	const destinationProject = await createTeamProject('Moved Away', owner);
	const movedWorkflow = await createWorkflow({}, destinationProject);
	await createWorkflowHistoryItem(movedWorkflow.id, { versionId: 'version-pinned' });
	const readableWorkflow = await createWorkflow({ name: 'Still readable' }, teamProject);
	const request = await seedReview({
		projectId: teamProject.id,
		author,
		title: 'Please review',
	});
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
	return { request, movedWorkflow, readableWorkflow };
}

const getDetail = (agent: SuperAgentTest, requestId: string) =>
	agent.get(`/workflow-review-requests/${requestId}`);

describe('GET /workflow-review-requests/:workflowReviewRequestId', () => {
	test('returns the review, the workflows it covers, and both versions to compare', async () => {
		const workflow = await createWorkflow({ name: 'Reviewed workflow' }, teamProject);
		const baseline = await createWorkflowHistoryItem(workflow.id, {
			versionId: 'version-published',
		});
		await createWorkflowHistoryItem(workflow.id, {
			versionId: 'version-pinned',
			name: 'Release candidate',
		});
		// The baseline resolves from the workflow row, which both publication paths maintain.
		await workflowEntityRepository.update(workflow.id, {
			active: true,
			activeVersionId: baseline.versionId,
		});
		const reviewer = await createAdmin();
		const request = await seedRequest(workflow.id, 'version-pinned', owner);
		await reviewerRepository.addReviewers(
			{ workflowReviewRequestId: request.id, userIds: [reviewer.id] },
			{},
		);

		const response = await getDetail(ownerAgent, request.id).expect(200);

		expect(response.body.data).toMatchObject({
			id: request.id,
			projectId: teamProject.id,
			state: 'open',
			decision: 'pending',
			title: 'Please review',
			description: 'Some context',
			requester: { id: owner.id, email: owner.email },
			reviewers: [{ id: reviewer.id, email: reviewer.email }],
		});
		// The covered workflows live only in `workflows` — the inbox card's flat
		// summary fields are not part of the detail response.
		expect(response.body.data).not.toHaveProperty('workflowName');
		expect(response.body.data).not.toHaveProperty('workflowVersionId');

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

	test('keeps the approval-time baseline after the published pointer moves', async () => {
		const workflow = await createWorkflow({ name: 'Reviewed workflow' }, teamProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-published' });
		await createWorkflowHistoryItem(workflow.id, {
			versionId: 'version-pinned',
			name: 'Release candidate',
		});
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-later' });
		await workflowEntityRepository.update(workflow.id, {
			active: true,
			activeVersionId: 'version-published',
		});
		const request = await seedRequest(workflow.id, 'version-pinned', owner);
		await reviewerRepository.addReviewers(
			{ workflowReviewRequestId: request.id, userIds: [member.id] },
			{},
		);

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		// Auto-publish moved the live pointer to the pinned version; advance it again
		// so a live read would show the wrong baseline without persistence.
		await workflowEntityRepository.update(workflow.id, { activeVersionId: 'version-later' });

		const response = await getDetail(ownerAgent, request.id).expect(200);

		expect(response.body.data.state).toBe('closed');
		expect(response.body.data.workflows[0].baselineVersion).toMatchObject({
			versionId: 'version-published',
		});
		expect(response.body.data.workflows[0].pinnedVersion).toMatchObject({
			versionId: 'version-pinned',
		});

		const [child] = await workflowRepository.findByRequestId(request.id, {});
		expect(child?.baselineVersionId).toBe('version-published');
	});

	test('keeps a null approval baseline null once auto-publish moves the pointer', async () => {
		const workflow = await createWorkflow({ name: 'Reviewed workflow' }, teamProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-pinned' });
		// Never published, so the approval freezes a null baseline.
		const request = await seedRequest(workflow.id, 'version-pinned', owner);
		await reviewerRepository.addReviewers(
			{ workflowReviewRequestId: request.id, userIds: [member.id] },
			{},
		);

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		// Auto-publish left the live pointer on the pinned version, so reading it
		// live would diff that version against itself.
		const response = await getDetail(ownerAgent, request.id).expect(200);

		expect(response.body.data.state).toBe('closed');
		expect(response.body.data.workflows[0].baselineVersion).toBeNull();
	});

	test('returns no baseline for a closed review that was never approved', async () => {
		const workflow = await createWorkflow({ name: 'Reviewed workflow' }, teamProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-published' });
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-pinned' });
		await workflowEntityRepository.update(workflow.id, {
			active: true,
			activeVersionId: 'version-published',
		});
		const request = await seedReview({
			projectId: teamProject.id,
			workflowId: workflow.id,
			versionId: 'version-pinned',
			author: owner,
			title: 'Please review',
			state: 'closed',
			decision: 'pending',
		});

		const response = await getDetail(ownerAgent, request.id).expect(200);

		expect(response.body.data).toMatchObject({
			state: 'closed',
			decision: 'pending',
		});
		expect(response.body.data.workflows[0].baselineVersion).toBeNull();
	});

	test('has nothing to compare against when the workflow was never published', async () => {
		const workflow = await createWorkflow({}, teamProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-pinned' });
		const request = await seedRequest(workflow.id, 'version-pinned', owner);

		const response = await getDetail(ownerAgent, request.id).expect(200);

		expect(response.body.data.workflows[0].pinnedVersion).toMatchObject({
			versionId: 'version-pinned',
		});
		expect(response.body.data.workflows[0].baselineVersion).toBeNull();
	});

	test('returns no version under review when the review does not point at one', async () => {
		const workflow = await createWorkflow({}, teamProject);
		const request = await seedRequest(workflow.id, null, owner);

		const response = await getDetail(ownerAgent, request.id).expect(200);

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

		const response = await getDetail(ownerAgent, request.id).expect(200);

		expect(response.body.data.id).toBe(request.id);
		expect(response.body.data.state).toBe('open');
		expect(response.body.data.workflows).toEqual([]);
	});

	test('still opens a closed review after its workflow was deleted', async () => {
		const workflow = await createWorkflow({}, teamProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-pinned' });
		const request = await seedReview({
			projectId: teamProject.id,
			workflowId: workflow.id,
			versionId: 'version-pinned',
			author: owner,
			title: 'Please review',
			state: 'closed',
			decision: 'approved',
		});

		// Deleting the workflow removes the review's reference, not its history
		await workflowEntityRepository.delete({ id: workflow.id });

		const response = await getDetail(ownerAgent, request.id).expect(200);

		expect(response.body.data.id).toBe(request.id);
		expect(response.body.data.workflows).toEqual([]);
	});

	test('lets an assigned reviewer in the review project open it', async () => {
		const workflow = await createWorkflow({}, teamProject);
		const request = await seedRequest(workflow.id, null, owner);
		await reviewerRepository.addReviewers(
			{ workflowReviewRequestId: request.id, userIds: [member.id] },
			{},
		);

		const response = await getDetail(memberAgent, request.id).expect(200);

		expect(response.body.data.id).toBe(request.id);
	});

	test('lets a project admin open a review in their project without involvement', async () => {
		const projectAdmin = await createMember();
		await linkUserToProject(projectAdmin, teamProject, 'project:admin');
		const workflow = await createWorkflow({}, teamProject);
		const request = await seedRequest(workflow.id, null, owner);

		const response = await getDetail(testServer.authAgentFor(projectAdmin), request.id).expect(200);

		expect(response.body.data.id).toBe(request.id);
	});

	test('hides the review from an uninvolved project member', async () => {
		const workflow = await createWorkflow({}, teamProject);
		const request = await seedRequest(workflow.id, null, owner);

		await getDetail(viewerAgent, request.id).expect(404);
	});

	test('hides the review from someone outside its project', async () => {
		const otherProject = await createTeamProject('Unrelated Project', owner);
		const workflow = await createWorkflow({}, otherProject);
		const request = await seedRequest(workflow.id, null, owner, otherProject.id);

		await getDetail(memberAgent, request.id).expect(404);
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

		await getDetail(memberAgent, request.id).expect(404);
	});

	test('hides the review from its requester once they can read none of its workflows', async () => {
		// Viewer asked for the review while the workflow was reachable; it has since
		// moved to a project they have no access to. Seeing a review requires still
		// holding read on what it reviews — requesters included.
		const destinationProject = await createTeamProject('Moved Away', owner);
		const workflow = await createWorkflow({}, destinationProject);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-pinned' });
		const request = await seedRequest(workflow.id, 'version-pinned', viewer, teamProject.id);

		await getDetail(viewerAgent, request.id).expect(404);
	});

	test('leaves out a workflow the requester can no longer see while another keeps the review open', async () => {
		// The pinned workflow moved out of reach, but a second covered workflow is
		// still readable — the review opens without the unreadable content.
		const { request, readableWorkflow } = await seedTwoWorkflowRequest(viewer);

		const response = await getDetail(viewerAgent, request.id).expect(200);

		expect(response.body.data.id).toBe(request.id);
		expect(response.body.data.workflows).toEqual([
			expect.objectContaining({ workflowId: readableWorkflow.id }),
		]);
	});

	test('shows requesters the review they asked for while they can read in its project', async () => {
		const workflow = await createWorkflow({}, teamProject);
		const request = await seedRequest(workflow.id, null, viewer);

		const response = await getDetail(viewerAgent, request.id).expect(200);

		expect(response.body.data.id).toBe(request.id);
	});

	describe('viewer decision eligibility', () => {
		// Nobody is left who is neither admin, author, nor reviewer, so
		// `missing_reviewer_permission` cannot happen over HTTP. The eligibility service
		// unit tests cover that branch.

		test('tells an assigned reviewer that they can decide', async () => {
			const workflow = await createWorkflow({}, teamProject);
			const request = await seedRequest(workflow.id, null, owner);
			await reviewerRepository.addReviewers(
				{ workflowReviewRequestId: request.id, userIds: [member.id] },
				{},
			);

			const response = await getDetail(memberAgent, request.id).expect(200);

			expect(response.body.data.viewerCanDecide).toBe(true);
			expect(response.body.data.viewerDecisionIneligibilityReason).toBeNull();
		});

		test('tells a non-assigned author why they cannot decide their own review', async () => {
			const workflow = await createWorkflow({}, teamProject);
			const request = await seedRequest(workflow.id, null, member);

			const response = await getDetail(memberAgent, request.id).expect(200);

			expect(response.body.data.viewerCanDecide).toBe(false);
			expect(response.body.data.viewerDecisionIneligibilityReason).toBe('author');
		});

		test('lets an instance admin decide a review they authored', async () => {
			const workflow = await createWorkflow({}, teamProject);
			const request = await seedRequest(workflow.id, null, owner);

			const response = await getDetail(ownerAgent, request.id).expect(200);

			expect(response.body.data.viewerCanDecide).toBe(true);
			expect(response.body.data.viewerDecisionIneligibilityReason).toBeNull();
		});

		test('reports missing permission once the pinned workflow moved out of the requester reach', async () => {
			// The pinned workflow moved away while a second one keeps the review
			// readable: the requester keeps the record, but could no longer decide —
			// and the reason says why.
			const { request } = await seedTwoWorkflowRequest(viewer);

			const response = await getDetail(viewerAgent, request.id).expect(200);

			expect(response.body.data.viewerCanDecide).toBe(false);
			expect(response.body.data.viewerDecisionIneligibilityReason).toBe('missing_permission');
		});
	});

	test('reports a review that does not exist as not found', async () => {
		await getDetail(ownerAgent, 'unknown-request').expect(404);
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

		await getDetail(ownerAgent, request.id).expect(403);
	});
});
