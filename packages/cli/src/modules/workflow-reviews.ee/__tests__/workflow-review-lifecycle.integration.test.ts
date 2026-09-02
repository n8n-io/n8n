import type { SourceControlledFile } from '@n8n/api-types';
import { createTeamProject, mockInstance, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project, User } from '@n8n/db';
import {
	FolderRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	UserRepository,
	WorkflowRepository,
	WorkflowReviewActivityRepository,
	WorkflowReviewLifecycleRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import { readFile } from 'node:fs/promises';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { EventService } from '@/events/event.service';
import { SourceControlImportService } from '@/modules/source-control.ee/source-control-import.service.ee';
import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowMutationHooksProxy } from '@/workflows/workflow-mutation-hooks-proxy.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import { createFolder } from '@test-integration/db/folders';
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

// `readFile` must be mocked at the module level: the source-control import service
// imports it as a named binding, which `vi.spyOn` can't intercept under Vitest.
// The default implementation passes through to the real fs.
vi.mock('node:fs/promises', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs/promises')>();
	const mockedReadFile = vi.fn(actual.readFile);
	return { ...actual, readFile: mockedReadFile, default: { ...actual, readFile: mockedReadFile } };
});

const testServer = utils.setupTestServer({
	endpointGroups: ['workflow-reviews', 'workflows'],
	enabledFeatures: ['feat:workflowReviews'],
	modules: ['workflow-reviews'],
});

let owner: User;
let ownerProject: Project;
let ownerAgent: SuperAgentTest;

let requestRepository: WorkflowReviewRequestRepository;
let lifecycleRepository: WorkflowReviewLifecycleRepository;
let linkRepository: WorkflowReviewRequestWorkflowRepository;
let activityRepository: WorkflowReviewActivityRepository;

beforeAll(async () => {
	await utils.initNodeTypes();
	requestRepository = Container.get(WorkflowReviewRequestRepository);
	lifecycleRepository = Container.get(WorkflowReviewLifecycleRepository);
	linkRepository = Container.get(WorkflowReviewRequestWorkflowRepository);
	activityRepository = Container.get(WorkflowReviewActivityRepository);
});

beforeEach(async () => {
	testServer.license.enable('feat:workflowReviews');
	// `Folder` on top of the shared list: only the source-control pull tests need it.
	await testDb.truncate(['Folder', ...REVIEW_TABLES]);
	await Container.get(WorkflowReviewPolicyService).set(true);
	stubWorkflowValidation(workflowValidationService);

	({ owner, ownerProject, ownerAgent } = await seedReviewActors(testServer.authAgentFor));
});

/** Read through the endpoint, so the entries are asserted exactly as a reader sees them. */
async function getActivityEntries(requestId: string) {
	const response = await ownerAgent
		.get(`/workflow-review-requests/${requestId}/activity`)
		.expect(200);
	return response.body.data.data as Array<{
		type: string;
		data: Record<string, unknown> | null;
		createdBy: { id: string } | null;
	}>;
}

const closedEntry = expect.objectContaining({
	type: 'review.closed',
	data: { reason: 'no-reviewable-workflows' },
});

/**
 * Take the activity writes down for the duration of `mutate`, then restore them.
 *
 * Scoping it to the one mutation matters: counting `mockRejectedValueOnce` calls
 * instead couples the test to how many writes that mutation happens to attempt,
 * and an unconsumed rejection then leaks into the *next* mutation — which is the
 * sweep these tests are trying to observe working.
 */
async function withActivityWritesDown(mutate: () => Promise<unknown>) {
	const spy = vi
		.spyOn(activityRepository, 'createActivity')
		.mockRejectedValue(new Error('write failed'));
	try {
		await mutate();
	} finally {
		spy.mockRestore();
	}
}

async function createOpenReview(
	workflowId: string,
	versionId: string,
	overrides: {
		state?: 'open' | 'closed';
		decision?: 'pending' | 'changes_requested' | 'approved';
	} = {},
) {
	return await seedReview({
		projectId: ownerProject.id,
		workflowId,
		versionId,
		author: owner,
		...overrides,
	});
}

