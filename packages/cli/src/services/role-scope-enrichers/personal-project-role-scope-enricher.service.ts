import { Role } from '@n8n/db';
import { Service } from '@n8n/di';
import { Scope } from '@n8n/permissions';

import { RoleScopeEnricher } from '@/services/role-scope-enrichers/types';
import { SecuritySettingsService } from '@/services/security-settings.service';


@Service()
export class PersonalProjectScopeEnricher implements RoleScopeEnricher {
	constructor(
		private securitySettingsService: SecuritySettingsService
	) {}

	async execute(_role: Role): Promise<Scope[]> {
		const isPersonalSpacePublishingEnabled = await this.securitySettingsService.getPersonalSpacePublishing();
		return isPersonalSpacePublishingEnabled ? ["workflow:publish"] : [];
	}
}
