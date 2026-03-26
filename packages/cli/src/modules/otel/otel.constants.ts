import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

export const ATTR = {
	OTEL_SERVICE_NAME: ATTR_SERVICE_NAME,
	OTEL_SERVICE_VERSION: ATTR_SERVICE_VERSION,

	INSTANCE_ID: 'n8n.instance.id',
	INSTANCE_ROLE: 'n8n.instance.role',

	WORKFLOW_ID: 'n8n.workflow.id',
	WORKFLOW_NAME: 'n8n.workflow.name',
	WORKFLOW_NODE_COUNT: 'n8n.workflow.node_count',

	EXECUTION_ID: 'n8n.execution.id',
	EXECUTION_MODE: 'n8n.execution.mode',
	EXECUTION_STATUS: 'n8n.execution.status',
	EXECUTION_IS_RETRY: 'n8n.execution.is_retry',
	EXECUTION_ERROR_TYPE: 'n8n.execution.error_type',
} as const;
