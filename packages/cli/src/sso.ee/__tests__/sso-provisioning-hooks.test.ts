import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { SsoLoginClaims, SsoProvisioningHandler } from '../sso-provisioning-hooks';
import { SsoProvisioningHooks } from '../sso-provisioning-hooks';

describe('SsoProvisioningHooks', () => {
	describe('without a registered handler', () => {
		const hooks = new SsoProvisioningHooks();
		const login: SsoLoginClaims = { provider: 'saml', rawAttributes: {} };

		it('getSamlRoleClaimNames returns disabled claim names', async () => {
			await expect(hooks.getSamlRoleClaimNames()).resolves.toEqual({
				instanceRole: null,
				projectRoles: null,
			});
		});

		it('getOidcScope returns no scope', async () => {
			await expect(hooks.getOidcScope()).resolves.toBeUndefined();
		});

		it('assertLoginAllowed does not throw', async () => {
			await expect(hooks.assertLoginAllowed(login)).resolves.toBeUndefined();
		});

		it('provisionRoles no-ops', async () => {
			await expect(hooks.provisionRoles(mock<User>(), login)).resolves.toBeUndefined();
		});
	});

	it('delegates to the registered handler', async () => {
		const hooks = new SsoProvisioningHooks();
		const handler = mock<SsoProvisioningHandler>();
		handler.getSamlRoleClaimNames.mockResolvedValue({ instanceRole: 'role', projectRoles: 'pr' });
		hooks.registerHandler(handler);

		await expect(hooks.getSamlRoleClaimNames()).resolves.toEqual({
			instanceRole: 'role',
			projectRoles: 'pr',
		});
	});
});
