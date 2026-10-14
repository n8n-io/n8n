import type { OperationContext, User } from '@n8n/db';
import { Service } from '@n8n/di';

import type {
	ResolvedRoles,
	RoleMappingConfig,
	RoleMappingProvider,
	RoleResolverContext,
} from '@/services/role-mapping-proxy.service';

import { ProvisioningService } from './provisioning.service.ee';
import { RoleResolverService } from './role-resolver.service.ee';

/** Registered on the core `RoleMappingProxyService` so the identity layer maps roles without importing this module. */
@Service()
export class ProvisioningRoleMappingProvider implements RoleMappingProvider {
	constructor(
		private readonly roleResolver: RoleResolverService,
		private readonly provisioning: ProvisioningService,
	) {}

	async resolveRoles(
		config: RoleMappingConfig,
		context: RoleResolverContext,
		ctx?: OperationContext,
	): Promise<ResolvedRoles> {
		return await this.roleResolver.resolveRoles(config, context, ctx);
	}

	async applyResolvedRoles(
		user: User,
		resolved: ResolvedRoles,
		managed: { instanceRole: boolean; projectRoles: boolean },
	): Promise<void> {
		await this.provisioning.applyResolvedRoles(user, resolved, managed);
	}
}
