import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import { EventService } from '@n8n/backend-services';
import { WorkflowsConfig } from '@n8n/config';
import type { Project, User, WorkflowEntity } from '@n8n/db';
import {
	ProjectWorkflowReviewSettings,
	WorkflowRepository,
	WorkflowReviewRequestRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import { addApiKey, createMember } from '@test-integration/db/users';
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
	endpointGroups: ['workflow-reviews', 'workflows', 'publicApi', 'security-settings'],
	enabledFeatures: ['feat:workflowReviews', 'feat:personalSpacePolicy'],
	modules: ['workflow-reviews'],
});

let owner: User;
let member: User;
let ownerProject: Project;
let teamProject: Project;
let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;

let requestRepository: WorkflowReviewRequestRepository;
let workflowEntityRepository: WorkflowRepository;
let policyService: WorkflowReviewPolicyService;

// The auto-publish outcome is asserted synchronously through the mocked
// `ActiveWorkflowManager`, which is the legacy activation path.
const workflowsConfig = Container.get(WorkflowsConfig);
const originalUseWorkflowPublicationService = workflowsConfig.useWorkflowPublicationService;

afterAll(() => {
	workflowsConfig.useWorkflowPublicationService = originalUseWorkflowPublicationService;
});

beforeAll(async () => {
	workflowsConfig.useWorkflowPublicationService = false;
	await utils.initNodeTypes();
	requestRepository = Container.get(WorkflowReviewRequestRepository);
	workflowEntityRepository = Container.get(WorkflowRepository);
	policyService = Container.get(WorkflowReviewPolicyService);
});

beforeEach(async () => {
	testServer.license.enable('feat:workflowReviews');
	await testDb.truncate([...REVIEW_TABLES]);
	await policyService.update({ enabled: true, alwaysRequired: false });
	stubWorkflowValidation(workflowValidationService);

	({ owner, member, ownerProject, teamProject, ownerAgent, memberAgent } = await seedReviewActors(
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

const requireApproval = async () => await policyService.update({ alwaysRequired: true });

const projectSettingsUrl = (projectId: string) => `/projects/${projectId}/workflow-review-settings`;

const requireProjectApproval = async () =>
	await ownerAgent
		.patch(projectSettingsUrl(teamProject.id))
		.send({ requiredByProject: true })
		.expect(200);

/** A team project workflow with its first version live and a second version not yet published. */
async function createLiveTeamWorkflow() {
	const { workflow, versionId: liveVersionId } = await createReviewableWorkflow(teamProject);
	await ownerAgent
		.post(`/workflows/${workflow.id}/activate`)
		.send({ versionId: liveVersionId })
		.expect(200);

	const newVersionId = uuid();
	await createWorkflowHistoryItem(workflow.id, { versionId: newVersionId });

	return { workflow, liveVersionId, newVersionId };
}

async function seedTeamReview(
	workflowId: string,
	versionId: string,
	review: {
		state?: 'open' | 'closed';
		decision?: 'pending' | 'changes_requested' | 'approved';
	} = {},
) {
	return await seedReview({
		projectId: teamProject.id,
		workflowId,
		versionId,
		author: member,
		...review,
	});
}

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

	test('keeps the live version on close and lets the workflow be published again', async () => {
		const { workflow, liveVersionId, newVersionId } = await createLiveTeamWorkflow();
		const request = await seedTeamReview(workflow.id, newVersionId);

		await memberAgent.post(`/workflow-review-requests/${request.id}/close`).expect(200);
		expect(await publishedVersionOf(workflow.id)).toBe(liveVersionId);

		await memberAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: newVersionId })
			.expect(200);
		expect(await publishedVersionOf(workflow.id)).toBe(newVersionId);
	});

	test('allows unpublishing while a review is open', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);

		await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);
		await createOpenReview(workflow.id, versionId);

		await ownerAgent.post(`/workflows/${workflow.id}/deactivate`).send({}).expect(200);

		expect(await publishedVersionOf(workflow.id)).toBeNull();
	});
});

