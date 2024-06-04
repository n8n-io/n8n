import { AuthUser } from '@db/entities/AuthUser';
import { generateNanoId } from '@db/utils/generators';
import { AuthUserRepository } from '@db/repositories/authUser.repository';
import type { AuthIdentity } from '@db/entities/AuthIdentity';
import { AuthIdentityRepository } from '@db/repositories/authIdentity.repository';
import * as helpers from '@/sso/saml/samlHelpers';
import type { SamlUserAttributes } from '@/sso/saml/types/samlUserAttributes';
import { mockInstance } from '../../../shared/mocking';

const authUserRepository = mockInstance(AuthUserRepository);
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
