import { Config, Env } from '@n8n/config';

@Config
export class InstanceMonitoringConfig {
	@Env('N8N_WORKFLOW_EXECUTION_DATA_REPORTING_INTERVAL_MINUTES')
	executionDataReportingIntervalMinutes: number;

	@Env('N8N_WORKFLOW_EXECUTION_DATA_REPORTING_INSTANCE_IDENTIFIER')
	executionDataReportingIdentifier: string;

	@Env('N8N_WORKFLOW_EXECUTION_DATA_REPORTING_WEBHOOK_URL')
	executionDataReportingWebhookUrl: string;
}