describe('auto-close on workflow archive', () => {
	test('archiving records the cause and the close, leaving the decision unchanged', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId, {
			decision: 'changes_requested',
		});
		// Spied rather than mocked: the real container's listeners must keep running.
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		await ownerAgent.post(`/workflows/${workflow.id}/archive`).expect(200);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(closed?.decision).toBe('changes_requested');
		expect(closed?.closedById).toBeNull();
		expect(closed?.approvedAt).toBeNull();

		expect(await getActivityEntries(request.id)).toEqual([
			expect.objectContaining({
				type: 'workflow.archived',
				data: { workflowId: workflow.id, actorKind: 'user' },
				createdBy: expect.objectContaining({ id: owner.id }),
			}),
			closedEntry,
		]);

		// The archive path reports the close naming the cause, and the sweep that runs right
		// after it finds nothing left to report.
		expect(emit.mock.calls.filter(([eventName]) => eventName === 'workflow-review-closed')).toEqual(
			[
				[
					'workflow-review-closed',
					{
						workflowReviewRequestId: request.id,
						cause: { trigger: 'workflow-archived', actorKind: 'user', userId: owner.id },
					},
				],
			],
		);
	});

	// The cause, the close and its explanation share one transaction, so an unwritable entry
	// rolls all of them back — and archiving still succeeds, because cleanup never fails the
	// mutation. The reconciliation sweep that follows the hook picks the rolled-back review
	// straight back up, closing it without the (unrecoverable) cause entry.
	test('archives the workflow anyway when the cause cannot be recorded, and the sweep closes it', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId);
		vi.spyOn(activityRepository, 'createActivity').mockRejectedValueOnce(new Error('write failed'));

		await ownerAgent.post(`/workflows/${workflow.id}/archive`).expect(200);

		expect((await requestRepository.findById(request.id, {}))?.state).toBe('closed');
		expect(await getActivityEntries(request.id)).toEqual([closedEntry]);
	});

	// Both the targeted close and the sweep that follows it are down, so the review is stranded
	// open on a workflow that is already archived — the state the next sweep has to repair.
	test('a review stranded open on an archived workflow is closed by the next sweep', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId);
		await withActivityWritesDown(
			async () => await ownerAgent.post(`/workflows/${workflow.id}/archive`).expect(200),
		);
		expect((await requestRepository.findById(request.id, {}))?.state).toBe('open');

		// Any later lifecycle mutation runs the sweep again — this one touches an unrelated
		// workflow, so only the sweep can reach the stranded review.
		const unrelated = await createReviewableWorkflow(owner);
		await ownerAgent.post(`/workflows/${unrelated.workflow.id}/archive`).expect(200);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(closed?.closedById).toBeNull();
		expect(await getActivityEntries(request.id)).toEqual([closedEntry]);
	});

	test('unarchiving does not reopen the review, and the workflow is no longer publish-blocked', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId);

		await ownerAgent.post(`/workflows/${workflow.id}/archive`).expect(200);
		await ownerAgent.post(`/workflows/${workflow.id}/unarchive`).expect(200);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(await requestRepository.findOpenRequestForWorkflow(workflow.id, {})).toBeNull();
	});

	test('an already-closed (approved) review is untouched by archiving', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId, {
			state: 'closed',
			decision: 'approved',
		});

		await ownerAgent.post(`/workflows/${workflow.id}/archive`).expect(200);

		const untouched = await requestRepository.findById(request.id, {});
		expect(untouched?.state).toBe('closed');
		expect(untouched?.decision).toBe('approved');
		expect(untouched?.updatedAt).toEqual(request.updatedAt);
	});
});

