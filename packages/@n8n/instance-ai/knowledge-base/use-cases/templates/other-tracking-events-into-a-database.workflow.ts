// Use case: other / Tracking Events into a Database and an Analytics Tool.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Database table, run once:
//   CREATE TABLE tracking_events (id serial PRIMARY KEY, event text, user_id text,
//     properties jsonb, occurred_at timestamptz, created_at timestamptz DEFAULT now());
import { workflow, node, trigger, newCredential, placeholder, expr } from '@n8n/workflow-sdk';

// Your website or app posts one tracking event here.
const trackEvent = trigger({
	type: 'n8n-nodes-base.webhook',
	version: 2.1,
	config: {
		name: 'Track Event',
		parameters: { httpMethod: 'POST', path: 'track', responseMode: 'onReceived' },
		output: [
			{
				body: {
					event: 'signup_completed',
					user_id: 'user_284',
					properties: { plan: 'pro' },
					occurred_at: '2026-09-15T10:00:00.000Z',
				},
			},
		],
	},
});

// Tool-neutral step: normalizes the event fields and keeps a JSON-string copy of
// properties for the database write.
const prepareEvent = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Event',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'event',
						value: expr('{{ $json.body.event || "unknown" }}'),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'user_id',
						value: expr('{{ $json.body.user_id || "" }}'),
						type: 'string',
					},
					{
						id: 'a3',
						name: 'properties',
						value: expr('{{ $json.body.properties || {} }}'),
						type: 'object',
					},
					{
						id: 'a4',
						name: 'occurred_at',
						value: expr('{{ $json.body.occurred_at || $now.toISO() }}'),
						type: 'string',
					},
					{
						id: 'a5',
						name: 'properties_json',
						value: expr('{{ JSON.stringify($json.body.properties || {}) }}'),
						type: 'string',
					},
				],
			},
		},
	},
});

// [database] Postgres. Swap for MySQL, Supabase or MongoDB: replace this node only. It
// reads $json.event, $json.user_id, $json.properties_json and $json.occurred_at.
const insertEvent = node({
	type: 'n8n-nodes-base.postgres',
	version: 2.7,
	config: {
		name: 'Insert Event',
		credentials: { postgres: newCredential('Postgres account') },
		parameters: {
			operation: 'executeQuery',
			query:
				'INSERT INTO tracking_events (event, user_id, properties, occurred_at) VALUES ($1, $2, $3::jsonb, $4)',
			options: {
				queryReplacement: expr(
					'{{ $json.event }},{{ $json.user_id }},{{ $json.properties_json }},{{ $json.occurred_at }}',
				),
			},
		},
	},
});

// Forwards the event to the analytics tool in the shape it expects.
const sendToAnalytics = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Send to Analytics',
		credentials: { httpTemplatedCustomAuth: newCredential('Analytics tool API') },
		parameters: {
			method: 'POST',
			url: placeholder(
				'Events endpoint of the analytics tool, for example https://api.analytics.example.com/track',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: expr(
				'{{ { event: $json.event, user_id: $json.user_id, properties: $json.properties, occurred_at: $json.occurred_at } }}',
			),
		},
	},
});

export default workflow('id', 'Tracking Events into a Database and an Analytics Tool')
	.add(trackEvent)
	.to(prepareEvent)
	.to(insertEvent)
	.add(prepareEvent)
	.to(sendToAnalytics);
