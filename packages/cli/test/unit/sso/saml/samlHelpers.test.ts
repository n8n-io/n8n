import { User } from '@/databases/entities/User';
import { generateNanoId } from '@/databases/utils/generators';
import * as helpers from '@/sso/saml/samlHelpers';
import type { SamlUserAttributes } from '@/sso/saml/types/samlUserAttributes';
import { mockInstance } from '../../../shared/mocking';
import { UserRepository } from '@/databases/repositories/user.repository';
import type { AuthIdentity } from '@/databases/entities/AuthIdentity';
import { AuthIdentityRepository } from '@/databases/repositories/authIdentity.repository';

const userRepository = mockInstance(UserRepository);
mockInstance(AuthIdentityRepository);

describe('sso/saml/samlHelpers', () => {
	describe('updateUserFromSamlAttributes', () => {
		// We need to use `save` so that that the subscriber in
		// packages/cli/src/databases/entities/Project.ts receives the full user.
		// With `update` it would only receive the updated fields, e.g. the `id`
		// would be missing.
		test('does not user `Repository.update`, but `Repository.save` instead', async () => {
			//
			// ARRANGE
			//
			const user = Object.assign(new User(), {
				id: generateNanoId(),
				authIdentities: [] as AuthIdentity[],
			} as User);
			const samlUserAttributes: SamlUserAttributes = {
				firstName: 'Nathan',
				lastName: 'Nathaniel',
				email: 'n@8.n',
				userPrincipalName: 'Huh?',
			};

			userRepository.save.mockImplementationOnce(async (user) => user as User);

			//
			// ACT
			//
			await helpers.updateUserFromSamlAttributes(user, samlUserAttributes);

			//
			// ASSERT
			//
			expect(userRepository.save).toHaveBeenCalledWith(
				{
					...user,
					firstName: samlUserAttributes.firstName,
					lastName: samlUserAttributes.lastName,
				},
				{ transaction: false },
			);
			expect(userRepository.update).not.toHaveBeenCalled();
		});
	});
});
