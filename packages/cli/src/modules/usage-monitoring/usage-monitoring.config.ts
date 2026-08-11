import { Config, Env } from '@n8n/config';

@Config
export class UsageMonitoringConfig {
	/** Webhook URL that daily usage reports are pushed to. Reporting is disabled when unset. */
	@Env('N8N_USAGE_METRICS_REPORTING_WEBHOOK_URL')
	webhookUrl: string = '';

	/** How often to attempt sending a usage report. Defaults to once a day. */
	@Env('N8N_USAGE_METRICS_REPORTING_INTERVAL_MINUTES')
	reportingIntervalMinutes: number = 1440;
}
