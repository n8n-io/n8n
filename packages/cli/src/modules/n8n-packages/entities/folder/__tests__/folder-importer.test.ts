import type { User } from '@n8n/db';
import { PROJECT_ROOT } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { FolderService } from '@/services/folder.service';

import type { PlacementPolicy } from '../../../n8n-packages.types';
import type { FolderImportContext, PreparedFolder } from '../folder-import.types';
import { FolderImporter, toFolderSummaries } from '../folder-importer';

const context = (
	placementPolicy?: PlacementPolicy,
	over: Partial<FolderImportContext> = {},
): FolderImportContext => ({
	user: mock<User>(),
	projectId: 'project-1',
	folderId: null,
	folderConflictPolicy: 'merge',
	placementPolicy,
	...over,
});

const folder = (sourceFolderId: string, parentFolderId: string | null): PreparedFolder => ({
	sourceFolderId,
	name: sourceFolderId,
	parentFolderId,
});

const existingFolder = (id: string, projectId: string, parentFolderId: string | null) =>
	({ id, name: id, parentFolderId, homeProject: { id: projectId } }) as never;

describe('FolderImporter', () => {
	it('reports a parent mismatch as a conflict by default', async () => {
		const folderService = mock<FolderService>();
		folderService.getFoldersByIds.mockResolvedValue([existingFolder('a', 'project-1', 'old')]);

		const plan = await new FolderImporter(folderService).plan(context(), [
			folder('new', null),
			folder('a', 'new'),
		]);

		expect(plan.items.map(({ action }) => action)).toEqual(['create']);
		expect(plan.conflicts).toEqual([expect.objectContaining({ kind: 'parent-mismatch' })]);
	});

	it('plans and applies a move within the project under follow-package placement', async () => {
		const folderService = mock<FolderService>();
		folderService.getFoldersByIds.mockResolvedValue([
			existingFolder('b', 'project-1', 'a'),
			existingFolder('a', 'project-1', null),
		]);
		const importer = new FolderImporter(folderService);

		// `b` sat under `a`. The package puts `a` under `b`, and `b` at the project root.
		const plan = await importer.plan(context('follow-package'), [
			folder('a', 'b'),
			folder('b', null),
		]);
		await importer.applyMoves(context('follow-package'), plan);

		expect(plan.conflicts).toEqual([]);
		expect(toFolderSummaries(plan).map(({ status }) => status)).toEqual(['moved', 'moved']);
		expect(folderService.updateFolder.mock.calls).toEqual([
			['b', 'project-1', { parentFolderId: PROJECT_ROOT }],
			['a', 'project-1', { parentFolderId: 'b' }],
		]);
	});

	it('creates new folders in apply and leaves the moves to applyMoves', async () => {
		const folderService = mock<FolderService>();
		folderService.getFoldersByIds.mockResolvedValue([existingFolder('a', 'project-1', null)]);
		const importer = new FolderImporter(folderService);
		const ctx = context('follow-package');

		const plan = await importer.plan(ctx, [folder('new', null), folder('a', 'new')]);
		await importer.apply(ctx, plan);

		expect(folderService.createFolder).toHaveBeenCalledExactlyOnceWith(
			{ name: 'new', parentFolderId: undefined },
			'project-1',
			'new',
		);
		expect(folderService.updateFolder).not.toHaveBeenCalled();

		await importer.applyMoves(ctx, plan);

		expect(folderService.createFolder).toHaveBeenCalledOnce();
		expect(folderService.updateFolder).toHaveBeenCalledExactlyOnceWith('a', 'project-1', {
			parentFolderId: 'new',
		});
	});

	it('still reports a folder that belongs to another project', async () => {
		const folderService = mock<FolderService>();
		folderService.getFoldersByIds.mockResolvedValue([existingFolder('a', 'project-2', null)]);

		const plan = await new FolderImporter(folderService).plan(context('follow-package'), [
			folder('a', null),
		]);

		expect(plan.conflicts).toEqual([
			expect.objectContaining({ kind: 'id-in-other-project', existingProjectId: 'project-2' }),
		]);
		expect(folderService.updateFolder).not.toHaveBeenCalled();
	});

	it('leaves a folder outside the selection where it is, without a conflict', async () => {
		const folderService = mock<FolderService>();
		folderService.getFoldersByIds.mockResolvedValue([
			existingFolder('a', 'project-1', 'old'),
			existingFolder('new', 'project-1', null),
		]);
		const importer = new FolderImporter(folderService);
		const ctx = context('follow-package', { movableFolderIds: new Set(['new']) });

		const plan = await importer.plan(ctx, [folder('new', null), folder('a', 'new')]);
		await importer.apply(ctx, plan);
		await importer.applyMoves(ctx, plan);

		expect(plan.conflicts).toEqual([]);
		expect(plan.items.find(({ sourceFolderId }) => sourceFolderId === 'a')).toMatchObject({
			action: 'skip',
			targetParentFolderId: 'old',
		});
		expect(folderService.updateFolder).not.toHaveBeenCalled();
	});

	it('reports a fail-policy conflict instead of moving a matched folder under the fail policy', async () => {
		const folderService = mock<FolderService>();
		folderService.getFoldersByIds.mockResolvedValue([
			existingFolder('a', 'project-1', 'old'),
			existingFolder('new', 'project-1', null),
		]);

		const plan = await new FolderImporter(folderService).plan(
			context('follow-package', { folderConflictPolicy: 'fail' }),
			[folder('new', null), folder('a', 'new')],
		);

		expect(plan.items.some(({ action }) => action === 'move')).toBe(false);
		expect(plan.conflicts).toContainEqual(
			expect.objectContaining({ kind: 'fail-policy', sourceFolderId: 'a' }),
		);
	});
});
