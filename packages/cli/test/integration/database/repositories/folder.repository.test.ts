import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import { FolderRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createFolder } from '@test-integration/db/folders';

const SQLITE_MAX_BIND_PARAMETERS = 32_766;

describe('FolderRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('resolves subtree ids beyond the SQLite bind-parameter limit', async () => {
		const folderIds = Array.from(
			{ length: SQLITE_MAX_BIND_PARAMETERS + 1 },
			(_, index) => `folder-${index}`,
		);

		await expect(
			Container.get(FolderRepository).getAllFolderIdsInSubtrees(folderIds),
		).resolves.toEqual([]);
	});

	describe.each(['workflow', 'agent'] as const)(
		'getAncestorPath for %s folders',
		(resourceType) => {
			beforeEach(async () => {
				await testDb.truncate(['Folder', 'Project']);
			});

			it('returns the ancestor path from root to leaf without siblings or descendants', async () => {
				const project = await createTeamProject();
				const root = await createFolder(project, { resourceType });
				const parent = await createFolder(project, { resourceType, parentFolder: root });
				const leaf = await createFolder(project, { resourceType, parentFolder: parent });
				await createFolder(project, { resourceType, parentFolder: root });
				await createFolder(project, { resourceType, parentFolder: leaf });
				await createFolder(project, { resourceType });

				const path = await Container.get(FolderRepository).getAncestorPath(
					leaf.id,
					project.id,
					resourceType,
				);

				expect(path.map(({ id }) => id)).toEqual([root.id, parent.id, leaf.id]);
				expect(path.map(({ name }) => name)).toEqual([root.name, parent.name, leaf.name]);
			});

			it('returns only the root when it has no parent', async () => {
				const project = await createTeamProject();
				const root = await createFolder(project, { resourceType });

				const path = await Container.get(FolderRepository).getAncestorPath(
					root.id,
					project.id,
					resourceType,
				);

				expect(path.map(({ id }) => id)).toEqual([root.id]);
			});

			it('returns no path for an unknown folder or a different project or resource type', async () => {
				const project = await createTeamProject();
				const otherProject = await createTeamProject();
				const folder = await createFolder(project, { resourceType });
				const repository = Container.get(FolderRepository);
				const otherType = resourceType === 'workflow' ? 'agent' : 'workflow';

				await expect(
					repository.getAncestorPath('missing', project.id, resourceType),
				).resolves.toEqual([]);
				await expect(
					repository.getAncestorPath(folder.id, otherProject.id, resourceType),
				).resolves.toEqual([]);
				await expect(repository.getAncestorPath(folder.id, project.id, otherType)).resolves.toEqual(
					[],
				);
			});

			it('stops at a parent in another project', async () => {
				const project = await createTeamProject();
				const otherProject = await createTeamProject();
				const parent = await createFolder(otherProject, { resourceType });
				const child = await createFolder(project, { resourceType, parentFolder: parent });

				const path = await Container.get(FolderRepository).getAncestorPath(
					child.id,
					project.id,
					resourceType,
				);

				expect(path.map(({ id }) => id)).toEqual([child.id]);
			});

			it('stops at a parent with another resource type', async () => {
				const project = await createTeamProject();
				const parent = await createFolder(project, {
					resourceType: resourceType === 'workflow' ? 'agent' : 'workflow',
				});
				const child = await createFolder(project, { resourceType, parentFolder: parent });

				const path = await Container.get(FolderRepository).getAncestorPath(
					child.id,
					project.id,
					resourceType,
				);

				expect(path.map(({ id }) => id)).toEqual([child.id]);
			});

			it('visits each ancestor once when the parent links form a cycle', async () => {
				const project = await createTeamProject();
				const first = await createFolder(project, { resourceType });
				const second = await createFolder(project, { resourceType, parentFolder: first });
				const repository = Container.get(FolderRepository);
				await repository.update(first.id, { parentFolderId: second.id });

				const path = await repository.getAncestorPath(second.id, project.id, resourceType);

				expect(path.map(({ id }) => id)).toEqual([first.id, second.id]);
			});
		},
	);
});
