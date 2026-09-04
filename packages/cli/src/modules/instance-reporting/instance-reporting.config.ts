import { Config, Env } from '@n8n/config';

@Config
export class InstanceReportingConfig {
	@Env('N8N_INSTANCE_REPORTING_IDENTIFIER')
	instanceReportingIdentifier: string = '';

	/**
	 * Base URL of the receiver. The report is POSTed to its
	 * `/api/v1/instance-reports` endpoint, so set the origin only.
	 */
	@Env('N8N_INSTANCE_REPORTING_BASE_URL')
	instanceReportingBaseUrl: string = '';

	/** Sent as a bearer token; leave unset if the receiver does not require one. */
	@Env('N8N_INSTANCE_REPORTING_AUTH_TOKEN')
	instanceReportingAuthToken: string = '';
}
