// Use case: security / Dashboard Data API from the data warehouse.
// Swap a tool: replace only the node marked with that family. Keep the variable name
// and the fields the next node reads.
// The dashboard calls this webhook with a header token and a query string report name,
// for example GET /webhook/dashboard-data?report=users.
import {
	workflow,
	trigger,
	node,
	placeholder,
	newCredential,
	expr,
	switchCase,
} from '@n8n/workflow-sdk';

// Starts the workflow when the dashboard calls the webhook. The header token proves the caller.
const dashboardRequest = trigger({
	type: 'n8n-nodes-base.webhook',
	version: 2.1,
	config: {
		name: 'Dashboard Request',
		credentials: { httpHeaderAuth: newCredential('Dashboard caller token') },
		parameters: {
			httpMethod: 'GET',
			path: 'dashboard-data',
			authentication: 'headerAuth',
			responseMode: 'responseNode',
		},
		output: [
			{
				headers: { 'x-dashboard-token': 'header-token-value' },
				params: {},
				query: { report: 'users' },
				body: {},
				webhookUrl: 'https://example.com/webhook/dashboard-data',
				executionMode: 'production',
			},
		],
	},
});

// Routes the request by the requested report name. Unknown names fall back to Reject Query.
const routeQuery = switchCase({
	version: 3.2,
	config: {
		name: 'Route Query',
		parameters: {
			mode: 'rules',
			rules: {
				values: [
					{
						outputKey: 'Users',
						renameOutput: true,
						conditions: {
							options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
							conditions: [
								{
									leftValue: expr('{{ $json.query.report }}'),
									operator: { type: 'string', operation: 'equals' },
									rightValue: 'users',
								},
							],
							combinator: 'and',
						},
					},
					{
						outputKey: 'Orders',
						renameOutput: true,
						conditions: {
							options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
							conditions: [
								{
									leftValue: expr('{{ $json.query.report }}'),
									operator: { type: 'string', operation: 'equals' },
									rightValue: 'orders',
								},
							],
							combinator: 'and',
						},
					},
				],
			},
			options: { fallbackOutput: 'extra', renameFallbackOutput: 'Reject' },
		},
	},
});

// [data warehouse] Google BigQuery. Swap for Snowflake or Redshift: replace this node only.
// The next node reads the returned rows.
const queryUsers = node({
	type: 'n8n-nodes-base.googleBigQuery',
	version: 2.1,
	config: {
		name: 'Query Users',
		credentials: { googleBigQueryOAuth2Api: newCredential('Google BigQuery account') },
		parameters: {
			authentication: 'oAuth2',
			resource: 'database',
			operation: 'executeQuery',
			projectId: {
				__rl: true,
				mode: 'id',
				value: placeholder('Google Cloud project ID that holds the analytics dataset'),
			},
			sqlQuery:
				'SELECT id, name, email, created_at FROM analytics.users ORDER BY created_at DESC LIMIT 100',
		},
		output: [
			{
				id: 'u-1',
				name: 'Jane Doe',
				email: 'jane@example.com',
				created_at: '2026-09-01T10:00:00.000Z',
			},
			{
				id: 'u-2',
				name: 'John Smith',
				email: 'john@example.com',
				created_at: '2026-09-02T11:00:00.000Z',
			},
		],
	},
});

// [data warehouse] Google BigQuery. Swap for Snowflake or Redshift: replace this node only.
// The next node reads the returned rows.
const queryOrders = node({
	type: 'n8n-nodes-base.googleBigQuery',
	version: 2.1,
	config: {
		name: 'Query Orders',
		credentials: { googleBigQueryOAuth2Api: newCredential('Google BigQuery account') },
		parameters: {
			authentication: 'oAuth2',
			resource: 'database',
			operation: 'executeQuery',
			projectId: {
				__rl: true,
				mode: 'id',
				value: placeholder('Google Cloud project ID that holds the analytics dataset'),
			},
			sqlQuery:
				'SELECT id, user_id, total, status, created_at FROM analytics.orders ORDER BY created_at DESC LIMIT 100',
		},
		output: [
			{
				id: 'o-1',
				user_id: 'u-1',
				total: 42.5,
				status: 'paid',
				created_at: '2026-09-01T12:00:00.000Z',
			},
			{
				id: 'o-2',
				user_id: 'u-2',
				total: 17,
				status: 'pending',
				created_at: '2026-09-02T13:00:00.000Z',
			},
		],
	},
});

// Returns the query rows to the dashboard as the webhook response.
const returnRows = node({
	type: 'n8n-nodes-base.respondToWebhook',
	version: 1.5,
	config: {
		name: 'Return Rows',
		parameters: { respondWith: 'allIncomingItems' },
	},
});

// Rejects a request for a report name that has no matching query.
const rejectQuery = node({
	type: 'n8n-nodes-base.respondToWebhook',
	version: 1.5,
	config: {
		name: 'Reject Query',
		parameters: {
			respondWith: 'json',
			responseBody: expr('{{ { "error": "Unknown report name" } }}'),
			options: { responseCode: 400 },
		},
	},
});

export default workflow('id', 'Dashboard Data API')
	.add(dashboardRequest)
	.to(routeQuery.onCase(0, queryUsers).onCase(1, queryOrders).onCase(2, rejectQuery))
	.add(queryUsers)
	.to(returnRows)
	.add(queryOrders)
	.to(returnRows);
