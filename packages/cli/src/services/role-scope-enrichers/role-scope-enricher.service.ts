import { Role } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	PersonalProjectScopeEnricher
} from '@/services/role-scope-enrichers/personal-project-role-scope-enricher.service';

import { RoleScopeEnricher } from '@/services/role-scope-enrichers/types';

@Service()
export class RoleScopeEnricherService {

	enrichers: RoleScopeEnricher[]

	constructor(
		personalProjectScopeEnricher: PersonalProjectScopeEnricher
	) {
		this.enrichers = [personalProjectScopeEnricher]
	}

	async findAdditionalScopesForRole(role: Role) {
		const roleAdditions = await Promise.all(this.enrichers.map(async enricher => await enricher.execute(role)))
		return roleAdditions.flatMap(roleIds => roleIds);
	}
}



