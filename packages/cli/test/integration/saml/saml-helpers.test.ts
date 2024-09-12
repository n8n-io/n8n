import * as helpers from '@/sso/saml/saml-helpers';
import type { SamlUserAttributes } from '@/sso/saml/types/saml-user-attributes';

import { getPersonalProject } from '../shared/db/projects';
import * as testDb from '../shared/test-db';

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
				email: 'n@8.n',
				userPrincipalName: 'Huh?',
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
