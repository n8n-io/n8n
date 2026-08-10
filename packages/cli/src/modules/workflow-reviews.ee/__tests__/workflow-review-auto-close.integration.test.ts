process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';

import type { SourceControlledFile } from '@n8n/api-types';
import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	FolderRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	UserRepository,
	WorkflowRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import { readFile } from 'node:fs/promises';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { SourceControlImportService } from '@/modules/source-control.ee/source-control-import.service.ee';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowMutationHooksProxy } from '@/workflows/workflow-mutation-hooks-proxy.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import { WorkflowService } from '@/workflows/workflow.service';
import { createFolder } from '@test-integration/db/folders';
import { createOwner } from '@test-integration/db/users';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

mockInstance(ActiveWorkflowManager);

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
let linkRepository: WorkflowReviewRequestWorkflowRepository;
let authorRepository: WorkflowReviewRequestAuthorRepository;

beforeAll(async () => {
	await utils.initNodeTypes();
	requestRepository = Container.get(WorkflowReviewRequestRepository);
	linkRepository = Container.get(WorkflowReviewRequestWorkflowRepository);
	authorRepository = Container.get(WorkflowReviewRequestAuthorRepository);
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
		'WorkflowPublishedVersion',
		'WorkflowPublicationOutbox',
		'WorkflowPublishHistory',
		'WorkflowEntity',
		'WorkflowHistory',
		'Folder',
		'ProjectRelation',
		'Project',
		'User',
	]);

	await Container.get(WorkflowReviewPolicyService).set(true);

	owner = await createOwner();
	ownerProject = await getPersonalProject(owner);
	ownerAgent = testServer.authAgentFor(owner);
});

/** Create a workflow owned by `owner` with a pinned history version. */
async function createReviewableWorkflow() {
	const versionId = uuid();
	const workflow = await createWorkflow({ versionId }, owner);
	await createWorkflowHistoryItem(workflow.id, { versionId });
	return { workflow, versionId };
}

async function createOpenReview(
	workflowId: string,
	versionId: string,
	overrides: {
		state?: 'open' | 'closed';
		decision?: 'pending' | 'changes_requested' | 'approved';
	} = {},
) {
	const request = await requestRepository.createRequest(
		{
			projectId: ownerProject.id,
			title: 'Review before publishing',
			createdById: owner.id,
			state: overrides.state,
			decision: overrides.decision,
		},
		{},
	);
	await linkRepository.createWorkflowRow(
		{ workflowReviewRequestId: request.id, workflowId, workflowVersionId: versionId },
		{},
	);
	await authorRepository.addAuthor({ workflowReviewRequestId: request.id, userId: owner.id }, {});
	return request;
}

describe('auto-close on workflow archive', () => {
	test('archiving closes the open review, leaving the decision unchanged', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await createOpenReview(workflow.id, versionId, {
			decision: 'changes_requested',
		});

		await ownerAgent.post(`/workflows/${workflow.id}/archive`).expect(200);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(closed?.decision).toBe('changes_requested');
		expect(closed?.closedById).toBeNull();
		expect(closed?.approvedAt).toBeNull();
	});

	test('unarchiving does not reopen the review, and the workflow is no longer publish-blocked', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await createOpenReview(workflow.id, versionId);

		await ownerAgent.post(`/workflows/${workflow.id}/archive`).expect(200);
		await ownerAgent.post(`/workflows/${workflow.id}/unarchive`).expect(200);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(await requestRepository.findOpenRequestForWorkflow(workflow.id, {})).toBeNull();
	});

	test('an already-closed (approved) review is untouched by archiving', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
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
	test('moving the workflow to another project closes the open review', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
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
	});
});

describe('auto-close on workflow hard delete', () => {
	test('force-deleting a non-archived workflow closes the review instead of orphaning it open', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
		const request = await createOpenReview(workflow.id, versionId);

		await Container.get(WorkflowService).delete(owner, workflow.id, true);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		// The link row cascaded away with the workflow; the request itself remains, closed.
		expect(await linkRepository.findByRequestId(request.id, {})).toHaveLength(0);
	});

	// A review opened after the pre-delete hook ran loses its link row to the cascade and
	// can no longer be found by workflow id. The post-delete sweep is what catches it.
	test('a review orphaned by a delete that skipped the hooks is closed by the next delete', async () => {
		const orphaned = await createReviewableWorkflow();
		const request = await createOpenReview(orphaned.workflow.id, orphaned.versionId);

		// Delete the row straight from the repository, as a folder-hierarchy cascade does:
		// no hook fires, so the request is left open with its link row cascaded away.
		await Container.get(WorkflowRepository).delete(orphaned.workflow.id);
		expect((await requestRepository.findById(request.id, {}))?.state).toBe('open');
		expect(await linkRepository.findByRequestId(request.id, {})).toHaveLength(0);

		const unrelated = await createReviewableWorkflow();
		await Container.get(WorkflowService).delete(owner, unrelated.workflow.id, true);

		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(closed?.closedById).toBeNull();
	});

	test('leaves a review whose workflow still exists open', async () => {
		const live = await createReviewableWorkflow();
		const request = await createOpenReview(live.workflow.id, live.versionId);

		const other = await createReviewableWorkflow();
		await Container.get(WorkflowService).delete(owner, other.workflow.id, true);

		expect((await requestRepository.findById(request.id, {}))?.state).toBe('open');
	});
});

describe('auto-close with the instance policy disabled', () => {
	test('cleanup still runs when the policy toggle is off', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
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
		const { workflow, versionId } = await createReviewableWorkflow();
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
	});

	test('an already-approved (closed) review is untouched by a pull-archive', async () => {
		const { workflow, versionId } = await createReviewableWorkflow();
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
		const { workflow, versionId } = await createReviewableWorkflow();
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
		const { workflow, versionId } = await createReviewableWorkflow();
		await Container.get(WorkflowRepository).save({ id: workflow.id, parentFolder: folder });
		const request = await createOpenReview(workflow.id, versionId);

		await importService.deleteFoldersNotInWorkfolder([
			mock<SourceControlledFile>({ id: folder.id, name: folder.name }),
		]);

		// The workflow went with the folder cascade...
		expect(await Container.get(WorkflowRepository).findOneBy({ id: workflow.id })).toBeNull();

		// ...but its review was properly closed first, not left orphaned open
		const closed = await requestRepository.findById(request.id, {});
		expect(closed?.state).toBe('closed');
		expect(closed?.closedById).toBeNull();
		expect(await linkRepository.findByRequestId(request.id, {})).toHaveLength(0);
	});
});
