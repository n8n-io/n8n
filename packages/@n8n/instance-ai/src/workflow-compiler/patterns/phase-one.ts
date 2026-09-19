import { CORE_OPERATION_IDS } from '../catalog/operations';
import { kw } from '../catalog/types';
import { expr, field, input, template } from '../expressions/expression';
import type { ActionIR, BranchIR, Condition, StepIR, TriggerIR } from '../ir/schema';
import type { PatternContext, PatternInputDefinition, WorkflowPattern } from './types';

type InputExtra = Partial<Pick<PatternInputDefinition, 'question' | 'options' | 'default'>>;

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

const inputDef =
	(required: boolean) =>
	(
		name: string,
		type: PatternInputDefinition['type'],
		description: string,
		extra: InputExtra = {},
	): PatternInputDefinition => ({ name, type, required, description, ...extra });
const reqInput = inputDef(true);
const optInput = inputDef(false);
/** Builds a pattern at version 1 and splits the keyword list. */
const pattern = (
	definition: Omit<WorkflowPattern, 'version' | 'keywords'> & { keywords: string },
): WorkflowPattern => ({ version: 1, ...definition, keywords: kw(definition.keywords) });
const trigger = (
	context: PatternContext,
	triggerKind: TriggerIR['triggerKind'],
	operationId: string,
	label: string,
	params: TriggerIR['params'],
): TriggerIR => ({
	id: context.triggerStepId,
	kind: 'trigger',
	triggerKind,
	label,
	operation: { operationId },
	params,
});
const action = (
	id: string,
	label: string,
	operationId: string,
	params: ActionIR['params'],
): ActionIR => ({ id, kind: 'action', label, operation: { operationId }, params });
const branch = (id: string, label: string, condition: Condition, then: StepIR[]): BranchIR => ({
	id,
	kind: 'branch',
	label,
	condition,
	then,
	else: [],
});
const slackNotify = (id: string, channel: unknown, text: unknown) =>
	action(id, 'Notify Slack', 'slack.message.post', { channel: asString(channel), text });

/** Webhook trigger that answers from a Respond node, with optional payload validation. */
export const WEBHOOK_REQUEST_RESPONSE = pattern({
	id: 'webhook_request_response',
	title: 'Webhook request/response',
	description: 'HTTP endpoint that validates the payload and responds from the workflow.',
	keywords: 'webhook, api, endpoint, post, get, request, respond, http',
	requiredOperations: [CORE_OPERATION_IDS.WEBHOOK_TRIGGER],
	inputs: [
		reqInput('method', 'enum', 'HTTP method.', {
			options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
			question: 'Which HTTP method should the endpoint accept?',
		}),
		reqInput('path', 'string', 'Endpoint path.', {
			question: 'What path should the endpoint use?',
		}),
		optInput('requiredFields', 'string[]', 'Body fields that must be present.'),
		optInput('emailFields', 'string[]', 'Body fields that must be valid emails.'),
	],
	instantiate(inputs, context) {
		const webhook = trigger(context, 'webhook', CORE_OPERATION_IDS.WEBHOOK_TRIGGER, 'Webhook', {
			method: asString(inputs.method, 'POST'),
			path: asString(inputs.path).replace(/^\/+/, ''),
			responseMode: 'responseNode',
		});
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
		return { triggers: [webhook], steps };
	},
});

export const SCHEDULED_JOB = pattern({
	id: 'scheduled_job',
	title: 'Scheduled job',
	description: 'Runs on a cron schedule.',
	keywords: 'schedule, nightly, daily, hourly, every, cron, reconcile, periodic',
	requiredOperations: [CORE_OPERATION_IDS.SCHEDULE_TRIGGER],
	inputs: [
		reqInput('cron', 'string', 'Cron expression.', {
			question: 'How often should the workflow run (for example "every night at 2am")?',
		}),
	],
	instantiate: (inputs, context) => ({
		triggers: [
			trigger(context, 'schedule', CORE_OPERATION_IDS.SCHEDULE_TRIGGER, 'Schedule', {
				cron: asString(inputs.cron, '0 2 * * *'),
			}),
		],
		steps: [],
	}),
});

export const MANUAL_RUN = pattern({
	id: 'manual_run',
	title: 'Manual run',
	description: 'Runs when a user clicks execute.',
	keywords: 'manual, one-off, once, test',
	requiredOperations: [CORE_OPERATION_IDS.MANUAL_TRIGGER],
	inputs: [],
	instantiate: (_inputs, context) => ({
		triggers: [trigger(context, 'manual', CORE_OPERATION_IDS.MANUAL_TRIGGER, 'Manual Trigger', {})],
		steps: [],
	}),
});

