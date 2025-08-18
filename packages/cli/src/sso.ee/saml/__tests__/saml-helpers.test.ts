import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthIdentity } from '@n8n/db';
import { generateNanoId, User, AuthIdentityRepository, UserRepository } from '@n8n/db';

import * as helpers from '@/sso.ee/saml/saml-helpers';
import type { SamlUserAttributes } from '@/sso.ee/saml/types';

const userRepository = mockInstance(UserRepository);
mockInstance(AuthIdentityRepository);

describe('sso/saml/samlHelpers', () => {
	describe('updateUserFromSamlAttributes', () => {
		// We need to use `save` so that that the subscriber in
		// packages/@n8n/db/src/entities/Project.ts receives the full user.
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
