import Container from 'typedi';
import { AuthUserRepository } from '@db/repositories/authUser.repository';
import * as testDb from './shared/testDb';
import { randomEmail } from './shared/random';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';

describe('AuthUserRepository', () => {
	let authUserRepository: AuthUserRepository;

	beforeAll(async () => {
		await testDb.init();

		authUserRepository = Container.get(AuthUserRepository);

		await testDb.truncate(['User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('createUserWithProject()', () => {
		test('should create personal project for a user', async () => {
			const { user, project } = await authUserRepository.createUserWithProject({
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