export const CRM_UPSERT_AND_NOTIFY = pattern({
	id: 'crm_upsert_and_notify',
	title: 'CRM upsert and notify when new',
	description: 'Upserts a contact and posts to Slack only when the contact was created.',
	keywords: 'hubspot, crm, upsert, contact, notify, slack, new, lead, customer',
	requiredOperations: ['hubspot.contact.upsert', 'slack.message.post', CORE_OPERATION_IDS.IF],
	inputs: [
		reqInput('emailField', 'string', 'Path to the email on the trigger payload.', {
			default: 'body.email',
		}),
		reqInput('slackChannel', 'string', 'Channel for new-contact notifications.', {
			question: 'Which Slack channel should receive new-contact notifications?',
		}),
		optInput('notifyOnlyWhenNew', 'boolean', 'Notify only for created contacts.', {
			default: true,
		}),
	],
	instantiate(inputs, context) {
		const emailPath = asString(inputs.emailField, 'body.email').split('.');
		const upsertId = context.stepId('upsert-contact');
		const notifyId = context.stepId('notify-sales');
		const notify = slackNotify(
			notifyId,
			inputs.slackChannel,
			expr(template('New contact: ', field(context.triggerStepId, ...emailPath))),
		);
		const steps: StepIR[] = [
			action(upsertId, 'Upsert Contact', 'hubspot.contact.upsert', {
				email: expr(field(context.triggerStepId, ...emailPath)),
			}),
		];
		if (inputs.notifyOnlyWhenNew === false) steps.push(notify);
		else {
			const condition: Condition = { op: 'is_true', left: field(upsertId, 'isNew') };
			steps.push(branch(context.stepId('is-new'), 'Is New Contact?', condition, [notify]));
		}
		return { steps };
	},
});

export const AUDIT_PERSIST = pattern({
	id: 'audit_persist',
	title: 'Persist audit record',
	description: 'Stores every incoming item in a Postgres table.',
	keywords: 'postgres, store, save, persist, audit, record, log, database',
	requiredOperations: ['postgres.row.insert'],
	inputs: [
		reqInput('table', 'string', 'Target table.', {
			question: 'Which Postgres table should store the records?',
		}),
	],
	instantiate: (inputs, context) => ({
		steps: [
			action(context.stepId('store-audit'), 'Store Audit Record', 'postgres.row.insert', {
				table: asString(inputs.table),
			}),
		],
	}),
});

export const CONDITIONAL_NOTIFICATION = pattern({
	id: 'conditional_notification',
	title: 'Notify Slack when a field is set',
	description: 'Posts to Slack when a field on the current item is truthy.',
	keywords: 'notify, slack, alert, when, only if, message',
	requiredOperations: ['slack.message.post', CORE_OPERATION_IDS.IF],
	inputs: [
		reqInput('slackChannel', 'string', 'Channel.', {
			question: 'Which Slack channel should receive the notification?',
		}),
		optInput('conditionField', 'string', 'Item field that must be truthy; omit to always notify.'),
		optInput('text', 'string', 'Message text.', { default: 'Notification from n8n' }),
	],
	instantiate(inputs, context) {
		const text = asString(inputs.text, 'Notification from n8n');
		const notify = slackNotify(context.stepId('notify'), inputs.slackChannel, text);
		const conditionField = asString(inputs.conditionField);
		if (!conditionField) return { steps: [notify] };
		const condition: Condition = { op: 'is_true', left: input(...conditionField.split('.')) };
		return {
			steps: [branch(context.stepId('should-notify'), 'Should Notify?', condition, [notify])],
		};
	},
});

export const SUBWORKFLOW_ORCHESTRATION = pattern({
	id: 'subworkflow_orchestration',
	title: 'Call a sub-workflow',
	description: 'Delegates work to another workflow and waits for its output.',
	keywords: 'sub-workflow, subworkflow, call workflow, execute workflow, delegate, child',
	requiredOperations: [CORE_OPERATION_IDS.EXECUTE_WORKFLOW],
	inputs: [
		optInput('workflowId', 'string', 'Saved workflow id.'),
		optInput('workflowRef', 'string', 'Bundle-local workflow id.'),
	],
	instantiate: (inputs, context) => ({
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
	}),
});

export const FAN_OUT_PROCESSING = pattern({
	id: 'fan_out_processing',
	title: 'Fan-out processing',
	description: 'Processes items in rate-limited batches through an HTTP call.',
	keywords: 'each, every item, batch, loop, fan out, rate limit, bulk',
	requiredOperations: [CORE_OPERATION_IDS.LOOP, CORE_OPERATION_IDS.HTTP_REQUEST],
	inputs: [
		reqInput('url', 'string', 'URL called per batch.', {
			question: 'Which URL should be called for each item?',
		}),
		optInput('batchSize', 'number', 'Items per batch.', { default: 10 }),
	],
	instantiate: (inputs, context) => ({
		steps: [
			{
				id: context.stepId('process-batches'),
				kind: 'map',
				label: 'Loop Over Items',
				batchSize: asNumber(inputs.batchSize, 10),
				steps: [
					{
						...action(context.stepId('call-api'), 'Call API', CORE_OPERATION_IDS.HTTP_REQUEST, {
							url: asString(inputs.url),
							method: 'POST',
						}),
						onError: 'retry_exponential',
						retry: { maxAttempts: 3, backoff: 'exponential', waitMs: 1000 },
					},
				],
			},
		],
	}),
});

export const RESPOND_WITH_RESULT = pattern({
	id: 'respond_with_result',
	title: 'Respond with a result field',
	description: 'Returns selected fields from an earlier step as the HTTP response.',
	keywords: 'respond, return, response, reply with',
	requiredOperations: [CORE_OPERATION_IDS.RESPOND],
	inputs: [
		optInput('fields', 'json', 'Response body mapping (IR expressions).'),
		optInput('status', 'number', 'HTTP status code.', { default: 200 }),
	],
	instantiate(inputs, context) {
		const body =
			typeof inputs.fields === 'object' && inputs.fields !== null
				? (inputs.fields as Record<string, unknown>)
				: { ok: true };
		const status = asNumber(inputs.status, 200);
		return {
			steps: [{ id: context.stepId('respond'), kind: 'respond', label: 'Respond', status, body }],
		};
	},
});

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
