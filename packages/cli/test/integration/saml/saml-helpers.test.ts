import { getPersonalProject, testDb } from '@n8n/backend-test-utils';

import * as helpers from '@/modules/sso-saml/saml-helpers';
import type { SamlUserAttributes } from '@/modules/sso-saml/types';

beforeAll(async () => {
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('sso/saml/samlHelpers', () => {
	describe('createUserFromSamlAttributes', () => {
		test('Creates personal project for user', async () => {
			//
			// ARRANGE
			//
			const samlUserAttributes: SamlUserAttributes = {
				firstName: 'Nathan',
				lastName: 'Nathaniel',
				email: 'nathan@n8n.io',
				userPrincipalName: 'Huh?',
				n8nInstanceRole: 'n8n_instance_role',
			};

			//
			// ACT
			//
			const user = await helpers.createUserFromSamlAttributes(samlUserAttributes);

			//
			// ASSERT
			//
			expect(user).toMatchObject({
				firstName: samlUserAttributes.firstName,
				lastName: samlUserAttributes.lastName,
				email: samlUserAttributes.email,
			});
			await expect(getPersonalProject(user)).resolves.not.toBeNull();
		});
	});
});
