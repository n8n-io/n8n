import {
	REDACTION_ENFORCEMENT_DEFAULTS,
	redactionEnforcementSettingsSchema,
	type RedactionEnforcementSettings,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';

import { CacheService } from '@/services/cache/cache.service';

import { isRedactionEnforcementEnabled } from './redaction-enforcement.feature-flag';

const KEY = 'redaction.enforcement';

@Service()
export class InstanceRedactionEnforcementService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly cacheService: CacheService,
		private readonly logger: Logger,
	) {}

	isFeatureEnabled(): boolean {
		return isRedactionEnforcementEnabled();
	}

	async get(): Promise<RedactionEnforcementSettings> {
		if (!this.isFeatureEnabled()) return REDACTION_ENFORCEMENT_DEFAULTS;

		const raw = await this.cacheService.get<string>(KEY, {
			refreshFn: async () => {
				const row = await this.settingsRepository.findByKey(KEY);
				const value =
					row?.value !== undefined
						? (this.parseStoredValue(row.value, 'database') ?? REDACTION_ENFORCEMENT_DEFAULTS)
						: REDACTION_ENFORCEMENT_DEFAULTS;
				return JSON.stringify(value);
			},
		});

		if (raw === undefined) return REDACTION_ENFORCEMENT_DEFAULTS;
		return this.parseStoredValue(raw, 'cache') ?? REDACTION_ENFORCEMENT_DEFAULTS;
	}

	async set(next: RedactionEnforcementSettings): Promise<void> {
		if (!this.isFeatureEnabled()) {
			throw new OperationalError('Redaction enforcement is not enabled on this instance');
		}

		const parsed = redactionEnforcementSettingsSchema.parse(next);
		const serialized = JSON.stringify(parsed);

		await this.settingsRepository.upsert(
			{ key: KEY, value: serialized, loadOnStartup: true },
			['key'],
		);

		await this.cacheService.set(KEY, serialized);
	}

	private parseStoredValue(
		raw: string,
		source: 'cache' | 'database',
	): RedactionEnforcementSettings | undefined {
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

		const result = redactionEnforcementSettingsSchema.safeParse(parsedJson);
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
