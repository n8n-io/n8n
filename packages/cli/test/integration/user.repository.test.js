'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const users_1 = require('./shared/db/users');
describe('UserRepository', () => {
	let userRepository;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		userRepository = di_1.Container.get(db_1.UserRepository);
		await backend_test_utils_1.testDb.truncate(['User']);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	describe('countUsersByRole()', () => {
		test('should return the number of users in each role', async () => {
			await Promise.all([
				(0, users_1.createOwner)(),
				(0, users_1.createAdmin)(),
				(0, users_1.createAdmin)(),
				(0, users_1.createMember)(),
				(0, users_1.createMember)(),
				(0, users_1.createMember)(),
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
				email: (0, backend_test_utils_1.randomEmail)(),
				role: 'global:member',
			});
			const projectRelation = await di_1.Container.get(
				db_1.ProjectRelationRepository,
			).findOneOrFail({
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
//# sourceMappingURL=user.repository.test.js.map
