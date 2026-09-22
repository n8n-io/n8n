import type { User, WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import type { WorkflowPlanItem } from '../workflow-import.types';
import type { WorkflowRemovalPlan } from '../workflow-removal.types';
import { WorkflowRemover } from '../workflow-remover';
import type { ImportContext, OverwriteDeletionPolicy } from '../../../n8n-packages.types';

const user = mock<User>({ id: 'user-1' });
const context: ImportContext = { user, projectId: 'proj-1', folderId: null };

type Placement = { id: string; name: string; parentFolderId: string | null; isArchived?: boolean };

function makeRemover(placements: Placement[], archivableIds = placements.map(({ id }) => id)) {
	const workflowFinderService = mock<WorkflowFinderService>();
	workflowFinderService.findOwnedWorkflowPlacementsInProject.mockResolvedValue(
		placements.map((placement) => ({ isArchived: false, ...placement })),
	);
	workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(archivableIds));
	const workflowService = mock<WorkflowService>();
	return {
		remover: new WorkflowRemover(workflowFinderService, workflowService),
		workflowService,
		workflowFinderService,
	};
}

// The pruner reads only the action and the target id, so these omit the PreparedWorkflow payload.
const created = (decidedId: string) =>
	({ action: 'create', decidedId }) as unknown as WorkflowPlanItem;

const updated = (existingId: string) =>
	({
		action: 'update',
		existing: mock<WorkflowEntity>({ id: existingId }),
	}) as unknown as WorkflowPlanItem;

const skipped = (existingId: string) =>
	({
		action: 'skip',
		existing: mock<WorkflowEntity>({ id: existingId }),
	}) as unknown as WorkflowPlanItem;

describe('WorkflowRemover.plan', () => {
	it('archives a root workflow the package does not contain', async () => {
		const { remover } = makeRemover([{ id: 'stale', name: 'Stale', parentFolderId: null }]);

		const plan = await remover.plan(context, {
			workflowItems: [created('fresh')],
			packageFolderIds: [],
			folderConflictPolicy: 'overwrite',
			deletionPolicy: 'archive',
		});

		expect(plan.failures).toEqual([]);
		expect(plan.removals).toEqual([{ id: 'stale', name: 'Stale', parentFolderId: null }]);
	});

	it('retains every workflow the package accounts for, however it was matched', async () => {
		const { remover } = makeRemover([
			{ id: 'a', name: 'Created', parentFolderId: null },
			{ id: 'b', name: 'Updated', parentFolderId: null },
			{ id: 'c', name: 'Skipped', parentFolderId: null },
		]);

		const plan = await remover.plan(context, {
			workflowItems: [created('a'), updated('b'), skipped('c')],
			packageFolderIds: [],
			folderConflictPolicy: 'overwrite',
			deletionPolicy: 'archive',
		});

		expect(plan.removals).toEqual([]);
	});

	it('retains a sub-workflow dependency the package references but does not carry', async () => {
		const { remover } = makeRemover([{ id: 'sub', name: 'Sub', parentFolderId: null }]);

		const plan = await remover.plan(context, {
			workflowItems: [created('parent')],
			packageFolderIds: [],
			subWorkflowRequirementIds: ['sub'],
			folderConflictPolicy: 'overwrite',
			deletionPolicy: 'archive',
		});

		// Archiving it would leave the packaged parent unable to publish.
		expect(plan.removals).toEqual([]);
	});

	it('archives inside a package-defined folder but leaves a target-only folder alone', async () => {
		const { remover } = makeRemover([
			{ id: 'in-package-folder', name: 'Stale', parentFolderId: 'F1' },
			{ id: 'in-other-folder', name: 'Sheltered', parentFolderId: 'F2' },
		]);

		const plan = await remover.plan(context, {
			workflowItems: [],
			packageFolderIds: ['F1'],
			folderConflictPolicy: 'overwrite',
			deletionPolicy: 'archive',
		});

		expect(plan.removals.map(({ id }) => id)).toEqual(['in-package-folder']);
	});

	it('reports a failure instead of archiving what the caller may not archive', async () => {
		const { remover } = makeRemover([{ id: 'stale', name: 'Stale', parentFolderId: null }], []);

		const plan = await remover.plan(context, {
			workflowItems: [],
			packageFolderIds: [],
			folderConflictPolicy: 'overwrite',
			deletionPolicy: 'archive',
		});

		expect(plan.removals).toEqual([]);
		expect(plan.failures).toEqual([{ workflowId: 'stale', name: 'Stale', projectId: 'proj-1' }]);
	});

	it('never removes an archived workflow, but counts its folder as occupied', async () => {
		const { remover, workflowFinderService } = makeRemover([
			{ id: 'gone', name: 'Gone', parentFolderId: 'F-target-only', isArchived: true },
		]);

		const plan = await remover.plan(context, {
			workflowItems: [],
			packageFolderIds: [],
			folderConflictPolicy: 'overwrite',
			deletionPolicy: 'hard-delete',
		});

		// Already archived means already removed — but the folder holding it is not empty, so
		// folder reconciliation must not sweep it up and displace the archived workflow.
		expect(plan.removals).toEqual([]);
		expect(plan.occupiedFolderIds).toEqual(['F-target-only']);
		expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
	});

	it('checks delete permission only once, for the candidates', async () => {
		const { remover, workflowFinderService } = makeRemover([
			{ id: 'keep', name: 'Keep', parentFolderId: null },
			{ id: 'stale', name: 'Stale', parentFolderId: null },
		]);

		await remover.plan(context, {
			workflowItems: [created('keep')],
			packageFolderIds: [],
			folderConflictPolicy: 'overwrite',
			deletionPolicy: 'archive',
		});

		expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledExactlyOnceWith(
			['stale'],
			user,
			['workflow:delete'],
		);
	});

	it.each(['merge', 'fail'] as const)('removes nothing under %s', async (folderConflictPolicy) => {
		const { remover, workflowFinderService } = makeRemover([
			{ id: 'stale', name: 'Stale', parentFolderId: null },
		]);

		const plan = await remover.plan(context, {
			folderConflictPolicy,
			deletionPolicy: 'archive',
			workflowItems: [],
			packageFolderIds: [],
		});

		expect(plan.removals).toEqual([]);
		// Reconciliation is off, so the target is never even read.
		expect(workflowFinderService.findOwnedWorkflowPlacementsInProject).not.toHaveBeenCalled();
	});

	it('removes nothing when the project is still to be created', async () => {
		const { remover, workflowFinderService } = makeRemover([
			{ id: 'stale', name: 'Stale', parentFolderId: null },
		]);

		const plan = await remover.plan(context, {
			folderConflictPolicy: 'overwrite',
			deletionPolicy: 'archive',
			workflowItems: [],
			packageFolderIds: [],
			projectPendingCreation: true,
		});

		expect(plan.removals).toEqual([]);
		expect(workflowFinderService.findOwnedWorkflowPlacementsInProject).not.toHaveBeenCalled();
	});

	it('skips the permission query entirely when nothing would be archived', async () => {
		const { remover, workflowFinderService } = makeRemover([]);

		const plan = await remover.plan(context, {
			workflowItems: [],
			packageFolderIds: [],
			folderConflictPolicy: 'overwrite',
			deletionPolicy: 'archive',
		});

		expect(plan).toEqual({
			removals: [],
			failures: [],
			deletionPolicy: 'archive',
			occupiedFolderIds: [],
		});
		expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
	});
});

