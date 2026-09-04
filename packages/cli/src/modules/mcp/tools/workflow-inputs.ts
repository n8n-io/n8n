import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';
import z from 'zod';

export const webhookPayloadSchema = z
	.object({
		method: z
			.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])
			.optional()
			.default('GET')
			.describe('HTTP method (defaults to GET)'),
		query: z.record(z.string()).optional().describe('Query string parameters'),
		body: z.record(z.unknown()).optional().describe('Request body data (main webhook payload)'),
		headers: z
			.record(z.string())
			.optional()
			.describe('HTTP headers (e.g., authorization, content-type)'),
	})
	// Strict so a misspelled field is rejected rather than dropped, which would
	// otherwise start the workflow with an empty body and report success.
	.strict()
	.describe('Input data for webhook-based workflows');

export const chatWorkflowInputSchema = z
	.object({
		chatInput: z.string().describe('Input for chat-based workflows'),
	})
	.strict();

export const formWorkflowInputSchema = z
	.object({
		formData: z.record(z.unknown()).describe('Input data for form-based workflows'),
	})
	.strict();

export const webhookWorkflowInputSchema = z
	.object({
		webhookData: webhookPayloadSchema,
	})
	.strict();

export const workflowInputsSchema = z.union([
	chatWorkflowInputSchema,
	formWorkflowInputSchema,
	webhookWorkflowInputSchema,
]);

export type WorkflowInputs = z.infer<typeof workflowInputsSchema>;

export const triggerRequiresInputs = (nodeType: string): boolean =>
	nodeType === CHAT_TRIGGER_NODE_TYPE ||
	nodeType === FORM_TRIGGER_NODE_TYPE ||
	nodeType === WEBHOOK_NODE_TYPE;

export const getExpectedInputsDescription = (nodeType: string): string => {
	switch (nodeType) {
		case CHAT_TRIGGER_NODE_TYPE:
			return '{ chatInput: string }';
		case FORM_TRIGGER_NODE_TYPE:
			return '{ formData: { FIELD_NAME: VALUE } }';
		case WEBHOOK_NODE_TYPE:
			return '{ webhookData: { headers?, query?, body? } }';
		case SCHEDULE_TRIGGER_NODE_TYPE:
		case MANUAL_TRIGGER_NODE_TYPE:
			return 'omit inputs';
		default:
			return 'omit inputs';
	}
};

/** Shown in get_workflow_details trigger notices so clients pass the same shape execute_workflow expects. */
export const getExecuteWorkflowCallExample = (nodeType: string): string => {
	switch (nodeType) {
		case CHAT_TRIGGER_NODE_TYPE:
			return '{ triggerNodeName: "<node name>", inputs: { chatInput: "<message>" } }';
		case FORM_TRIGGER_NODE_TYPE:
			return '{ triggerNodeName: "<node name>", inputs: { formData: { FIELD_NAME: VALUE } } }';
		case WEBHOOK_NODE_TYPE:
			return '{ triggerNodeName: "<node name>", inputs: { webhookData: { headers?, query?, body? } } }';
		case SCHEDULE_TRIGGER_NODE_TYPE:
		case MANUAL_TRIGGER_NODE_TYPE:
			return '{ triggerNodeName: "<node name>" }';
		default:
			return '{ triggerNodeName: "<node name>" }';
	}
};
