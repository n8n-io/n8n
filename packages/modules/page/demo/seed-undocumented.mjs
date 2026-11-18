// Loads a team project that has many workflows and no page into a local n8n instance.
// It is the start state of the "Document me!" demo of the documentation overview.
// A resource whose name already exists is kept, so a second run adds nothing.

import { randomUUID } from 'node:crypto';

const BASE_URL = process.env.N8N_BASE_URL ?? 'http://localhost:5678';
const REST_URL = `${BASE_URL}/rest`;
const PROJECT_NAME = process.env.N8N_DEMO_PROJECT ?? 'Acme Operations';
const NODE_SPACING = 220;

const BASE = 'n8n-nodes-base.';
const LANGCHAIN = '@n8n/n8n-nodes-langchain.';

/** The credentials of the project. The values are placeholders, so no workflow can reach a real service. */
const CREDENTIALS = [
	{ key: 'slack', name: 'Acme Slack', type: 'slackApi', data: { accessToken: 'demo-value' } },
	{
		key: 'postgres',
		name: 'Acme warehouse',
		type: 'postgres',
		data: { host: 'db.example.com', database: 'acme', user: 'demo', password: 'demo-value' },
	},
	{
		key: 'crm',
		name: 'Acme CRM API key',
		type: 'httpHeaderAuth',
		data: { name: 'X-Api-Key', value: 'demo-value' },
	},
	{ key: 'stripe', name: 'Acme Stripe', type: 'stripeApi', data: { secretKey: 'demo-value' } },
	{
		key: 'github',
		name: 'Acme GitHub',
		type: 'githubApi',
		data: { server: 'https://api.github.com', user: 'acme-bot', accessToken: 'demo-value' },
	},
];

const schedule = (name, field, extra = {}) => ({
	name,
	type: `${BASE}scheduleTrigger`,
	typeVersion: 1.2,
	parameters: { rule: { interval: [{ field, ...extra }] } },
});
const webhook = (name, path, httpMethod = 'POST') => ({
	name,
	type: `${BASE}webhook`,
	typeVersion: 2,
	parameters: { path, httpMethod, responseMode: 'responseNode' },
});
const respond = (name) => ({
	name,
	type: `${BASE}respondToWebhook`,
	typeVersion: 1.1,
	parameters: { respondWith: 'json', responseBody: '={{ { "ok": true } }}' },
});
const http = (name, url, method = 'GET') => ({
	name,
	type: `${BASE}httpRequest`,
	typeVersion: 4.2,
	parameters: {
		url,
		method,
		authentication: 'genericCredentialType',
		genericAuthType: 'httpHeaderAuth',
	},
	credential: 'crm',
});
const code = (name, jsCode) => ({
	name,
	type: `${BASE}code`,
	typeVersion: 2,
	parameters: { jsCode },
});
const slack = (name, channel, text) => ({
	name,
	type: `${BASE}slack`,
	typeVersion: 2.3,
	parameters: {
		select: 'channel',
		channelId: { __rl: true, mode: 'name', value: channel },
		text,
	},
	credential: 'slack',
});
const postgres = (name, query) => ({
	name,
	type: `${BASE}postgres`,
	typeVersion: 2.5,
	parameters: { operation: 'executeQuery', query },
	credential: 'postgres',
});
const filter = (name, leftValue, operation, rightValue) => ({
	name,
	type: `${BASE}if`,
	typeVersion: 2.2,
	parameters: {
		conditions: {
			options: { caseSensitive: true, typeValidation: 'loose' },
			combinator: 'and',
			conditions: [
				{ id: randomUUID(), leftValue, rightValue, operator: { type: 'number', operation } },
			],
		},
	},
});
const manual = (name) => ({ name, type: `${BASE}manualTrigger`, typeVersion: 1, parameters: {} });

