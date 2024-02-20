import Container from 'typedi';
import { createOwner } from '../../shared/db/users';
import * as testDb from '../../shared/testDb';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { EntityNotFoundError } from '@n8n/typeorm';
import { createProject } from '../../shared/db/projects';

describe('ProjectRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['User', 'Workflow', 'Project']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('getPersonalProjectForUser', () => {
		it('returns the personal project', async () => {
			//
			// ARRANGE
			//
			const owner = await createOwner();
			const ownerPersonalProject = await Container.get(ProjectRepository).findOneByOrFail({
				projectRelations: { userId: owner.id },
			});

			//
			// ACT
			//
			const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUser(
				owner.id,
			);

			//
			// ASSERT
			//
			if (!personalProject) {
				fail('Expected personalProject to be defined.');
			}
			expect(personalProject).toBeDefined();
			expect(personalProject.id).toBe(ownerPersonalProject.id);
		});

		it('does not return non personal projects', async () => {
			//
			// ARRANGE
			//
			const owner = await createOwner();
			await Container.get(ProjectRepository).delete({});
			await createProject(owner);

			//
			// ACT
			//
			const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUser(
				owner.id,
			);

			//
			// ASSERT
			//
			expect(personalProject).toBeNull();
		});
	});

	describe('getPersonalProjectForUserOrFail', () => {
		it('returns the personal project', async () => {
			//
			// ARRANGE
			//
			const owner = await createOwner();
			const ownerPersonalProject = await Container.get(ProjectRepository).findOneByOrFail({
				projectRelations: { userId: owner.id },
			});

			//
			// ACT
			//
			const personalProject = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(owner.id);

			//
			// ASSERT
			//
			if (!personalProject) {
				fail('Expected personalProject to be defined.');
			}
			expect(personalProject).toBeDefined();
			expect(personalProject.id).toBe(ownerPersonalProject.id);
		});

		it('does not return non personal projects', async () => {
			//
			// ARRANGE
			//
			const owner = await createOwner();
			await Container.get(ProjectRepository).delete({});
			await createProject(owner);

			//
			// ACT
			//
			const promise = Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id);

			//
			// ASSERT
			//
			await expect(promise).rejects.toThrowError(EntityNotFoundError);
		});
	});
});
