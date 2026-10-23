import { Config, Env } from '@n8n/config';

@Config
export class InstanceReportingConfig {
	/**
	 * @beta - breaking changes may still occur
	 */
	@Env('N8N_INSTANCE_REPORTING_LABEL')
	instanceReportingLabel: string = '';

	/**
	 * Base URL of the receiver. The report is POSTed to its
	 * `/api/v1/instance-reports` endpoint, so set the origin only.
	 *
	 * @beta - breaking changes may still occur
	 */
	@Env('N8N_INSTANCE_REPORTING_BASE_URL')
	instanceReportingBaseUrl: string = '';

	/**
	 * Optional. When set, it is sent as `Authorization: Bearer …` and the license
	 * certificate is not sent. Leave unset to authenticate with the certificate.
	 *
	 * @beta - breaking changes may still occur
	 */
	@Env('N8N_INSTANCE_REPORTING_AUTH_TOKEN')
	instanceReportingAuthToken: string = '';
}
