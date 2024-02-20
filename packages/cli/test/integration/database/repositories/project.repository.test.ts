import Container from 'typedi';
import { createOwner } from '../../shared/db/users';
import * as testDb from '../../shared/testDb';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import type { DeepPartial } from 'ts-essentials';
import type { Project } from '@/databases/entities/Project';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';
import { User } from '@/databases/entities/User';
import { createPromptModule } from 'inquirer';
import { ApplicationError } from 'n8n-workflow';
import { EntityNotFoundError } from '@n8n/typeorm';

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

	async function createProject(user: User, project?: DeepPartial<Project>) {
		const projectRepository = Container.get(ProjectRepository);
		const projectRelationRepository = Container.get(ProjectRelationRepository);

		const savedProject = await projectRepository.save<Project>(
			projectRepository.create({
				name: 'project name',
				type: 'team',
				...project,
			}),
		);
		await projectRelationRepository.save(
			projectRelationRepository.create({
				userId: user.id,
				projectId: savedProject.id,
				role: 'project:personalOwner',
			}),
		);

		return savedProject;
	}

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
