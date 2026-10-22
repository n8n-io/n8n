import { createTeamProject, getPersonalProject, testDb } from '@n8n/backend-test-utils';
import { type Transaction, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createMember } from '../../shared/db/users';

describe('UserRepository', () => {
	let repository: UserRepository;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(UserRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['ProjectRelation', 'Project', 'User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('findPersonalOwnerForProject', () => {
		it('returns the user who owns the personal project', async () => {
			const member = await createMember();
			const personalProject = await getPersonalProject(member);

			const owner = await repository.findPersonalOwnerForProject(personalProject.id);

			expect(owner?.id).toBe(member.id);
		});

		it('returns null for a team project', async () => {
			const admin = await createMember();
			const teamProject = await createTeamProject(undefined, admin);

			const owner = await repository.findPersonalOwnerForProject(teamProject.id);

			expect(owner).toBeNull();
		});

		it('resolves its manager from the transaction carried by ctx', async () => {
			const member = await createMember();
			const personalProject = await getPersonalProject(member);
			const foreignTransaction = {} as Transaction;

			await expect(
				repository.findPersonalOwnerForProject(personalProject.id, { trx: foreignTransaction }),
			).rejects.toThrow('Transaction was not created by the TypeORM runner');
		});
	});
});
