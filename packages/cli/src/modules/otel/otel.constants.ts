import { OTLP_PROTOCOLS, type OtlpProtocol } from '@n8n/api-types';
import {
	ATTR_ERROR_TYPE,
	ATTR_HTTP_REQUEST_METHOD,
	ATTR_HTTP_REQUEST_RESEND_COUNT,
	ATTR_HTTP_RESPONSE_STATUS_CODE,
	ATTR_SERVER_ADDRESS,
	ATTR_SERVER_PORT,
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
	ATTR_URL_SCHEME,
} from '@opentelemetry/semantic-conventions';

export { OTLP_PROTOCOLS, type OtlpProtocol };

export const OTEL_ENV_VARS = {
	enabled: 'N8N_OTEL_ENABLED',
	exporterProtocol: 'N8N_OTEL_EXPORTER_OTLP_PROTOCOL',
	exporterEndpoint: 'N8N_OTEL_EXPORTER_OTLP_ENDPOINT',
	exporterTracingPath: 'N8N_OTEL_EXPORTER_OTLP_TRACING_PATH',
	exporterHeaders: 'N8N_OTEL_EXPORTER_OTLP_HEADERS',
	exporterServiceName: 'N8N_OTEL_EXPORTER_SERVICE_NAME',
	tracesSampleRate: 'N8N_OTEL_TRACES_SAMPLE_RATE',
	startupConnectivityTimeoutMs: 'N8N_OTEL_STARTUP_CONNECTIVITY_TIMEOUT_MS',
	includeNodeSpans: 'N8N_OTEL_TRACES_INCLUDE_NODE_SPANS',
	injectOutbound: 'N8N_OTEL_TRACES_INJECT_OUTBOUND',
	productionExecutionsOnly: 'N8N_OTEL_TRACES_PRODUCTION_ONLY',
} as const;

export const OTEL_TEST_SPAN_NAME = 'n8n.test_trace';

