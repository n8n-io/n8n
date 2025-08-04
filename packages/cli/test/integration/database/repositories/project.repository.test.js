'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const users_1 = require('../../shared/db/users');
describe('ProjectRepository', () => {
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
	});
	beforeEach(async () => {
		await backend_test_utils_1.testDb.truncate(['User', 'WorkflowEntity', 'Project']);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	describe('getPersonalProjectForUser', () => {
		it('returns the personal project', async () => {
			const owner = await (0, users_1.createOwner)();
			const ownerPersonalProject = await di_1.Container.get(db_1.ProjectRepository).findOneByOrFail(
				{
					projectRelations: { userId: owner.id },
				},
			);
			const personalProject = await di_1.Container.get(
				db_1.ProjectRepository,
			).getPersonalProjectForUser(owner.id);
			if (!personalProject) {
				fail('Expected personalProject to be defined.');
			}
			expect(personalProject).toBeDefined();
			expect(personalProject.id).toBe(ownerPersonalProject.id);
		});
		it('does not return non personal projects', async () => {
			const owner = await (0, users_1.createOwner)();
			await di_1.Container.get(db_1.ProjectRepository).delete({});
			await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
			const personalProject = await di_1.Container.get(
				db_1.ProjectRepository,
			).getPersonalProjectForUser(owner.id);
			expect(personalProject).toBeNull();
		});
	});
	describe('getPersonalProjectForUserOrFail', () => {
		it('returns the personal project', async () => {
			const owner = await (0, users_1.createOwner)();
			const ownerPersonalProject = await di_1.Container.get(db_1.ProjectRepository).findOneByOrFail(
				{
					projectRelations: { userId: owner.id },
				},
			);
			const personalProject = await di_1.Container.get(
				db_1.ProjectRepository,
			).getPersonalProjectForUserOrFail(owner.id);
			if (!personalProject) {
				fail('Expected personalProject to be defined.');
			}
			expect(personalProject).toBeDefined();
			expect(personalProject.id).toBe(ownerPersonalProject.id);
		});
		it('does not return non personal projects', async () => {
			const owner = await (0, users_1.createOwner)();
			await di_1.Container.get(db_1.ProjectRepository).delete({});
			await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
			const promise = di_1.Container.get(db_1.ProjectRepository).getPersonalProjectForUserOrFail(
				owner.id,
			);
			await expect(promise).rejects.toThrowError(typeorm_1.EntityNotFoundError);
		});
	});
	describe('update personal project name', () => {
		test('do not pass a User instance with circular references into `UserRepository.create`', async () => {
			const user = await (0, users_1.createMember)();
			const authIdentity = new db_1.AuthIdentity();
			authIdentity.providerId = user.email;
			authIdentity.providerType = 'saml';
			authIdentity.user = user;
			user.firstName = `updated ${user.firstName}`;
			user.authIdentities = [];
			user.authIdentities.push(authIdentity);
			await expect(di_1.Container.get(db_1.UserRepository).save(user)).resolves.not.toThrow();
		});
	});
});
//# sourceMappingURL=project.repository.test.js.map
