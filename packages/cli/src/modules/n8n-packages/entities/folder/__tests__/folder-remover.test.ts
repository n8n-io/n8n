import type { Project, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { FolderService } from '@/services/folder.service';
import type { ProjectService } from '@/services/project.service.ee';

import { FolderRemover } from '../folder-remover';
import type { ImportContext } from '../../../n8n-packages.types';

const user = mock<User>({ id: 'user-1' });
const context: ImportContext = { user, projectId: 'proj-1', folderId: null };

type Placement = { id: string; name: string; parentFolderId: string | null };

function makeRemover(placements: Placement[], { canDeleteFolders = true } = {}) {
	const folderService = mock<FolderService>();
	folderService.getFolderPlacementsInProject.mockResolvedValue(placements);
	const projectService = mock<ProjectService>();
	projectService.getProjectWithScope.mockResolvedValue(canDeleteFolders ? mock<Project>() : null);
	return {
		remover: new FolderRemover(folderService, projectService),
		folderService,
		projectService,
	};
}

const folder = (id: string, parentFolderId: string | null = null): Placement => ({
	id,
	name: id,
	parentFolderId,
});

describe('FolderRemover.plan', () => {
	it('removes an empty folder the package does not define', async () => {
		const { remover } = makeRemover([folder('stale')]);

		const plan = await remover.plan(context, { packageFolderIds: [], occupiedFolderIds: [] });

		expect(plan.removals.map(({ id }) => id)).toEqual(['stale']);
	});

	it('keeps a folder the package defines, even when empty', async () => {
		const { remover } = makeRemover([folder('FA')]);

		const plan = await remover.plan(context, { packageFolderIds: ['FA'], occupiedFolderIds: [] });

		expect(plan.removals).toEqual([]);
	});

	it('keeps a target-only folder that still holds a workflow', async () => {
		const { remover } = makeRemover([folder('sheltered')]);

		const plan = await remover.plan(context, {
			packageFolderIds: [],
			occupiedFolderIds: ['sheltered'],
		});

		// Its contents were sheltered by the workflow pass, so removing it would archive them.
		expect(plan.removals).toEqual([]);
	});

	it('removes a whole empty subtree, deepest first', async () => {
		const { remover } = makeRemover([
			folder('top'),
			folder('middle', 'top'),
			folder('leaf', 'middle'),
		]);

		const plan = await remover.plan(context, { packageFolderIds: [], occupiedFolderIds: [] });

		// Deepest first, so the parent's cascade never drops a child without its own deletion.
		expect(plan.removals.map(({ id }) => id)).toEqual(['leaf', 'middle', 'top']);
	});

	it('keeps a parent whose subtree still holds a workflow', async () => {
		const { remover } = makeRemover([folder('top'), folder('leaf', 'top')]);

		const plan = await remover.plan(context, {
			packageFolderIds: [],
			occupiedFolderIds: ['leaf'],
		});

		expect(plan.removals).toEqual([]);
	});

	it('keeps a parent that still holds a package-defined child', async () => {
		const { remover } = makeRemover([folder('top'), folder('FA', 'top')]);

		const plan = await remover.plan(context, { packageFolderIds: ['FA'], occupiedFolderIds: [] });

		expect(plan.removals).toEqual([]);
	});

	it('reports failures instead of removals when the user may not delete folders', async () => {
		const { remover, projectService } = makeRemover([folder('stale')], {
			canDeleteFolders: false,
		});

		const plan = await remover.plan(context, { packageFolderIds: [], occupiedFolderIds: [] });

		expect(plan.removals).toEqual([]);
		expect(plan.failures).toEqual([{ folderId: 'stale', name: 'stale', projectId: 'proj-1' }]);
		expect(projectService.getProjectWithScope).toHaveBeenCalledExactlyOnceWith(user, 'proj-1', [
			'folder:delete',
		]);
	});

	it('skips the permission lookup when nothing would be removed', async () => {
		const { remover, projectService } = makeRemover([folder('FA')]);

		const plan = await remover.plan(context, { packageFolderIds: ['FA'], occupiedFolderIds: [] });

		expect(plan).toEqual({ removals: [], failures: [] });
		expect(projectService.getProjectWithScope).not.toHaveBeenCalled();
	});
});

describe('FolderRemover.apply', () => {
	it('deletes each planned folder without transferring its contents', async () => {
		const { remover, folderService } = makeRemover([]);

		const summaries = await remover.apply(context, {
			removals: [{ id: 'stale', name: 'Stale', parentFolderId: 'top', depth: 1 }],
			failures: [],
		});

		expect(folderService.deleteFolder).toHaveBeenCalledExactlyOnceWith(user, 'stale', 'proj-1', {});
		expect(summaries).toEqual([
			{ folderId: 'stale', name: 'Stale', projectId: 'proj-1', parentFolderId: 'top' },
		]);
	});

	it('writes nothing when the plan is empty', async () => {
		const { remover, folderService } = makeRemover([]);

		expect(await remover.apply(context, { removals: [], failures: [] })).toEqual([]);
		expect(folderService.deleteFolder).not.toHaveBeenCalled();
	});
});