describe('auto-close on workflow transfer', () => {
	test('moving the workflow to another project records the cause and closes the review', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId);
		const destination = await createTeamProject('Destination', owner);

		await Container.get(EnterpriseWorkflowService).transferWorkflow(
			owner,
			workflow.id,
			destination.id,
		);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(closed?.decision).toBe('pending');
		expect(await requestRepository.findOpenRequestForWorkflow(workflow.id, {})).toBeNull();

		expect(await getActivityEntries(request.id)).toEqual([
			expect.objectContaining({
				type: 'workflow.moved',
				data: { workflowId: workflow.id, actorKind: 'user' },
				createdBy: expect.objectContaining({ id: owner.id }),
			}),
			closedEntry,
		]);
	});

	// The move stays committed when its close rolls back, leaving the review open on a workflow
	// that now belongs to another project — the sweep still has the link row to find it by.
	test('a review stranded open on a moved workflow is closed by the next sweep', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId);
		const destination = await createTeamProject('Destination', owner);

		await withActivityWritesDown(
			async () =>
				await Container.get(EnterpriseWorkflowService).transferWorkflow(
					owner,
					workflow.id,
					destination.id,
				),
		);
		expect((await requestRepository.findById(request.id, {}))?.state).toBe('open');

		const unrelated = await createReviewableWorkflow(owner);
		await ownerAgent.post(`/workflows/${unrelated.workflow.id}/archive`).expect(200);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(await linkRepository.findByRequestId(request.id, {})).toHaveLength(1);
		expect(await getActivityEntries(request.id)).toEqual([closedEntry]);
	});

	test('a review whose workflow is still in its project and unarchived is left open', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId);

		const unrelated = await createReviewableWorkflow(owner);
		await ownerAgent.post(`/workflows/${unrelated.workflow.id}/archive`).expect(200);

		expect((await requestRepository.findById(request.id, {}))?.state).toBe('open');
	});
});

describe('auto-close on workflow hard delete', () => {
	test('force-deleting a non-archived workflow records the cause and closes the review', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId);

		await Container.get(WorkflowService).delete(owner, workflow.id, true);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		// The link row cascaded away with the workflow; the request itself remains, closed.
		expect(await linkRepository.findByRequestId(request.id, {})).toHaveLength(0);

		// The captured-context path and the post-delete sweep both run here, so the count
		// matters as much as the content: the review must be explained exactly once.
		expect(await getActivityEntries(request.id)).toEqual([
			expect.objectContaining({
				type: 'workflow.deleted',
				data: { workflowId: workflow.id, actorKind: 'user' },
				createdBy: expect.objectContaining({ id: owner.id }),
			}),
			closedEntry,
		]);
	});

	// The capture is best-effort: when it fails, the delete still goes through and the
	// sweep closes the review — without the cause entry, which the cascade made unrecoverable.
	test('a failed capture degrades to a sweep close without a cause entry', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner, { isArchived: true });
		const request = await createOpenReview(workflow.id, versionId);
		vi.spyOn(lifecycleRepository, 'findOpenRequestsAffectedByWorkflows').mockRejectedValueOnce(
			new Error('read failed'),
		);

		await ownerAgent.delete(`/workflows/${workflow.id}`).expect(200);

		expect(await Container.get(WorkflowRepository).findOneBy({ id: workflow.id })).toBeNull();
		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(await getActivityEntries(request.id)).toEqual([closedEntry]);
	});

	// A review opened after the capture ran loses its link row to the cascade and
	// can no longer be found by workflow id. The post-delete sweep is what catches it.
	test('a review orphaned by a delete that skipped the hooks is closed by the next delete', async () => {
		const orphaned = await createReviewableWorkflow(owner);
		const request = await createOpenReview(orphaned.workflow.id, orphaned.versionId);

		// Delete the row straight from the repository, as a folder-hierarchy cascade does:
		// no hook fires, so the request is left open with its link row cascaded away.
		await Container.get(WorkflowRepository).delete(orphaned.workflow.id);
		expect((await requestRepository.findById(request.id, {}))?.state).toBe('open');
		expect(await linkRepository.findByRequestId(request.id, {})).toHaveLength(0);

		// `unrelated` has no review of its own, so the capture finds nothing to record
		// and the sweep is the only thing that can explain the orphaned review.
		const unrelated = await createReviewableWorkflow(owner);
		await Container.get(WorkflowService).delete(owner, unrelated.workflow.id, true);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(closed?.closedById).toBeNull();

		expect(await getActivityEntries(request.id)).toEqual([closedEntry]);
	});

	test('leaves a review whose workflow still exists open', async () => {
		const live = await createReviewableWorkflow(owner);
		const request = await createOpenReview(live.workflow.id, live.versionId);

		const other = await createReviewableWorkflow(owner);
		await Container.get(WorkflowService).delete(owner, other.workflow.id, true);

		expect((await requestRepository.findById(request.id, {}))?.state).toBe('open');
	});
});

