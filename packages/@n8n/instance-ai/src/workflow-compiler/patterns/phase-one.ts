import { CORE_OPERATION_IDS } from '../catalog/operations';
import { expr, field, input, template } from '../expressions/expression';
import type { StepIR, TriggerIR } from '../ir/schema';
import type { WorkflowPattern } from './types';

function asString(value: unknown, fallback = ''): string {
	return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asStringList(value: unknown): string[] {
	if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
	if (typeof value === 'string')
		return value
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean);
	return [];
}

/** Webhook trigger that answers from a Respond node, with optional payload validation. */
export const WEBHOOK_REQUEST_RESPONSE: WorkflowPattern = {
	id: 'webhook_request_response',
	version: 1,
	title: 'Webhook request/response',
	description: 'HTTP endpoint that validates the payload and responds from the workflow.',
	keywords: ['webhook', 'api', 'endpoint', 'post', 'get', 'request', 'respond', 'http'],
	requiredOperations: [CORE_OPERATION_IDS.WEBHOOK_TRIGGER],
	inputs: [
		{
			name: 'method',
			type: 'enum',
			required: true,
			options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
			description: 'HTTP method.',
			question: 'Which HTTP method should the endpoint accept?',
		},
		{
			name: 'path',
			type: 'string',
			required: true,
			description: 'Endpoint path.',
			question: 'What path should the endpoint use?',
		},
		{
			name: 'requiredFields',
			type: 'string[]',
			required: false,
			description: 'Body fields that must be present.',
		},
		{
			name: 'emailFields',
			type: 'string[]',
			required: false,
			description: 'Body fields that must be valid emails.',
		},
	],
	instantiate(inputs, context) {
		const trigger: TriggerIR = {
			id: context.triggerStepId,
			kind: 'trigger',
			triggerKind: 'webhook',
			label: 'Webhook',
			operation: { operationId: CORE_OPERATION_IDS.WEBHOOK_TRIGGER },
			params: {
				method: asString(inputs.method, 'POST'),
				path: asString(inputs.path).replace(/^\/+/, ''),
				responseMode: 'responseNode',
			},
		};
		const steps: StepIR[] = [];
		const required = asStringList(inputs.requiredFields);
		const emails = asStringList(inputs.emailFields);
		if (required.length > 0 || emails.length > 0) {
			steps.push({
				id: context.stepId('validate'),
				kind: 'validate',
				label: 'Validate request',
				rules: [
					...required.map((name) => ({ field: ['body', name], rule: 'required' as const })),
					...emails.map((name) => ({ field: ['body', name], rule: 'email' as const })),
				],
				onInvalid: 'respond_400',
			});
		}
		return { triggers: [trigger], steps };
	},
};

export const SCHEDULED_JOB: WorkflowPattern = {
	id: 'scheduled_job',
	version: 1,
	title: 'Scheduled job',
	description: 'Runs on a cron schedule.',
	keywords: ['schedule', 'nightly', 'daily', 'hourly', 'every', 'cron', 'reconcile', 'periodic'],
	requiredOperations: [CORE_OPERATION_IDS.SCHEDULE_TRIGGER],
	inputs: [
		{
			name: 'cron',
			type: 'string',
			required: true,
			description: 'Cron expression.',
			question: 'How often should the workflow run (for example "every night at 2am")?',
		},
	],
	instantiate(inputs, context) {
		return {
			triggers: [
				{
					id: context.triggerStepId,
					kind: 'trigger',
					triggerKind: 'schedule',
					label: 'Schedule',
					operation: { operationId: CORE_OPERATION_IDS.SCHEDULE_TRIGGER },
					params: { cron: asString(inputs.cron, '0 2 * * *') },
				},
			],
			steps: [],
		};
	},
};

export const MANUAL_RUN: WorkflowPattern = {
	id: 'manual_run',
	version: 1,
	title: 'Manual run',
	description: 'Runs when a user clicks execute.',
	keywords: ['manual', 'one-off', 'once', 'test'],
	requiredOperations: [CORE_OPERATION_IDS.MANUAL_TRIGGER],
	inputs: [],
	instantiate(_inputs, context) {
		return {
			triggers: [
				{
					id: context.triggerStepId,
					kind: 'trigger',
					triggerKind: 'manual',
					label: 'Manual Trigger',
					operation: { operationId: CORE_OPERATION_IDS.MANUAL_TRIGGER },
					params: {},
				},
			],
			steps: [],
		};
	},
};

