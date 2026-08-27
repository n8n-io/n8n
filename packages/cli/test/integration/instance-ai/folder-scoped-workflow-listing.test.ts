import { createWorkflow, createTeamProject, testDb } from '@n8n/backend-test-utils';
import { LicenseState } from '@n8n/backend-common';
import type { Project, User } from '@n8n/db';
import { FolderRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { License } from '@/license';
import { FolderService } from '@/services/folder.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createFolder } from '../shared/db/folders';
import { createOwner } from '../shared/db/users';

/**
 * The queries behind folder-scoped workflow listing, run against a real database.
 *
 * They are here rather than in a unit test because both defects this covers are
 * defects of the ORM/SQL layer, invisible to a mocked repository:
 *  - the folder scan's column selection has to satisfy the ORDER BY that
 *    pagination generates, or SQLite rejects the query outright;
 *  - `parentFolderIds` has to be honoured by the plain listing path, which is a
 *    different query builder from the workflows-and-folders one.
 */
describe('folder-scoped workflow listing (real queries)', () => {
	let owner: User;
	let project: Project;
	let folderService: FolderService;
	let workflowService: WorkflowService;

	beforeAll(async () => {
		await testDb.init();
		Container.get(LicenseState).setLicenseProvider(Container.get(License));
		folderService = Container.get(FolderService);
		workflowService = Container.get(WorkflowService);
	});

	beforeEach(async () => {
		await testDb.truncate(['Folder', 'WorkflowEntity', 'SharedWorkflow', 'Project', 'User']);
		owner = await createOwner();
		project = await createTeamProject('Folder Test Project', owner);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('the folder scan behind folder-name resolution', () => {
		// Regression: this exact select + take + parentFolder join previously failed
		// with `SQLITE_ERROR: no such column: distinctAlias.folder_updatedAt`. The
		// agent's folder lookup returned that error instead of a folder, and it fell
		// back to guessing — which is the behaviour the feature exists to remove.
		it('returns folders with paths without a database error', async () => {
			const parent = await createFolder(project, { name: 'Clients' });
			await createFolder(project, { name: 'Acme', parentFolder: parent });

			const [folders] = await folderService.getManyAndCount(project.id, {
				take: 200,
				select: { name: true, path: true, parentFolder: true, updatedAt: true },
			});

			const paths = folders.map((folder) => (folder.path ?? []).join('/')).sort();
			expect(paths).toEqual(['Clients', 'Clients/Acme']);
		});

		it('reports each folder its parent, so a subtree can be walked', async () => {
			const parent = await createFolder(project, { name: 'Clients' });
			const child = await createFolder(project, { name: 'Acme', parentFolder: parent });

			const [folders] = await folderService.getManyAndCount(project.id, {
				take: 200,
				select: { name: true, path: true, parentFolder: true, updatedAt: true },
			});

			const byId = new Map(folders.map((folder) => [folder.id, folder]));
			expect(byId.get(child.id)?.parentFolder?.id).toBe(parent.id);
			expect(byId.get(parent.id)?.parentFolder ?? null).toBeNull();
		});
	});

	describe('listing workflows by folder', () => {
		it('returns only the folder members, excluding same-named workflows outside it', async () => {
			const folder = await createFolder(project, { name: 'Acme Clinic' });
			await createWorkflow({ name: 'Missed Call Recovery', parentFolder: folder }, project);
			await createWorkflow({ name: 'Appointment Reminders', parentFolder: folder }, project);
			// Shares the folder's name but is NOT in it — the row a name filter finds
			// and a membership read must not.
			await createWorkflow({ name: 'Acme Clinic Sandbox' }, project);

			const { workflows } = await workflowService.getMany(owner, {
				filter: { projectId: project.id, isArchived: false, parentFolderIds: [folder.id] },
			});

			expect(workflows.map((workflow) => workflow.name).sort()).toEqual([
				'Appointment Reminders',
				'Missed Call Recovery',
			]);
		});

		// The plain listing path treats `parentFolderId` as an exact match; only the
		// workflows-and-folders path expands a subtree. Passing the expanded id set is
		// what makes a nested folder's contents visible, so assert the nesting really
		// resolves rather than trusting the repository to expand it.
		it('includes nested subfolder members when the expanded id set is passed', async () => {
			const parent = await createFolder(project, { name: 'Clients' });
			const child = await createFolder(project, { name: 'Acme', parentFolder: parent });
			await createWorkflow({ name: 'Top Level Sync', parentFolder: parent }, project);
			await createWorkflow({ name: 'Nested Sync', parentFolder: child }, project);

			const { workflows } = await workflowService.getMany(owner, {
				filter: {
					projectId: project.id,
					isArchived: false,
					parentFolderIds: [parent.id, child.id],
				},
			});

			expect(workflows.map((workflow) => workflow.name).sort()).toEqual([
				'Nested Sync',
				'Top Level Sync',
			]);
		});

		it('returns only the top level when the subtree is not expanded', async () => {
			const parent = await createFolder(project, { name: 'Clients' });
			const child = await createFolder(project, { name: 'Acme', parentFolder: parent });
			await createWorkflow({ name: 'Top Level Sync', parentFolder: parent }, project);
			await createWorkflow({ name: 'Nested Sync', parentFolder: child }, project);

			const { workflows } = await workflowService.getMany(owner, {
				filter: { projectId: project.id, isArchived: false, parentFolderIds: [parent.id] },
			});

			expect(workflows.map((workflow) => workflow.name)).toEqual(['Top Level Sync']);
		});
	});

	describe('folder attribution on an ordinary listing', () => {
		// Attribution is what makes every existing listing folder-aware. The join is
		// the repository's default, so the only real question is whether the path
		// lookup resolves it for the rows a page actually returned.
		it('carries the containing folder and its root-relative path', async () => {
			const parent = await createFolder(project, { name: 'Clients' });
			const child = await createFolder(project, { name: 'Acme', parentFolder: parent });
			await createWorkflow({ name: 'Nested Sync', parentFolder: child }, project);
			await createWorkflow({ name: 'Unfiled Sync' }, project);

			const { workflows } = await workflowService.getMany(owner, {
				filter: { projectId: project.id, isArchived: false },
			});

			const folderIds = [
				...new Set(
					workflows.flatMap((workflow) =>
						'parentFolder' in workflow && workflow.parentFolder ? [workflow.parentFolder.id] : [],
					),
				),
			];
			const paths = await Container.get(FolderRepository).getFolderPathsToRoot(folderIds);

			const nested = workflows.find((workflow) => workflow.name === 'Nested Sync');
			const unfiled = workflows.find((workflow) => workflow.name === 'Unfiled Sync');
			expect(nested && 'parentFolder' in nested ? nested.parentFolder?.id : undefined).toBe(
				child.id,
			);
			expect(paths.get(child.id)?.join('/')).toBe('Clients/Acme');
			expect(unfiled && 'parentFolder' in unfiled ? unfiled.parentFolder : null).toBeNull();
		});
	});
});
