import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

export const ATTR = {
	OTEL_SERVICE_NAME: ATTR_SERVICE_NAME,
	OTEL_SERVICE_VERSION: ATTR_SERVICE_VERSION,

	INSTANCE_ID: 'n8n.instance.id',
	INSTANCE_ROLE: 'n8n.instance.role',

	WORKFLOW_ID: 'n8n.workflow.id',
	WORKFLOW_VERSION_ID: 'n8n.workflow.version_id',
	WORKFLOW_NAME: 'n8n.workflow.name',
	WORKFLOW_NODE_COUNT: 'n8n.workflow.node_count',

	EXECUTION_ID: 'n8n.execution.id',
	EXECUTION_MODE: 'n8n.execution.mode',
	EXECUTION_STATUS: 'n8n.execution.status',
	EXECUTION_IS_RETRY: 'n8n.execution.is_retry',
	EXECUTION_RETRY_OF: 'n8n.execution.retry_of',
	EXECUTION_ERROR_TYPE: 'n8n.execution.error_type',

	NODE_ID: 'n8n.node.id',
	NODE_NAME: 'n8n.node.name',
	NODE_TYPE: 'n8n.node.type',
	NODE_TYPE_VERSION: 'n8n.node.type_version',
	NODE_ITEMS_INPUT: 'n8n.node.items.input',
	NODE_ITEMS_OUTPUT: 'n8n.node.items.output',
	NODE_TERMINATION_REASON: 'n8n.node.termination_reason',

	CONTINUATION_REASON: 'n8n.continuation.reason',
} as const;
