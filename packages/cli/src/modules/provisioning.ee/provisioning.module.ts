import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({
	name: 'provisioning',
	licenseFlag: ['feat:oidc', 'feat:saml', 'feat:ldap'],
	instanceTypes: ['main'],
})
export class ProvisioningModule implements ModuleInterface {
	async init() {
		await import('./provisioning.controller.ee');
		await import('./role-mapping-rule.controller.ee');

		// Register the role-deletion checker so the core `RoleService` blocks
		// deleting a role still targeted by a mapping rule, without importing
		// this module.
		const { RoleDeletionCheckProxy } = await import('@/services/role-deletion-check-proxy.service');
		const { ProvisioningRoleDeletionChecker } = await import('./role-deletion-checker.ee');
		Container.get(RoleDeletionCheckProxy).registerProvider(
			Container.get(ProvisioningRoleDeletionChecker),
		);
	}
}