describe.each(['instance', 'project'] as const)(
	'publishing when the %s requires an approved review',
	(level) => {
		const requireApprovalAtLevel = async () =>
			level === 'instance' ? await requireApproval() : await requireProjectApproval();

		test.each([
			['no review', undefined],
			['only an approved review of the live version', { pinned: 'live', decision: 'approved' }],
			[
				'only a closed review of this version without approval',
				{ pinned: 'new', decision: 'changes_requested' },
			],
		] as const)('rejects a team project version with %s', async (_case, review) => {
			const { workflow, liveVersionId, newVersionId } = await createLiveTeamWorkflow();
			if (review) {
				await seedTeamReview(workflow.id, review.pinned === 'live' ? liveVersionId : newVersionId, {
					state: 'closed',
					decision: review.decision,
				});
			}
			await requireApprovalAtLevel();

			const response = await ownerAgent
				.post(`/workflows/${workflow.id}/activate`)
				.send({ versionId: newVersionId })
				.expect(409);

			expect(response.body.meta).toEqual({
				reason: 'review_required',
				versionId: newVersionId,
				validationError: true,
			});
			expect(response.body.message).toContain('Submit this version for review');
			expect(await publishedVersionOf(workflow.id)).toBe(liveVersionId);
		});

		test('rejects a version approved in another project', async () => {
			const { workflow, liveVersionId, newVersionId } = await createLiveTeamWorkflow();
			const otherProject = await createTeamProject('Other project', member);
			await seedReview({
				projectId: otherProject.id,
				workflowId: workflow.id,
				versionId: newVersionId,
				author: member,
				state: 'closed',
				decision: 'approved',
			});
			await requireApprovalAtLevel();

			await ownerAgent
				.post(`/workflows/${workflow.id}/activate`)
				.send({ versionId: newVersionId })
				.expect(409);
			expect(await publishedVersionOf(workflow.id)).toBe(liveVersionId);
		});

		test('rejects a version whose review was closed without approval', async () => {
			const { workflow, liveVersionId, newVersionId } = await createLiveTeamWorkflow();
			const request = await seedTeamReview(workflow.id, newVersionId);
			await requireApprovalAtLevel();

			await memberAgent.post(`/workflow-review-requests/${request.id}/close`).expect(200);

			const response = await ownerAgent
				.post(`/workflows/${workflow.id}/activate`)
				.send({ versionId: newVersionId })
				.expect(409);
			expect(response.body.meta).toMatchObject({ reason: 'review_required' });
			expect(await publishedVersionOf(workflow.id)).toBe(liveVersionId);
		});

		test('publishes a version when its review is approved', async () => {
			const { workflow, newVersionId } = await createLiveTeamWorkflow();
			await requireApprovalAtLevel();
			await ownerAgent
				.post(`/workflows/${workflow.id}/activate`)
				.send({ versionId: newVersionId })
				.expect(409);
			const request = await seedTeamReview(workflow.id, newVersionId);

			const response = await ownerAgent
				.post(`/workflow-review-requests/${request.id}/decision`)
				.send({ decision: 'approved' })
				.expect(200);

			expect(response.body.data.autoPublish).toEqual({ status: 'published' });
			expect(await publishedVersionOf(workflow.id)).toBe(newVersionId);
		});

		test('saves an API key update as a draft and rejects its publish', async () => {
			const { workflow, liveVersionId } = await createLiveTeamWorkflow();
			await requireApprovalAtLevel();
			const { apiKey } = await addApiKey(owner);

			const response = await testServer
				.publicApiAgentWithApiKey(apiKey)
				.put(`/workflows/${workflow.id}`)
				.send({
					name: workflow.name,
					nodes: workflow.nodes.map((node) => ({ ...node, position: [100, 100] })),
					connections: workflow.connections,
					settings: workflow.settings ?? {},
				})
				.expect(409);

			const stored = await workflowEntityRepository.findOneByOrFail({ id: workflow.id });
			expect(response.body.reason).toBe('review_required');
			expect(response.body.versionId).toBe(stored.versionId);
			expect(stored.versionId).not.toBe(liveVersionId);
			expect(stored.activeVersionId).toBe(liveVersionId);
		});

		test('publishes an unapproved team version when workflow reviews are turned off', async () => {
			const { workflow, newVersionId } = await createLiveTeamWorkflow();
			await requireApprovalAtLevel();
			await ownerAgent
				.post(`/workflows/${workflow.id}/activate`)
				.send({ versionId: newVersionId })
				.expect(409);

			await policyService.update({ enabled: false });
			await ownerAgent
				.post(`/workflows/${workflow.id}/activate`)
				.send({ versionId: newVersionId })
				.expect(200);

			expect(await publishedVersionOf(workflow.id)).toBe(newVersionId);
		});
	},
);

