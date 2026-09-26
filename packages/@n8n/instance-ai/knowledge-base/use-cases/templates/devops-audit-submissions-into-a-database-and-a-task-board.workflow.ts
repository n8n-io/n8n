// Use case: devops / Audit Submissions into a Database and a Task Board.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The audit app posts { type, title, location, findings, submitted_by }. type is "walk" or "audit".
// The table audit_submissions has the columns source, kind, payload (jsonb) and received_at.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	switchCase,
} from '@n8n/workflow-sdk';

// Receives one submission per request.
const auditSubmission = trigger({
	type: 'n8n-nodes-base.webhook',
	version: 2.1,
	config: {
		name: 'Audit Submission',
		parameters: { httpMethod: 'POST', path: 'audit', options: {} },
		output: [
			{
				headers: {},
				params: {},
				query: { source: 'audit-app' },
				body: {
					type: 'walk',
					title: 'Lobby walk, Building A',
					location: 'Building A',
					findings: [{ item: 'Exit sign light off', severity: 'high' }],
					submitted_by: 'jane@example.com',
				},
			},
		],
	},
});

// [database] Tool. Swap for another database: replace this node only. It stores the raw
// submission. The next node reads $json.kind from the inserted row.
const storeSubmission = node({
	type: 'n8n-nodes-base.postgres',
	version: 2.7,
	config: {
		name: 'Store Submission',
		credentials: { postgres: newCredential('Postgres account') },
		parameters: {
			operation: 'insert',
			schema: { __rl: true, mode: 'list', value: 'public' },
			table: { __rl: true, mode: 'name', value: 'audit_submissions' },
			columns: {
				mappingMode: 'defineBelow',
				value: {
					source: expr('{{ $json.query.source || "unknown" }}'),
					kind: expr('{{ $json.body.type }}'),
					payload: expr('{{ JSON.stringify($json.body) }}'),
					received_at: expr('{{ $now.toISO() }}'),
				},
				matchingColumns: [],
				schema: [
					{
						id: 'source',
						displayName: 'source',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
						canBeUsedToMatch: false,
					},
					{
						id: 'kind',
						displayName: 'kind',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
						canBeUsedToMatch: false,
					},
					{
						id: 'payload',
						displayName: 'payload',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'object',
						canBeUsedToMatch: false,
					},
					{
						id: 'received_at',
						displayName: 'received_at',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'dateTime',
						canBeUsedToMatch: false,
					},
				],
			},
			options: {},
		},
		output: [
			{
				id: 501,
				source: 'audit-app',
				kind: 'walk',
				payload: {},
				received_at: '2026-09-17T10:15:00.000Z',
			},
		],
	},
});

// Routes the submission by type. Output 0 is a walk, output 1 is an audit.
const routeByType = switchCase({
	version: 3.2,
	config: {
		name: 'Route by Type',
		parameters: {
			mode: 'rules',
			rules: {
				values: [
					{
						outputKey: 'Walk',
						renameOutput: true,
						conditions: {
							options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
							conditions: [
								{
									leftValue: expr('{{ $json.kind }}'),
									operator: { type: 'string', operation: 'equals' },
									rightValue: 'walk',
								},
							],
							combinator: 'and',
						},
					},
					{
						outputKey: 'Audit',
						renameOutput: true,
						conditions: {
							options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
							conditions: [
								{
									leftValue: expr('{{ $json.kind }}'),
									operator: { type: 'string', operation: 'equals' },
									rightValue: 'audit',
								},
							],
							combinator: 'and',
						},
					},
				],
			},
			options: {},
		},
	},
});

// [task manager] Tool. Swap for another task manager: replace this node only. It reads the
// submission from Audit Submission. Column ids follow the board; text is the first text column.
const createWalkItem = node({
	type: 'n8n-nodes-base.mondayCom',
	version: 1,
	config: {
		name: 'Create Walk Item',
		credentials: { mondayComApi: newCredential('Monday.com account') },
		parameters: {
			authentication: 'accessToken',
			resource: 'boardItem',
			operation: 'create',
			boardId: placeholder('Monday.com board ID of the walks board'),
			groupId: placeholder('Group ID inside the board, for example topics'),
			name: expr("{{ $('Audit Submission').item.json.body.title }}"),
			additionalFields: {
				columnValues: expr(
					"{{ JSON.stringify({ text: $('Audit Submission').item.json.body.location }) }}",
				),
			},
		},
	},
});

// [task manager] Tool. Swap for another task manager: replace this node only. Same fields as
// Create Walk Item, in the audits board.
const createAuditItem = node({
	type: 'n8n-nodes-base.mondayCom',
	version: 1,
	config: {
		name: 'Create Audit Item',
		credentials: { mondayComApi: newCredential('Monday.com account') },
		parameters: {
			authentication: 'accessToken',
			resource: 'boardItem',
			operation: 'create',
			boardId: placeholder('Monday.com board ID of the audits board'),
			groupId: placeholder('Group ID inside the board, for example topics'),
			name: expr("{{ $('Audit Submission').item.json.body.title }}"),
			additionalFields: {
				columnValues: expr(
					"{{ JSON.stringify({ text: $('Audit Submission').item.json.body.location }) }}",
				),
			},
		},
	},
});

export default workflow('id', 'Audit Submissions into a Database and a Task Board')
	.add(auditSubmission)
	.to(storeSubmission)
	.to(routeByType.onCase(0, createWalkItem).onCase(1, createAuditItem));
