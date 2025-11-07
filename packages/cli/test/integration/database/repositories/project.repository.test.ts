import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import { AuthIdentity, ProjectRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { EntityNotFoundError } from '@n8n/typeorm';

import { createMember, createOwner } from '../../shared/db/users';

describe('ProjectRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['User', 'WorkflowEntity', 'Project']);
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
			await createTeamProject(undefined, owner);

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
			await createTeamProject(undefined, owner);

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

	describe('update personal project name', () => {
		// TypeORM enters an infinite loop if you create entities with circular
		// references and pass this to the `Repository.create` function.
		//
		// This actually happened in combination with SAML.
		// `samlHelpers.updateUserFromSamlAttributes` and
		// `samlHelpers.createUserFromSamlAttributes` would create a User and an
		// AuthIdentity and assign them to one another. Then it would call
		// `UserRepository.save(user)`. This would then call the UserSubscriber in
		// `database/entities/Project.ts` which would pass the circular User into
		// `UserRepository.create` and cause the infinite loop.
		//
		// This test simulates that behavior and makes sure the UserSubscriber
		// checks if the entity is already a user and does not pass it into
		// `UserRepository.create` in that case.
		test('do not pass a User instance with circular references into `UserRepository.create`', async () => {
			//
			// ARRANGE
			//
			const user = await createMember();

			const authIdentity = new AuthIdentity();
			authIdentity.providerId = user.email;
			authIdentity.providerType = 'saml';
			authIdentity.user = user;

			user.firstName = `updated ${user.firstName}`;
			user.authIdentities = [];
			user.authIdentities.push(authIdentity);

			//
			// ACT & ASSERT
			//
			await expect(Container.get(UserRepository).save(user)).resolves.not.toThrow();
		});
	});
});
