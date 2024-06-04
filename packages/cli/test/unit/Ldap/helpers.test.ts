import { AuthUserRepository } from '@db/repositories/authUser.repository';
import * as helpers from '@/Ldap/helpers';
import { AuthIdentity } from '@db/entities/AuthIdentity';
import { AuthUser } from '@db/entities/AuthUser';
import { generateNanoId } from '@db/utils/generators';
import { mockInstance } from '../../shared/mocking';

const authUserRepository = mockInstance(AuthUserRepository);

describe('Ldap/helpers', () => {
	describe('updateLdapUserOnLocalDb', () => {
		// We need to use `save` so that that the subscriber in
		// packages/cli/src/databases/entities/Project.ts receives the full user.
		// With `update` it would only receive the updated fields, e.g. the `id`
		// would be missing.
		test('does not use `Repository.update`, but `Repository.save` instead', async () => {
			//
			// ARRANGE
			//
			const user = Object.assign(new AuthUser(), { id: generateNanoId() } as AuthUser);
			const authIdentity = Object.assign(new AuthIdentity(), {
				user: { id: user.id },
			} as AuthIdentity);
			const data: Partial<AuthUser> = { firstName: 'Nathan', lastName: 'Nathaniel' };

			authUserRepository.findOneBy.mockResolvedValueOnce(user);

			//
			// ACT
			//
			await helpers.updateLdapUserOnLocalDb(authIdentity, data);

			//
			// ASSERT
			//
			expect(authUserRepository.save).toHaveBeenCalledWith(
				{ ...user, ...data },
				{ transaction: true },
			);
			expect(authUserRepository.update).not.toHaveBeenCalled();
		});
	});
});
