import type { NodeOperation, ParameterDefinition } from './types';

/**
 * Phase-1 operation index. Every entry is reviewed: the node version, the
 * discriminators and the parameter paths are what the compiler emits. Extend
 * this list (or generate it from node descriptions) to widen the catalog.
 */

type Defaulted = 'kind' | 'credentials' | `${'base' | 'required' | 'optional'}Parameters`;
type OperationInput = Omit<NodeOperation, Defaulted | 'keywords'> &
	Partial<Pick<NodeOperation, Defaulted>> & { keywords: string };
type ParameterExtra = Partial<
	Pick<ParameterDefinition, 'options' | 'locatorMode' | 'question' | 'derivable'>
>;
/** Splits a comma-separated keyword list. Keywords may contain spaces. */
const kw = (list: string): string[] => list.split(',').map((keyword) => keyword.trim());
const param =
	(required: boolean) =>
	(
		name: string,
		path: string,
		type: ParameterDefinition['type'],
		description: string,
		extra: ParameterExtra = {},
	): ParameterDefinition => ({ name, path, type, required, description, ...extra });
const req = param(true);
const opt = param(false);
const cred = (type: string) => [{ type, required: true }];
/** Builds an operation. Fills the action defaults and splits the keyword list. */
const op = (input: OperationInput): NodeOperation => ({
	kind: 'action',
	baseParameters: {},
	requiredParameters: [],
	optionalParameters: [],
	credentials: [],
	...input,
	keywords: kw(input.keywords),
});

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const pgBase = (operation: string) => ({
	operation,
	schema: { __rl: true, mode: 'list', value: 'public' },
	options: {},
});
const pgTable = (description: string, question: string) =>
	req('table', 'table', 'resource_locator', description, { locatorMode: 'name', question });
const slackChannel = (description: string, question: string) =>
	req('channel', 'channelId', 'resource_locator', description, { locatorMode: 'name', question });
const hubspotBase = (operation: string, fields: Record<string, unknown>) => ({
	resource: 'contact',
	operation,
	authentication: 'appToken',
	...fields,
});
const hubspotContactId = (question: string) =>
	req('contactId', 'contactId', 'string', 'Contact id.', { question });

/** Operation ids the compiler relies on for control flow and pattern expansion. */
export const CORE_OPERATION_IDS = {
	WEBHOOK_TRIGGER: 'webhook.trigger',
	SCHEDULE_TRIGGER: 'schedule.trigger',
	MANUAL_TRIGGER: 'manual.trigger',
	HTTP_REQUEST: 'http.request',
	IF: 'control.if',
	SWITCH: 'control.switch',
	SET: 'transform.set',
	CODE: 'transform.code',
	RESPOND: 'webhook.respond',
	EXECUTE_WORKFLOW: 'workflow.execute',
	MERGE: 'control.merge',
	LOOP: 'control.loop',
	NOOP: 'control.noop',
} as const;

const HUBSPOT_UPSERT_CONTACT = op({
	id: 'hubspot.contact.upsert',
	label: 'Upsert Contact',
	nodeType: 'n8n-nodes-base.hubspot',
	version: 2.1,
	integration: 'hubspot',
	resource: 'contact',
	operation: 'upsert',
	title: 'HubSpot: create or update contact',
	description: 'Creates the contact by email or updates it when it exists.',
	keywords: 'hubspot, crm, contact, upsert, create or update, add, lead, customer, sync',
	baseParameters: hubspotBase('upsert', { additionalFields: {}, options: {} }),
	requiredParameters: [req('email', 'email', 'string', 'Contact email.', { derivable: true })],
	optionalParameters: [
		opt('additionalFields', 'additionalFields', 'json', 'Extra contact properties.'),
	],
	credentials: cred('hubspotAppToken'),
	outputContract: {
		cardinality: 'one',
		fields: [
			{ name: 'vid', type: 'number', nullable: false },
			{ name: 'isNew', type: 'boolean', nullable: false },
		],
	},
});

