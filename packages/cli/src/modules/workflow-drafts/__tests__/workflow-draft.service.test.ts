import type { WorkflowDraftSource } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import {
	WorkflowEntity,
	type OperationContext,
	type TransactionRunner,
	type User,
	type UserRepository,
} from '@n8n/db';
import { calculateWorkflowChecksum } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';
import type { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';

import { WorkflowDraft } from '../database/workflow-draft.entity';
import type { WorkflowDraftRepository } from '../database/workflow-draft.repository';
import type { WorkflowDraftCandidateService } from '../workflow-draft-candidate.service';
import { WorkflowDraftService } from '../workflow-draft.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const drafts = mock<WorkflowDraftRepository>();
const candidates = mock<WorkflowDraftCandidateService>();
const users = mock<UserRepository>();
const publication = mock<WorkflowPublicationStatusService>();
const modules = mock<ModuleRegistry>();
const tx = mock<TransactionRunner>();
const ctx: OperationContext = {};
const service = new WorkflowDraftService(drafts, candidates, users, publication, tx, modules);
const user = mock<User>({ id: 'c22db9f1-8fc0-4a46-96e2-c3a0a592a851', disabled: false });
const versionId = '2d97d917-00ae-4fce-98c0-9b4d708a6c94';
let source: WorkflowDraftSource;
let workflow: WorkflowEntity;
let draft: WorkflowDraft;

beforeEach(async () => {
	vi.resetAllMocks();
	modules.isActive.mockReturnValue(true);
	users.findByIdWithRole.mockResolvedValue(user);
	vi.mocked(userHasScopes).mockResolvedValue(true);
	tx.run.mockImplementation(async (_ctx, fn) => await fn(ctx));
	workflow = Object.assign(new WorkflowEntity(), {
		id: 'wf',
		name: 'Example',
		nodes: [],
		connections: {},
		versionId,
		activeVersionId: versionId,
		isArchived: false,
		settings: {},
		nodeGroups: [],
	});
	source = {
		sourceKey: 'investigation-1',
		workflowId: workflow.id,
		backgroundUserId: user.id,
		expectedBaseline: {
			savedVersionId: versionId,
			publishedVersionId: versionId,
			checksum: await calculateWorkflowChecksum(workflow),
		},
	};
	draft = Object.assign(new WorkflowDraft(), {
		id: 'draft',
		...source,
		projectId: 'project',
		state: 'preparing',
		revision: 2,
		submittedRevision: null,
		closedReason: null,
		payload: {
			original: { name: workflow.name, nodes: [], connections: {} },
			candidate: {
				nodes: [
					{
						id: 'n',
						name: 'Node',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						parameters: {},
						position: [0, 0],
					},
				],
				connections: {},
			},
			explanation: 'Fix',
			errorContext: null,
			validation: {
				revision: 2,
				requiredChecks: 'passed',
				configuration: { status: 'not_run' },
				execution: { status: 'not_run' },
			},
		},
	});
	drafts.getDraft.mockResolvedValue(draft);
	drafts.findBySourceKey.mockResolvedValue(null);
	drafts.readWorkflowTarget.mockResolvedValue({ workflow, projectId: 'project' });
	drafts.loadForSubmission.mockResolvedValue({ draft, workflow, projectId: 'project' });
	publication.getStatus.mockResolvedValue({
		status: 'published',
		liveVersionId: versionId,
		pendingVersionId: null,
		triggers: [],
	});
	drafts.markPendingIfCurrent.mockImplementation(async () =>
		Object.assign(draft, { state: 'pending', submittedRevision: 2 }),
	);
	drafts.closeAsOutdated.mockImplementation(async () =>
		Object.assign(draft, { state: 'closed', closedReason: 'outdated' }),
	);
	drafts.getActivity.mockResolvedValue([]);
});

it('captures a separate baseline without validation or workflow writes', async () => {
	await service.createDraft(source);
	expect(drafts.createOnce).toHaveBeenCalledWith(
		source,
		'project',
		expect.objectContaining({
			validation: null,
			original: expect.objectContaining({ name: 'Example' }),
		}),
	);
	expect(candidates.prepare).not.toHaveBeenCalled();
	expect(publication.getStatus).toHaveBeenCalledWith('wf', ctx);
});

it.each(['settings', 'version', 'published', 'archived', 'publication'] as const)(
	'rejects a changed %s baseline at creation',
	async (change) => {
		if (change === 'settings') workflow.settings = { executionTimeout: 12 };
		if (change === 'version') workflow.versionId = 'new';
		if (change === 'published') workflow.activeVersionId = 'new';
		if (change === 'archived') workflow.isArchived = true;
		if (change === 'publication')
			publication.getStatus.mockResolvedValue({
				status: 'in_progress',
				liveVersionId: versionId,
				pendingVersionId: versionId,
				triggers: [],
			});
		await expect(service.createDraft(source)).rejects.toThrow('baseline');
		expect(drafts.createOnce).not.toHaveBeenCalled();
	},
);

it('binds a source retry to its original identity and baseline', async () => {
	drafts.findBySourceKey.mockResolvedValue(draft);
	expect(await service.createDraft(source)).toBe(draft);
	await expect(
		service.createDraft({
			...source,
			expectedBaseline: { ...source.expectedBaseline, checksum: 'a'.repeat(64) },
		}),
	).rejects.toThrow('source');
});

it('stores the exact prepared candidate with validation for the new revision', async () => {
	const graph = draft.payload!.candidate;
	const prepared = { nodes: [], connections: {} };
	candidates.prepare.mockResolvedValue(prepared);
	await service.reviseDraft(source, {
		draftId: draft.id,
		expectedRevision: 2,
		graph,
		explanation: 'Prepared fix',
	});
	expect(drafts.reviseIfCurrent).toHaveBeenCalledWith(
		draft.id,
		2,
		expect.objectContaining({
			candidate: prepared,
			validation: expect.objectContaining({ revision: 3 }),
		}),
	);
});

it('keeps the previous candidate when validation fails', async () => {
	candidates.prepare.mockRejectedValue(new Error('Credential access required'));
	await expect(
		service.reviseDraft(source, {
			draftId: draft.id,
			expectedRevision: 2,
			graph: draft.payload!.candidate,
			explanation: 'Fix',
		}),
	).rejects.toThrow('Credential');
	expect(drafts.reviseIfCurrent).not.toHaveBeenCalled();
});

it('rejects unsupported graph fields', async () => {
	const graph = { ...draft.payload!.candidate, settings: {} };
	await expect(
		service.reviseDraft(source, {
			draftId: draft.id,
			expectedRevision: 2,
			graph,
			explanation: 'Fix',
		}),
	).rejects.toThrow();
	expect(candidates.prepare).not.toHaveBeenCalled();
});

it('submits once and returns the same frozen result on retry', async () => {
	const first = await service.submitDraft(source, draft.id, 2);
	expect(await service.submitDraft(source, draft.id, 2)).toEqual(first);
	expect(drafts.appendSubmittedActivity).toHaveBeenCalledTimes(1);
	expect(drafts.appendSubmittedActivity).toHaveBeenCalledWith(draft.id, 2, ctx);
	expect(candidates.assertStillAllowed).toHaveBeenCalledTimes(1);
});

it.each(['unchecked', 'wrong revision', 'unchanged'] as const)(
	'does not submit an %s candidate',
	async (failure) => {
		if (failure === 'unchecked') draft.payload!.validation = null;
		if (failure === 'wrong revision') draft.payload!.validation!.revision = 1;
		if (failure === 'unchanged') draft.payload!.candidate = { nodes: [], connections: {} };
		await expect(service.submitDraft(source, draft.id, 2)).rejects.toThrow();
		expect(drafts.markPendingIfCurrent).not.toHaveBeenCalled();
	},
);

it('requires the preflight revision again inside the transaction', async () => {
	candidates.assertStillAllowed.mockImplementation(async () => {
		draft.revision = 3;
	});
	await expect(service.submitDraft(source, draft.id, 2)).rejects.toThrow('revision');
	expect(drafts.markPendingIfCurrent).not.toHaveBeenCalled();
});

it('closes a changed baseline without creating a submission activity', async () => {
	workflow.settings = { executionTimeout: 10 };
	expect(await service.submitDraft(source, draft.id, 2)).toMatchObject({
		state: 'closed',
		closedReason: 'outdated',
	});
	expect(drafts.appendSubmittedActivity).not.toHaveBeenCalled();
});

it('rejects changed credential access at submission', async () => {
	candidates.assertStillAllowed.mockRejectedValue(new Error('Credential access changed'));
	await expect(service.submitDraft(source, draft.id, 2)).rejects.toThrow('Credential');
	expect(drafts.markPendingIfCurrent).not.toHaveBeenCalled();
});

it.each(['disabled', 'no edit access'] as const)(
	'blocks background and review reads for a user with %s',
	async (failure) => {
		if (failure === 'disabled')
			users.findByIdWithRole.mockResolvedValue(mock<User>({ id: user.id, disabled: true }));
		else vi.mocked(userHasScopes).mockResolvedValue(false);
		await expect(service.readDraft(source, draft.id)).rejects.toThrow('edit access');
		await expect(service.getProposal(user, 'project', draft.id)).rejects.toThrow('edit access');
	},
);

it('allows another current editor to review without publish permission', async () => {
	draft.submittedRevision = 2;
	draft.state = 'pending';
	const viewer = mock<User>({ id: 'another-editor', disabled: false });
	users.findByIdWithRole.mockResolvedValue(viewer);
	const detail = await service.getProposal(viewer, 'project', draft.id);
	expect(detail.payload?.proposed.nodes).toEqual(draft.payload!.candidate.nodes);
	expect(userHasScopes).toHaveBeenCalledWith(viewer, ['workflow:read', 'workflow:update'], false, {
		workflowId: 'wf',
	});
});

it('rejects a wrong project and an unsubmitted draft', async () => {
	await expect(service.getProposal(user, 'other', draft.id)).rejects.toThrow('not found');
	await expect(service.getProposal(user, 'project', draft.id)).rejects.toThrow('not found');
});

it('retains a lifecycle receipt after content expires and background access is lost', async () => {
	Object.assign(draft, {
		state: 'closed',
		submittedRevision: 2,
		closedReason: 'discarded',
		payload: null,
	});
	drafts.findBySourceKey.mockResolvedValue(draft);
	vi.mocked(userHasScopes).mockResolvedValue(false);
	expect(await service.getLifecycleResult(source)).toMatchObject({
		content: 'expired',
		submittedRevision: 2,
	});
	expect(users.findByIdWithRole).not.toHaveBeenCalled();
});

it('blocks operations when the module is disabled', async () => {
	modules.isActive.mockReturnValue(false);
	await expect(service.createDraft(source)).rejects.toThrow('not enabled');
});
