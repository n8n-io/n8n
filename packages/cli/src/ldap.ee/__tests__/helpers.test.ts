import { mockInstance } from '@n8n/backend-test-utils';
import { generateNanoId, AuthIdentity, User, UserRepository } from '@n8n/db';

import * as helpers from '@/ldap.ee/helpers.ee';

const userRepository = mockInstance(UserRepository);

describe('Ldap/helpers', () => {
	describe('updateLdapUserOnLocalDb', () => {
		// We need to use `save` so that that the subscriber in
		// packages/@n8n/db/src/entities/Project.ts receives the full user.
		// With `update` it would only receive the updated fields, e.g. the `id`
		// would be missing.
		test('does not use `Repository.update`, but `Repository.save` instead', async () => {
			//
			// ARRANGE
			//
			const user = Object.assign(new User(), { id: generateNanoId() } as User);
			const authIdentity = Object.assign(new AuthIdentity(), {
				user: { id: user.id },
			} as AuthIdentity);
			const data: Partial<User> = { firstName: 'Nathan', lastName: 'Nathaniel' };

			userRepository.findOneBy.mockResolvedValueOnce(user);

			//
			// ACT
			//
			await helpers.updateLdapUserOnLocalDb(authIdentity, data);

			//
			// ASSERT
			//
			expect(userRepository.save).toHaveBeenCalledWith({ ...user, ...data }, { transaction: true });
			expect(userRepository.update).not.toHaveBeenCalled();
		});
	});
});
