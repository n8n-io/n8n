import { Config, Env } from '@n8n/config';

@Config
export class InstanceMonitoringConfig {
	/** Whether to report execution data to an external usage-monitoring endpoint. */
	@Env('N8N_INSTANCE_REPORTING_ENABLED')
	enabled: boolean = false;

	@Env('N8N_INSTANCE_REPORTING_INTERVAL_MINUTES')
	instanceReportingIntervalMinutes: number = 60;

	@Env('N8N_INSTANCE_REPORTING_IDENTIFIER')
	instanceReportingIdentifier: string = '';

	@Env('N8N_INSTANCE_REPORTING_WEBHOOK_URL')
	instanceReportingWebhookUrl: string = '';

	/** Sent as a bearer token; leave unset if the receiver does not require one. */
	@Env('N8N_INSTANCE_REPORTING_AUTH_TOKEN')
	instanceReportingAuthToken: string = '';
}