describe('close policy with multiple linked workflows', () => {
	test('stays open while a reviewable workflow remains outside the affected set, then closes', async () => {
		const first = await createReviewableWorkflow(owner);
		const second = await createReviewableWorkflow(owner);
		const request = await createOpenReview(first.workflow.id, first.versionId);
		await linkRepository.createWorkflowRow(
			{
				workflowReviewRequestId: request.id,
				workflowId: second.workflow.id,
				workflowVersionId: second.versionId,
			},
			{},
		);

		await ownerAgent.post(`/workflows/${first.workflow.id}/archive`).expect(200);

		// The cause is on the record, but the second workflow is still reviewable.
		expect((await requestRepository.findById(request.id, {}))?.state).toBe('open');
		expect(await getActivityEntries(request.id)).toEqual([
			expect.objectContaining({
				type: 'workflow.archived',
				data: { workflowId: first.workflow.id, actorKind: 'user' },
			}),
		]);

		await ownerAgent.post(`/workflows/${second.workflow.id}/archive`).expect(200);

		expect((await requestRepository.findById(request.id, {}))?.state).toBe('closed');
		expect(await getActivityEntries(request.id)).toEqual([
			expect.objectContaining({
				type: 'workflow.archived',
				data: { workflowId: first.workflow.id, actorKind: 'user' },
			}),
			expect.objectContaining({
				type: 'workflow.archived',
				data: { workflowId: second.workflow.id, actorKind: 'user' },
			}),
			closedEntry,
		]);
	});

	// A linked workflow without an owner sharing row is a broken row, not a move; the
	// targeted close must leave it reviewable, exactly as the reconciliation sweep does.
	test('treats a linked workflow with no owner row as reviewable, matching the sweep', async () => {
		const first = await createReviewableWorkflow(owner);
		const second = await createReviewableWorkflow(owner);
		const request = await createOpenReview(first.workflow.id, first.versionId);
		await linkRepository.createWorkflowRow(
			{
				workflowReviewRequestId: request.id,
				workflowId: second.workflow.id,
				workflowVersionId: second.versionId,
			},
			{},
		);
		await Container.get(SharedWorkflowRepository).delete({ workflowId: second.workflow.id });

		await ownerAgent.post(`/workflows/${first.workflow.id}/archive`).expect(200);

		// Neither the targeted close nor the sweep that follows it may take the request.
		expect((await requestRepository.findById(request.id, {}))?.state).toBe('open');
	});
});

