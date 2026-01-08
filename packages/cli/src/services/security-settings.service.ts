import { SettingsRepository, RoleRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { PERSONAL_SPACE_PUBLISHING_SETTING_KEY } from '@n8n/permissions';
import { OperationalError } from 'n8n-workflow';

import { RoleService } from '@/services/role.service';

@Service()
export class SecuritySettingsService {
	private readonly SETTING_KEY = PERSONAL_SPACE_PUBLISHING_SETTING_KEY;

	private readonly PERSONAL_OWNER_ROLE_SLUG = 'project:personalOwner';

	private readonly PUBLISH_SCOPE_SLUG = 'workflow:publish';

	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly roleRepository: RoleRepository,
		private readonly roleService: RoleService,
	) {}

	async setPersonalSpacePublishing(enabled: boolean): Promise<void> {
		// 1. Persist setting to database
		await this.settingsRepository.upsert(
			{ key: this.SETTING_KEY, value: enabled.toString(), loadOnStartup: true },
			['key'],
		);

		// 2. Verify role exists
		const role = await this.roleRepository.findBySlug(this.PERSONAL_OWNER_ROLE_SLUG);
		if (!role) {
			throw new OperationalError(`Role ${this.PERSONAL_OWNER_ROLE_SLUG} not found`);
		}

		// 3. Check current state
		const hasPublishScope = role.scopes.some((s) => s.slug === this.PUBLISH_SCOPE_SLUG);

		// 4. Add or remove scope using RoleService (handles cache invalidation)
		if (enabled && !hasPublishScope) {
			await this.roleService.addScopeToRole(this.PERSONAL_OWNER_ROLE_SLUG, this.PUBLISH_SCOPE_SLUG);
		} else if (!enabled && hasPublishScope) {
			await this.roleService.removeScopeFromRole(
				this.PERSONAL_OWNER_ROLE_SLUG,
				this.PUBLISH_SCOPE_SLUG,
			);
		}
	}

	async getPersonalSpacePublishing(): Promise<boolean> {
		const row = await this.settingsRepository.findByKey(this.SETTING_KEY);
		return row?.value === 'true' || row === null; // Default to true
	}
}
