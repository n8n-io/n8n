import type { AuthIdentity } from '@n8n/db';
import { AuthUser, AuthUserRepository, generateNanoId } from '@n8n/db';
import { AuthIdentityRepository } from '@n8n/db';

import * as helpers from '@/sso.ee/saml/saml-helpers';
import type { SamlUserAttributes } from '@/sso.ee/saml/types';
import { mockInstance } from '@test/mocking';

mockInstance(AuthIdentityRepository);
const authUserRepository = mockInstance(AuthUserRepository);

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
			const user = Object.assign(new AuthUser(), {
				id: generateNanoId(),
				authIdentities: [] as AuthIdentity[],
			} as AuthUser);
			const samlUserAttributes: SamlUserAttributes = {
				firstName: 'Nathan',
				lastName: 'Nathaniel',
				email: 'n@8.n',
				userPrincipalName: 'Huh?',
			};

			authUserRepository.save.mockImplementationOnce(async (user) => user as AuthUser);

			//
			// ACT
			//
			await helpers.updateUserFromSamlAttributes(user, samlUserAttributes);

			//
			// ASSERT
			//
			expect(authUserRepository.save).toHaveBeenCalledWith(
				{
					...user,
					firstName: samlUserAttributes.firstName,
					lastName: samlUserAttributes.lastName,
				},
				{ transaction: false },
			);
			expect(authUserRepository.update).not.toHaveBeenCalled();
		});
	});
});
