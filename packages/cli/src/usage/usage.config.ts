import { Config, Env } from '@n8n/config';

@Config
export class UsageConfig {
	/**
	 * Days a usage ledger row is kept. Duplicates arrive within seconds, so a week is enough;
	 * raise it for longer audits. 0 keeps rows forever.
	 */
	@Env('N8N_USAGE_LEDGER_RETENTION_DAYS')
	ledgerRetentionDays: number = 7;

	/**
	 * Days hourly usage rows are kept before they are rolled up into daily rows. Hourly rows
	 * feed short-range charts and local-time days. 0 keeps hourly rows forever.
	 */
	@Env('N8N_USAGE_HOURLY_RETENTION_DAYS')
	hourlyRetentionDays: number = 7;
}