describe('publishing when the instance always requires an approved review', () => {
	test('approves only the version that was last submitted to the review', async () => {
		const { workflow, newVersionId: firstSubmittedId } = await createLiveTeamWorkflow();
		const request = await seedTeamReview(workflow.id, firstSubmittedId);
		const lastSubmittedId = uuid();
		await createWorkflowHistoryItem(workflow.id, { versionId: lastSubmittedId });
		await memberAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send({
				workflowId: workflow.id,
				workflowVersionId: lastSubmittedId,
				workflowVersionName: 'Second attempt',
			})
			.expect(200);
		await requireApproval();

		await ownerAgent
			.post(`/workflow-review-requests/${request.id}/decision`)
			.send({ decision: 'approved' })
			.expect(200);
		expect(await publishedVersionOf(workflow.id)).toBe(lastSubmittedId);

		await ownerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: firstSubmittedId })
			.expect(409);
		expect(await publishedVersionOf(workflow.id)).toBe(lastSubmittedId);
	});

	test('rolls back to an earlier version that has an approved review', async () => {
		const { workflow, versionId: firstVersionId } = await createReviewableWorkflow(teamProject);
		const secondVersionId = uuid();
		await createWorkflowHistoryItem(workflow.id, { versionId: secondVersionId });
		for (const versionId of [firstVersionId, secondVersionId]) {
			await seedTeamReview(workflow.id, versionId, { state: 'closed', decision: 'approved' });
		}
		await requireApproval();

		for (const versionId of [firstVersionId, secondVersionId, firstVersionId]) {
			await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);
		}

		expect(await publishedVersionOf(workflow.id)).toBe(firstVersionId);
	});

	test('keeps an unapproved live version live when its settings change', async () => {
		const { workflow, liveVersionId } = await createLiveTeamWorkflow();
		await requireApproval();
		activeWorkflowManager.add.mockClear();

		await Container.get(WorkflowService).update(
			owner,
			{ settings: { saveManualExecutions: true } } as WorkflowEntity,
			workflow.id,
			{ forceSave: true },
		);

		expect(activeWorkflowManager.add).toHaveBeenCalledWith(
			workflow.id,
			'update',
			undefined,
			expect.anything(),
		);
		expect(await publishedVersionOf(workflow.id)).toBe(liveVersionId);
	});

	test('publishes an unapproved team version through a source control pull', async () => {
		const { workflow, newVersionId } = await createLiveTeamWorkflow();
		await requireApproval();

		await Container.get(WorkflowService).activateWorkflowFromSourceControlPull(
			owner,
			workflow.id,
			newVersionId,
		);

		expect(await publishedVersionOf(workflow.id)).toBe(newVersionId);
	});

	test('rejects a source control pull publish while a review is open', async () => {
		const { workflow, liveVersionId, newVersionId } = await createLiveTeamWorkflow();
		await seedTeamReview(workflow.id, newVersionId);
		await requireApproval();

		await expect(
			Container.get(WorkflowService).activateWorkflowFromSourceControlPull(
				owner,
				workflow.id,
				newVersionId,
			),
		).rejects.toMatchObject({ details: { reason: 'review_pending' } });
		expect(await publishedVersionOf(workflow.id)).toBe(liveVersionId);
	});

	test('publishes an unapproved version of a personal workflow', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		await requireApproval();

		await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);

		expect(await publishedVersionOf(workflow.id)).toBe(versionId);
	});

	test('publishes an unapproved team version when approval is required only when configured', async () => {
		const { workflow, newVersionId } = await createLiveTeamWorkflow();
		await policyService.update({ enabled: true, alwaysRequired: false });

		await ownerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: newVersionId })
			.expect(200);

		expect(await publishedVersionOf(workflow.id)).toBe(newVersionId);
	});
});

