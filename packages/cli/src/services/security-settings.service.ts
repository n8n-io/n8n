import {
	SettingsRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import {
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';

import { RoleService } from '@/services/role.service';

@Service()
export class SecuritySettingsService {
	private readonly PERSONAL_OWNER_ROLE_SLUG = 'project:personalOwner';

	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly roleService: RoleService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
	) {}

	async setPersonalSpaceSetting(
		setting: typeof PERSONAL_SPACE_PUBLISHING_SETTING | typeof PERSONAL_SPACE_SHARING_SETTING,
		enabled: boolean,
	): Promise<void> {
		await this.settingsRepository.upsert(
			{
				key: setting.key,
				value: enabled.toString(),
				loadOnStartup: true,
			},
			['key'],
		);

		if (enabled) {
			await this.roleService.addScopesToRole(this.PERSONAL_OWNER_ROLE_SLUG, setting.scopes);
		} else {
			await this.roleService.removeScopesFromRole(this.PERSONAL_OWNER_ROLE_SLUG, setting.scopes);
		}
	}

	async arePersonalSpaceSettingsEnabled(): Promise<{
		personalSpacePublishing: boolean;
		personalSpaceSharing: boolean;
	}> {
		const settingKeys = [PERSONAL_SPACE_PUBLISHING_SETTING.key, PERSONAL_SPACE_SHARING_SETTING.key];
		const rows = await this.settingsRepository.findByKeys(settingKeys);
		const personalSpacePublishingValue = rows.find(
			(r) => r.key === PERSONAL_SPACE_PUBLISHING_SETTING.key,
		)?.value;
		const personalSpaceSharingValue = rows.find(
			(r) => r.key === PERSONAL_SPACE_SHARING_SETTING.key,
		)?.value;

		return {
			personalSpacePublishing: personalSpacePublishingValue !== 'false', // Default to true for backward compatibility
			personalSpaceSharing: personalSpaceSharingValue !== 'false', // Default to true for backward compatibility
		};
	}

	async getPublishedPersonalWorkflowsCount(): Promise<number> {
		return await this.workflowRepository.getPublishedPersonalWorkflowsCount();
	}

	async getSharedPersonalWorkflowsCount(): Promise<number> {
		return await this.sharedWorkflowRepository.getSharedPersonalWorkflowsCount();
	}

	async getSharedPersonalCredentialsCount(): Promise<number> {
		return await this.sharedCredentialsRepository.getSharedPersonalCredentialsCount();
	}
}
