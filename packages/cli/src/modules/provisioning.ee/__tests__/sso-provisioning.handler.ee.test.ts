import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ProvisioningService } from '../provisioning.service.ee';
import { SsoProvisioningHandlerService } from '../sso-provisioning.handler.ee';

describe('SsoProvisioningHandlerService', () => {
	let provisioningService: ProvisioningService;
	let handler: SsoProvisioningHandlerService;

	const user = mock<User>({ id: 'user-1' });
	const samlLogin = {
		provider: 'saml' as const,
		rawAttributes: { groups: ['engineering'] },
		instanceRole: 'global:admin',
		projectRoles: ['project-1:viewer'],
	};
	const oidcLogin = {
		provider: 'oidc' as const,
		claims: {
			sub: 'sub-1',
			n8n_instance_role: 'global:member',
			n8n_projects: ['project-1:viewer'],
		},
		userInfo: { email: 'test@example.com' },
	};

	beforeEach(() => {
		vi.resetAllMocks();
		provisioningService = mock<ProvisioningService>();
		provisioningService.getConfig = vi.fn().mockResolvedValue({
			scopesProvisionInstanceRole: false,
			scopesProvisionProjectRoles: false,
			scopesName: 'n8n',
			scopesInstanceRoleClaimName: 'n8n_instance_role',
			scopesProjectsRolesClaimName: 'n8n_projects',
		});
		provisioningService.isExpressionMappingEnabled = vi.fn().mockResolvedValue(false);
		handler = new SsoProvisioningHandlerService(provisioningService);
	});

	describe('getSamlRoleClaimNames', () => {
		it('returns the claim names from the provisioning service', async () => {
			provisioningService.getInstanceRoleClaimName = vi.fn().mockResolvedValue('instance-claim');
			provisioningService.getProjectsRolesClaimName = vi.fn().mockResolvedValue(null);

			await expect(handler.getSamlRoleClaimNames()).resolves.toEqual({
				instanceRole: 'instance-claim',
				projectRoles: null,
			});
		});
	});

	describe('getOidcScope', () => {
		it('returns the configured scope name when role provisioning is enabled', async () => {
			provisioningService.getConfig = vi.fn().mockResolvedValue({
				scopesProvisionInstanceRole: true,
				scopesProvisionProjectRoles: false,
				scopesName: 'n8n',
			});

			await expect(handler.getOidcScope()).resolves.toBe('n8n');
		});

		it('returns undefined when role provisioning is disabled', async () => {
			await expect(handler.getOidcScope()).resolves.toBeUndefined();
		});
	});

	describe('assertLoginAllowed', () => {
		it('builds a SAML claims context and passes the mapped instance role', async () => {
			await handler.assertLoginAllowed(samlLogin);

			expect(provisioningService.assertSsoLoginAllowed).toHaveBeenCalledWith(
				expect.objectContaining({
					$provider: 'saml',
					$claims: samlLogin.rawAttributes,
					$saml: { attributes: samlLogin.rawAttributes },
				}),
				'global:admin',
			);
		});

		it('builds an OIDC claims context and extracts the configured instance role claim', async () => {
			await handler.assertLoginAllowed(oidcLogin);

			expect(provisioningService.assertSsoLoginAllowed).toHaveBeenCalledWith(
				expect.objectContaining({
					$provider: 'oidc',
					$claims: expect.objectContaining({ sub: 'sub-1', email: 'test@example.com' }),
				}),
				'global:member',
			);
		});

		it('propagates a denial from the provisioning service', async () => {
			const error = new Error('Access denied by SSO role mapping configuration');
			provisioningService.assertSsoLoginAllowed = vi.fn().mockRejectedValue(error);

			await expect(handler.assertLoginAllowed(samlLogin)).rejects.toThrow(error);
		});
	});

	describe('provisionRoles', () => {
		it('provisions expression-mapped roles when expression mapping is enabled', async () => {
			provisioningService.isExpressionMappingEnabled = vi.fn().mockResolvedValue(true);

			await handler.provisionRoles(user, samlLogin);

			expect(provisioningService.provisionExpressionMappedRolesForUser).toHaveBeenCalledWith(
				user,
				expect.objectContaining({ $provider: 'saml' }),
			);
			expect(provisioningService.provisionInstanceRoleForUser).not.toHaveBeenCalled();
			expect(provisioningService.provisionProjectRolesForUser).not.toHaveBeenCalled();
		});

		it('provisions direct SAML claims when expression mapping is disabled', async () => {
			await handler.provisionRoles(user, samlLogin);

			expect(provisioningService.provisionInstanceRoleForUser).toHaveBeenCalledWith(
				user,
				'global:admin',
			);
			expect(provisioningService.provisionProjectRolesForUser).toHaveBeenCalledWith(user.id, [
				'project-1:viewer',
			]);
			expect(provisioningService.provisionExpressionMappedRolesForUser).not.toHaveBeenCalled();
		});

		it('still provisions the instance role when the SAML claims are missing, so the default condition applies', async () => {
			await handler.provisionRoles(user, { provider: 'saml', rawAttributes: {} });

			expect(provisioningService.provisionInstanceRoleForUser).toHaveBeenCalledWith(
				user,
				undefined,
			);
			expect(provisioningService.provisionProjectRolesForUser).not.toHaveBeenCalled();
		});

		it('extracts OIDC claims by the configured claim names', async () => {
			await handler.provisionRoles(user, oidcLogin);

			expect(provisioningService.provisionInstanceRoleForUser).toHaveBeenCalledWith(
				user,
				'global:member',
			);
			expect(provisioningService.provisionProjectRolesForUser).toHaveBeenCalledWith(user.id, [
				'project-1:viewer',
			]);
		});
	});
});
