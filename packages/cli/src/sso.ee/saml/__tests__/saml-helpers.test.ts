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
				n8nInstanceRole: 'n8n_instance_role',
			};

			userRepository.findOne.mockImplementationOnce(async (_) => user);
			userRepository.save.mockImplementationOnce(async (_) => user);

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

	describe('getMappedSamlAttributesFromFlowResult', () => {
		test('returns the mapped attributes from the flow result', () => {
			const flowResult = {
				extract: {
					attributes: {
						email: 'test@test.com',
						firstName: 'test',
						lastName: 'test',
						userPrincipalName: 'test',
					},
				},
			} as any;
			const attributeMapping = {
				email: 'email',
				firstName: 'firstName',
				lastName: 'lastName',
				userPrincipalName: 'userPrincipalName',
			};
			const jitClaimNames = {
				instanceRole: 'instanceRole',
				projectRoles: 'projectRoles',
			};

			const result = helpers.getMappedSamlAttributesFromFlowResult(
				flowResult,
				attributeMapping,
				jitClaimNames,
			);

			expect(result).toEqual({
				attributes: {
					email: 'test@test.com',
					firstName: 'test',
					lastName: 'test',
					userPrincipalName: 'test',
				},
				missingAttributes: [],
			});
		});

		test('returns the missing attributes from the flow result', () => {
			const flowResult = {
				extract: {
					attributes: {
						email: 'test@test.com',
					},
				},
			} as any;
			const attributeMapping = {
				email: 'email',
				firstName: 'firstName',
				lastName: 'lastName',
				userPrincipalName: 'userPrincipalName',
			};
			const jitClaimNames = {
				instanceRole: 'instanceRole',
				projectRoles: 'projectRoles',
			};

			const result = helpers.getMappedSamlAttributesFromFlowResult(
				flowResult,
				attributeMapping,
				jitClaimNames,
			);

			expect(result).toEqual({
				attributes: {
					email: 'test@test.com',
				},
				missingAttributes: ['userPrincipalName', 'firstName', 'lastName'],
			});
		});
		test('returns the attributes from the flow result with instance role', () => {
			const flowResult = {
				extract: {
					attributes: {
						email: 'test@test.com',
						firstName: 'test',
						lastName: 'test',
						userPrincipalName: 'test',
						instanceRole: 'instanceRole',
					},
				},
			} as any;
			const attributeMapping = {
				email: 'email',
				instanceRole: 'instanceRole',
				firstName: 'firstName',
				lastName: 'lastName',
				userPrincipalName: 'userPrincipalName',
			};
			const jitClaimNames = {
				instanceRole: 'instanceRole',
				projectRoles: 'projectRoles',
			};
			const result = helpers.getMappedSamlAttributesFromFlowResult(
				flowResult,
				attributeMapping,
				jitClaimNames,
			);
			expect(result).toEqual({
				attributes: {
					email: 'test@test.com',
					n8nInstanceRole: 'instanceRole',
					firstName: 'test',
					lastName: 'test',
					userPrincipalName: 'test',
				},
				missingAttributes: [],
			});
		});
	});

	test('returns the attributes from the flow result with project roles', () => {
		const flowResult = {
			extract: {
				attributes: {
					email: 'test@test.com',
					firstName: 'test',
					lastName: 'test',
					userPrincipalName: 'test',
					projectRoles: ['projectRole1', 'projectRole2'],
				},
			},
		} as any;
		const attributeMapping = {
			email: 'email',
			instanceRole: 'instanceRole',
			firstName: 'firstName',
			lastName: 'lastName',
			userPrincipalName: 'userPrincipalName',
		};
		const jitClaimNames = {
			instanceRole: 'instanceRole',
			projectRoles: 'projectRoles',
		};
		const result = helpers.getMappedSamlAttributesFromFlowResult(
			flowResult,
			attributeMapping,
			jitClaimNames,
		);
		expect(result).toEqual({
			attributes: {
				email: 'test@test.com',
				firstName: 'test',
				lastName: 'test',
				userPrincipalName: 'test',
				n8nProjectRoles: ['projectRole1', 'projectRole2'],
			},
			missingAttributes: [],
		});
	});

	test('maps single projectRoles string to array', () => {
		const flowResult = {
			extract: {
				attributes: {
					email: 'test@test.com',
					firstName: 'test',
					lastName: 'test',
					userPrincipalName: 'test',
					projectRoles: 'projectRole1',
				},
			},
		} as any;
		const attributeMapping = {
			email: 'email',
			instanceRole: 'instanceRole',
			firstName: 'firstName',
			lastName: 'lastName',
			userPrincipalName: 'userPrincipalName',
		};
		const jitClaimNames = {
			instanceRole: 'instanceRole',
			projectRoles: 'projectRoles',
		};
		const result = helpers.getMappedSamlAttributesFromFlowResult(
			flowResult,
			attributeMapping,
			jitClaimNames,
		);
		expect(result).toEqual({
			attributes: {
				email: 'test@test.com',
				firstName: 'test',
				lastName: 'test',
				userPrincipalName: 'test',
				n8nProjectRoles: ['projectRole1'],
			},
			missingAttributes: [],
		});
	});
});
