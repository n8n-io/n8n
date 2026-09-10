import { createTeamProject, createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { WorkflowRepository, WorkflowReviewRequestRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import { createMember } from '@test-integration/db/users';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import {
	createReviewableWorkflow,
	REVIEW_TABLES,
	seedReview,
	seedReviewActors,
	stubWorkflowValidation,
} from './support/workflow-review-test-data';

const activeWorkflowManager = mockInstance(ActiveWorkflowManager);
const workflowValidationService = mockInstance(WorkflowValidationService);

const testServer = utils.setupTestServer({
	endpointGroups: ['workflow-reviews', 'workflows'],
	enabledFeatures: ['feat:workflowReviews'],
	modules: ['workflow-reviews'],
});

let owner: User;
let member: User;
let ownerProject: Project;
let teamProject: Project;
let ownerAgent: SuperAgentTest;

let requestRepository: WorkflowReviewRequestRepository;
let workflowEntityRepository: WorkflowRepository;
let policyService: WorkflowReviewPolicyService;

beforeAll(async () => {
	await utils.initNodeTypes();
	requestRepository = Container.get(WorkflowReviewRequestRepository);
	workflowEntityRepository = Container.get(WorkflowRepository);
	policyService = Container.get(WorkflowReviewPolicyService);
});

beforeEach(async () => {
	testServer.license.enable('feat:workflowReviews');
	await testDb.truncate([...REVIEW_TABLES]);
	await policyService.set(true);
	stubWorkflowValidation(workflowValidationService);

	({ owner, member, ownerProject, teamProject, ownerAgent } = await seedReviewActors(
		testServer.authAgentFor,
	));
});

/** An open review on a workflow `owner` owns personally. */
async function createOpenReview(
	workflowId: string,
	versionId: string,
	decision: 'pending' | 'changes_requested' = 'pending',
) {
	return await seedReview({
		projectId: ownerProject.id,
		workflowId,
		versionId,
		author: owner,
		decision,
	});
}

const publishedVersionOf = async (workflowId: string) =>
	(await workflowEntityRepository.findOneByOrFail({ id: workflowId })).activeVersionId;

describe('publishing a workflow under review', () => {
	test.each([
		['waiting for a decision', 'pending', 'review_pending'],
		['waiting for requested changes', 'changes_requested', 'changes_requested'],
	] as const)(
		'blocks publication while the review is %s',
		async (_reviewState, decision, expectedReason) => {
			const { workflow, versionId } = await createReviewableWorkflow(owner);
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
			expect(await publishedVersionOf(workflow.id)).toBeNull();
		},
	);

	test('publishes the pinned version automatically when the review is approved', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId);

		const response = await ownerAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		expect(response.body.data.autoPublish).toEqual({ status: 'published' });
		expect(await publishedVersionOf(workflow.id)).toBe(versionId);

		// The timeline completes: the approval that closed the review, then its publication.
		const activity = await ownerAgent
			.get(`/workflow-review-requests/${request.id}/activity`)
			.expect(200);
		expect((activity.body.data.data as Array<{ type: string }>).map((entry) => entry.type)).toEqual(
			['review.approved', 'workflow.published'],
		);
	});

	test('keeps the approval and allows manual publish when auto-publish fails', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId);

		// Activation fails once — after the approval has already committed.
		workflowValidationService.validateForActivation.mockResolvedValueOnce({
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
		expect(await publishedVersionOf(workflow.id)).toBeNull();

		// Retry path: the review is closed, so the regular publish flow is unblocked.
		await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);

		expect(await publishedVersionOf(workflow.id)).toBe(versionId);
	});

	test('leaves an already published workflow unpublished when the approval publish fails at registration', async () => {
		const { workflow, versionId: firstVersionId } = await createReviewableWorkflow(owner);

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
			const { workflow, versionId } = await createReviewableWorkflow(owner);
			await createOpenReview(workflow.id, versionId);

			if (unavailableReason === 'policy disabled') {
				await policyService.set(false);
			} else {
				testServer.license.disable('feat:workflowReviews');
			}

			await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);

			expect(await publishedVersionOf(workflow.id)).toBe(versionId);
		},
	);

	test('allows unpublishing while a review is open', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);

		await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);
		await createOpenReview(workflow.id, versionId);

		await ownerAgent.post(`/workflows/${workflow.id}/deactivate`).send({}).expect(200);

		expect(await publishedVersionOf(workflow.id)).toBeNull();
	});
});

