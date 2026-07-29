import { REDACTION_FLOOR_DEFAULT, redactionFloorSchema, type RedactionFloor } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { Publisher } from '@/scaling/pubsub/publisher.service';
import { CacheService } from '@/services/cache/cache.service';

const KEY = 'redaction.enforcement';

@Service()
export class InstanceRedactionEnforcementService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly cacheService: CacheService,
		private readonly logger: Logger,
		private readonly publisher: Publisher,
		private readonly globalConfig: GlobalConfig,
	) {}

	/**
	 * Resolves the instance redaction floor. Returns `'off'` when no value is
	 * stored. The floor is stored as the enum directly, so no translation is
	 * needed.
	 */
	async get(): Promise<RedactionFloor> {
		return await this.load();
	}

	private async load(): Promise<RedactionFloor> {
		const raw = await this.cacheService.get<string>(KEY, {
			refreshFn: async () => await this.loadFromDatabase(),
		});

		if (raw === undefined) return REDACTION_FLOOR_DEFAULT;
		return this.parseStoredValue(raw, 'cache') ?? REDACTION_FLOOR_DEFAULT;
	}

	async set(next: RedactionFloor): Promise<void> {
		const result = redactionFloorSchema.safeParse(next);
		if (!result.success) {
			this.logger.warn('Invalid redaction enforcement settings payload', {
				issues: result.error.issues,
			});
			throw new UserError('Invalid redaction enforcement settings');
		}

		const serialized = JSON.stringify(result.data);

		await this.settingsRepository.upsert({ key: KEY, value: serialized, loadOnStartup: true }, [
			'key',
		]);

		await this.cacheService.set(KEY, serialized);

		if (this.globalConfig.multiMainSetup.enabled) {
			void this.publisher.publishCommand({ command: 'redaction-floor-changed' }).catch((error) => {
				this.logger.warn(
					'[InstanceRedactionEnforcementService] Failed to publish redaction-floor-changed',
					{
						error: error instanceof Error ? error.message : String(error),
					},
				);
			});
		}
	}

	/**
	 * Drop the locally cached redaction floor when a peer main reports a change.
	 * Next read re-loads from the DB. Does not re-publish — the originating main
	 * already updated its own cache synchronously in set().
	 */
	@OnPubSubEvent('redaction-floor-changed', { instanceType: 'main' })
	async handleRedactionFloorChanged(): Promise<void> {
		await this.cacheService.delete(KEY);
	}

	private async loadFromDatabase(): Promise<string> {
		const row = await this.settingsRepository.findByKey(KEY);
		const value =
			row?.value !== undefined
				? (this.parseStoredValue(row.value, 'database') ?? REDACTION_FLOOR_DEFAULT)
				: REDACTION_FLOOR_DEFAULT;
		return JSON.stringify(value);
	}

	private parseStoredValue(raw: string, source: 'cache' | 'database'): RedactionFloor | undefined {
		let parsedJson: unknown;
		try {
			parsedJson = JSON.parse(raw);
		} catch (error) {
			this.logger.warn('Failed to parse redaction enforcement setting JSON', {
				source,
				cause: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}

		const result = redactionFloorSchema.safeParse(parsedJson);
		if (!result.success) {
			this.logger.warn('Redaction enforcement setting has an invalid shape', {
				source,
				issues: result.error.issues,
			});
			return undefined;
		}

		return result.data;
	}
}
