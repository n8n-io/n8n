// Use case: engineering / Status Counts into a Totals Table.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The evaluations table has one view per status (Open, Overdue, Ready to Bill). The totals
// table has one row per metric with the columns Metric and Total.
// ponytail: three views. For one more view, copy one Search node into the chain and add one
// line to the Count Records array.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Runs every hour.
const everyHour = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every Hour',
		parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
	},
});

// [spreadsheet] Tool. Swap for another spreadsheet: replace this node only. It returns the
// records of the Open view, or one empty item when the view is empty. Count Records reads
// $('Search Open').all().
const searchOpen = node({
	type: 'n8n-nodes-base.airtable',
	version: 2.2,
	config: {
		name: 'Search Open',
		credentials: { airtableTokenApi: newCredential('Airtable account') },
		executeOnce: true,
		alwaysOutputData: true,
		parameters: {
			authentication: 'airtableTokenApi',
			resource: 'record',
			operation: 'search',
			base: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable base ID, for example the Evaluations base'),
			},
			table: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable table name for the evaluations, for example Evaluations'),
			},
			options: {
				view: {
					__rl: true,
					mode: 'id',
					value: placeholder('Airtable view ID of the open evaluations, starts with viw'),
				},
			},
		},
		output: [{ id: 'recAcme0001', fields: { Name: 'Acme evaluation', Status: 'Open' } }],
	},
});

// [spreadsheet] Tool. Swap for another spreadsheet: replace this node only. It returns the
// records of the Overdue view, or one empty item when the view is empty. Count Records reads
// $('Search Overdue').all().
const searchOverdue = node({
	type: 'n8n-nodes-base.airtable',
	version: 2.2,
	config: {
		name: 'Search Overdue',
		credentials: { airtableTokenApi: newCredential('Airtable account') },
		executeOnce: true,
		alwaysOutputData: true,
		parameters: {
			authentication: 'airtableTokenApi',
			resource: 'record',
			operation: 'search',
			base: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable base ID, for example the Evaluations base'),
			},
			table: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable table name for the evaluations, for example Evaluations'),
			},
			options: {
				view: {
					__rl: true,
					mode: 'id',
					value: placeholder('Airtable view ID of the overdue evaluations, starts with viw'),
				},
			},
		},
		output: [{ id: 'recAcme0002', fields: { Name: 'Globex evaluation', Status: 'Overdue' } }],
	},
});

// [spreadsheet] Tool. Swap for another spreadsheet: replace this node only. It returns the
// records of the Ready to Bill view, or one empty item when the view is empty. Count Records
// reads $('Search Ready to Bill').all().
const searchReadyToBill = node({
	type: 'n8n-nodes-base.airtable',
	version: 2.2,
	config: {
		name: 'Search Ready to Bill',
		credentials: { airtableTokenApi: newCredential('Airtable account') },
		executeOnce: true,
		alwaysOutputData: true,
		parameters: {
			authentication: 'airtableTokenApi',
			resource: 'record',
			operation: 'search',
			base: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable base ID, for example the Evaluations base'),
			},
			table: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable table name for the evaluations, for example Evaluations'),
			},
			options: {
				view: {
					__rl: true,
					mode: 'id',
					value: placeholder('Airtable view ID of the evaluations ready to bill, starts with viw'),
				},
			},
		},
		output: [
			{ id: 'recAcme0003', fields: { Name: 'Initech evaluation', Status: 'Ready to bill' } },
		],
	},
});

// Counts the records of each view. The empty item of an empty view has no id and is not
// counted. The next node reads $json.totals.
const countRecords = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Count Records',
		executeOnce: true,
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'totals',
						value: expr(
							'{{ [{ Metric: "Open", Total: $("Search Open").all().filter(i => i.json.id).length }, { Metric: "Overdue", Total: $("Search Overdue").all().filter(i => i.json.id).length }, { Metric: "Ready to bill", Total: $("Search Ready to Bill").all().filter(i => i.json.id).length }] }}',
						),
						type: 'array',
					},
				],
			},
		},
		output: [
			{
				totals: [
					{ Metric: 'Open', Total: 12 },
					{ Metric: 'Overdue', Total: 3 },
					{ Metric: 'Ready to bill', Total: 5 },
				],
			},
		],
	},
});

// One item per metric. The next node reads $json.Metric and $json.Total.
const oneItemPerMetric = node({
	type: 'n8n-nodes-base.splitOut',
	version: 1,
	config: {
		name: 'One Item per Metric',
		parameters: { fieldToSplitOut: 'totals', include: 'noOtherFields', options: {} },
		output: [{ Metric: 'Open', Total: 12 }],
	},
});

// [spreadsheet] Tool. Swap for another spreadsheet: replace this node only. It reads
// $json.Metric and $json.Total and writes the Total of the row with that Metric.
const upsertTotal = node({
	type: 'n8n-nodes-base.airtable',
	version: 2.2,
	config: {
		name: 'Upsert Total',
		credentials: { airtableTokenApi: newCredential('Airtable account') },
		parameters: {
			authentication: 'airtableTokenApi',
			resource: 'record',
			operation: 'upsert',
			base: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable base ID, for example the Evaluations base'),
			},
			table: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable table name for the totals, for example Totals'),
			},
			columns: {
				mappingMode: 'defineBelow',
				matchingColumns: ['Metric'],
				value: {
					Metric: expr('{{ $json.Metric }}'),
					Total: expr('{{ $json.Total }}'),
				},
				schema: [
					{
						id: 'Metric',
						displayName: 'Metric',
						required: false,
						defaultMatch: false,
						display: true,
						canBeUsedToMatch: true,
						type: 'string',
					},
					{
						id: 'Total',
						displayName: 'Total',
						required: false,
						defaultMatch: false,
						display: true,
						canBeUsedToMatch: true,
						type: 'number',
					},
				],
			},
			options: {},
		},
	},
});

export default workflow('id', 'Status Counts into a Totals Table')
	.add(everyHour)
	.to(searchOpen)
	.to(searchOverdue)
	.to(searchReadyToBill)
	.to(countRecords)
	.to(oneItemPerMetric)
	.to(upsertTotal);