/** The workflows of the project. The nodes of each workflow run in one line, in this order. */
const WORKFLOWS = [
	{
		name: 'Nightly warehouse export',
		nodes: [
			schedule('Every night at 2am', 'days', { triggerAtHour: 2 }),
			postgres(
				'Read orders of the day',
				"SELECT * FROM orders WHERE created_at >= now() - interval '1 day'",
			),
			code(
				'Build CSV rows',
				'return items.map((item) => ({ json: { line: Object.values(item.json).join(",") } }));',
			),
			http('Upload to data lake', 'https://lake.example.com/v1/uploads', 'POST'),
			slack('Tell the data team', '#data', 'Nightly export done: {{ $items().length }} orders'),
		],
	},
	{
		name: 'Weekly revenue digest',
		nodes: [
			schedule('Every Monday at 8am', 'weeks', { triggerAtDay: [1], triggerAtHour: 8 }),
			postgres(
				'Sum revenue by product',
				'SELECT product, sum(amount) AS revenue FROM orders GROUP BY product',
			),
			code(
				'Write the digest',
				'return [{ json: { text: items.map((i) => `${i.json.product}: ${i.json.revenue}`).join("\\n") } }];',
			),
			slack('Post to leadership', '#leadership', '={{ $json.text }}'),
		],
	},
	{
		name: 'Stale deals reminder',
		nodes: [
			schedule('Every weekday at 9am', 'days', { triggerAtHour: 9 }),
			http('List open deals', 'https://crm.example.com/api/deals?status=open'),
			filter('No activity for 14 days?', '={{ $json.daysSinceLastActivity }}', 'gt', 14),
			slack(
				'Remind the owner',
				'#sales',
				'Deal {{ $json.name }} has had no activity for {{ $json.daysSinceLastActivity }} days',
			),
		],
	},
	{
		name: 'Demo: revenue snapshot',
		runnable: true,
		nodes: [
			manual('Run now'),
			code(
				'Build snapshot from sample data',
				'return [{ json: { revenue: 48210, orders: 312, date: new Date().toISOString().slice(0, 10) } }];',
			),
			code(
				'Format the numbers',
				'return items.map((item) => ({ json: { ...item.json, average: Math.round(item.json.revenue / item.json.orders) } }));',
			),
		],
	},
	{
		name: 'Checkout API: create order',
		active: false,
		nodes: [
			webhook('POST /orders', 'acme/orders'),
			code(
				'Validate the payload',
				'if (!$json.body?.items?.length) { throw new Error("The order has no item"); }\nreturn items;',
			),
			postgres(
				'Insert the order',
				'INSERT INTO orders (customer_id, amount) VALUES ($1, $2) RETURNING id',
			),
			http('Create the invoice in the CRM', 'https://crm.example.com/api/invoices', 'POST'),
			respond('Answer with the order id'),
		],
	},
	{
		name: 'Partner API: stock levels',
		nodes: [
			webhook('GET /stock', 'acme/stock', 'GET'),
			postgres('Read stock by SKU', 'SELECT sku, quantity FROM stock WHERE sku = $1'),
			respond('Answer with the stock'),
		],
	},
	{
		name: 'Stripe payment failed follow-up',
		nodes: [
			{
				name: 'On payment failed',
				type: `${BASE}stripeTrigger`,
				typeVersion: 1,
				parameters: { events: ['invoice.payment_failed'] },
				credential: 'stripe',
			},
			http(
				'Find the customer in the CRM',
				'https://crm.example.com/api/customers?stripeId={{ $json.data.object.customer }}',
			),
			filter('Third failure?', '={{ $json.failedPayments }}', 'gte', 3),
			slack('Alert the finance team', '#finance', 'Payment failed 3 times for {{ $json.name }}'),
		],
	},
	{
		name: 'GitHub release announcer',
		nodes: [
			{
				name: 'On new release',
				type: `${BASE}githubTrigger`,
				typeVersion: 1,
				parameters: {
					owner: { __rl: true, mode: 'name', value: 'acme' },
					repository: { __rl: true, mode: 'name', value: 'storefront' },
					events: ['release'],
				},
				credential: 'github',
			},
			code(
				'Shorten the release notes',
				'return [{ json: { notes: String($json.body.release.body).slice(0, 500), tag: $json.body.release.tag_name } }];',
			),
			slack(
				'Announce in #releases',
				'#releases',
				'Storefront {{ $json.tag }} is out\n{{ $json.notes }}',
			),
		],
	},
	{
		name: 'Customer feedback form',
		nodes: [
			{
				name: 'Feedback form',
				type: `${BASE}formTrigger`,
				typeVersion: 2.2,
				parameters: {
					formTitle: 'Tell us how we did',
					formFields: {
						values: [
							{ fieldLabel: 'Email', fieldType: 'email', requiredField: true },
							{ fieldLabel: 'Score from 1 to 10', fieldType: 'number', requiredField: true },
							{ fieldLabel: 'Comment', fieldType: 'textarea' },
						],
					},
				},
			},
			postgres(
				'Save the answer',
				'INSERT INTO feedback (email, score, comment) VALUES ($1, $2, $3)',
			),
			filter('Score under 6?', '={{ $json["Score from 1 to 10"] }}', 'lt', 6),
			slack(
				'Ask support to call back',
				'#support',
				'Low score from {{ $json.Email }}: {{ $json.Comment }}',
			),
		],
	},
	{
		name: 'Time off request form',
		nodes: [
			{
				name: 'Time off form',
				type: `${BASE}formTrigger`,
				typeVersion: 2.2,
				parameters: {
					formTitle: 'Request time off',
					formFields: {
						values: [
							{ fieldLabel: 'First day', fieldType: 'date', requiredField: true },
							{ fieldLabel: 'Last day', fieldType: 'date', requiredField: true },
						],
					},
				},
			},
			http('Create the request in the HR tool', 'https://hr.example.com/api/time-off', 'POST'),
			slack(
				'Ask the manager to approve',
				'#people',
				'New time off request: {{ $json["First day"] }} to {{ $json["Last day"] }}',
			),
		],
	},
	{
		name: 'Internal docs chatbot',
		nodes: [
			{
				name: 'When a chat message arrives',
				type: `${LANGCHAIN}chatTrigger`,
				typeVersion: 1.1,
				parameters: { public: false },
			},
			http(
				'Search the handbook',
				'https://handbook.example.com/api/search?q={{ $json.chatInput }}',
			),
			code(
				'Write the answer with sources',
				'return [{ json: { output: items.map((i) => `${i.json.title}: ${i.json.url}`).join("\\n") } }];',
			),
		],
	},
	{
		name: 'Shared: normalize customer record',
		nodes: [
			{
				name: 'When called by another workflow',
				type: `${BASE}executeWorkflowTrigger`,
				typeVersion: 1.1,
				parameters: { inputSource: 'passthrough' },
			},
			code(
				'Trim and lowercase the email',
				'return items.map((item) => ({ json: { ...item.json, email: String(item.json.email).trim().toLowerCase() } }));',
			),
			code(
				'Split the full name',
				'return items.map((item) => { const [firstName, ...rest] = String(item.json.name).split(" "); return { json: { ...item.json, firstName, lastName: rest.join(" ") } }; });',
			),
		],
	},
	{
		name: 'Shared: send incident alert',
		nodes: [
			{
				name: 'When called by another workflow',
				type: `${BASE}executeWorkflowTrigger`,
				typeVersion: 1.1,
				parameters: { inputSource: 'passthrough' },
			},
			slack('Post in #incidents', '#incidents', '={{ $json.severity }}: {{ $json.title }}'),
			http('Open a ticket', 'https://tickets.example.com/api/tickets', 'POST'),
		],
	},
	{
		name: 'Backfill customer segments',
		nodes: [
			manual('Run by hand'),
			postgres(
				'Read customers without segment',
				'SELECT id, total_spent FROM customers WHERE segment IS NULL',
			),
			code(
				'Pick a segment',
				'return items.map((item) => ({ json: { id: item.json.id, segment: item.json.total_spent > 1000 ? "vip" : "standard" } }));',
			),
			postgres('Save the segment', 'UPDATE customers SET segment = $2 WHERE id = $1'),
		],
	},
	{
		name: 'Demo: broken currency rates',
		runnable: true,
		nodes: [
			manual('Run now'),
			code('Read the rates', 'throw new Error("The rates service answered with status 503");'),
			code('Convert the prices', 'return items;'),
		],
	},
];

