import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

// Loaded on workers and webhook processes too: the trusted-source identity
// layer maps roles through the core `RoleMappingProxyService`, and a request
// that resolves an identity there needs the provider registered.
@BackendModule({
	name: 'provisioning',
	licenseFlag: ['feat:oidc', 'feat:saml', 'feat:ldap'],
	instanceTypes: ['main', 'webhook', 'worker'],
})
export class ProvisioningModule implements ModuleInterface {
	async init() {
		// Controllers serve HTTP on main only.
		if (Container.get(InstanceSettings).instanceType === 'main') {
			await import('./provisioning.controller.ee.js');
			await import('./role-mapping-rule.controller.ee.js');
		}

		// Register the role-deletion checker so the core `RoleService` blocks
		// deleting a role still targeted by a mapping rule, without importing
		// this module.
		const { RoleDeletionCheckProxy } = await import('@n8n/backend-services');
		const { ProvisioningRoleDeletionChecker } = await import('./role-deletion-checker.ee.js');
		Container.get(RoleDeletionCheckProxy).registerProvider(
			Container.get(ProvisioningRoleDeletionChecker),
		);

		// Register the role mapping provider so the identity layer maps roles
		// through the core `RoleMappingProxyService`, without importing this module.
		const { RoleMappingProxyService } = await import('@/services/role-mapping-proxy.service.js');
		const { ProvisioningRoleMappingProvider } = await import('./role-mapping-provider.ee.js');
		Container.get(RoleMappingProxyService).registerProvider(
			Container.get(ProvisioningRoleMappingProvider),
		);
	}
}
