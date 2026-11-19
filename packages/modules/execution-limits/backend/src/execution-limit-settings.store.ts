import {
	DEFAULT_EXECUTION_LIMIT_SETTINGS,
	executionLimitSettingsSchema,
	type ExecutionLimitSettings,
} from '@n8n/api-types';
import { SettingsRepository, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';

const SETTINGS_KEY = 'features.executionLimits';

function parseStoredValue(value: string): ExecutionLimitSettings {
	try {
		return executionLimitSettingsSchema.parse(JSON.parse(value));
	} catch (cause) {
		throw new UnexpectedError('The stored execution limit settings are not valid', { cause });
	}
}

/** The only reader and writer of the `features.executionLimits` settings row. */
@Service()
export class ExecutionLimitSettingsStore {
	constructor(private readonly settingsRepository: SettingsRepository) {}

	/** An instance with no row has the default settings. */
	async read(ctx: OperationContext): Promise<ExecutionLimitSettings> {
		const row = await this.settingsRepository.findByKeyInContext(SETTINGS_KEY, ctx);

		return row ? parseStoredValue(row.value) : DEFAULT_EXECUTION_LIMIT_SETTINGS;
	}

	/**
	 * Reads the settings and holds a write lock until the transaction of `ctx` ends, so a
	 * read-merge-write cannot lose a parallel change. A lock needs a row, so this creates the
	 * row with the default settings when the row does not exist.
	 */
	async lockAndRead(ctx: OperationContext): Promise<ExecutionLimitSettings> {
		const row = await this.settingsRepository.getOrCreateWithWriteLock(
			SETTINGS_KEY,
			JSON.stringify(DEFAULT_EXECUTION_LIMIT_SETTINGS),
			false,
			ctx,
		);

		return parseStoredValue(row.value);
	}

	async write(settings: ExecutionLimitSettings, ctx: OperationContext): Promise<void> {
		await this.settingsRepository.upsertByKey(SETTINGS_KEY, JSON.stringify(settings), false, ctx);
	}
}