/**
 * The approval commits under the review lock, but auto-publish runs after it is
 * released. Workflow mutations are deliberately not serialized behind that lock,
 * so they can land in the gap. These pin the accepted outcomes: the approval
 * stands and the publish that lost the race is reported as a failure.
 */
describe('a workflow mutation racing the auto-publish of an approval', () => {
	/** Run `raceAction` in the gap between the committed approval and auto-publish. */
	function raceBeforeAutoPublish(raceAction: () => Promise<unknown>) {
		const workflowService = Container.get(WorkflowService);
		const activate = workflowService.activateWorkflow.bind(workflowService);
		vi.spyOn(workflowService, 'activateWorkflow').mockImplementationOnce(async (...args) => {
			await raceAction();
			return await activate(...args);
		});
	}

	test('an archive that lands in the gap leaves an approved review and a failed auto-publish', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId);

		raceBeforeAutoPublish(
			async () => await ownerAgent.post(`/workflows/${workflow.id}/archive`).expect(200),
		);

		const response = await ownerAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		expect(response.body.data).toMatchObject({
			state: 'closed',
			decision: 'approved',
			autoPublish: { status: 'failed', message: 'Cannot activate an archived workflow.' },
		});

		// The archive found the review already closed, so it left the approval alone.
		const closed = await requestRepository.findById(request.id, {});
		expect(closed).toMatchObject({ state: 'closed', decision: 'approved' });

		const archived = await workflowEntityRepository.findOneByOrFail({ id: workflow.id });
		expect(archived.isArchived).toBe(true);
		expect(archived.activeVersionId).toBeNull();

		// Publishing stays blocked by the archival itself, not by the closed review.
		await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(400);
	});

	test('a transfer that lands in the gap leaves an approved review and a failed auto-publish', async () => {
		const versionId = uuid();
		const workflow = await createWorkflow({}, teamProject);
		await createWorkflowHistoryItem(workflow.id, { versionId });

		// The requester publishes on approval, so it must be someone who loses access
		// when the workflow moves — the deciding owner never does.
		const request = await seedReview({
			projectId: teamProject.id,
			workflowId: workflow.id,
			versionId,
			author: member,
		});

		const destination = await createTeamProject('Elsewhere', await createMember());
		raceBeforeAutoPublish(
			async () =>
				await Container.get(EnterpriseWorkflowService).transferWorkflow(
					owner,
					workflow.id,
					destination.id,
				),
		);

		const response = await ownerAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		expect(response.body.data).toMatchObject({
			state: 'closed',
			decision: 'approved',
			autoPublish: {
				status: 'failed',
				message:
					'You do not have permission to activate this workflow. Ask the owner to share it with you.',
			},
		});

		expect(await requestRepository.findById(request.id, {})).toMatchObject({
			state: 'closed',
			decision: 'approved',
		});
		expect(await publishedVersionOf(workflow.id)).toBeNull();
	});

	test('a review created in the gap blocks the auto-publish without failing the decision', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId);

		let racingRequestId = '';
		raceBeforeAutoPublish(async () => {
			racingRequestId = (await createOpenReview(workflow.id, versionId)).id;
		});

		const response = await ownerAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);

		expect(response.body.data).toMatchObject({
			state: 'closed',
			decision: 'approved',
			autoPublish: {
				status: 'failed',
				message:
					"Workflow can't be published while its review is open. Submit this version to the review, or wait for the review to close.",
			},
		});

		// The new review is untouched and still guards the workflow.
		expect(await requestRepository.findOpenRequestForWorkflow(workflow.id, {})).toMatchObject({
			id: racingRequestId,
			state: 'open',
		});
		expect(await publishedVersionOf(workflow.id)).toBeNull();
	});
});
