import { RoleMappingRuleRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import type { RoleDeletionChecker } from '@/services/role-deletion-check-proxy.service';

/**
 * Blocks deletion of a custom role while it is still targeted by an SSO role
 * mapping rule. Registered on the core `RoleDeletionCheckProxy` by the
 * provisioning module so `RoleService` stays decoupled from this module.
 */
@Service()
export class ProvisioningRoleDeletionChecker implements RoleDeletionChecker {
	constructor(private readonly roleMappingRuleRepository: RoleMappingRuleRepository) {}

	async findRoleDeletionBlockers(roleSlug: string): Promise<string[]> {
		const count = await this.roleMappingRuleRepository.count({
			where: { role: { slug: roleSlug } },
		});
		if (count === 0) return [];
		return [`referenced by ${count} role mapping rule${count === 1 ? '' : 's'}`];
	}
}
