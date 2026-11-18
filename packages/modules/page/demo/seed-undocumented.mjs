// Loads a team project that has many workflows and no page into a local n8n instance.
// It is the start state of the "Write it for me" demo of the documentation overview.
// A resource whose name already exists is kept, so a second run adds nothing.

import { randomUUID } from 'node:crypto';

const BASE_URL = process.env.N8N_BASE_URL ?? 'http://localhost:5678';
const REST_URL = `${BASE_URL}/rest`;
const PROJECT_NAME = process.env.N8N_DEMO_PROJECT ?? 'Solstice Festival';
const NODE_SPACING = 220;

const BASE = 'n8n-nodes-base.';
const LANGCHAIN = '@n8n/n8n-nodes-langchain.';

/** The credentials of the project. The values are placeholders, so no workflow can reach a real service. */
const CREDENTIALS = [
	{ key: 'slack', name: 'Festival Slack', type: 'slackApi', data: { accessToken: 'demo-value' } },
	{
		key: 'postgres',
		name: 'Festival database',
		type: 'postgres',
		data: { host: 'db.example.com', database: 'festival', user: 'demo', password: 'demo-value' },
	},
	{
		key: 'api',
		name: 'Festival API key',
		type: 'httpHeaderAuth',
		data: { name: 'X-Api-Key', value: 'demo-value' },
	},
	{
		key: 'stripe',
		name: 'Box office Stripe',
		type: 'stripeApi',
		data: { secretKey: 'demo-value' },
	},
	{
		key: 'telegram',
		name: 'Backstage Telegram bot',
		type: 'telegramApi',
		data: { accessToken: 'demo-value' },
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
	credential: 'api',
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
		name: 'Morning weather watch',
		nodes: [
			schedule('Every day at 7am', 'days', { triggerAtHour: 7 }),
			http(
				'Get the forecast for the site',
				'https://weather.example.com/v1/forecast?site=solstice',
			),
			filter('Wind over 60 km/h?', '={{ $json.windKmh }}', 'gt', 60),
			slack(
				'Warn the stage crew',
				'#stage-crew',
				'Wind of {{ $json.windKmh }} km/h today: lower the screens of the main stage',
			),
		],
	},
	{
		name: 'Hourly crowd count',
		nodes: [
			schedule('Every hour', 'hours'),
			postgres(
				'Count the people on site',
				"SELECT zone, count(*) AS people FROM gate_scans WHERE direction = 'in' GROUP BY zone",
			),
			code(
				'Compare with the capacity of each zone',
				'return items.map((item) => ({ json: { ...item.json, fillRate: Math.round((item.json.people / 5000) * 100) } }));',
			),
			filter('Zone over 90% full?', '={{ $json.fillRate }}', 'gt', 90),
			slack(
				'Tell security to close the zone',
				'#security',
				'{{ $json.zone }} is {{ $json.fillRate }}% full',
			),
		],
	},
	{
		name: 'Monday lineup newsletter',
		nodes: [
			schedule('Every Monday at 10am', 'weeks', { triggerAtDay: [1], triggerAtHour: 10 }),
			postgres(
				'Read the lineup changes of the week',
				"SELECT artist, stage, starts_at FROM lineup WHERE updated_at >= now() - interval '7 days'",
			),
			code(
				'Write the newsletter',
				'return [{ json: { text: items.map((i) => `${i.json.artist} plays the ${i.json.stage} stage`).join("\\n") } }];',
			),
			http('Send it to the ticket holders', 'https://mail.example.com/api/campaigns', 'POST'),
		],
	},
	{
		name: 'Demo: set times of tonight',
		runnable: true,
		nodes: [
			manual('Run now'),
			code(
				'Build the set times from sample data',
				'return [{ json: { artist: "The Night Owls", stage: "Main", minutesLate: 12 } }, { json: { artist: "DJ Pamplemousse", stage: "Forest", minutesLate: 0 } }];',
			),
			code(
				'Mark the late sets',
				'return items.map((item) => ({ json: { ...item.json, status: item.json.minutesLate > 10 ? "late" : "on time" } }));',
			),
		],
	},
	{
		name: 'Gate API: scan ticket',
		active: false,
		nodes: [
			webhook('POST /scan', 'festival/scan'),
			code(
				'Check the ticket code',
				'if (!$json.body?.ticketCode) { throw new Error("The scan has no ticket code"); }\nreturn items;',
			),
			postgres(
				'Mark the ticket as used',
				'UPDATE tickets SET used_at = now() WHERE code = $1 AND used_at IS NULL RETURNING id',
			),
			http('Open the turnstile', 'https://gates.example.com/api/turnstiles/open', 'POST'),
			respond('Answer the scanner'),
		],
	},
	{
		name: 'Food truck API: queue times',
		nodes: [
			webhook('GET /queues', 'festival/queues', 'GET'),
			postgres(
				'Read the queue of each food truck',
				'SELECT truck, minutes_to_wait FROM food_truck_queues ORDER BY minutes_to_wait',
			),
			respond('Answer with the queue times'),
		],
	},
	{
		name: 'Rain refund follow-up',
		nodes: [
			{
				name: 'On ticket refunded',
				type: `${BASE}stripeTrigger`,
				typeVersion: 1,
				parameters: { events: ['charge.refunded'] },
				credential: 'stripe',
			},
			http(
				'Find the ticket holder',
				'https://tickets.example.com/api/holders?stripeId={{ $json.data.object.customer }}',
			),
			filter('Refund over 200?', '={{ $json.refundAmount }}', 'gte', 200),
			slack(
				'Tell the box office',
				'#box-office',
				'Refund of {{ $json.refundAmount }} for {{ $json.name }}: offer a ticket for next year',
			),
		],
	},
	{
		name: 'Artist arrival check-in',
		nodes: [
			{
				name: 'On message to the backstage bot',
				type: `${BASE}telegramTrigger`,
				typeVersion: 1.2,
				parameters: { updates: ['message'] },
				credential: 'telegram',
			},
			code(
				'Read the artist name from the message',
				'return [{ json: { artist: String($json.message.text).replace(/^arrived\\s+/i, "") } }];',
			),
			postgres(
				'Mark the artist as on site',
				'UPDATE lineup SET arrived_at = now() WHERE artist = $1',
			),
			slack(
				'Tell the backstage team',
				'#backstage',
				'{{ $json.artist }} is on site: bring the rider to the dressing room',
			),
		],
	},
	{
		name: 'Lost and found form',
		nodes: [
			{
				name: 'Lost item form',
				type: `${BASE}formTrigger`,
				typeVersion: 2.2,
				parameters: {
					formTitle: 'Did you lose something?',
					formFields: {
						values: [
							{ fieldLabel: 'What did you lose', fieldType: 'text', requiredField: true },
							{ fieldLabel: 'Where did you see it last', fieldType: 'text' },
							{ fieldLabel: 'Email', fieldType: 'email', requiredField: true },
						],
					},
				},
			},
			postgres(
				'Save the lost item',
				'INSERT INTO lost_items (description, last_seen, email) VALUES ($1, $2, $3)',
			),
			slack(
				'Ask the info desk to look',
				'#info-desk',
				'Lost: {{ $json["What did you lose"] }}, last seen {{ $json["Where did you see it last"] }}',
			),
		],
	},
	{
		name: 'Volunteer shift swap form',
		nodes: [
			{
				name: 'Shift swap form',
				type: `${BASE}formTrigger`,
				typeVersion: 2.2,
				parameters: {
					formTitle: 'Swap a volunteer shift',
					formFields: {
						values: [
							{ fieldLabel: 'Shift to give away', fieldType: 'date', requiredField: true },
							{ fieldLabel: 'Shift that you can take', fieldType: 'date', requiredField: true },
						],
					},
				},
			},
			http(
				'Create the swap in the planning tool',
				'https://planning.example.com/api/swaps',
				'POST',
			),
			slack(
				'Ask the volunteers for a taker',
				'#volunteers',
				'Shift of {{ $json["Shift to give away"] }} needs a taker',
			),
		],
	},
	{
		name: 'Festival guide chatbot',
		nodes: [
			{
				name: 'When a chat message arrives',
				type: `${LANGCHAIN}chatTrigger`,
				typeVersion: 1.1,
				parameters: { public: false },
			},
			http(
				'Search the programme and the site map',
				'https://guide.example.com/api/search?q={{ $json.chatInput }}',
			),
			code(
				'Write the answer with the stage and the time',
				'return [{ json: { output: items.map((i) => `${i.json.title}: ${i.json.stage}, ${i.json.time}`).join("\\n") } }];',
			),
		],
	},
	{
		name: 'Shared: find the nearest first aid post',
		nodes: [
			{
				name: 'When called by another workflow',
				type: `${BASE}executeWorkflowTrigger`,
				typeVersion: 1.1,
				parameters: { inputSource: 'passthrough' },
			},
			code(
				'Measure the distance to each post',
				'const posts = [{ name: "Main gate", x: 0, y: 0 }, { name: "Forest stage", x: 400, y: 250 }];\nreturn posts.map((post) => ({ json: { ...post, distance: Math.hypot(post.x - $json.x, post.y - $json.y) } }));',
			),
			code(
				'Keep the nearest post',
				'return [items.reduce((nearest, item) => (item.json.distance < nearest.json.distance ? item : nearest))];',
			),
		],
	},
	{
		name: 'Shared: call the stage manager',
		nodes: [
			{
				name: 'When called by another workflow',
				type: `${BASE}executeWorkflowTrigger`,
				typeVersion: 1.1,
				parameters: { inputSource: 'passthrough' },
			},
			slack(
				'Post in #stage-managers',
				'#stage-managers',
				'={{ $json.stage }}: {{ $json.message }}',
			),
			http('Send the message to the radios', 'https://radio.example.com/api/messages', 'POST'),
		],
	},
	{
		name: 'Assign camping pitches',
		nodes: [
			manual('Run by hand'),
			postgres(
				'Read the campers without a pitch',
				'SELECT id, tent_size FROM campers WHERE pitch IS NULL',
			),
			code(
				'Pick a field for the tent size',
				'return items.map((item) => ({ json: { id: item.json.id, pitch: item.json.tent_size > 4 ? "family field" : "quiet field" } }));',
			),
			postgres('Save the pitch', 'UPDATE campers SET pitch = $2 WHERE id = $1'),
		],
	},
	{
		name: 'Demo: broken sound check',
		runnable: true,
		nodes: [
			manual('Run now'),
			code(
				'Read the levels of the mixing desk',
				'throw new Error("The mixing desk answered with status 503");',
			),
			code('Compare the levels with the limit', 'return items;'),
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
				icon: { type: 'icon', value: 'tent' },
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