/** Returns the value of a required environment variable. Stops the script when it is not set. */
function requireEnv(name) {
	const value = process.env[name];
	if (!value) {
		console.error(`Set ${name} before you run this script.`);
		process.exit(1);
	}
	return value;
}

/** Signs in and returns a function that calls the REST API as that user and returns the `data` of the answer. */
async function createApi(email, password) {
	const login = await fetch(`${REST_URL}/login`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ emailOrLdapLoginId: email, password }),
	});
	if (!login.ok) {
		throw new Error(`Login failed with status ${login.status}`);
	}
	const cookie = login.headers
		.getSetCookie()
		.map((entry) => entry.split(';')[0])
		.join('; ');
	const headers = { cookie, 'content-type': 'application/json', 'browser-id': 'page-demo' };

	return async (method, path, body) => {
		const response = await fetch(`${REST_URL}${path}`, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});
		if (!response.ok) {
			throw new Error(
				`${method} ${path} failed with status ${response.status}: ${await response.text()}`,
			);
		}
		return (await response.json()).data;
	};
}

/** Returns the item with this name, or creates it. The result always has an `id`. */
async function findOrCreate(existing, name, create) {
	const found = existing.find((item) => item.name === name);
	if (found) {
		console.log(`kept     ${name}`);
		return found;
	}
	const created = await create();
	console.log(`created  ${name}`);
	return created;
}

