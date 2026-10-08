import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/** Settings key written once by {@link WorkflowStatisticsService} at the instance's activation. */
export const INSTANCE_ACTIVATED_SETTINGS_KEY = 'instance.firstProductionSuccess';

type ActivationRecord = { timestamp?: number };

/**
 * Reads the instance's activation moment: its first successful production execution, for any
 * project type. Written exactly once by {@link WorkflowStatisticsService}; this is the read side.
 *
 * Activation is monotonic — an instance never de-activates — so a `true` answer is memoised for
 * the life of the process. A `false` answer is not, since it can change at any moment.
 */
@Service()
export class InstanceActivationService {
	/** Set once activation is observed; `undefined` means "not observed yet", never "not activated". */
	private activatedAt: number | undefined;

	constructor(private readonly settingsRepository: SettingsRepository) {}

	async isActivated(): Promise<boolean> {
		return (await this.getActivatedAt()) !== undefined;
	}

	async getActivatedAt(): Promise<number | undefined> {
		if (this.activatedAt !== undefined) return this.activatedAt;

		const row = await this.settingsRepository.findByKey(INSTANCE_ACTIVATED_SETTINGS_KEY);
		if (!row) return undefined;

		this.activatedAt = this.parseTimestamp(row.value);
		return this.activatedAt;
	}

	/**
	 * The row's timestamp, or a non-undefined fallback. The row's existence is what marks the
	 * instance activated, so a malformed value must not read as "never activated" — it only costs
	 * the precise moment, which is used for telemetry.
	 */
	private parseTimestamp(value: string): number {
		try {
			const parsed = JSON.parse(value) as ActivationRecord;
			if (typeof parsed?.timestamp === 'number') return parsed.timestamp;
		} catch {
			// Fall through to the sentinel below.
		}
		return 0;
	}
}