describe('changing the review settings', () => {
	const saveSettings = async (agent: SuperAgentTest, body: object) =>
		await agent.post('/settings/security').send(body);

	test('rejects a user without the security settings scope who changes Require approval', async () => {
		const response = await saveSettings(memberAgent, { workflowReviews: { alwaysRequired: true } });

		expect(response.status).toBe(403);
		expect((await policyService.get()).alwaysRequired).toBe(false);
	});

	test.each([
		[
			{ alwaysRequired: true },
			[{ settingName: 'workflow_reviews_approval_required', value: true }],
		],
		[{ enabled: false }, [{ settingName: 'workflow_reviews', value: false }]],
	])(
		'records one instance policy event when a review setting changes: %j',
		async (workflowReviews, expectedEvents) => {
			const eventService = Container.get(EventService);
			const settingEvents: Array<{ settingName: string; value: unknown }> = [];
			const listener = ({ settingName, value }: { settingName: string; value: unknown }) =>
				settingEvents.push({ settingName, value });
			eventService.on('instance-policies-updated', listener);

			try {
				for (let i = 0; i < 2; i++) {
					const response = await saveSettings(ownerAgent, { workflowReviews });
					expect(response.status).toBe(200);
				}
			} finally {
				eventService.off('instance-policies-updated', listener);
			}

			expect(settingEvents).toEqual(expectedEvents);
		},
	);

	test('keeps Require approval when workflow reviews are turned off and on again', async () => {
		for (const workflowReviews of [
			{ alwaysRequired: true },
			{ enabled: false },
			{ enabled: true },
		]) {
			expect((await saveSettings(ownerAgent, { workflowReviews })).status).toBe(200);
		}

		expect(await policyService.get()).toEqual({ enabled: true, alwaysRequired: true });
	});

	test('keeps open reviews and live versions when approval becomes required', async () => {
		const { workflow, liveVersionId, newVersionId } = await createLiveTeamWorkflow();
		const request = await seedTeamReview(workflow.id, newVersionId);

		expect(
			(await saveSettings(ownerAgent, { workflowReviews: { alwaysRequired: true } })).status,
		).toBe(200);

		expect(await publishedVersionOf(workflow.id)).toBe(liveVersionId);
		expect(await requestRepository.findOpenRequestForWorkflow(workflow.id, {})).toMatchObject({
			id: request.id,
		});
		const response = await ownerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: newVersionId })
			.expect(409);
		expect(response.body.meta.reason).toBe('review_pending');
	});

	test('reads the workflow review settings', async () => {
		const response = await ownerAgent.get('/settings/security').expect(200);

		expect(response.body.data.workflowReviews).toEqual({ enabled: true, alwaysRequired: false });
	});

	test('saves the workflow review settings and returns the full policy', async () => {
		const response = await saveSettings(ownerAgent, {
			workflowReviews: { alwaysRequired: true },
		});

		expect(response.status).toBe(200);
		expect(response.body.data.workflowReviews).toEqual({ enabled: true, alwaysRequired: true });
	});
});