async function seedProject(api) {
	return await findOrCreate(
		await api('GET', '/projects'),
		PROJECT_NAME,
		async () =>
			await api('POST', '/projects', {
				name: PROJECT_NAME,
				icon: { type: 'icon', value: 'layers' },
			}),
	);
}

/** Returns the credentials of the project by their key. */
async function seedCredentials(api, projectId) {
	const existing = await api('GET', '/credentials');
	const entries = [];
	for (const credential of CREDENTIALS) {
		const target = await findOrCreate(
			existing,
			credential.name,
			async () =>
				await api('POST', '/credentials', {
					name: credential.name,
					type: credential.type,
					data: credential.data,
					projectId,
				}),
		);
		entries.push([credential.key, { id: target.id, name: credential.name, type: credential.type }]);
	}
	return Object.fromEntries(entries);
}

/** Gives a node its id, its position in the line and the credential of the project that it names. */
function toNode(credentials) {
	return ({ credential, ...node }, index) => ({
		...node,
		id: randomUUID(),
		position: [index * NODE_SPACING, 300],
		...(credential
			? {
					credentials: {
						[credentials[credential].type]: {
							id: credentials[credential].id,
							name: credentials[credential].name,
						},
					},
				}
			: {}),
	});
}

/** Connects each node to the next one. */
function toLineConnections(nodes) {
	return Object.fromEntries(
		nodes
			.slice(0, -1)
			.map((node, index) => [
				node.name,
				{ main: [[{ node: nodes[index + 1].name, type: 'main', index: 0 }]] },
			]),
	);
}

async function seedWorkflows(api, projectId, credentials) {
	const existing = await api('GET', '/workflows');
	for (const workflow of WORKFLOWS) {
		const nodes = workflow.nodes.map(toNode(credentials));
		await findOrCreate(
			existing,
			workflow.name,
			async () =>
				await api('POST', '/workflows', {
					name: workflow.name,
					nodes,
					connections: toLineConnections(nodes),
					settings: { executionOrder: 'v1' },
					projectId,
				}),
		);
	}
}

async function main() {
	const api = await createApi(requireEnv('N8N_EMAIL'), requireEnv('N8N_PASSWORD'));
	const project = await seedProject(api);
	const credentials = await seedCredentials(api, project.id);
	await seedWorkflows(api, project.id, credentials);

	console.log(`\nDone. Open ${BASE_URL}/projects/${project.id}/workflows`);
}

await main();
