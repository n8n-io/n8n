// ---------------------------------------------------------------------------
// Graded eval cases for simulation-fixture generation (INS-668)
//
// Each case is a minimal workflow with one or more `simulate`-verdict nodes.
// The grader (see runner.ts) calls the real fixture generator and checks that
// every simulated node gets NON-EMPTY, schema-appropriate mock output — never
// the `{}` placeholder the fallback produces.
//
// Node types are chosen to stress the failure modes: thin-output operations
// (deletes), no-obvious-shape nodes, and multi-node batches that tempt the
// model to omit entries.
// ---------------------------------------------------------------------------

import type { IConnections } from 'n8n-workflow';

export interface SimulatedNodeSpec {
	name: string;
	type: string;
	parameters?: Record<string, unknown>;
}

export interface FixtureCase {
	/** Stable id for filtering / reporting. */
	id: string;
	description: string;
	nodes: SimulatedNodeSpec[];
	connections?: IConnections;
	/** Node names to mark `simulate`; the rest are `execute`. */
	simulate: string[];
	/**
	 * Per simulated node: at least one of these keys (case-insensitive) must
	 * appear in the generated item for it to count as schema-appropriate.
	 */
	expectedKeys: Record<string, string[]>;
}

const chain = (...names: string[]): IConnections =>
	Object.fromEntries(
		names
			.slice(0, -1)
			.map((from, i) => [from, { main: [[{ node: names[i + 1], type: 'main', index: 0 }]] }]),
	);

export const FIXTURE_CASES: FixtureCase[] = [
	{
		id: 'slack-post',
		description: 'Slack post message returns the delivered message envelope',
		nodes: [
			{
				name: 'Send Slack',
				type: 'n8n-nodes-base.slack',
				parameters: {
					resource: 'message',
					operation: 'post',
					channelId: 'C0ALERTS',
					text: 'Deploy finished',
				},
			},
		],
		simulate: ['Send Slack'],
		expectedKeys: { 'Send Slack': ['ts', 'channel', 'ok', 'message'] },
	},
	{
		id: 'gmail-send',
		description: 'Gmail send returns the created message id',
		nodes: [
			{
				name: 'Send Email',
				type: 'n8n-nodes-base.gmail',
				parameters: {
					resource: 'message',
					operation: 'send',
					to: 'user@example.com',
					subject: 'Receipt',
				},
			},
		],
		simulate: ['Send Email'],
		expectedKeys: { 'Send Email': ['id', 'threadId', 'messageId', 'labelIds'] },
	},
	{
		id: 'sheets-append',
		description: 'Google Sheets append echoes the appended row columns',
		nodes: [
			{
				name: 'Append Row',
				type: 'n8n-nodes-base.googleSheets',
				parameters: {
					resource: 'sheet',
					operation: 'append',
					columns: { value: { Name: 'Ada Lovelace', Email: 'ada@example.com', Status: 'active' } },
				},
			},
		],
		simulate: ['Append Row'],
		// Either the echoed row columns or the Sheets append update metadata is acceptable.
		expectedKeys: {
			'Append Row': [
				'Name',
				'Email',
				'Status',
				'row',
				'updatedRange',
				'updatedCells',
				'spreadsheetId',
			],
		},
	},
	{
		id: 'postgres-insert',
		description: 'Postgres insert returns the new row including its id',
		nodes: [
			{
				name: 'Insert Order',
				type: 'n8n-nodes-base.postgres',
				parameters: { operation: 'insert', table: 'orders', columns: 'customer,amount' },
			},
		],
		simulate: ['Insert Order'],
		expectedKeys: { 'Insert Order': ['id', 'customer', 'amount'] },
	},
	{
		id: 'http-post',
		description: 'HTTP POST to an API returns a plausible JSON body',
		nodes: [
			{
				name: 'Create Ticket',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { method: 'POST', url: 'https://api.example.com/tickets', sendBody: true },
			},
		],
		simulate: ['Create Ticket'],
		expectedKeys: { 'Create Ticket': ['id', 'status', 'url', 'createdAt', 'data'] },
	},
	{
		id: 'http-delete',
		description: 'A delete operation still emits a non-empty status (thin-output stress)',
		nodes: [
			{
				name: 'Delete Record',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { method: 'DELETE', url: 'https://api.example.com/records/42' },
			},
		],
		simulate: ['Delete Record'],
		expectedKeys: {
			'Delete Record': ['id', 'success', 'deleted', 'status', 'statusCode', 'statusMessage'],
		},
	},
	{
		id: 'form-submit',
		description: 'Mid-workflow Form emits the submitted field values',
		nodes: [
			{
				name: 'Collect Details',
				type: 'n8n-nodes-base.form',
				parameters: {
					formFields: {
						values: [
							{ fieldLabel: 'fullName', fieldType: 'text' },
							{ fieldLabel: 'email', fieldType: 'email' },
						],
					},
				},
			},
		],
		simulate: ['Collect Details'],
		expectedKeys: { 'Collect Details': ['fullName', 'email', 'submittedAt'] },
	},
	{
		id: 'multi-node-batch',
		description: 'Two simulated nodes in one batch — neither may be omitted',
		nodes: [
			{
				name: 'Create Contact',
				type: 'n8n-nodes-base.hubspot',
				parameters: { resource: 'contact', operation: 'create', email: 'lead@example.com' },
			},
			{
				name: 'Notify Channel',
				type: 'n8n-nodes-base.slack',
				parameters: {
					resource: 'message',
					operation: 'post',
					channelId: 'C0SALES',
					text: 'New lead',
				},
			},
		],
		connections: chain('Create Contact', 'Notify Channel'),
		simulate: ['Create Contact', 'Notify Channel'],
		expectedKeys: {
			'Create Contact': ['id', 'vid', 'email', 'properties'],
			'Notify Channel': ['ts', 'channel', 'ok', 'message'],
		},
	},
];