describe('WorkflowRemover.apply', () => {
	const planWith = (deletionPolicy: OverwriteDeletionPolicy): WorkflowRemovalPlan => ({
		removals: [{ id: 'stale', name: 'Stale', parentFolderId: 'F1' }],
		failures: [],
		deletionPolicy,
		occupiedFolderIds: [],
	});
	const summaryOf = (deletion: 'archived' | 'deleted') => [
		{ workflowId: 'stale', name: 'Stale', projectId: 'proj-1', parentFolderId: 'F1', deletion },
	];

	it('archives without deleting under archive', async () => {
		const { remover, workflowService } = makeRemover([]);

		const summaries = await remover.apply(context, planWith('archive'));

		expect(workflowService.archive).toHaveBeenCalledExactlyOnceWith(user, 'stale', {
			skipArchived: true,
		});
		expect(workflowService.delete).not.toHaveBeenCalled();
		expect(summaries).toEqual(summaryOf('archived'));
	});

	it('archives then deletes under hard-delete', async () => {
		const { remover, workflowService } = makeRemover([]);

		const summaries = await remover.apply(context, planWith('hard-delete'));

		// Archive first: it is the step that unpublishes, and `delete` refuses a published workflow.
		expect(workflowService.archive).toHaveBeenCalledExactlyOnceWith(user, 'stale', {
			skipArchived: true,
		});
		expect(workflowService.delete).toHaveBeenCalledExactlyOnceWith(user, 'stale');
		expect(summaries).toEqual(summaryOf('deleted'));
	});

	it('reports archived when the row cannot be dropped yet under hard-delete', async () => {
		const { remover, workflowService } = makeRemover([]);
		workflowService.delete.mockRejectedValue(new ConflictError('still unpublishing'));

		const summaries = await remover.apply(context, planWith('hard-delete'));

		expect(summaries).toEqual(summaryOf('archived'));
	});

	it('propagates an unexpected delete failure rather than reporting a removal', async () => {
		const { remover, workflowService } = makeRemover([]);
		workflowService.delete.mockRejectedValue(new Error('boom'));

		await expect(remover.apply(context, planWith('hard-delete'))).rejects.toThrow('boom');
	});

	it('writes nothing when the plan is empty', async () => {
		const { remover, workflowService } = makeRemover([]);

		const summaries = await remover.apply(context, {
			removals: [],
			failures: [],
			deletionPolicy: 'hard-delete',
			occupiedFolderIds: [],
		});

		expect(summaries).toEqual([]);
		expect(workflowService.archive).not.toHaveBeenCalled();
		expect(workflowService.delete).not.toHaveBeenCalled();
	});
});
