import { REDACTION_FLOOR_DEFAULT, redactionFloorSchema, type RedactionFloor } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError, UserError } from 'n8n-workflow';

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

	async get(): Promise<RedactionFloor> {
		if (!isRedactionEnforcementEnabled()) return REDACTION_FLOOR_DEFAULT;
		return await this.load();
	}

	async buildContext(): Promise<{ enforcement: RedactionFloor } | undefined> {
		if (!isRedactionEnforcementEnabled()) return undefined;
		return { enforcement: await this.load() };
	}

	private async load(): Promise<RedactionFloor> {
		const raw = await this.cacheService.get<string>(KEY, {
			refreshFn: async () => await this.loadFromDatabase(),
		});

		if (raw === undefined) return REDACTION_FLOOR_DEFAULT;
		return this.parseStoredValue(raw, 'cache') ?? REDACTION_FLOOR_DEFAULT;
	}

	async set(next: RedactionFloor): Promise<void> {
		if (!isRedactionEnforcementEnabled()) {
			throw new OperationalError('Redaction enforcement is not enabled on this instance');
		}

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
