import { LicenseState } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { SettingsRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';

import { SkillSourceRepository } from '../database/repositories/skill-source.repository';

const SKILL_SYNC_ENABLED_KEY = 'skills.skillSync.enabled';

@Service()
export class SkillSyncSettingsService {
	private savedEnabled: boolean | undefined;

	constructor(
		private readonly loaderConfig: InstanceSettingsLoaderConfig,
		private readonly licenseState: LicenseState,
		private readonly settingsRepository: SettingsRepository,
		private readonly sourceRepository: SkillSourceRepository,
		private readonly txRunner: TransactionRunner,
	) {}

	get isManagedByEnv(): boolean {
		return this.loaderConfig.skillSyncManagedByEnv;
	}

	isEnabled(): boolean {
		if (this.isManagedByEnv) return this.loaderConfig.skillSyncEnabled;
		return this.savedEnabled ?? !this.licenseState.isEnterprisePlan();
	}

	async init(): Promise<void> {
		await this.load();
		await this.keepEnabledIfInUse();
	}

	async load(): Promise<void> {
		const saved = await this.settingsRepository.findByKeyInContext(SKILL_SYNC_ENABLED_KEY, {});
		this.savedEnabled = saved ? saved.value === 'true' : undefined;
	}

	async setEnabled(enabled: boolean): Promise<void> {
		await this.settingsRepository.upsertByKey(SKILL_SYNC_ENABLED_KEY, String(enabled), true, {});
		this.savedEnabled = enabled;
	}

	private async keepEnabledIfInUse(): Promise<void> {
		if (this.isManagedByEnv || this.savedEnabled !== undefined) return;
		if (!this.licenseState.isEnterprisePlan()) return;
		if (!(await this.sourceRepository.hasAnySource())) return;
		const saved = await this.txRunner.run(
			{},
			async (ctx) =>
				await this.settingsRepository.getOrCreateWithReadLock(
					SKILL_SYNC_ENABLED_KEY,
					'true',
					true,
					ctx,
				),
		);
		this.savedEnabled = saved.value === 'true';
	}
}
