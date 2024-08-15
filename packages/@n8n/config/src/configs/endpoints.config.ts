import { Config, Env, Nested } from '../decorators';

@Config
class PrometheusMetricsConfig {
	/** Whether to enable the `/metrics` endpoint to expose Prometheus metrics. */
	@Env('N8N_METRICS')
	enable: boolean = false;

	/** Prefix for Prometheus metric names. */
	@Env('N8N_METRICS_PREFIX')
	prefix: string = 'n8n_';

	/** Whether to expose system and Node.js metrics. See: https://www.npmjs.com/package/prom-client */
	@Env('N8N_METRICS_INCLUDE_DEFAULT_METRICS')
	includeDefaultMetrics: boolean = true;

	/** Whether to include a label for workflow ID on workflow metrics. */
	@Env('N8N_METRICS_INCLUDE_WORKFLOW_ID_LABEL')
	includeWorkflowIdLabel: boolean = false;

	/** Whether to include a label for node type on node metrics. */
	@Env('N8N_METRICS_INCLUDE_NODE_TYPE_LABEL')
	includeNodeTypeLabel: boolean = false;

	/** Whether to include a label for credential type on credential metrics. */
	@Env('N8N_METRICS_INCLUDE_CREDENTIAL_TYPE_LABEL')
	includeCredentialTypeLabel: boolean = false;

	/** Whether to expose metrics for API endpoints. See: https://www.npmjs.com/package/express-prom-bundle */
	@Env('N8N_METRICS_INCLUDE_API_ENDPOINTS')
	includeApiEndpoints: boolean = false;

	/** Whether to include a label for the path of API endpoint calls. */
	@Env('N8N_METRICS_INCLUDE_API_PATH_LABEL')
	includeApiPathLabel: boolean = false;

	/** Whether to include a label for the HTTP method of API endpoint calls. */
	@Env('N8N_METRICS_INCLUDE_API_METHOD_LABEL')
	includeApiMethodLabel: boolean = false;

	/** Whether to include a label for the status code of API endpoint calls. */
	@Env('N8N_METRICS_INCLUDE_API_STATUS_CODE_LABEL')
	includeApiStatusCodeLabel: boolean = false;

	/** Whether to include metrics for cache hits and misses. */
	@Env('N8N_METRICS_INCLUDE_CACHE_METRICS')
	includeCacheMetrics: boolean = false;

	/** Whether to include metrics derived from n8n's internal events */
	@Env('N8N_METRICS_INCLUDE_MESSAGE_EVENT_BUS_METRICS')
	includeMessageEventBusMetrics: boolean = false;
}

@Config
export class EndpointsConfig {
	/** Max payload size in MiB */
	@Env('N8N_PAYLOAD_SIZE_MAX')
	payloadSizeMax: number = 16;

	@Nested
	metrics: PrometheusMetricsConfig;

	/** Path segment for REST API endpoints. */
	@Env('N8N_ENDPOINT_REST')
	rest: string = 'rest';

	/** Path segment for form endpoints. */
	@Env('N8N_ENDPOINT_FORM')
	form: string = 'form';

	/** Path segment for test form endpoints. */
	@Env('N8N_ENDPOINT_FORM_TEST')
	formTest: string = 'form-test';

	/** Path segment for waiting form endpoints. */
	@Env('N8N_ENDPOINT_FORM_WAIT')
	formWaiting: string = 'form-waiting';

	/** Path segment for webhook endpoints. */
	@Env('N8N_ENDPOINT_WEBHOOK')
	webhook: string = 'webhook';

	/** Path segment for test webhook endpoints. */
	@Env('N8N_ENDPOINT_WEBHOOK_TEST')
	webhookTest: string = 'webhook-test';

	/** Path segment for waiting webhook endpoints. */
	@Env('N8N_ENDPOINT_WEBHOOK_WAIT')
	webhookWaiting: string = 'webhook-waiting';

	/** Whether to disable n8n's UI (frontend). */
	@Env('N8N_DISABLE_UI')
	disableUi: boolean = false;

	/** Whether to disable production webhooks on the main process, when using webhook-specific processes. */
	@Env('N8N_DISABLE_PRODUCTION_MAIN_PROCESS')
	disableProductionWebhooksOnMainProcess: boolean = false;

	/** Colon-delimited list of additional endpoints to not open the UI on. */
	@Env('N8N_ADDITIONAL_NON_UI_ROUTES')
	additionalNonUIRoutes: string = '';
}