describe('publish recorder', () => {
	/** Approved reviews are closed; publishing them is the happy path the recorder must reach. */
	const approvedReview = async (workflowId: string, versionId: string) =>
		await createOpenReview(workflowId, versionId, { state: 'closed', decision: 'approved' });

	const publishedEntry = (workflowId: string, versionId: string) =>
		expect.objectContaining({
			type: 'workflow.published',
			data: { workflowId, workflowVersionId: versionId },
			createdBy: expect.objectContaining({ id: owner.id }),
		});

	test('records workflow.published into the closed (approved) review pinned to the version', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await approvedReview(workflow.id, versionId);

		await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);

		expect(await getActivityEntries(request.id)).toEqual([publishedEntry(workflow.id, versionId)]);
	});

	test('records the entry on the outbox activation path too', async () => {
		const globalConfig = Container.get(GlobalConfig);
		// Stubbed so the flag flip does not pull the outbox consumer into this process.
		vi.spyOn(Container.get(WorkflowPublicationNotifier), 'requestDrain').mockReturnValue();
		globalConfig.workflows.useWorkflowPublicationService = true;
		try {
			const { workflow, versionId } = await createReviewableWorkflow(owner);
			const request = await approvedReview(workflow.id, versionId);

			await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);

			expect(await getActivityEntries(request.id)).toEqual([
				publishedEntry(workflow.id, versionId),
			]);
		} finally {
			globalConfig.workflows.useWorkflowPublicationService = false;
		}
	});

	test('records into every request pinned to the published version', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const first = await approvedReview(workflow.id, versionId);
		const second = await approvedReview(workflow.id, versionId);

		await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);

		expect(await getActivityEntries(first.id)).toEqual([publishedEntry(workflow.id, versionId)]);
		expect(await getActivityEntries(second.id)).toEqual([publishedEntry(workflow.id, versionId)]);
	});

	// It's a timeline, matching publish history: each publication of the version is an event.
	test('repeated publication of the same version appends repeated entries', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await approvedReview(workflow.id, versionId);

		await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);
		await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);

		expect(await getActivityEntries(request.id)).toEqual([
			publishedEntry(workflow.id, versionId),
			publishedEntry(workflow.id, versionId),
		]);
	});

	test('records nothing for a review pinned to a different version', async () => {
		const { workflow, versionId: pinnedVersionId } = await createReviewableWorkflow(owner);
		const request = await approvedReview(workflow.id, pinnedVersionId);

		const otherVersionId = uuid();
		await createWorkflowHistoryItem(workflow.id, { versionId: otherVersionId });
		await ownerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: otherVersionId })
			.expect(200);

		expect(await getActivityEntries(request.id)).toEqual([]);
	});

	test('records nothing when activation fails before the commit boundary', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await approvedReview(workflow.id, versionId);
		activeWorkflowManager.add.mockRejectedValueOnce(new Error('Webhook path already taken'));

		await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(400);

		expect(await getActivityEntries(request.id)).toEqual([]);
	});

	// The rename and the final re-fetch run after the boundary; their failures fail the API
	// call, but the publication is committed and its record must survive with it.
	test('the entry persists when post-boundary work throws', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await approvedReview(workflow.id, versionId);
		vi.spyOn(Container.get(WorkflowHistoryService), 'updateVersion').mockRejectedValueOnce(
			new Error('rename failed'),
		);

		await expect(
			Container.get(WorkflowService).activateWorkflow(owner, workflow.id, {
				versionId,
				name: 'Renamed after publish',
			}),
		).rejects.toThrow('rename failed');

		expect(
			(await Container.get(WorkflowRepository).findOneByOrFail({ id: workflow.id }))
				.activeVersionId,
		).toBe(versionId);
		expect(await getActivityEntries(request.id)).toEqual([publishedEntry(workflow.id, versionId)]);
	});

	// The publication must never fail because its feed entry could not be written.
	test('a failed recorder write does not fail the publish', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await approvedReview(workflow.id, versionId);
		vi.spyOn(activityRepository, 'createActivity').mockRejectedValueOnce(new Error('db down'));

		await ownerAgent.post(`/workflows/${workflow.id}/activate`).send({ versionId }).expect(200);

		expect(
			(await Container.get(WorkflowRepository).findOneByOrFail({ id: workflow.id }))
				.activeVersionId,
		).toBe(versionId);
		expect(await getActivityEntries(request.id)).toEqual([]);
	});
});

describe('auto-close with the instance policy disabled', () => {
	test('cleanup still runs when the policy toggle is off', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId);

		await Container.get(WorkflowReviewPolicyService).set(false);

		await ownerAgent.post(`/workflows/${workflow.id}/archive`).expect(200);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
	});
});

