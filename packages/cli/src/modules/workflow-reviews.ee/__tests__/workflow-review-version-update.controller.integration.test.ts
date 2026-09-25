import type { WorkflowReviewInboxItem } from '@n8n/api-types';
import { mockInstance, testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	WorkflowHistoryRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import {
	createReviewableWorkflow,
	findVersionName,
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
let ownerProject: Project;
let teamProject: Project;
let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;

let requestRepository: WorkflowReviewRequestRepository;
let workflowRepository: WorkflowReviewRequestWorkflowRepository;
let authorRepository: WorkflowReviewRequestAuthorRepository;
let workflowHistoryRepository: WorkflowHistoryRepository;
let policyService: WorkflowReviewPolicyService;

beforeAll(async () => {
	await utils.initNodeTypes();
	requestRepository = Container.get(WorkflowReviewRequestRepository);
	workflowRepository = Container.get(WorkflowReviewRequestWorkflowRepository);
	authorRepository = Container.get(WorkflowReviewRequestAuthorRepository);
	workflowHistoryRepository = Container.get(WorkflowHistoryRepository);
	policyService = Container.get(WorkflowReviewPolicyService);
});

beforeEach(async () => {
	testServer.license.enable('feat:workflowReviews');
	await testDb.truncate([...REVIEW_TABLES]);
	await policyService.set(true);
	stubWorkflowValidation(workflowValidationService);

	({ owner, member, ownerProject, teamProject, ownerAgent, memberAgent } = await seedReviewActors(
		testServer.authAgentFor,
	));
});

/** Seed an open review pinned to `versionId`, authored by `author`. */
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
	return await seedReview({
		projectId,
		workflowId,
		versionId,
		author,
		title: 'Existing review',
		...overrides,
	});
}

const updateVersion = (agent: SuperAgentTest, requestId: string, body: object) =>
	agent.post(`/workflow-review-requests/${requestId}/update-version`).send(body);

/** A workflow with two history versions, so it can be re-pinned. */
async function createRepinnableWorkflow(ownerOrProject: User | Project = owner) {
	const { workflow } = await createReviewableWorkflow(ownerOrProject, { versionId: 'version-1' });
	await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });
	return workflow;
}

