import { Container } from '@n8n/di';
import { DateTime } from 'luxon';

import type { Folder } from '@/databases/entities/folder';
import type { Project } from '@/databases/entities/project';
import type { User } from '@/databases/entities/user';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { createFolder } from '@test-integration/db/folders';
import { getPersonalProject } from '@test-integration/db/projects';
import { createTag } from '@test-integration/db/tags';
import { createMember, createOwner } from '@test-integration/db/users';
import { createWorkflow } from '@test-integration/db/workflows';

import * as testDb from '../../../../test/integration/shared/test-db';
import { FolderRepository } from '../folder.repository';

describe('FolderRepository', () => {
	let folderRepository: FolderRepository;

	beforeAll(async () => {
		await testDb.init();
		folderRepository = Container.get(FolderRepository);
	});

	afterEach(async () => {
		await testDb.truncate(['Folder', 'Tag']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('getMany', () => {
		let project: Project;
		let owner: User;

		beforeAll(async () => {
			owner = await createOwner();
			project = await getPersonalProject(owner);
		});

		describe('filters', () => {
			it('should return all folders if not filter is provided', async () => {
				const folder1 = await createFolder(project, { name: 'folder1' });
				const folder2 = await createFolder(project, { name: 'folder2' });

				await Promise.all([folder1, folder2]);

				const [folders, count] = await folderRepository.getMany();
				expect(count).toBe(2);
				expect(folders).toHaveLength(2);

				expect(folders[1].name).toBe('folder1');
				expect(folders[0].name).toBe('folder2');

				folders.forEach((folder) => {
					expect(folder).toMatchObject({
						id: expect.any(String),
						name: expect.any(String),
						createdAt: expect.any(Date),
						updatedAt: expect.any(Date),
						parentFolder: null,
						project: {
							id: expect.any(String),
							name: expect.any(String),
							type: expect.any(String),
							icon: null,
						},
						tags: expect.any(Array),
					});
				});
			});
			it('should filter folders by project ID', async () => {
				const anotherUser = await createMember();
				const anotherProject = await getPersonalProject(anotherUser);

				const folder1 = createFolder(project, { name: 'folder1' });
				const folder2 = createFolder(anotherProject, { name: 'folder2' });

				await Promise.all([folder1, folder2]);

				const [folders, count] = await folderRepository.getMany({
					filter: { projectId: project.id },
				});

				expect(count).toBe(1);
				expect(folders).toHaveLength(1);
				expect(folders[0].name).toBe('folder1');
				expect(folders[0].project.id).toBe(project.id);
			});

			it('should filter folders by name case-insensitively', async () => {
				const folder1 = createFolder(project, { name: 'Test Folder' });
				const folder2 = createFolder(project, { name: 'Another Folder' });
				const folder3 = createFolder(project, { name: 'test folder sub' });

				await Promise.all([folder1, folder2, folder3]);

				const [folders, count] = await folderRepository.getMany({
					filter: { name: 'test' },
				});

				expect(count).toBe(2);
				expect(folders).toHaveLength(2);
				expect(folders.map((f) => f.name).sort()).toEqual(['Test Folder', 'test folder sub']);
			});

			it('should filter folders by parent folder ID', async () => {
				const parentFolder = await createFolder(project, { name: 'Parent' });
				await createFolder(project, {
					name: 'Child 1',
					parentFolder,
				});
				await createFolder(project, {
					name: 'Child 2',
					parentFolder,
				});
				await createFolder(project, { name: 'Unrelated' });

				const [folders, count] = await folderRepository.getMany({
					filter: { parentFolderId: parentFolder.id },
				});

				expect(count).toBe(2);
				expect(folders).toHaveLength(2);
				expect(folders.map((f) => f.name).sort()).toEqual(['Child 1', 'Child 2']);
				folders.forEach((folder) => {
					expect(folder.parentFolder?.id).toBe(parentFolder.id);
				});
			});

			it('should filter folders by a single tag', async () => {
				const tag1 = await createTag({ name: 'important' });
				const tag2 = await createTag({ name: 'archived' });

				await createFolder(project, {
					name: 'Folder 1',
					tags: [tag1],
				});

				await createFolder(project, {
					name: 'Folder 2',
					tags: [tag2],
				});

				const [folders, count] = await folderRepository.getMany({
					filter: { tags: ['important'] },
				});

				expect(count).toBe(1);
				expect(folders).toHaveLength(1);
				expect(folders[0].name).toBe('Folder 1');
				expect(folders[0].tags[0].name).toBe('important');
			});

			it('should filter folders by multiple tags (AND operator)', async () => {
				const tag1 = await createTag({ name: 'important' });
				const tag2 = await createTag({ name: 'active' });
				const tag3 = await createTag({ name: 'archived' });

				await createFolder(project, {
					name: 'Folder 1',
					tags: [tag1, tag2],
				});
				await createFolder(project, {
					name: 'Folder 2',
					tags: [tag1],
				});
				await createFolder(project, {
					name: 'Folder 3',
					tags: [tag3],
				});

				const [folders] = await folderRepository.getMany({
					filter: { tags: ['important', 'active'] },
				});

				expect(folders).toHaveLength(1);
				expect(folders[0].name).toBe('Folder 1');
			});

			it('should apply multiple filters together', async () => {
				const tag1 = await createTag({ name: 'important' });
				const tag2 = await createTag({ name: 'archived' });

				const parentFolder = await createFolder(project, { name: 'Parent' });
				await createFolder(project, {
					name: 'Test Folder',
					parentFolder,
					tags: [tag1],
				});
				await createFolder(project, {
					name: 'Test Another',
					tags: [tag1],
				});
				await createFolder(project, {
					name: 'Test Child',
					parentFolder,
					tags: [tag2],
				});

				const [folders, count] = await folderRepository.getMany({
					filter: {
						name: 'test',
						parentFolderId: parentFolder.id,
						tags: ['important'],
					},
				});

				expect(count).toBe(1);
				expect(folders).toHaveLength(1);
				expect(folders[0].name).toBe('Test Folder');
				expect(folders[0].parentFolder?.id).toBe(parentFolder.id);
				expect(folders[0].tags[0].name).toBe('important');
			});
		});

		describe('select', () => {
			let testFolder: Folder;
			let workflowWithTestFolder: WorkflowEntity;

			beforeEach(async () => {
				const parentFolder = await createFolder(project, { name: 'Parent Folder' });
				const tag = await createTag({ name: 'test-tag' });
				testFolder = await createFolder(project, {
					name: 'Test Folder',
					parentFolder,
					tags: [tag],
				});
				workflowWithTestFolder = await createWorkflow({ parentFolder: testFolder });
			});

			it('should select only id and name when specified', async () => {
				const [folders] = await folderRepository.getMany({
					select: {
						id: true,
						name: true,
					},
				});

				expect(folders).toEqual([
					{
						id: expect.any(String),
						name: 'Test Folder',
					},
					{
						id: expect.any(String),
						name: 'Parent Folder',
					},
				]);
			});

			it('should return id, name and tags when specified', async () => {
				const [folders] = await folderRepository.getMany({
					select: {
						id: true,
						name: true,
						tags: true,
					},
				});

				expect(folders).toHaveLength(2);
				folders.forEach((folder) => {
					expect(Object.keys(folder).sort()).toEqual(['id', 'name', 'tags']);
					expect(folder.id).toBeDefined();
					expect(folder.name).toBeDefined();
					expect(Array.isArray(folder.tags)).toBeTruthy();
				});

				const folderWithTag = folders.find((f) => f.name === 'Test Folder');
				expect(folderWithTag?.tags).toHaveLength(1);
				expect(folderWithTag?.tags[0]).toEqual({
					id: expect.any(String),
					name: 'test-tag',
				});
			});

			it('should return id, name and project when specified', async () => {
				const [folders] = await folderRepository.getMany({
					select: {
						id: true,
						name: true,
						project: true,
					},
				});

				expect(folders).toHaveLength(2);
				folders.forEach((folder) => {
					expect(Object.keys(folder).sort()).toEqual(['id', 'name', 'project']);
					expect(folder.project).toEqual({
						id: expect.any(String),
						name: expect.any(String),
						type: expect.any(String),
						icon: null,
					});
				});
			});

			it('should return id, name and parentFolder when specified', async () => {
				const [folders] = await folderRepository.getMany({
					select: {
						id: true,
						name: true,
						parentFolder: true,
					},
				});

				expect(folders).toHaveLength(2);
				folders.forEach((folder) => {
					expect(Object.keys(folder).sort()).toEqual(['id', 'name', 'parentFolder']);
				});

				const parentFolder = folders.find((f) => f.name === 'Parent Folder');
				expect(parentFolder?.parentFolder).toBeNull();

				const childFolder = folders.find((f) => f.name === 'Test Folder');
				expect(childFolder?.parentFolder).toEqual({
					id: expect.any(String),
					name: 'Parent Folder',
				});
			});

			it('should return id, name and workflows when specified', async () => {
				const [folders] = await folderRepository.getMany({
					select: {
						id: true,
						name: true,
						workflows: true,
					},
				});

				expect(folders).toHaveLength(2);
				folders.forEach((folder) => {
					expect(Object.keys(folder).sort()).toEqual(['id', 'name', 'workflows']);
					expect(folder.id).toBeDefined();
					expect(folder.name).toBeDefined();
					expect(Array.isArray(folder.workflows)).toBeTruthy();
				});

				expect(folders[0].workflows).toHaveLength(1);
				expect(folders[0].workflows[0].id).toBe(workflowWithTestFolder.id);
			});

			it('should return timestamps when specified', async () => {
				const [folders] = await folderRepository.getMany({
					select: {
						id: true,
						createdAt: true,
						updatedAt: true,
					},
				});

				expect(folders).toHaveLength(2);
				folders.forEach((folder) => {
					expect(Object.keys(folder).sort()).toEqual(['createdAt', 'id', 'updatedAt']);
					expect(folder.createdAt).toBeInstanceOf(Date);
					expect(folder.updatedAt).toBeInstanceOf(Date);
				});
			});

			it('should return all properties when no select is specified', async () => {
				const [folders] = await folderRepository.getMany();

				expect(folders).toHaveLength(2);
				folders.forEach((folder) => {
					expect(folder).toMatchObject({
						id: expect.any(String),
						name: expect.any(String),
						createdAt: expect.any(Date),
						updatedAt: expect.any(Date),
						project: {
							id: expect.any(String),
							name: expect.any(String),
							type: expect.any(String),
							icon: null,
						},
						workflows: expect.any(Array),
						tags: expect.any(Array),
					});
				});
			});
		});

		describe('pagination', () => {
			beforeEach(async () => {
				// Create 5 folders sequentially and ensure consistent updatedAt order
				await createFolder(project, {
					name: 'Folder 1',
					updatedAt: DateTime.now().minus({ minutes: 4 }).toJSDate(),
				});
				await createFolder(project, {
					name: 'Folder 2',
					updatedAt: DateTime.now().minus({ minutes: 3 }).toJSDate(),
				});
				await createFolder(project, {
					name: 'Folder 3',
					updatedAt: DateTime.now().minus({ minutes: 2 }).toJSDate(),
				});
				await createFolder(project, {
					name: 'Folder 4',
					updatedAt: DateTime.now().minus({ minutes: 1 }).toJSDate(),
				});

				await createFolder(project, {
					name: 'Folder 5',
					updatedAt: DateTime.now().toJSDate(),
				});
			});

			it('should limit results when take is specified', async () => {
				const [folders, count] = await folderRepository.getMany({
					take: 3,
				});

				expect(count).toBe(5);
				expect(folders).toHaveLength(3);
			});

			it('should skip results when skip is specified', async () => {
				const [folders, count] = await folderRepository.getMany({
					skip: 2,
					take: 5,
				});

				expect(count).toBe(5);
				expect(folders).toHaveLength(3);
				expect(folders.map((f) => f.name)).toEqual(['Folder 3', 'Folder 2', 'Folder 1']);
			});

			it('should handle skip and take together', async () => {
				const [folders, count] = await folderRepository.getMany({
					skip: 1,
					take: 2,
				});

				expect(count).toBe(5);
				expect(folders).toHaveLength(2);
				expect(folders.map((f) => f.name)).toEqual(['Folder 4', 'Folder 3']);
			});

			it('should handle take larger than remaining items', async () => {
				const [folders, count] = await folderRepository.getMany({
					skip: 3,
					take: 10,
				});

				expect(count).toBe(5);
				expect(folders).toHaveLength(2);
				expect(folders.map((f) => f.name)).toEqual(['Folder 2', 'Folder 1']);
			});

			it('should handle zero take by returning all results', async () => {
				const [folders, count] = await folderRepository.getMany({
					take: 0,
				});

				expect(count).toBe(5);
				expect(folders).toHaveLength(5);
				expect(folders.map((f) => f.name)).toEqual([
					'Folder 5',
					'Folder 4',
					'Folder 3',
					'Folder 2',
					'Folder 1',
				]);
			});
		});

		describe('sorting', () => {
			beforeEach(async () => {
				// Create 4 folders sequentially and ensure consistent updatedAt order
				await createFolder(project, {
					name: 'B Folder',
					createdAt: DateTime.now().toJSDate(),
					updatedAt: DateTime.now().toJSDate(),
				});

				await createFolder(project, {
					name: 'A Folder',
					createdAt: DateTime.now().plus({ minutes: 1 }).toJSDate(),
					updatedAt: DateTime.now().plus({ minutes: 1 }).toJSDate(),
				});

				await createFolder(project, {
					name: 'D Folder',
					createdAt: DateTime.now().plus({ minutes: 2 }).toJSDate(),
					updatedAt: DateTime.now().plus({ minutes: 2 }).toJSDate(),
				});

				await createFolder(project, {
					name: 'C Folder',
					createdAt: DateTime.now().plus({ minutes: 3 }).toJSDate(),
					updatedAt: DateTime.now().plus({ minutes: 3 }).toJSDate(),
				});
			});

			it('should sort by default (updatedAt:desc)', async () => {
				const [folders] = await folderRepository.getMany();

				expect(folders.map((f) => f.name)).toEqual([
					'C Folder',
					'D Folder',
					'A Folder',
					'B Folder',
				]);
			});

			it('should sort by name:asc', async () => {
				const [folders] = await folderRepository.getMany({
					sortBy: 'name:asc',
				});

				expect(folders.map((f) => f.name)).toEqual([
					'A Folder',
					'B Folder',
					'C Folder',
					'D Folder',
				]);
			});

			it('should sort by name:desc', async () => {
				const [folders] = await folderRepository.getMany({
					sortBy: 'name:desc',
				});

				expect(folders.map((f) => f.name)).toEqual([
					'D Folder',
					'C Folder',
					'B Folder',
					'A Folder',
				]);
			});

			it('should sort by createdAt:asc', async () => {
				const [folders] = await folderRepository.getMany({
					sortBy: 'createdAt:asc',
				});

				expect(folders.map((f) => f.name)).toEqual([
					'B Folder',
					'A Folder',
					'D Folder',
					'C Folder',
				]);
			});

			it('should sort by createdAt:desc', async () => {
				const [folders] = await folderRepository.getMany({
					sortBy: 'createdAt:desc',
				});

				expect(folders.map((f) => f.name)).toEqual([
					'C Folder',
					'D Folder',
					'A Folder',
					'B Folder',
				]);
			});

			it('should sort by updatedAt:asc', async () => {
				const [folders] = await folderRepository.getMany({
					sortBy: 'updatedAt:asc',
				});

				expect(folders.map((f) => f.name)).toEqual([
					'B Folder',
					'A Folder',
					'D Folder',
					'C Folder',
				]);
			});

			it('should sort by updatedAt:desc', async () => {
				const [folders] = await folderRepository.getMany({
					sortBy: 'updatedAt:desc',
				});

				expect(folders.map((f) => f.name)).toEqual([
					'C Folder',
					'D Folder',
					'A Folder',
					'B Folder',
				]);
			});

			it('should default to asc if order not specified', async () => {
				const [folders] = await folderRepository.getMany({
					sortBy: 'name',
				});

				expect(folders.map((f) => f.name)).toEqual([
					'A Folder',
					'B Folder',
					'C Folder',
					'D Folder',
				]);
			});
		});
	});
});
