import type { User, WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import type { WorkflowPlanItem } from '../workflow-import.types';
import { WorkflowPruner } from '../workflow-pruner';
import type { ImportContext } from '../../../n8n-packages.types';

const user = mock<User>({ id: 'user-1' });
const context: ImportContext = { user, projectId: 'proj-1', folderId: null };

type Placement = { id: string; name: string; parentFolderId: string | null };

function makePruner(placements: Placement[], archivableIds = placements.map(({ id }) => id)) {
	const workflowFinderService = mock<WorkflowFinderService>();
	workflowFinderService.findOwnedWorkflowPlacementsInProject.mockResolvedValue(placements);
	workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(archivableIds));
	const workflowService = mock<WorkflowService>();
	return {
		pruner: new WorkflowPruner(workflowFinderService, workflowService),
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

describe('WorkflowPruner.plan', () => {
	it('archives a root workflow the package does not contain', async () => {
		const { pruner } = makePruner([{ id: 'stale', name: 'Stale', parentFolderId: null }]);

		const plan = await pruner.plan(context, {
			workflowItems: [created('fresh')],
			packageFolderIds: [],
		});

		expect(plan.failures).toEqual([]);
		expect(plan.archivals).toEqual([{ id: 'stale', name: 'Stale', parentFolderId: null }]);
	});

	it('retains every workflow the package accounts for, however it was matched', async () => {
		const { pruner } = makePruner([
			{ id: 'a', name: 'Created', parentFolderId: null },
			{ id: 'b', name: 'Updated', parentFolderId: null },
			{ id: 'c', name: 'Skipped', parentFolderId: null },
		]);

		const plan = await pruner.plan(context, {
			workflowItems: [created('a'), updated('b'), skipped('c')],
			packageFolderIds: [],
		});

		expect(plan.archivals).toEqual([]);
	});

	it('retains a sub-workflow dependency the package references but does not carry', async () => {
		const { pruner } = makePruner([{ id: 'sub', name: 'Sub', parentFolderId: null }]);

		const plan = await pruner.plan(context, {
			workflowItems: [created('parent')],
			packageFolderIds: [],
			subWorkflowRequirementIds: ['sub'],
		});

		// Archiving it would leave the packaged parent unable to publish.
		expect(plan.archivals).toEqual([]);
	});

	it('archives inside a package-defined folder but leaves a target-only folder alone', async () => {
		const { pruner } = makePruner([
			{ id: 'in-package-folder', name: 'Stale', parentFolderId: 'F1' },
			{ id: 'in-other-folder', name: 'Sheltered', parentFolderId: 'F2' },
		]);

		const plan = await pruner.plan(context, {
			workflowItems: [],
			packageFolderIds: ['F1'],
		});

		expect(plan.archivals.map(({ id }) => id)).toEqual(['in-package-folder']);
	});

	it('reports a failure instead of archiving what the caller may not archive', async () => {
		const { pruner } = makePruner([{ id: 'stale', name: 'Stale', parentFolderId: null }], []);

		const plan = await pruner.plan(context, { workflowItems: [], packageFolderIds: [] });

		expect(plan.archivals).toEqual([]);
		expect(plan.failures).toEqual([{ workflowId: 'stale', name: 'Stale', projectId: 'proj-1' }]);
	});

	it('checks delete permission only once, for the candidates', async () => {
		const { pruner, workflowFinderService } = makePruner([
			{ id: 'keep', name: 'Keep', parentFolderId: null },
			{ id: 'stale', name: 'Stale', parentFolderId: null },
		]);

		await pruner.plan(context, { workflowItems: [created('keep')], packageFolderIds: [] });

		expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledExactlyOnceWith(
			['stale'],
			user,
			['workflow:delete'],
		);
	});

	it('skips the permission query entirely when nothing would be archived', async () => {
		const { pruner, workflowFinderService } = makePruner([]);

		const plan = await pruner.plan(context, { workflowItems: [], packageFolderIds: [] });

		expect(plan).toEqual({ archivals: [], failures: [] });
		expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
	});
});

describe('WorkflowPruner.apply', () => {
	it('archives each planned workflow, tolerating one already archived', async () => {
		const { pruner, workflowService } = makePruner([]);

		const summaries = await pruner.apply(context, {
			archivals: [{ id: 'stale', name: 'Stale', parentFolderId: 'F1' }],
			failures: [],
		});

		expect(workflowService.archive).toHaveBeenCalledExactlyOnceWith(user, 'stale', {
			skipArchived: true,
		});
		expect(summaries).toEqual([
			{ workflowId: 'stale', name: 'Stale', projectId: 'proj-1', parentFolderId: 'F1' },
		]);
	});

	it('writes nothing when the plan is empty', async () => {
		const { pruner, workflowService } = makePruner([]);

		const summaries = await pruner.apply(context, { archivals: [], failures: [] });

		expect(summaries).toEqual([]);
		expect(workflowService.archive).not.toHaveBeenCalled();
	});
});