export const PHASE_ONE_OPERATIONS: readonly NodeOperation[] = [
	op({
		id: CORE_OPERATION_IDS.WEBHOOK_TRIGGER,
		nodeType: 'n8n-nodes-base.webhook',
		version: 2.1,
		integration: 'webhook',
		kind: 'trigger',
		title: 'Webhook',
		description: 'Starts the workflow when an HTTP request reaches a path.',
		keywords: 'webhook, http, endpoint, api, post, get, request, rest, receive',
		baseParameters: { options: {} },
		requiredParameters: [
			req('method', 'httpMethod', 'enum', 'HTTP method the endpoint accepts.', {
				options: HTTP_METHODS,
				question: 'Which HTTP method should the endpoint accept?',
			}),
			req('path', 'path', 'string', 'Path segment of the endpoint URL.', {
				question: 'What path should the endpoint use?',
			}),
		],
		optionalParameters: [
			opt('responseMode', 'responseMode', 'enum', 'When the HTTP response is sent.', {
				options: ['onReceived', 'lastNode', 'responseNode'],
			}),
		],
		outputContract: {
			cardinality: 'one',
			fields: [
				{ name: 'body', type: 'object', nullable: false },
				{ name: 'headers', type: 'object', nullable: false },
				{ name: 'query', type: 'object', nullable: false },
			],
		},
	}),
	op({
		id: CORE_OPERATION_IDS.SCHEDULE_TRIGGER,
		nodeType: 'n8n-nodes-base.scheduleTrigger',
		version: 1.2,
		integration: 'schedule',
		kind: 'trigger',
		title: 'Schedule',
		description: 'Starts the workflow on a fixed interval or cron expression.',
		keywords:
			'schedule, cron, every, daily, nightly, hourly, weekly, interval, timer, periodic, reconcile',
		requiredParameters: [
			req('cron', 'rule', 'json', 'Cron expression compiled into the schedule rule.', {
				question: 'How often should the workflow run?',
			}),
		],
		outputContract: {
			cardinality: 'one',
			fields: [{ name: 'timestamp', type: 'string', nullable: false }],
		},
	}),
	op({
		id: CORE_OPERATION_IDS.MANUAL_TRIGGER,
		nodeType: 'n8n-nodes-base.manualTrigger',
		version: 1,
		integration: 'manual',
		kind: 'trigger',
		title: 'Manual trigger',
		description: 'Starts the workflow when a user runs it in the editor.',
		keywords: 'manual, click, test, run, button, one-off, once',
		outputContract: { cardinality: 'one', fields: [] },
	}),
	op({
		id: CORE_OPERATION_IDS.HTTP_REQUEST,
		label: 'HTTP Request',
		nodeType: 'n8n-nodes-base.httpRequest',
		version: 4.2,
		integration: 'http',
		title: 'HTTP Request',
		description: 'Calls an HTTP API.',
		keywords: 'http, api, call, fetch, rest, request, enrich, lookup, external',
		baseParameters: { options: {} },
		requiredParameters: [
			req('url', 'url', 'string', 'URL to call.', {
				question: 'Which URL should the request call?',
			}),
		],
		optionalParameters: [
			opt('method', 'method', 'enum', 'HTTP method.', { options: HTTP_METHODS }),
			opt('body', 'jsonBody', 'json', 'JSON body.'),
		],
		outputContract: { cardinality: 'many', fields: [] },
		rateLimit: { requestsPerSecond: 5 },
	}),
	op({
		id: CORE_OPERATION_IDS.IF,
		nodeType: 'n8n-nodes-base.if',
		version: 2.2,
		integration: 'control',
		kind: 'control',
		title: 'If',
		description: 'Routes items to the true or false output.',
		keywords: 'if, condition, branch, only when, check',
		requiredParameters: [
			req('conditions', 'conditions', 'json', 'Filter conditions.', { derivable: true }),
		],
		outputs: ['true', 'false'],
	}),
	op({
		id: CORE_OPERATION_IDS.SWITCH,
		nodeType: 'n8n-nodes-base.switch',
		version: 3.2,
		integration: 'control',
		kind: 'control',
		title: 'Switch',
		description: 'Routes items to one of several outputs by value.',
		keywords: 'switch, route, case, depending on, by type',
		requiredParameters: [req('rules', 'rules', 'json', 'Routing rules.', { derivable: true })],
	}),
	op({
		id: CORE_OPERATION_IDS.SET,
		nodeType: 'n8n-nodes-base.set',
		version: 3.4,
		integration: 'transform',
		title: 'Edit Fields',
		description: 'Sets or renames fields on each item.',
		keywords: 'set, edit fields, map, rename, transform, format, normalize, shape',
		baseParameters: { mode: 'manual', options: {} },
		requiredParameters: [
			req('assignments', 'assignments', 'json', 'Field assignments.', { derivable: true }),
		],
		optionalParameters: [
			opt('includeOtherFields', 'includeOtherFields', 'boolean', 'Keep incoming fields.'),
		],
	}),
	op({
		id: CORE_OPERATION_IDS.CODE,
		nodeType: 'n8n-nodes-base.code',
		version: 2,
		integration: 'transform',
		title: 'Code',
		description: 'Runs custom JavaScript or Python.',
		keywords: 'code, script, javascript, python, custom logic, compute',
		requiredParameters: [req('source', 'jsCode', 'string', 'Source code.', { derivable: true })],
	}),
	op({
		id: CORE_OPERATION_IDS.RESPOND,
		nodeType: 'n8n-nodes-base.respondToWebhook',
		version: 1.1,
		integration: 'webhook',
		kind: 'respond',
		title: 'Respond to Webhook',
		description: 'Sends the HTTP response for the webhook that started the workflow.',
		keywords: 'respond, response, reply, return, status code, json',
		baseParameters: { respondWith: 'json' },
		requiredParameters: [
			req('body', 'responseBody', 'json', 'Response body.', { derivable: true }),
		],
		optionalParameters: [opt('status', 'options.responseCode', 'number', 'HTTP status code.')],
	}),
	op({
		id: CORE_OPERATION_IDS.EXECUTE_WORKFLOW,
		nodeType: 'n8n-nodes-base.executeWorkflow',
		version: 1.2,
		integration: 'workflow',
		title: 'Execute Workflow',
		description: 'Calls another workflow and waits for its result.',
		keywords:
			'execute workflow, sub-workflow, subworkflow, call workflow, child workflow, delegate',
		baseParameters: { source: 'database', options: {} },
		requiredParameters: [
			req('workflowId', 'workflowId', 'resource_locator', 'Workflow to call.', {
				locatorMode: 'id',
				question: 'Which workflow should be called?',
			}),
		],
		optionalParameters: [opt('inputs', 'workflowInputs', 'json', 'Input mapping.')],
	}),
	op({
		id: CORE_OPERATION_IDS.MERGE,
		nodeType: 'n8n-nodes-base.merge',
		version: 3,
		integration: 'control',
		kind: 'control',
		title: 'Merge',
		description: 'Waits for several branches and combines their items.',
		keywords: 'merge, join, combine, wait for both',
		baseParameters: { mode: 'append', numberInputs: 2 },
	}),
	op({
		id: CORE_OPERATION_IDS.LOOP,
		nodeType: 'n8n-nodes-base.splitInBatches',
		version: 3,
		integration: 'control',
		kind: 'control',
		title: 'Loop Over Items',
		description: 'Processes items in batches.',
		keywords: 'loop, batch, each, for every, iterate, fan out, rate limit',
		baseParameters: { options: {} },
		requiredParameters: [
			req('batchSize', 'batchSize', 'number', 'Items per batch.', { derivable: true }),
		],
		outputs: ['done', 'loop'],
	}),
	op({
		id: CORE_OPERATION_IDS.NOOP,
		nodeType: 'n8n-nodes-base.noOp',
		version: 1,
		integration: 'control',
		kind: 'control',
		title: 'No Operation',
		description: 'Passes items through unchanged.',
		keywords: 'noop, nothing, pass through',
	}),
	op({
		id: 'slack.message.post',
		label: 'Send Slack Message',
		nodeType: 'n8n-nodes-base.slack',
		version: 2.2,
		integration: 'slack',
		resource: 'message',
		operation: 'post',
		title: 'Slack: post channel message',
		description: 'Posts a message to a Slack channel.',
		keywords: 'slack, message, notify, notification, post, channel, alert, tell, ping, team',
		baseParameters: { resource: 'message', operation: 'post', select: 'channel', otherOptions: {} },
		requiredParameters: [
			slackChannel(
				'Channel name such as #sales.',
				'Which Slack channel should receive the message?',
			),
			req('text', 'text', 'string', 'Message text.', { derivable: true }),
		],
		credentials: cred('slackApi'),
		rateLimit: { requestsPerSecond: 1 },
	}),
	op({
		id: 'slack.message.reply',
		label: 'Reply In Thread',
		nodeType: 'n8n-nodes-base.slack',
		version: 2.2,
		integration: 'slack',
		resource: 'message',
		operation: 'post',
		title: 'Slack: reply in thread',
		description: 'Posts a reply into an existing Slack thread.',
		keywords: 'slack, reply, thread, respond in thread',
		baseParameters: { resource: 'message', operation: 'post', select: 'channel' },
		requiredParameters: [
			slackChannel('Channel name.', 'Which Slack channel holds the thread?'),
			req('text', 'text', 'string', 'Reply text.', { derivable: true }),
			req(
				'threadTs',
				'otherOptions.thread_ts.replyValues.thread_ts',
				'string',
				'Timestamp of the parent message.',
				{
					question: 'Which message timestamp (thread_ts) should the reply go to?',
				},
			),
		],
		credentials: cred('slackApi'),
	}),
	op({
		id: 'slack.message.update',
		label: 'Update Slack Message',
		nodeType: 'n8n-nodes-base.slack',
		version: 2.2,
		integration: 'slack',
		resource: 'message',
		operation: 'update',
		title: 'Slack: update message',
		description: 'Edits an existing Slack message.',
		keywords: 'slack, update message, edit message',
		baseParameters: { resource: 'message', operation: 'update' },
		requiredParameters: [
			req('channel', 'channelId', 'resource_locator', 'Channel name.', { locatorMode: 'name' }),
			req('ts', 'ts', 'string', 'Timestamp of the message.', {
				question: 'Which message timestamp (ts) should be updated?',
			}),
			req('text', 'text', 'string', 'New text.', { derivable: true }),
		],
		credentials: cred('slackApi'),
	}),
	op({
		id: 'postgres.row.insert',
		label: 'Insert Row',
		nodeType: 'n8n-nodes-base.postgres',
		version: 2.5,
		integration: 'postgres',
		resource: 'database',
		operation: 'insert',
		title: 'Postgres: insert row',
		description: 'Inserts each item as a row.',
		keywords:
			'postgres, postgresql, database, insert, store, save, persist, audit, record, log, sql',
		baseParameters: pgBase('insert'),
		requiredParameters: [pgTable('Target table.', 'Which Postgres table should receive the rows?')],
		optionalParameters: [
			opt('columns', 'columns', 'json', 'Column mapping; defaults to auto-map input fields.'),
		],
		credentials: cred('postgres'),
	}),
	op({
		id: 'postgres.row.upsert',
		label: 'Upsert Row',
		nodeType: 'n8n-nodes-base.postgres',
		version: 2.5,
		integration: 'postgres',
		resource: 'database',
		operation: 'upsert',
		title: 'Postgres: upsert row',
		description: 'Inserts or updates a row by a unique column.',
		keywords: 'postgres, upsert, insert or update, database',
		baseParameters: pgBase('upsert'),
		requiredParameters: [pgTable('Target table.', 'Which Postgres table should be upserted?')],
		optionalParameters: [opt('columns', 'columns', 'json', 'Column mapping.')],
		credentials: cred('postgres'),
	}),
	op({
		id: 'postgres.row.select',
		label: 'Select Rows',
		nodeType: 'n8n-nodes-base.postgres',
		version: 2.5,
		integration: 'postgres',
		resource: 'database',
		operation: 'select',
		title: 'Postgres: select rows',
		description: 'Reads rows from a table.',
		keywords:
			'postgres, select, read, query, find, lookup, look up, rows, row, database, stuck, stalled',
		baseParameters: pgBase('select'),
		requiredParameters: [pgTable('Table to read.', 'Which Postgres table should be read?')],
		credentials: cred('postgres'),
		outputContract: { cardinality: 'many', fields: [] },
	}),
	op({
		id: 'postgres.query.execute',
		label: 'Run SQL Query',
		nodeType: 'n8n-nodes-base.postgres',
		version: 2.5,
		integration: 'postgres',
		resource: 'database',
		operation: 'executeQuery',
		title: 'Postgres: execute query',
		description: 'Runs a SQL statement.',
		keywords: 'postgres, sql, query, execute, statement',
		baseParameters: { operation: 'executeQuery', options: {} },
		requiredParameters: [
			req('query', 'query', 'string', 'SQL statement.', {
				question: 'Which SQL statement should run?',
			}),
		],
		credentials: cred('postgres'),
	}),
	HUBSPOT_UPSERT_CONTACT,
	{
		...HUBSPOT_UPSERT_CONTACT,
		id: 'hubspot.contact.create',
		label: 'Create Contact',
		operation: 'create',
		title: 'HubSpot: create contact',
		description: 'Creates a new contact.',
		keywords: kw('hubspot, crm, contact, create, new'),
		baseParameters: hubspotBase('create', { additionalFields: {}, options: {} }),
	},
	{
		...HUBSPOT_UPSERT_CONTACT,
		id: 'hubspot.contact.update',
		label: 'Update Contact',
		operation: 'update',
		title: 'HubSpot: update contact',
		description: 'Updates an existing contact by id.',
		keywords: kw('hubspot, crm, contact, update, change'),
		baseParameters: hubspotBase('update', { updateFields: {} }),
		requiredParameters: [hubspotContactId('Which HubSpot contact should be updated?')],
		optionalParameters: [],
	},
	{
		...HUBSPOT_UPSERT_CONTACT,
		id: 'hubspot.contact.get',
		label: 'Get Contact',
		operation: 'get',
		title: 'HubSpot: get contact',
		description: 'Reads one contact by id.',
		keywords: kw('hubspot, crm, contact, get, read, fetch, lookup'),
		baseParameters: hubspotBase('get', { additionalFields: {} }),
		requiredParameters: [hubspotContactId('Which HubSpot contact id should be read?')],
		optionalParameters: [],
	},
];
