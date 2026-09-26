// Use case: other / Accounting Expenses into a Database.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Database table, run once:
//   CREATE TABLE accounting_expenses (id serial PRIMARY KEY, external_id text, kind text,
//     vendor text, amount numeric, txn_date date, updated_at timestamptz,
//     UNIQUE (external_id, kind));
import { workflow, node, trigger, newCredential, merge, expr } from '@n8n/workflow-sdk';

const schedule = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every 2 Hours',
		parameters: {
			rule: {
				interval: [{ field: 'hours', hoursInterval: 2 }],
			},
		},
	},
});

// [accounting] QuickBooks. Swap for Xero, FreshBooks or Wave: replace this node and the
// next one. The window is wider than the schedule so a slow run never misses a row.
const getPurchases = node({
	type: 'n8n-nodes-base.quickbooks',
	version: 1,
	config: {
		name: 'Get Purchases',
		credentials: { quickBooksOAuth2Api: newCredential('QuickBooks account') },
		parameters: {
			resource: 'purchase',
			operation: 'getAll',
			returnAll: true,
			filters: {
				query: expr("WHERE MetaData.LastUpdatedTime > '{{ $now.minus({ hours: 2 }).toISO() }}'"),
			},
		},
		output: [
			{
				Id: '801',
				SyncToken: '0',
				TxnDate: '2026-09-15',
				TotalAmt: 42.5,
				EntityRef: { name: 'Acme Office Supplies', value: '55' },
				MetaData: { LastUpdatedTime: '2026-09-15T09:00:00.000Z' },
			},
		],
	},
});

// Maps a purchase to one expense row.
const purchaseRow = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Purchase Row',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{ id: 'a1', name: 'external_id', value: expr('{{ $json.Id }}'), type: 'string' },
					{ id: 'a2', name: 'kind', value: 'purchase', type: 'string' },
					{
						id: 'a3',
						name: 'vendor',
						value: expr('{{ ($json.EntityRef || {}).name || "" }}'),
						type: 'string',
					},
					{ id: 'a4', name: 'amount', value: expr('{{ $json.TotalAmt }}'), type: 'number' },
					{ id: 'a5', name: 'txn_date', value: expr('{{ $json.TxnDate }}'), type: 'string' },
					{
						id: 'a6',
						name: 'updated_at',
						value: expr('{{ $json.MetaData.LastUpdatedTime }}'),
						type: 'string',
					},
				],
			},
		},
	},
});

// QuickBooks: bills updated since the same cutoff.
const getBills = node({
	type: 'n8n-nodes-base.quickbooks',
	version: 1,
	config: {
		name: 'Get Bills',
		credentials: { quickBooksOAuth2Api: newCredential('QuickBooks account') },
		parameters: {
			resource: 'bill',
			operation: 'getAll',
			returnAll: true,
			filters: {
				query: expr("WHERE MetaData.LastUpdatedTime > '{{ $now.minus({ hours: 2 }).toISO() }}'"),
			},
		},
		output: [
			{
				Id: '9001',
				SyncToken: '1',
				TxnDate: '2026-09-15',
				TotalAmt: 310,
				VendorRef: { name: 'Acme Cloud Hosting', value: '77' },
				MetaData: { LastUpdatedTime: '2026-09-15T09:30:00.000Z' },
			},
		],
	},
});

// Maps a bill to one expense row, same shape as Purchase Row.
const billRow = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Bill Row',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{ id: 'a1', name: 'external_id', value: expr('{{ $json.Id }}'), type: 'string' },
					{ id: 'a2', name: 'kind', value: 'bill', type: 'string' },
					{
						id: 'a3',
						name: 'vendor',
						value: expr('{{ ($json.VendorRef || {}).name || "" }}'),
						type: 'string',
					},
					{ id: 'a4', name: 'amount', value: expr('{{ $json.TotalAmt }}'), type: 'number' },
					{ id: 'a5', name: 'txn_date', value: expr('{{ $json.TxnDate }}'), type: 'string' },
					{
						id: 'a6',
						name: 'updated_at',
						value: expr('{{ $json.MetaData.LastUpdatedTime }}'),
						type: 'string',
					},
				],
			},
		},
	},
});

// Combines the purchase rows and the bill rows into one list.
const allExpenses = merge({
	version: 3.2,
	config: { name: 'All Expenses', parameters: { mode: 'append' } },
});

// [database] Postgres. Swap for MySQL, Supabase or MongoDB: replace this node only. It reads
// $json.external_id, $json.kind, $json.vendor, $json.amount, $json.txn_date and
// $json.updated_at.
const upsertExpenses = node({
	type: 'n8n-nodes-base.postgres',
	version: 2.7,
	config: {
		name: 'Upsert Expenses',
		credentials: { postgres: newCredential('Postgres account') },
		parameters: {
			operation: 'executeQuery',
			query: `INSERT INTO accounting_expenses (external_id, kind, vendor, amount, txn_date, updated_at)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (external_id, kind) DO UPDATE SET
  vendor = EXCLUDED.vendor,
  amount = EXCLUDED.amount,
  txn_date = EXCLUDED.txn_date,
  updated_at = EXCLUDED.updated_at`,
			options: {
				queryReplacement: expr(
					'{{ $json.external_id }},{{ $json.kind }},{{ $json.vendor }},{{ $json.amount }},{{ $json.txn_date }},{{ $json.updated_at }}',
				),
			},
		},
	},
});

export default workflow('id', 'Accounting Expenses into a Database')
	.add(schedule)
	.to(getPurchases)
	.to(purchaseRow)
	.to(allExpenses.input(0))
	.add(schedule)
	.to(getBills)
	.to(billRow)
	.to(allExpenses.input(1))
	.add(allExpenses)
	.to(upsertExpenses);