describe('POST /workflow-review-requests/:workflowReviewRequestId/update-version', () => {
	test('re-pins the version, resets the decision, and keeps the author list deduplicated', async () => {
		const workflow = await createRepinnableWorkflow();
		const request = await seedOpenRequest(workflow.id, 'version-1', owner, ownerProject.id, {
			decision: 'changes_requested',
		});

		const response = await updateVersion(
			ownerAgent,
			request.id,
			versionUpdatePayload({ workflowId: workflow.id, versionId: 'version-2' }),
		).expect(200);

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
		const workflow = await createRepinnableWorkflow(teamProject);
		const request = await seedOpenRequest(workflow.id, 'version-1', owner, teamProject.id);

		await updateVersion(
			memberAgent,
			request.id,
			versionUpdatePayload({ workflowId: workflow.id, versionId: 'version-2' }),
		).expect(200);

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

	test('writes nothing when the version under review is unchanged', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await seedOpenRequest(workflow.id, versionId, owner, ownerProject.id, {
			decision: 'changes_requested',
		});

		const response = await updateVersion(
			ownerAgent,
			request.id,
			versionUpdatePayload({ workflowId: workflow.id, versionId }),
		).expect(200);

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
		const workflow = await createRepinnableWorkflow();
		const request = await seedOpenRequest(workflow.id, 'version-1', owner, ownerProject.id, {
			description: 'Original review description',
		});

		await updateVersion(
			ownerAgent,
			request.id,
			versionUpdatePayload({
				workflowId: workflow.id,
				versionId: 'version-2',
				description: '  Updated review description  ',
			}),
		).expect(200);

		const updated = await requestRepository.findById(request.id, {});
		expect(updated?.description).toBe('Updated review description');
	});

	test('updates the review description when the version is already pinned', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await seedOpenRequest(workflow.id, versionId, owner, ownerProject.id, {
			decision: 'changes_requested',
			description: 'Original review description',
		});

		await updateVersion(
			ownerAgent,
			request.id,
			versionUpdatePayload({
				workflowId: workflow.id,
				versionId,
				description: 'Updated review description',
			}),
		).expect(200);

		const updated = await requestRepository.findById(request.id, {});
		expect(updated).toMatchObject({
			description: 'Updated review description',
			decision: 'changes_requested',
		});
	});

	test.each([
		{ name: 'an empty string', description: '' },
		{ name: 'a whitespace-only string', description: '   ' },
	])('clears the review description when $name is sent', async ({ description }) => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await seedOpenRequest(workflow.id, versionId, owner, ownerProject.id, {
			description: 'Original review description',
		});

		await updateVersion(
			ownerAgent,
			request.id,
			versionUpdatePayload({ workflowId: workflow.id, versionId, description }),
		).expect(200);

		expect((await requestRepository.findById(request.id, {}))?.description).toBeNull();
	});

	test('hides a review that does not exist', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);

		await updateVersion(
			ownerAgent,
			'unknown-request',
			versionUpdatePayload({ workflowId: workflow.id, versionId }),
		).expect(404);
	});

	test('hides a review whose workflow the caller cannot access', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await seedOpenRequest(workflow.id, versionId, owner);

		await updateVersion(
			memberAgent,
			request.id,
			versionUpdatePayload({ workflowId: workflow.id, versionId }),
		).expect(404);
	});

	test('hides a workflow the review does not cover', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const other = await createReviewableWorkflow(owner, { versionId: 'version-other' });
		const request = await seedOpenRequest(workflow.id, versionId, owner);

		await updateVersion(
			ownerAgent,
			request.id,
			versionUpdatePayload({ workflowId: other.workflow.id, versionId: 'version-other' }),
		).expect(404);
	});

	test('refuses to re-pin a closed review', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await seedOpenRequest(workflow.id, versionId, owner, ownerProject.id, {
			state: 'closed',
		});

		const response = await updateVersion(
			ownerAgent,
			request.id,
			versionUpdatePayload({ workflowId: workflow.id, versionId }),
		).expect(409);

		expect(JSON.stringify(response.body)).not.toMatch(/sync/i);
	});

	test('refuses an archived workflow', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner, { isArchived: true });
		const request = await seedOpenRequest(workflow.id, versionId, owner);

		await updateVersion(
			ownerAgent,
			request.id,
			versionUpdatePayload({ workflowId: workflow.id, versionId }),
		).expect(400);
	});

	test('refuses a version the workflow does not have', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await seedOpenRequest(workflow.id, versionId, owner);

		await updateVersion(
			ownerAgent,
			request.id,
			versionUpdatePayload({ workflowId: workflow.id, versionId: 'unknown-version' }),
		).expect(400);
	});

	test('refuses everything once an admin turns reviews off', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await seedOpenRequest(workflow.id, versionId, owner);
		await policyService.set(false);

		await updateVersion(
			ownerAgent,
			request.id,
			versionUpdatePayload({ workflowId: workflow.id, versionId }),
		).expect(403);
	});

	describe('pinned version naming', () => {
		test('names the newly pinned version', async () => {
			const workflow = await createRepinnableWorkflow();
			const request = await seedOpenRequest(workflow.id, 'version-1', owner);

			await updateVersion(
				ownerAgent,
				request.id,
				versionUpdatePayload({ workflowId: workflow.id, versionId: 'version-2' }),
			).expect(200);

			expect(await findVersionName(workflow.id, 'version-2')).toBe('Release candidate');
			// The previously pinned version keeps whatever name it had.
			expect(await findVersionName(workflow.id, 'version-1')).toBeNull();
		});

		test('renames the version on a re-pin to the version already pinned', async () => {
			const { workflow, versionId } = await createReviewableWorkflow(owner);
			const request = await seedOpenRequest(workflow.id, versionId, owner);

			await updateVersion(
				ownerAgent,
				request.id,
				versionUpdatePayload({ workflowId: workflow.id, versionId, versionName: 'Renamed' }),
			).expect(200);

			expect(await findVersionName(workflow.id, versionId)).toBe('Renamed');
			// Still a no-op for the review itself.
			const unchanged = await requestRepository.findById(request.id, {});
			expect(unchanged?.updatedAt).toEqual(request.updatedAt);
		});

		test('persists the version description on a re-pin', async () => {
			const workflow = await createRepinnableWorkflow();
			const request = await seedOpenRequest(workflow.id, 'version-1', owner);

			await updateVersion(
				ownerAgent,
				request.id,
				versionUpdatePayload({
					workflowId: workflow.id,
					versionId: 'version-2',
					workflowVersionDescription: 'What changed in this version',
				}),
			).expect(200);

			const version = await workflowHistoryRepository.findOneBy({
				workflowId: workflow.id,
				versionId: 'version-2',
			});
			expect(version?.description).toBe('What changed in this version');
		});

		test('updates the description of the version already pinned', async () => {
			const { workflow, versionId } = await createReviewableWorkflow(owner);
			const request = await seedOpenRequest(workflow.id, versionId, owner);

			await updateVersion(
				ownerAgent,
				request.id,
				versionUpdatePayload({
					workflowId: workflow.id,
					versionId,
					workflowVersionDescription: 'Description added later',
				}),
			).expect(200);

			const version = await workflowHistoryRepository.findOneBy({
				workflowId: workflow.id,
				versionId,
			});
			expect(version?.description).toBe('Description added later');
			// Still a no-op for the review itself.
			const unchanged = await requestRepository.findById(request.id, {});
			expect(unchanged?.updatedAt).toEqual(request.updatedAt);
		});
	});
});