describe('auto-close on source-control pull', () => {
	const mockFileData = new Map<string, string>();
	const fsReadFile = vi.mocked(readFile);
	let importService: SourceControlImportService;

	beforeAll(() => {
		// Manual construction with real persistence + the real hooks proxy (whose
		// provider the workflow-reviews module registered), fs and non-workflow
		// dependencies mocked — same pattern as the environments integration tests.
		importService = new SourceControlImportService(
			mock(), // logger
			mock(), // errorReporter
			mock(), // variablesService
			mock(), // credentialsRepository
			Container.get(ProjectRepository),
			mock(), // projectRelationRepository
			mock(), // tagRepository
			Container.get(SharedWorkflowRepository),
			mock(), // sharedCredentialsRepository
			Container.get(UserRepository),
			mock(), // variablesRepository
			Container.get(WorkflowRepository),
			mock(), // workflowTagMappingRepository
			mock(), // workflowService
			mock(), // credentialsService
			mock(), // tagService
			Container.get(FolderRepository),
			mock<InstanceSettings>({ n8nFolder: '/mock' }),
			mock(), // sourceControlContextFactory
			mock(), // sourceControlScopedService
			Container.get(WorkflowHistoryService),
			mock(), // dataTableRepository
			mock(), // dataTableColumnRepository
			mock(), // dataTableDDLService
			mock(), // redactionEnforcementService
			mock<PolicyEnforcementService>({
				hasChecksFor: () => true,
				evaluateContentImport: async () => ({ violations: [] }),
			}), // policyEnforcementService
			mock(), // dataTableSizeValidator
			mock(), // activeWorkflowManager
			mock(), // executionPersistence
			mock(), // workflowPublishGuard
			Container.get(WorkflowMutationHooksProxy),
		);
	});

	beforeEach(() => {
		mockFileData.clear();
		fsReadFile.mockImplementation(async (path) => {
			const pathStr = typeof path === 'string' ? path : path.toString();
			const data = mockFileData.get(pathStr);
			if (data === undefined) throw new Error(`Trying to access invalid file in test: ${pathStr}`);
			return data;
		});
	});

	afterAll(() => {
		// Restore the pass-through implementation given to vi.fn(actual.readFile)
		fsReadFile.mockReset();
	});

	const putWorkflowFile = (remote: { id: string }) => {
		const file = `/mock/${remote.id}.json`;
		mockFileData.set(file, JSON.stringify(remote));
		return mock<SourceControlledFile>({ id: remote.id, file });
	};

	const remoteWorkflow = (id: string, overrides: Record<string, unknown> = {}) => ({
		id,
		name: 'Remote Workflow',
		versionId: uuid(),
		nodes: [],
		connections: {},
		settings: {},
		parentFolderId: null,
		active: false,
		isArchived: false,
		owner: { type: 'personal', personalEmail: owner.email },
		...overrides,
	});

	test('a pull that archives the workflow closes the open review, decision unchanged', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId, {
			decision: 'changes_requested',
		});

		const candidate = putWorkflowFile(remoteWorkflow(workflow.id, { isArchived: true }));
		await importService.importWorkflowFromWorkFolder([candidate], owner.id);

		const archived = await Container.get(WorkflowRepository).findOneBy({ id: workflow.id });
		expect(archived?.isArchived).toBe(true);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(closed?.decision).toBe('changes_requested');
		expect(closed?.closedById).toBeNull();
		// The publish guard keys off open requests — none left to block publishing
		expect(await requestRepository.findOpenRequestForWorkflow(workflow.id, {})).toBeNull();

		// A pull is a system mutation: the cause entry says so instead of naming a user.
		expect(await getActivityEntries(request.id)).toEqual([
			expect.objectContaining({
				type: 'workflow.archived',
				data: { workflowId: workflow.id, actorKind: 'system' },
				createdBy: null,
			}),
			closedEntry,
		]);
	});

	test('an already-approved (closed) review is untouched by a pull-archive', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId, {
			state: 'closed',
			decision: 'approved',
		});

		const candidate = putWorkflowFile(remoteWorkflow(workflow.id, { isArchived: true }));
		await importService.importWorkflowFromWorkFolder([candidate], owner.id);

		const untouched = await requestRepository.findById(request.id, {});
		expect(untouched?.state).toBe('closed');
		expect(untouched?.decision).toBe('approved');
		expect(untouched?.updatedAt).toEqual(request.updatedAt);
	});

	test('a pull that updates the workflow without archiving leaves the review open', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await createOpenReview(workflow.id, versionId);

		const candidate = putWorkflowFile(remoteWorkflow(workflow.id, { name: 'Updated by pull' }));
		await importService.importWorkflowFromWorkFolder([candidate], owner.id);

		const updated = await Container.get(WorkflowRepository).findOneBy({ id: workflow.id });
		expect(updated?.name).toBe('Updated by pull');

		const stillOpen = await requestRepository.findById(request.id, {});
		expect(stillOpen?.state).toBe('open');
	});

	test('a pull that deletes a folder closes reviews of cascade-deleted workflows', async () => {
		const folder = await createFolder(ownerProject, { name: 'Deleted remotely' });
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		await Container.get(WorkflowRepository).save({ id: workflow.id, parentFolder: folder });
		const request = await createOpenReview(workflow.id, versionId);

		await importService.deleteFoldersNotInWorkfolder([
			mock<SourceControlledFile>({ id: folder.id, name: folder.name }),
		]);

		// The workflow went with the folder cascade...
		expect(await Container.get(WorkflowRepository).findOneBy({ id: workflow.id })).toBeNull();

		// ...but its review was closed with the deletion on the record, not left orphaned open
		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(closed?.closedById).toBeNull();
		expect(await linkRepository.findByRequestId(request.id, {})).toHaveLength(0);
		expect(await getActivityEntries(request.id)).toEqual([
			expect.objectContaining({
				type: 'workflow.deleted',
				data: { workflowId: workflow.id, actorKind: 'system' },
				createdBy: null,
			}),
			closedEntry,
		]);
	});
});