export const CRM_UPSERT_AND_NOTIFY: WorkflowPattern = {
	id: 'crm_upsert_and_notify',
	version: 1,
	title: 'CRM upsert and notify when new',
	description: 'Upserts a contact and posts to Slack only when the contact was created.',
	keywords: ['hubspot', 'crm', 'upsert', 'contact', 'notify', 'slack', 'new', 'lead', 'customer'],
	requiredOperations: ['hubspot.contact.upsert', 'slack.message.post', CORE_OPERATION_IDS.IF],
	inputs: [
		{
			name: 'emailField',
			type: 'string',
			required: true,
			description: 'Path to the email on the trigger payload.',
			default: 'body.email',
		},
		{
			name: 'slackChannel',
			type: 'string',
			required: true,
			description: 'Channel for new-contact notifications.',
			question: 'Which Slack channel should receive new-contact notifications?',
		},
		{
			name: 'notifyOnlyWhenNew',
			type: 'boolean',
			required: false,
			description: 'Notify only for created contacts.',
			default: true,
		},
	],
	instantiate(inputs, context) {
		const emailPath = asString(inputs.emailField, 'body.email').split('.');
		const upsertId = context.stepId('upsert-contact');
		const notifyId = context.stepId('notify-sales');
		const notify: StepIR = {
			id: notifyId,
			kind: 'action',
			label: 'Notify Slack',
			operation: { operationId: 'slack.message.post' },
			params: {
				channel: asString(inputs.slackChannel),
				text: expr(template('New contact: ', field(context.triggerStepId, ...emailPath))),
			},
		};
		const steps: StepIR[] = [
			{
				id: upsertId,
				kind: 'action',
				label: 'Upsert Contact',
				operation: { operationId: 'hubspot.contact.upsert' },
				params: { email: expr(field(context.triggerStepId, ...emailPath)) },
			},
		];
		if (inputs.notifyOnlyWhenNew === false) {
			steps.push(notify);
		} else {
			steps.push({
				id: context.stepId('is-new'),
				kind: 'branch',
				label: 'Is New Contact?',
				condition: { op: 'is_true', left: field(upsertId, 'isNew') },
				then: [notify],
				else: [],
			});
		}
		return { steps };
	},
};

export const AUDIT_PERSIST: WorkflowPattern = {
	id: 'audit_persist',
	version: 1,
	title: 'Persist audit record',
	description: 'Stores every incoming item in a Postgres table.',
	keywords: ['postgres', 'store', 'save', 'persist', 'audit', 'record', 'log', 'database'],
	requiredOperations: ['postgres.row.insert'],
	inputs: [
		{
			name: 'table',
			type: 'string',
			required: true,
			description: 'Target table.',
			question: 'Which Postgres table should store the records?',
		},
	],
	instantiate(inputs, context) {
		return {
			steps: [
				{
					id: context.stepId('store-audit'),
					kind: 'action',
					label: 'Store Audit Record',
					operation: { operationId: 'postgres.row.insert' },
					params: { table: asString(inputs.table) },
				},
			],
		};
	},
};

export const CONDITIONAL_NOTIFICATION: WorkflowPattern = {
	id: 'conditional_notification',
	version: 1,
	title: 'Notify Slack when a field is set',
	description: 'Posts to Slack when a field on the current item is truthy.',
	keywords: ['notify', 'slack', 'alert', 'when', 'only if', 'message'],
	requiredOperations: ['slack.message.post', CORE_OPERATION_IDS.IF],
	inputs: [
		{
			name: 'slackChannel',
			type: 'string',
			required: true,
			description: 'Channel.',
			question: 'Which Slack channel should receive the notification?',
		},
		{
			name: 'conditionField',
			type: 'string',
			required: false,
			description: 'Item field that must be truthy; omit to always notify.',
		},
		{
			name: 'text',
			type: 'string',
			required: false,
			description: 'Message text.',
			default: 'Notification from n8n',
		},
	],
	instantiate(inputs, context) {
		const notify: StepIR = {
			id: context.stepId('notify'),
			kind: 'action',
			label: 'Notify Slack',
			operation: { operationId: 'slack.message.post' },
			params: {
				channel: asString(inputs.slackChannel),
				text: asString(inputs.text, 'Notification from n8n'),
			},
		};
		const conditionField = asString(inputs.conditionField);
		if (!conditionField) return { steps: [notify] };
		return {
			steps: [
				{
					id: context.stepId('should-notify'),
					kind: 'branch',
					label: 'Should Notify?',
					condition: { op: 'is_true', left: input(...conditionField.split('.')) },
					then: [notify],
					else: [],
				},
			],
		};
	},
};

