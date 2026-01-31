import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { PERSONAL_SPACE_PUBLISHING_SETTING_KEY } from '@n8n/permissions';

import { RoleService } from '@/services/role.service';

@Service()
export class SecuritySettingsService {
	private readonly PERSONAL_OWNER_ROLE_SLUG = 'project:personalOwner';

	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly roleService: RoleService,
	) {}

	async setPersonalSpacePublishing(enabled: boolean): Promise<void> {
		await this.settingsRepository.upsert(
			{
				key: PERSONAL_SPACE_PUBLISHING_SETTING_KEY,
				value: enabled.toString(),
				loadOnStartup: true,
			},
			['key'],
		);

		if (enabled) {
			await this.roleService.addScopeToRole(this.PERSONAL_OWNER_ROLE_SLUG, 'workflow:publish');
		} else {
			await this.roleService.removeScopeFromRole(this.PERSONAL_OWNER_ROLE_SLUG, 'workflow:publish');
		}
	}

	async isPersonalSpacePublishingEnabled(): Promise<boolean> {
		const row = await this.settingsRepository.findByKey(PERSONAL_SPACE_PUBLISHING_SETTING_KEY);
		return row?.value === 'true' || row === null; // Default to true for backward compatibility
	}
}