export const ATTR = {
	OTEL_SERVICE_NAME: ATTR_SERVICE_NAME,
	OTEL_SERVICE_VERSION: ATTR_SERVICE_VERSION,

	INSTANCE_ID: 'n8n.instance.id',
	INSTANCE_ROLE: 'n8n.instance.role',

	IS_TEST_TRACE: 'n8n.test',

	PROJECT_ID: 'n8n.project.id',

	WORKFLOW_ID: 'n8n.workflow.id',
	WORKFLOW_VERSION_ID: 'n8n.workflow.version_id',
	WORKFLOW_NAME: 'n8n.workflow.name',
	WORKFLOW_NODE_COUNT: 'n8n.workflow.node_count',
	WORKFLOW_CUSTOM_PREFIX: 'n8n.workflow.custom.',

	EXECUTION_ID: 'n8n.execution.id',
	EXECUTION_MODE: 'n8n.execution.mode',
	EXECUTION_STATUS: 'n8n.execution.status',
	EXECUTION_IS_RETRY: 'n8n.execution.is_retry',
	EXECUTION_RETRY_OF: 'n8n.execution.retry_of',
	EXECUTION_ERROR_TYPE: 'n8n.execution.error_type',
	EXECUTION_CRASH_DETECTOR: 'n8n.execution.crash.detector',
	EXECUTION_RECONSTRUCTED: 'n8n.execution.reconstructed',

	NODE_ID: 'n8n.node.id',
	NODE_NAME: 'n8n.node.name',
	NODE_TYPE: 'n8n.node.type',
	NODE_TYPE_VERSION: 'n8n.node.type_version',
	NODE_ITEMS_INPUT: 'n8n.node.items.input',
	NODE_ITEMS_OUTPUT: 'n8n.node.items.output',
	NODE_TERMINATION_REASON: 'n8n.node.termination_reason',
	PROJECT_CUSTOM_PREFIX: 'n8n.project.custom.',
	NODE_CUSTOM_PREFIX: 'n8n.node.custom.',

	CONTINUATION_REASON: 'n8n.continuation.reason',

	CONTRACT_ACTION: 'n8n.contract.action',
	CONTRACT_ACTION_VERSION: 'n8n.contract.action.version',
	CONTRACT_BUNDLE_HASH: 'n8n.contract.bundle_hash',
	CONTRACT_NODE_CONTRACT: 'n8n.contract.node_contract',
	CONTRACT_PATH: 'n8n.contract.path',
	CONTRACT_ITEMS_INPUT: 'n8n.contract.items.input',
	CONTRACT_OUTPUT_ITEMS: 'n8n.contract.output.items',
	CONTRACT_REQUESTS: 'n8n.contract.requests',
	CONTRACT_PAGES: 'n8n.contract.pages',
	CONTRACT_RETRIES: 'n8n.contract.retries',
	CONTRACT_INPUT_MS: 'n8n.contract.input.ms',
	CONTRACT_OUTPUT_VALIDATE_MS: 'n8n.contract.output.validate_ms',
	CONTRACT_DRIFT_ISSUES: 'n8n.contract.drift_issues',
	CONTRACT_SPANS_DROPPED: 'n8n.contract.spans_dropped',
	CONTRACT_LOAD_CACHED: 'n8n.contract.load.cached',
	SANDBOX_COMPILE_CACHED: 'n8n.sandbox.compile_cached',
	SANDBOX_GUEST_CPU_MS: 'n8n.sandbox.guest_cpu_ms',
	SANDBOX_MEMORY_PEAK_BYTES: 'n8n.sandbox.memory_peak_bytes',
	SANDBOX_INSTANTIATE_MS: 'n8n.sandbox.instantiate_ms',
	RPC_DIRECTION: 'n8n.rpc.direction',
	RPC_REQUEST_BYTES: 'n8n.rpc.request.bytes',
	RPC_RESPONSE_BYTES: 'n8n.rpc.response.bytes',
	RPC_ENCODE_MS: 'n8n.rpc.encode_ms',
	RPC_DECODE_MS: 'n8n.rpc.decode_ms',
	CREDENTIAL_TYPE: 'n8n.credential.type',
	CREDENTIAL_SCHEME: 'n8n.credential.scheme',
	HTTP_PAGE: 'n8n.http.page',
	// Set only with N8N_NODE_CONTRACT_TRACE_PAYLOADS, for development.
	CONTRACT_PAYLOADS: 'n8n.contract.payloads',
	CONTRACT_INPUT_PAYLOADS: 'n8n.contract.input.payloads',
	CONTRACT_OUTPUT_PAYLOADS: 'n8n.contract.output.payloads',
	HTTP_REQUEST_BODY: 'n8n.http.request.body',
	HTTP_RESPONSE_BODY: 'n8n.http.response.body',

	HTTP_REQUEST_METHOD: ATTR_HTTP_REQUEST_METHOD,
	HTTP_REQUEST_RESEND_COUNT: ATTR_HTTP_REQUEST_RESEND_COUNT,
	HTTP_RESPONSE_STATUS_CODE: ATTR_HTTP_RESPONSE_STATUS_CODE,
	SERVER_ADDRESS: ATTR_SERVER_ADDRESS,
	SERVER_PORT: ATTR_SERVER_PORT,
	URL_SCHEME: ATTR_URL_SCHEME,
	ERROR_TYPE: ATTR_ERROR_TYPE,
	// Development semconv names, copied: `/incubating` may change them in a minor release.
	URL_TEMPLATE: 'url.template',
	HTTP_REQUEST_BODY_SIZE: 'http.request.body.size',
	HTTP_RESPONSE_BODY_SIZE: 'http.response.body.size',
	RPC_SYSTEM_NAME: 'rpc.system.name',
	RPC_METHOD: 'rpc.method',
	RPC_RESPONSE_STATUS_CODE: 'rpc.response.status_code',
} as const;
