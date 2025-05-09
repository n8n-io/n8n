import { ProjectRelationRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { UserRepository } from '@/databases/repositories/user.repository';

import { createAdmin, createMember, createOwner } from './shared/db/users';
import { randomEmail } from './shared/random';
import * as testDb from './shared/test-db';

describe('UserRepository', () => {
	let userRepository: UserRepository;

	beforeAll(async () => {
		await testDb.init();

		userRepository = Container.get(UserRepository);

		await testDb.truncate(['User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('countUsersByRole()', () => {
		test('should return the number of users in each role', async () => {
			await Promise.all([
				createOwner(),
				createAdmin(),
				createAdmin(),
				createMember(),
				createMember(),
				createMember(),
			]);

			const usersByRole = await userRepository.countUsersByRole();

			expect(usersByRole).toStrictEqual({
				'global:admin': 2,
				'global:member': 3,
				'global:owner': 1,
			});
		});
	});

	describe('createUserWithProject()', () => {
		test('should create personal project for a user', async () => {
			const { user, project } = await userRepository.createUserWithProject({
				email: randomEmail(),
				role: 'global:member',
			});

			const projectRelation = await Container.get(ProjectRelationRepository).findOneOrFail({
				where: {
					userId: user.id,
					project: {
						type: 'personal',
					},
				},
				relations: ['project'],
			});

			expect(projectRelation.project.id).toBe(project.id);
		});
	});
});