export const SUBWORKFLOW_ORCHESTRATION: WorkflowPattern = {
	id: 'subworkflow_orchestration',
	version: 1,
	title: 'Call a sub-workflow',
	description: 'Delegates work to another workflow and waits for its output.',
	keywords: [
		'sub-workflow',
		'subworkflow',
		'call workflow',
		'execute workflow',
		'delegate',
		'child',
	],
	requiredOperations: [CORE_OPERATION_IDS.EXECUTE_WORKFLOW],
	inputs: [
		{ name: 'workflowId', type: 'string', required: false, description: 'Saved workflow id.' },
		{
			name: 'workflowRef',
			type: 'string',
			required: false,
			description: 'Bundle-local workflow id.',
		},
	],
	instantiate(inputs, context) {
		return {
			steps: [
				{
					id: context.stepId('call-workflow'),
					kind: 'call_workflow',
					label: 'Call Sub-workflow',
					...(typeof inputs.workflowId === 'string' ? { workflowId: inputs.workflowId } : {}),
					...(typeof inputs.workflowRef === 'string' ? { workflowRef: inputs.workflowRef } : {}),
					inputs: {},
					wait: true,
				},
			],
		};
	},
};

export const FAN_OUT_PROCESSING: WorkflowPattern = {
	id: 'fan_out_processing',
	version: 1,
	title: 'Fan-out processing',
	description: 'Processes items in rate-limited batches through an HTTP call.',
	keywords: ['each', 'every item', 'batch', 'loop', 'fan out', 'rate limit', 'bulk'],
	requiredOperations: [CORE_OPERATION_IDS.LOOP, CORE_OPERATION_IDS.HTTP_REQUEST],
	inputs: [
		{
			name: 'url',
			type: 'string',
			required: true,
			description: 'URL called per batch.',
			question: 'Which URL should be called for each item?',
		},
		{
			name: 'batchSize',
			type: 'number',
			required: false,
			description: 'Items per batch.',
			default: 10,
		},
	],
	instantiate(inputs, context) {
		return {
			steps: [
				{
					id: context.stepId('process-batches'),
					kind: 'map',
					label: 'Loop Over Items',
					batchSize: asNumber(inputs.batchSize, 10),
					steps: [
						{
							id: context.stepId('call-api'),
							kind: 'action',
							label: 'Call API',
							operation: { operationId: CORE_OPERATION_IDS.HTTP_REQUEST },
							params: { url: asString(inputs.url), method: 'POST' },
							onError: 'retry_exponential',
							retry: { maxAttempts: 3, backoff: 'exponential', waitMs: 1000 },
						},
					],
				},
			],
		};
	},
};

export const RESPOND_WITH_RESULT: WorkflowPattern = {
	id: 'respond_with_result',
	version: 1,
	title: 'Respond with a result field',
	description: 'Returns selected fields from an earlier step as the HTTP response.',
	keywords: ['respond', 'return', 'response', 'reply with'],
	requiredOperations: [CORE_OPERATION_IDS.RESPOND],
	inputs: [
		{
			name: 'fields',
			type: 'json',
			required: false,
			description: 'Response body mapping (IR expressions).',
		},
		{
			name: 'status',
			type: 'number',
			required: false,
			description: 'HTTP status code.',
			default: 200,
		},
	],
	instantiate(inputs, context) {
		const body =
			typeof inputs.fields === 'object' && inputs.fields !== null
				? (inputs.fields as Record<string, unknown>)
				: { ok: true };
		return {
			steps: [
				{
					id: context.stepId('respond'),
					kind: 'respond',
					label: 'Respond',
					status: asNumber(inputs.status, 200),
					body,
				},
			],
		};
	},
};

export const PHASE_ONE_PATTERNS: readonly WorkflowPattern[] = [
	WEBHOOK_REQUEST_RESPONSE,
	SCHEDULED_JOB,
	MANUAL_RUN,
	CRM_UPSERT_AND_NOTIFY,
	AUDIT_PERSIST,
	CONDITIONAL_NOTIFICATION,
	SUBWORKFLOW_ORCHESTRATION,
	FAN_OUT_PROCESSING,
	RESPOND_WITH_RESULT,
];