describe('changing the project review settings', () => {
	test('turns Require approval on and off for a team project', async () => {
		const projectAdmin = await createMember();
		await linkUserToProject(projectAdmin, teamProject, 'project:admin');
		const projectAdminAgent = testServer.authAgentFor(projectAdmin);
		const { workflow, newVersionId } = await createLiveTeamWorkflow();
		const readSetting = async () =>
			(await projectAdminAgent.get(projectSettingsUrl(teamProject.id)).expect(200)).body.data;
		const setSetting = async (requiredByProject: boolean) => {
			const response = await projectAdminAgent
				.patch(projectSettingsUrl(teamProject.id))
				.send({ requiredByProject })
				.expect(200);
			expect(response.body.data).toEqual({ requiredByProject });
		};
		const publishNewVersion = async () =>
			await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId: newVersionId });

		expect(await readSetting()).toEqual({ requiredByProject: false });

		await setSetting(true);
		expect(await readSetting()).toEqual({ requiredByProject: true });
		expect((await publishNewVersion()).status).toBe(409);

		await setSetting(false);
		expect(await readSetting()).toEqual({ requiredByProject: false });
		expect((await publishNewVersion()).status).toBe(200);
		expect(await publishedVersionOf(workflow.id)).toBe(newVersionId);
	});

	test('rejects a project editor who changes Require approval', async () => {
		await memberAgent
			.patch(projectSettingsUrl(teamProject.id))
			.send({ requiredByProject: true })
			.expect(403);

		const stored = await ownerAgent.get(projectSettingsUrl(teamProject.id)).expect(200);
		expect(stored.body.data).toEqual({ requiredByProject: false });
	});

	test('rejects a user outside the project who reads Require approval', async () => {
		const outsider = await createMember();

		await testServer.authAgentFor(outsider).get(projectSettingsUrl(teamProject.id)).expect(403);
	});

	test('refuses to read or change Require approval once an admin turns reviews off', async () => {
		await policyService.update({ enabled: false });

		await ownerAgent.get(projectSettingsUrl(teamProject.id)).expect(403);
		await ownerAgent
			.patch(projectSettingsUrl(teamProject.id))
			.send({ requiredByProject: true })
			.expect(403);

		await policyService.update({ enabled: true });
		const stored = await ownerAgent.get(projectSettingsUrl(teamProject.id)).expect(200);
		expect(stored.body.data).toEqual({ requiredByProject: false });
	});

	test('never requires a review in a personal space', async () => {
		await ownerAgent.get(projectSettingsUrl(ownerProject.id)).expect(404);
		await ownerAgent
			.patch(projectSettingsUrl(ownerProject.id))
			.send({ requiredByProject: true })
			.expect(404);
		await Container.get(DataSource)
			.getRepository(ProjectWorkflowReviewSettings)
			.insert({ projectId: ownerProject.id, requiredByProject: true });
		const { workflow, versionId } = await createReviewableWorkflow(owner);

		await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);

		expect(await publishedVersionOf(workflow.id)).toBe(versionId);
	});

	test('keeps open reviews and live versions when the project starts requiring approval', async () => {
		const { workflow, liveVersionId, newVersionId } = await createLiveTeamWorkflow();
		const request = await seedTeamReview(workflow.id, newVersionId);

		await requireProjectApproval();

		expect(await publishedVersionOf(workflow.id)).toBe(liveVersionId);
		expect(await requestRepository.findOpenRequestForWorkflow(workflow.id, {})).toMatchObject({
			id: request.id,
		});
		const response = await ownerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: newVersionId })
			.expect(409);
		expect(response.body.meta.reason).toBe('review_pending');
	});

	test('keeps the live version of a moved workflow and requires a review for its next version', async () => {
		const { workflow, versionId: liveVersionId } = await createReviewableWorkflow(owner);
		await ownerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: liveVersionId })
			.expect(200);
		await requireProjectApproval();

		await ownerAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: teamProject.id })
			.expect(200);
		expect(await publishedVersionOf(workflow.id)).toBe(liveVersionId);

		const newVersionId = uuid();
		await createWorkflowHistoryItem(workflow.id, { versionId: newVersionId });
		const response = await ownerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: newVersionId })
			.expect(409);
		expect(response.body.meta.reason).toBe('review_required');
	});

	test('records one audit event when Require approval changes for a project', async () => {
		const eventService = Container.get(EventService);
		const events: unknown[] = [];
		const listener = (event: unknown) => events.push(event);
		eventService.on('project-workflow-review-settings-updated', listener);

		try {
			for (const requiredByProject of [false, true, true]) {
				await ownerAgent
					.patch(projectSettingsUrl(teamProject.id))
					.send({ requiredByProject })
					.expect(200);
			}
			const save = async () =>
				await ownerAgent
					.patch(projectSettingsUrl(teamProject.id))
					.send({ requiredByProject: false })
					.expect(200);
			await Promise.all([save(), save()]);
		} finally {
			eventService.off('project-workflow-review-settings-updated', listener);
		}

		expect(events).toEqual([
			{
				user: expect.objectContaining({ id: owner.id }),
				projectId: teamProject.id,
				requiredByProject: true,
			},
			{
				user: expect.objectContaining({ id: owner.id }),
				projectId: teamProject.id,
				requiredByProject: false,
			},
		]);
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
