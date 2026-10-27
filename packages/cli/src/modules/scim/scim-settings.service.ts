import { SettingsRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';

import { CacheService } from '@n8n/backend-services';

import { SCIM_PROVISIONING_ENABLED_KEY } from '@/sso.ee/scim-switch-reader';

const ENABLED_KEY = SCIM_PROVISIONING_ENABLED_KEY;

export interface ScimSettingsChange {
	enabled: boolean;
	/**
	 * Runs before an enable is saved, while the switch is locked, in the
	 * transaction of the change. An error from it cancels the whole change.
	 */
	assertCanEnable?: (ctx: OperationContext) => Promise<void>;
}

export interface ScimSettingsChangeResult {
	/** The switch before the change. */
	wasEnabled: boolean;
	enabled: boolean;
}

/**
 * Persists instance-wide SCIM settings. Provisioning is disabled by
 * default; while disabled, all /scim/v2 endpoints reject requests but the
 * stored token is kept.
 */
@Service()
export class ScimSettingsService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly cacheService: CacheService,
		private readonly transactionRunner: TransactionRunner,
	) {}

	async isEnabled(): Promise<boolean> {
		const cached = await this.cacheService.get<string>(ENABLED_KEY);
		if (cached !== undefined) return cached === 'true';

		const row = await this.settingsRepository.findByKey(ENABLED_KEY);
		const enabled = row?.value === 'true';

		await this.cacheService.set(ENABLED_KEY, enabled.toString());

		return enabled;
	}

	async setEnabled(enabled: boolean): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: ENABLED_KEY, value: enabled.toString(), loadOnStartup: true },
			['key'],
		);

		await this.cacheService.set(ENABLED_KEY, enabled.toString());
	}

	/**
	 * Reads the saved switch, not the cache. The read lock waits for an
	 * `update` or a `turnOff` that holds the switch, so the read sees the
	 * value that they commit.
	 */
	async isSavedEnabled(): Promise<boolean> {
		return await this.transactionRunner.run({}, async (ctx) => {
			const row = await this.settingsRepository.getOrCreateWithReadLock(
				ENABLED_KEY,
				'false',
				true,
				ctx,
			);
			return row.value === 'true';
		});
	}

	/**
	 * Turns the switch off and tells if it was on. It reads the saved switch
	 * under the lock that `update` takes, not the cache. Thus it also turns
	 * off an enable that committed while the cache still held the old value.
	 */
	async turnOff(): Promise<boolean> {
		const wasEnabled = await this.transactionRunner.run({}, async (ctx) => {
			const row = await this.lockSwitch(ctx);
			if (row.value !== 'true') return false;

			await this.settingsRepository.upsertByKey(ENABLED_KEY, 'false', true, ctx);
			return true;
		});

		await this.cacheService.set(ENABLED_KEY, 'false');

		return wasEnabled;
	}

	/**
	 * Saves the switch. The switch row stays locked from the read to the
	 * write, as in `turnOff`, so the two run one after the other. `turnOff`
	 * sees an enable that committed first, and `assertCanEnable` runs after a
	 * `turnOff` that started first.
	 */
	async update({
		enabled,
		assertCanEnable,
	}: ScimSettingsChange): Promise<ScimSettingsChangeResult> {
		const result = await this.transactionRunner.run({}, async (ctx) => {
			const wasEnabled = (await this.lockSwitch(ctx)).value === 'true';
			if (enabled) await assertCanEnable?.(ctx);
			await this.settingsRepository.upsertByKey(ENABLED_KEY, enabled.toString(), true, ctx);

			return { wasEnabled, enabled };
		});

		// After the commit, so that the cache never holds a value that is not saved.
		await this.cacheService.set(ENABLED_KEY, enabled.toString());

		return result;
	}

	/** A lock needs a row, so a missing switch is created as off. */
	private async lockSwitch(ctx: OperationContext) {
		return await this.settingsRepository.getOrCreateWithWriteLock(ENABLED_KEY, 'false', true, ctx);
	}
}
