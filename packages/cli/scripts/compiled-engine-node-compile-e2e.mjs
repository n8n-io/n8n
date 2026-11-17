#!/usr/bin/env node
/**
 * End-to-end check of the compiled engine with the node compiler on.
 *
 * Start n8n first, with a test-owned user folder:
 *
 *   N8N_USER_FOLDER=<test folder> N8N_ENABLED_MODULES=compiled-engine \
 *   N8N_COMPILED_ENGINE_COMPILE_NODES=true ./packages/cli/bin/n8n start
 *
 * Then run:
 *
 *   N8N_URL=http://localhost:5678 node packages/cli/scripts/compiled-engine-node-compile-e2e.mjs
 *
 * The script starts a local HTTP stub that stands in for the vendors and
 * records each request. It runs each case two times: on the compiled engine
 * and on the v1 engine. It compares the webhook response and the requests
 * that the stub got. It prints one line for each case.
 *
 * A case with `open` is a known difference from v1: it prints `OPEN` and does
 * not change the exit code. Remove `open` from a case when its difference is
 * closed.
 *
 * `E2E_POSTGRES=1` adds the cases of the Postgres node. They need a PostgreSQL server
 * that n8n and this script can reach (`PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`,
 * `PG_DATABASE`). The script makes the schema `PG_SCHEMA` (default `compiled_e2e`), drops
 * it at the end, and touches nothing else.
 *
 * Exit code 0 means that all other cases passed. `RESULTS_FILE` gets the
 * details. `ONLY=b,c` runs only the named cases.
 */
import { writeFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';
import { parse } from 'flatted';

const BASE = (process.env.N8N_URL ?? 'http://localhost:5678').replace(/\/$/, '');
const EMAIL = process.env.N8N_EMAIL ?? 'e2e@example.com';
const PASSWORD = process.env.N8N_PASSWORD ?? 'E2e-password-1';
const STUB_PORT = Number(process.env.STUB_PORT ?? 19997);
const STUB = `http://127.0.0.1:${STUB_PORT}`;
const RUN = Date.now().toString(36);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- the stub

const stub = { requests: [], failWith: 0, unauthorizedOnce: false, tokens: 0 };

function startStub() {
	const handler = (req, res) => {
		const chunks = [];
		req.on('data', (c) => chunks.push(c));
		req.on('end', () => {
			const body = Buffer.concat(chunks).toString('utf8');
			const url = new URL(req.url ?? '/', STUB);
			stub.requests.push({
				method: req.method,
				path: url.pathname,
				query: url.search,
				body,
				headers: req.headers,
			});
			const send = (status, json) => {
				res.writeHead(status, { 'content-type': 'application/json' });
				res.end(JSON.stringify(json));
			};
			if (url.pathname === '/token') {
				stub.tokens++;
				return send(200, {
					access_token: `token-${stub.tokens}`,
					token_type: 'Bearer',
					expires_in: 3600,
				});
			}
			if (stub.unauthorizedOnce) {
				stub.unauthorizedOnce = false;
				return send(401, { error: 'expired' });
			}
			if (stub.failWith) return send(stub.failWith, { errors: ['stub failure'] });
			if (url.pathname.startsWith('/redirect/')) {
				// To another host name of this stub: `localhost` in place of `127.0.0.1`.
				const location = `http://localhost:${STUB_PORT}/landed/${url.pathname.slice(10)}`;
				res.writeHead(302, { location });
				return res.end();
			}
			send(200, { id: url.pathname.split('/').pop(), path: url.pathname, ok: true });
		});
	};
	// `localhost` can be the IPv6 loopback address, so the stub listens on the two addresses.
	const listen = (host) =>
		new Promise((resolve) => {
			const server = createServer(handler);
			server.once('error', () => resolve(undefined));
			server.listen(STUB_PORT, host, () => resolve(server));
		});
	return Promise.all([listen('127.0.0.1'), listen('::1')]);
}

/** The parts of the recorded requests that the two engines must agree on. */
function comparable(requests) {
	return requests.map((r) => ({
		method: r.method,
		host: r.headers.host,
		path: r.path,
		query: r.query,
		body: r.body,
		apiKey: r.headers['api-key'],
		apiUsername: r.headers['api-username'],
		authorization: r.headers.authorization?.replace(/token-\d+/, 'token-N'),
		stubKey: r.headers['x-stub-key'],
		userAgent: r.headers['user-agent'],
		accept: r.headers.accept,
		contentType: r.headers['content-type'],
	}));
}

// ---------------------------------------------------------------- n8n REST

let cookie = '';

async function rest(method, path, body) {
	const response = await fetch(`${BASE}/rest${path}`, {
		method,
		headers: { 'content-type': 'application/json', cookie, 'browser-id': 'compiled-e2e' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const setCookie = response.headers.get('set-cookie');
	if (setCookie) cookie = setCookie.split(';')[0];
	const text = await response.text();
	let json;
	try {
		json = JSON.parse(text);
	} catch {
		json = text;
	}
	if (!response.ok) {
		throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 500)}`);
	}
	return json?.data ?? json;
}

async function login() {
	try {
		await rest('POST', '/login', { emailOrLdapLoginId: EMAIL, password: PASSWORD });
	} catch {
		await rest('POST', '/owner/setup', {
			email: EMAIL,
			firstName: 'E2e',
			lastName: 'Owner',
			password: PASSWORD,
		});
	}
}

async function createCredential(name, type, data) {
	const created = await rest('POST', '/credentials', { name: `${name} ${RUN}`, type, data });
	return { id: created.id, name: created.name };
}

async function waitForExecution(id) {
	for (let i = 0; i < 100; i++) {
		const execution = await rest('GET', `/executions/${id}`);
		if (!['running', 'new'].includes(execution.status)) return execution;
		await sleep(200);
	}
	throw new Error(`Execution ${id} did not finish`);
}

function runDataOf(execution) {
	const data = typeof execution.data === 'string' ? parse(execution.data) : execution.data;
	return data.resultData.runData;
}

// ---------------------------------------------------------------- workflows

/**
 * `auth`: the authentication of the Webhook node and its credential. `auth.responseMode`
 * and `auth.responseData` replace the response mode `responseNode`.
 */
const webhook = (path, auth = {}) => ({
	id: 'w',
	name: 'Webhook',
	type: 'n8n-nodes-base.webhook',
	typeVersion: 2,
	position: [0, 0],
	webhookId: path,
	parameters: {
		path,
		httpMethod: 'POST',
		responseMode: auth.responseMode ?? 'responseNode',
		...(auth.responseData ? { responseData: auth.responseData } : {}),
		...(auth.authentication ? { authentication: auth.authentication } : {}),
	},
	...(auth.credentials ? { credentials: auth.credentials } : {}),
});

/** A token with the HS256 signature of `secret`, as the JWT authentication of the Webhook node reads it. */
function signedToken(payload, secret) {
	const part = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
	const text = `${part({ alg: 'HS256', typ: 'JWT' })}.${part(payload)}`;
	return `${text}.${createHmac('sha256', secret).update(text).digest('base64url')}`;
}

const respond = {
	id: 'r',
	name: 'Respond',
	type: 'n8n-nodes-base.respondToWebhook',
	typeVersion: 1.1,
	position: [800, 0],
	parameters: { respondWith: 'allIncomingItems' },
};

const chain = (...names) =>
	Object.fromEntries(
		names
			.slice(0, -1)
			.map((name, i) => [name, { main: [[{ node: names[i + 1], type: 'main', index: 0 }]] }]),
	);

const setNode = {
	id: 's',
	name: 'Set',
	type: 'n8n-nodes-base.set',
	typeVersion: 3.4,
	position: [400, 0],
	parameters: {
		assignments: {
			assignments: [
				{ id: 'a', name: 'greeting', value: '=Hello {{ $json.body.name }}', type: 'string' },
				{ id: 'b', name: 'double', value: '={{ $json.body.amount * 2 }}', type: 'number' },
			],
		},
	},
};

/** Lets an item through when the `amount` of its body is above 100. */
const amountFilter = {
	id: 'f',
	name: 'Filter',
	type: 'n8n-nodes-base.filter',
	typeVersion: 2.2,
	position: [400, 0],
	parameters: {
		conditions: {
			options: { caseSensitive: true, typeValidation: 'strict', version: 2 },
			conditions: [
				{
					id: 'a',
					leftValue: '={{ $json.body.amount }}',
					rightValue: 100,
					operator: { type: 'number', operation: 'gt' },
				},
			],
			combinator: 'and',
		},
		options: {},
	},
};

const splitOut = {
	id: 'p',
	name: 'Split Out',
	type: 'n8n-nodes-base.splitOut',
	typeVersion: 1,
	position: [200, 0],
	parameters: { fieldToSplitOut: 'body.ids' },
};

const discourse = (credential, postId, extra = {}) => ({
	id: 'd',
	name: 'Discourse',
	type: 'n8n-nodes-base.discourse',
	typeVersion: 1,
	position: [400, 0],
	parameters: { resource: 'post', operation: 'get', postId },
	credentials: { discourseApi: credential },
	...extra,
});

/** The node compiler has no compiled form for this node: it runs in the fallback host. */
const cryptoNode = {
	id: 'c',
	name: 'Crypto',
	type: 'n8n-nodes-base.crypto',
	typeVersion: 1,
	position: [400, 0],
	parameters: {
		action: 'hash',
		type: 'MD5',
		value: '={{ $json.body.name }}',
		dataPropertyName: 'hash',
	},
};

const keepHash = {
	id: 'k',
	name: 'Keep hash',
	type: 'n8n-nodes-base.set',
	typeVersion: 3.4,
	position: [600, 0],
	parameters: {
		assignments: {
			assignments: [{ id: 'a', name: 'hash', value: '={{ $json.hash }}', type: 'string' }],
		},
	},
};

/**
 * An HTTP Request with a header credential. The node continues on an error, so the response
 * of the webhook has the message of the error.
 */
const headerRequest = (credential, path, typeVersion = 4.2) => ({
	id: 'q',
	name: 'HTTP Request',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion,
	position: [400, 0],
	onError: 'continueRegularOutput',
	parameters: {
		url: `${STUB}/${path}`,
		authentication: 'genericCredentialType',
		genericAuthType: 'httpHeaderAuth',
	},
	credentials: { httpHeaderAuth: credential },
});

const oauthRequest = (credential) => ({
	id: 'o',
	name: 'HTTP Request',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4.2,
	position: [400, 0],
	parameters: {
		url: `${STUB}/protected/resource`,
		authentication: 'genericCredentialType',
		genericAuthType: 'oAuth2Api',
	},
	credentials: { oAuth2Api: credential },
});

// ---------------------------------------------------------------- Postgres

const PG = {
	host: process.env.PG_HOST ?? '127.0.0.1',
	port: Number(process.env.PG_PORT ?? 5432),
	user: process.env.PG_USER ?? 'postgres',
	password: process.env.PG_PASSWORD ?? '',
	database: process.env.PG_DATABASE ?? 'postgres',
};
const PG_SCHEMA = process.env.PG_SCHEMA ?? 'compiled_e2e';

/** Runs statements on the test database with the client of n8n's own Postgres node. */
async function pgRun(...statements) {
	const { default: pg } = await import('pg');
	const client = new pg.Client(PG);
	await client.connect();
	try {
		for (const statement of statements) await client.query(statement);
	} finally {
		await client.end();
	}
}

/** The same rows before the run of each engine: a case that deletes rows has them again. */
async function resetPeople() {
	await pgRun(
		`CREATE SCHEMA IF NOT EXISTS ${PG_SCHEMA}`,
		`DROP TABLE IF EXISTS ${PG_SCHEMA}.people`,
		`CREATE TABLE ${PG_SCHEMA}.people (id int PRIMARY KEY, name text, age int, score numeric(6,2), active boolean, meta jsonb)`,
		`INSERT INTO ${PG_SCHEMA}.people VALUES
			(1, 'Ada', 36, 91.50, true, '{"team": "a"}'),
			(2, 'Bob', 25, 70.25, false, null),
			(3, 'Cy', 52, 88.00, true, '{"team": "b", "tags": ["x"]}'),
			(4, 'Di', 41, null, false, '[1, 2]')`,
	);
}

const locator = (value) => ({ __rl: true, mode: 'name', value });

const postgres = (credential, parameters, name = 'Postgres') => ({
	id: name,
	name,
	type: 'n8n-nodes-base.postgres',
	typeVersion: 2.6,
	position: [400, 0],
	parameters,
	credentials: { postgres: credential },
});

/**
 * The cases of the Postgres node. `native`: the node runs in `wfrt` (the `sql` effect), and
 * no run moves it to the fallback host.
 */
function postgresCases(credential) {
	const table = { schema: locator(PG_SCHEMA), table: locator('people') };
	const native = (run) => run.tiersAfter?.Postgres === 'native';
	return [
		{
			key: 'pa',
			title: 'Postgres select with a condition and a sort order',
			before: resetPeople,
			nodes: [
				postgres(credential, {
					resource: 'database',
					operation: 'select',
					...table,
					returnAll: true,
					where: { values: [{ column: 'age', condition: '>', value: '={{ $json.body.age }}' }] },
					sort: { values: [{ column: 'id', direction: 'DESC' }] },
					options: {},
				}),
			],
			calls: [{ body: { age: 30 } }, { body: { age: 50 } }],
			tiers: { Postgres: 'native' },
			check: (run) => native(run) && run.calls[0]?.response?.length === 3,
		},
		{
			key: 'pb',
			title: 'Postgres executeQuery with query parameters',
			before: resetPeople,
			nodes: [
				postgres(credential, {
					resource: 'database',
					operation: 'executeQuery',
					query: `SELECT id, name, score, active, meta FROM ${PG_SCHEMA}.people WHERE name = $1 OR age > $2 ORDER BY id`,
					options: { queryReplacement: '={{ $json.body.name }}, {{ $json.body.age }}' },
				}),
			],
			// A value with a quote stays a value: the runtime sends it as a bind value.
			calls: [{ body: { name: 'Bob', age: 40 } }, { body: { name: "O'Hara; --", age: 50 } }],
			tiers: { Postgres: 'native' },
			check: (run) => native(run) && run.calls[0]?.response?.length === 3,
		},
		{
			key: 'pc',
			title: 'Postgres deleteTable with a condition',
			before: resetPeople,
			nodes: [
				postgres(credential, {
					resource: 'database',
					operation: 'deleteTable',
					...table,
					deleteCommand: 'delete',
					where: {
						values: [{ column: 'name', condition: 'equal', value: '={{ $json.body.name }}' }],
					},
					options: {},
				}),
				postgres(
					credential,
					{
						resource: 'database',
						operation: 'executeQuery',
						query: `SELECT id FROM ${PG_SCHEMA}.people ORDER BY id`,
						options: {},
					},
					'Left',
				),
			],
			calls: [{ body: { name: 'Bob' } }],
			tiers: { Postgres: 'native', Left: 'native' },
			check: (run) =>
				native(run) && JSON.stringify(run.calls[0]?.response) === '[{"id":1},{"id":3},{"id":4}]',
		},
		{
			key: 'pd',
			title: 'Postgres query with an array column: the fallback host runs the node in the same run',
			before: resetPeople,
			nodes: [
				postgres(credential, {
					resource: 'database',
					operation: 'executeQuery',
					query: `SELECT id, ARRAY[id, age] AS pair FROM ${PG_SCHEMA}.people WHERE age > $1 ORDER BY id`,
					options: { queryReplacement: '={{ $json.body.age }}' },
				}),
			],
			// The first call reaches the limit in `wfrt`. The second call starts in the host.
			calls: [{ body: { age: 40 } }, { body: { age: 30 } }],
			tiers: { Postgres: 'native' },
			check: (run) =>
				run.tiersAfter?.Postgres === 'host' &&
				JSON.stringify(run.calls[0]?.response) ===
					'[{"id":3,"pair":[3,52]},{"id":4,"pair":[4,41]}]',
		},
	];
}

function workflowBody(name, engine, path, nodes, auth) {
	// A Respond to Webhook node belongs only to the response mode `responseNode`.
	const all = [webhook(path, auth), ...nodes, ...(auth?.responseMode ? [] : [respond])];
	return {
		name: `E2E ${name} ${engine} ${RUN}`,
		settings: {
			executionOrder: 'v1',
			...(engine === 'compiled' ? { engineType: 'compiled' } : {}),
		},
		nodes: all,
		connections: chain(...all.map((n) => n.name)),
	};
}

// ---------------------------------------------------------------- one case

const results = [];

/**
 * Runs one workflow on one engine. `calls` is the list of webhook bodies; a
 * call can set the state of the stub first.
 */
async function runOn(engine, spec) {
	const path = `e2e-${spec.key}-${engine}-${RUN}`;
	const out = { engine, published: false, calls: [] };
	try {
		if (spec.before) await spec.before(engine);
		const workflow = await rest(
			'POST',
			'/workflows',
			workflowBody(spec.key, engine, path, spec.nodes, spec.webhook),
		);
		out.workflowId = workflow.id;
		if (engine === 'compiled') {
			const compiled = await rest('GET', `/compiled-engine/workflows/${workflow.id}/compile`);
			out.compileOk = compiled.ok;
			out.tiers = compiled.nodes;
			out.diagnostics = compiled.diagnostics;
			// The converter says which nodes run as code that is compiled from their source.
			out.compiledNodes = compiled.diagnostics
				.filter((d) => d.code === 'node-compiled')
				.map((d) => d.node);
		}
		if (spec.manual) {
			stub.requests = [];
			const run = await rest('POST', `/workflows/${workflow.id}/run`, {
				triggerToStartFrom: {
					name: 'Webhook',
					data: {
						startTime: Date.now(),
						executionTime: 0,
						executionIndex: 0,
						source: [],
						data: {
							main: [[{ json: { headers: {}, params: {}, query: {}, body: spec.calls[0].body } }]],
						},
					},
				},
			});
			const execution = await waitForExecution(run.executionId);
			const runData = runDataOf(execution);
			out.calls.push({
				status: execution.status,
				mode: execution.mode,
				response: Object.fromEntries(
					Object.entries(runData)
						.filter(([name]) => name !== 'Webhook')
						.map(([name, runs]) => [name, runs.map((r) => r.data?.main?.[0]?.map((i) => i.json))]),
				),
				requests: comparable(stub.requests),
				// For information: the two engines do not send the same transport headers.
				headers: stub.requests.map((r) => r.headers),
			});
			return out;
		}
		await rest('POST', `/workflows/${workflow.id}/activate`, { versionId: workflow.versionId });
		out.published = true;
		await sleep(700);
		if (engine === 'compiled') {
			// The reason, when the published version runs on the v1 engine.
			const state = await rest('GET', `/compiled-engine/workflows/${workflow.id}/compile`);
			out.runsOnV1 = state.runsOnV1;
		}
		for (const call of spec.calls) {
			stub.requests = [];
			stub.failWith = call.failWith ?? 0;
			stub.unauthorizedOnce = call.unauthorizedOnce ?? false;
			const response = await fetch(`${BASE}/webhook/${path}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json', ...(call.headers ?? {}) },
				body: JSON.stringify(call.body),
			});
			// The path has the name of the engine: the two responses must not differ by it.
			const text = (await response.text()).replaceAll(path, 'e2e-path');
			let json;
			try {
				json = JSON.parse(text);
			} catch {
				json = text;
			}
			await sleep(300);
			out.calls.push({
				status: response.status,
				response: json,
				requests: comparable(stub.requests),
				// For information: the two engines do not send the same transport headers.
				headers: stub.requests.map((r) => r.headers),
			});
		}
		stub.failWith = 0;
		stub.unauthorizedOnce = false;
		await sleep(500);
		const list = await rest(
			'GET',
			`/executions?filter=${encodeURIComponent(JSON.stringify({ workflowId: workflow.id }))}&limit=20`,
		);
		out.executions = (list.results ?? list).map((e) => `${e.mode}/${e.status}`).sort();
		if (engine === 'compiled') {
			// Where each node runs after the calls: a limit of `wfrt` moves a node to the host.
			const state = await rest('GET', `/compiled-engine/workflows/${workflow.id}/compile`);
			out.tiersAfter = state.nodes;
		}
	} catch (error) {
		out.error = error instanceof Error ? error.message : String(error);
	}
	return out;
}

async function runCase(spec) {
	if (spec.prepare) await spec.prepare();
	const compiled = await runOn('compiled', spec);
	const v1 = await runOn('v1', spec);
	const same = (pick) =>
		JSON.stringify(compiled.calls.map(pick)) === JSON.stringify(v1.calls.map(pick));
	const checks = {
		noError: compiled.error === undefined && v1.error === undefined,
		compiles: compiled.compileOk === true,
		tiers: Object.entries(spec.tiers ?? {}).every(
			([node, tier]) => compiled.tiers?.[node] === tier,
		),
		ranCompiled: (spec.compiledNodes ?? []).every((node) => compiled.compiledNodes?.includes(node)),
		// The published version is on the compiled engine, or on v1 for the case that expects it.
		engine: spec.onV1 ? compiled.runsOnV1 !== undefined : compiled.runsOnV1 === undefined,
		sameResponse: same(spec.response ?? ((c) => [c.status, c.response])),
		sameRequests: same((c) => c.requests),
		sameExecutions: JSON.stringify(compiled.executions) === JSON.stringify(v1.executions),
		...(spec.check ? { expected: spec.check(compiled) } : {}),
	};
	const pass = Object.values(checks).every(Boolean);
	results.push({ case: spec.key, title: spec.title, pass, open: spec.open, checks, compiled, v1 });
	const failed = Object.entries(checks)
		.filter(([, ok]) => !ok)
		.map(([name]) => name);
	console.log(
		`${pass ? 'ok  ' : spec.open ? 'OPEN' : 'FAIL'} ${spec.key} ${spec.title}` +
			` | tiers ${JSON.stringify(compiled.tiers ?? {})}` +
			` | compiled from source ${JSON.stringify(compiled.compiledNodes ?? [])}` +
			(pass ? '' : ` | failed: ${failed.join(', ')}`) +
			(!pass && spec.open ? ` | known difference: ${spec.open}` : ''),
	);
}

// ---------------------------------------------------------------- main

async function main() {
	const servers = await startStub();
	await login();
	const discourseCredential = await createCredential('Discourse', 'discourseApi', {
		url: STUB,
		apiKey: 'stub-api-key',
		username: 'stub-user',
	});
	const oauthCredential = await createCredential('OAuth2', 'oAuth2Api', {
		grantType: 'clientCredentials',
		accessTokenUrl: `${STUB}/token`,
		clientId: 'stub-client',
		clientSecret: 'stub-secret',
		scope: '',
		authentication: 'body',
	});
	const jwtCredential = await createCredential('Webhook token', 'jwtAuth', {
		keyType: 'passphrase',
		secret: 'e2e-secret',
		algorithm: 'HS256',
	});
	const hookCredential = await createCredential('Webhook header', 'httpHeaderAuth', {
		name: 'X-Hook-Key',
		value: 'hook-secret',
	});
	const discourseData = { url: STUB, apiKey: 'stub-api-key', username: 'stub-user' };
	const discourseListed = await createCredential('Discourse listed', 'discourseApi', {
		...discourseData,
		allowedHttpRequestDomains: 'domains',
		allowedDomains: '127.0.0.1',
	});
	const discourseOther = await createCredential('Discourse other', 'discourseApi', {
		...discourseData,
		allowedHttpRequestDomains: 'domains',
		allowedDomains: 'example.com',
	});
	const headerCredentials = [];
	/** A header credential; the data is made when the cases run. */
	const header = (limit, name = 'X-Stub-Key') => {
		const reference = {};
		headerCredentials.push({ reference, data: { name, value: 'stub-header-value', ...limit } });
		return reference;
	};
	const domains = (allowedDomains) => ({ allowedHttpRequestDomains: 'domains', allowedDomains });
	const only = process.env.ONLY?.split(',');
	const cases = [
		{
			key: 'a',
			title: 'Webhook -> Set -> Respond (native)',
			nodes: [setNode],
			calls: [{ body: { name: 'Ada', amount: 21 } }],
			tiers: { Set: 'code' },
		},
		{
			key: 'b',
			title: 'compiled API node, fixed parameter',
			nodes: [discourse(discourseCredential, '7')],
			calls: [{ body: {} }],
			compiledNodes: ['Discourse'],
			check: (run) => run.calls[0]?.requests.length === 1,
		},
		{
			key: 'c',
			title: 'compiled API node, expression over three items',
			nodes: [splitOut, discourse(discourseCredential, '={{ $json["body.ids"] }}')],
			calls: [{ body: { ids: [11, 12, 13] } }],
			compiledNodes: ['Discourse'],
			check: (run) => run.calls[0]?.requests.length === 3,
		},
		{
			key: 'd',
			title: 'compiled API node, continueRegularOutput, stub answers 400',
			nodes: [discourse(discourseCredential, '7', { onError: 'continueRegularOutput' })],
			calls: [{ body: {}, failWith: 400 }],
			compiledNodes: ['Discourse'],
		},
		{
			key: 'e',
			title: 'node that cannot compile runs in the fallback host',
			nodes: [cryptoNode, keepHash],
			calls: [{ body: { name: 'Ada' } }],
			tiers: { Crypto: 'host' },
		},
		{
			key: 'f',
			title: 'manual run of a compiled workflow',
			manual: true,
			nodes: [discourse(discourseCredential, '7')],
			calls: [{ body: {} }],
			compiledNodes: ['Discourse'],
			check: (run) => run.calls[0]?.status === 'success' && run.calls[0]?.mode === 'manual',
		},
		{
			key: 'g',
			title: 'OAuth2 credential, stub answers 401 one time',
			nodes: [oauthRequest(oauthCredential)],
			calls: [{ body: {} }, { body: {}, unauthorizedOnce: true }],
			// 401, then a new token, then the request again one time.
			check: (run) =>
				run.calls[1]?.requests.map((r) => r.path).join(' ') ===
				'/protected/resource /token /protected/resource',
		},
		{
			key: 'j',
			title: 'compiled API node fails, stub answers 400',
			nodes: [discourse(discourseCredential, '7')],
			calls: [{ body: {}, failWith: 400 }],
			compiledNodes: ['Discourse'],
		},
		{
			key: 'i',
			title: 'the item of the Webhook trigger',
			nodes: [],
			calls: [{ body: { name: 'Ada' } }],
		},
		{
			key: 'p',
			title: 'HTTP Request without a credential: the default headers',
			nodes: [
				{
					id: 'q',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [400, 0],
					parameters: { url: `${STUB}/plain/headers` },
				},
			],
			calls: [{ body: {} }],
		},
		{
			key: 'h',
			title: 'HTTP Request, credential that allows no domain',
			nodes: [headerRequest(header({ allowedHttpRequestDomains: 'none' }), 'limited/none')],
			calls: [{ body: {} }],
			check: (run) => run.calls[0]?.requests.length === 0,
		},
		{
			key: 'k',
			title: 'HTTP Request, allowed domains with the host of the request',
			nodes: [headerRequest(header(domains('example.com, 127.0.0.1')), 'limited/listed')],
			calls: [{ body: {} }],
			check: (run) => run.calls[0]?.requests.length === 1,
		},
		{
			key: 'l',
			title: 'HTTP Request, allowed domains without the host of the request',
			nodes: [headerRequest(header(domains('*.example.com, api.example.org')), 'limited/other')],
			calls: [{ body: {} }],
			check: (run) => run.calls[0]?.requests.length === 0,
		},
		{
			key: 'm',
			title: 'HTTP Request, redirect to a host that the allowed domains do not have',
			nodes: [headerRequest(header(domains('127.0.0.1')), 'redirect/limited')],
			calls: [{ body: {} }],
			// The error of v1 has a stack with file paths: the name and the message are compared.
			response: (c) => [c.status, c.response?.[0]?.error?.name, c.response?.[0]?.error?.message],
			check: (run) => run.calls[0]?.requests.length === 1,
		},
		{
			key: 'n',
			title: 'HTTP Request 4.4, redirect to another host, Authorization header',
			nodes: [headerRequest(header({}, 'Authorization'), 'redirect/open', 4.4)],
			calls: [{ body: {} }],
			check: (run) => run.calls[0]?.requests.at(-1)?.authorization === undefined,
		},
		{
			key: 'o',
			title: 'HTTP Request 4.2, redirect to another host, Authorization header',
			nodes: [headerRequest(header({}, 'Authorization'), 'redirect/open')],
			calls: [{ body: {} }],
			// Before version 4.4 the v1 node sends the header to the other host.
			check: (run) => run.calls[0]?.requests.at(-1)?.authorization === 'stub-header-value',
		},
		{
			key: 'r',
			title: 'HTTP Request 4.4, redirect to another host, credential header with another name',
			nodes: [headerRequest(header({}), 'redirect/named', 4.4)],
			calls: [{ body: {} }],
			// The v1 node removes only the headers that authenticate: this header stays.
			check: (run) => run.calls[0]?.requests.at(-1)?.stubKey === 'stub-header-value',
		},
		{
			key: 's',
			title:
				'Webhook with JWT authentication: the payload in the item, and a request without a token',
			webhook: { authentication: 'jwtAuth', credentials: { jwtAuth: jwtCredential } },
			nodes: [],
			calls: [
				{
					body: { name: 'Ada' },
					headers: {
						authorization: `Bearer ${signedToken({ sub: 'ada', role: 'admin' }, 'e2e-secret')}`,
					},
				},
				{ body: { name: 'Ada' } },
				{
					body: { name: 'Ada' },
					headers: { authorization: `Bearer ${signedToken({ sub: 'ada' }, 'other')}` },
				},
			],
			check: (run) =>
				run.calls[0]?.response?.[0]?.jwtPayload?.sub === 'ada' && run.calls[1]?.status >= 400,
		},
		{
			key: 't',
			title: 'Webhook with header authentication: the right header and a wrong header',
			webhook: { authentication: 'headerAuth', credentials: { httpHeaderAuth: hookCredential } },
			nodes: [setNode],
			calls: [
				{ body: { name: 'Ada', amount: 2 }, headers: { 'x-hook-key': 'hook-secret' } },
				{ body: { name: 'Ada', amount: 2 }, headers: { 'x-hook-key': 'wrong' } },
				{ body: { name: 'Ada', amount: 2 } },
			],
			check: (run) => run.calls[0]?.status === 200 && run.calls[1]?.status === 403,
		},
		{
			key: 'u',
			title: 'app node, credential with allowed domains that have the host',
			nodes: [discourse(discourseListed, '7')],
			calls: [{ body: {} }],
			// A value other than `all` is not checked against v1: the node runs in the fallback host.
			tiers: { Discourse: 'host' },
			check: (run) => run.calls[0]?.requests.length === 1,
		},
		{
			key: 'v',
			title: 'app node, credential with allowed domains that do not have the host',
			nodes: [discourse(discourseOther, '7')],
			calls: [{ body: {} }],
			tiers: { Discourse: 'host' },
			// The v1 node does not read the allowed domains of an app node: the request goes out.
			check: (run) => run.calls[0]?.requests.length === 1,
		},
	];
	cases.push({
		key: 'w',
		title: 'no item reaches the Respond node',
		nodes: [amountFilter],
		// v1 answers with an empty body. The second call has an item for the Respond node.
		calls: [{ body: { amount: 2 } }, { body: { amount: 200 } }],
		check: (run) => run.calls[0]?.status === 200 && run.calls[0]?.response === '',
	});
	// `wfrt` does not make the response of these response modes: n8n takes the request and
	// makes the response, and the run is in `wfrt`.
	const noItem = (calls) => ({ nodes: [amountFilter, setNode], calls });
	cases.push(
		{
			key: 'x',
			title: 'response mode lastNode, the first item: no item, and one item',
			webhook: { responseMode: 'lastNode' },
			...noItem([{ body: { amount: 2 } }, { body: { name: 'Ada', amount: 200 } }]),
			// The error response of n8n has the stack of the process: the status and the message count.
			response: (c) => [c.status, c.status >= 400 ? c.response?.message : c.response],
			check: (run) =>
				run.calls[0]?.status === 500 && run.calls[1]?.response?.greeting === 'Hello Ada',
		},
		{
			key: 'y',
			title: 'response mode lastNode, all items: no item, and one item',
			webhook: { responseMode: 'lastNode', responseData: 'allEntries' },
			...noItem([{ body: { amount: 2 } }, { body: { name: 'Ada', amount: 200 } }]),
			check: (run) =>
				JSON.stringify(run.calls[0]?.response) === '[]' && run.calls[1]?.response?.length === 1,
		},
		{
			key: 'z',
			title: 'response mode onReceived: the response does not wait for the run',
			webhook: { responseMode: 'onReceived' },
			...noItem([{ body: { amount: 2 } }, { body: { name: 'Ada', amount: 200 } }]),
			check: (run) => run.calls[0]?.response?.message === 'Workflow was started',
		},
	);
	if (process.env.E2E_FILL_MODULES === '1') {
		// `wfrt` has a limit for its loaded modules. This case loads workflows until `wfrt`
		// refuses one. The next workflow must then run on v1, with the result of v1. After this
		// case the instance has no room for another compiled workflow: use a test instance.
		cases.push({
			key: 'q',
			title: 'a workflow that wfrt refuses (module limit) runs on v1',
			onV1: true,
			nodes: [setNode],
			calls: [{ body: { name: 'Ada', amount: 21 } }],
			check: (run) => /module/.test(run.runsOnV1 ?? ''),
			prepare: async () => {
				for (let k = 0; k < 400; k++) {
					const body = workflowBody(`fill-${k}`, 'compiled', `e2e-fill-${k}-${RUN}`, [setNode]);
					const workflow = await rest('POST', '/workflows', body);
					await rest('POST', `/workflows/${workflow.id}/activate`, {
						versionId: workflow.versionId,
					});
					await sleep(120);
					const state = await rest('GET', `/compiled-engine/workflows/${workflow.id}/compile`);
					if (state.runsOnV1 !== undefined) return;
				}
				throw new Error('wfrt refused no workflow');
			},
		});
	}
	const withPostgres = process.env.E2E_POSTGRES === '1';
	if (withPostgres) {
		const credential = await createCredential('Postgres', 'postgres', {
			...PG,
			ssl: 'disable',
			allowUnauthorizedCerts: false,
			sshTunnel: false,
		});
		cases.push(...postgresCases(credential));
	}
	for (const [index, { reference, data }] of headerCredentials.entries()) {
		Object.assign(reference, await createCredential(`Header ${index}`, 'httpHeaderAuth', data));
	}
	for (const spec of cases) {
		if (only && !only.includes(spec.key)) continue;
		await runCase(spec);
	}
	if (process.env.RESULTS_FILE) {
		writeFileSync(process.env.RESULTS_FILE, JSON.stringify(results, null, 2));
	}
	for (const server of servers) server?.close();
	if (withPostgres) await pgRun(`DROP SCHEMA IF EXISTS ${PG_SCHEMA} CASCADE`);
	const failures = results.filter((r) => !r.pass && !r.open).length;
	const open = results.filter((r) => !r.pass && r.open).length;
	console.log(
		(failures === 0 ? 'All cases passed' : `${failures} case(s) failed`) +
			(open > 0 ? `; ${open} known difference(s) are open` : ''),
	);
	process.exit(failures === 0 ? 0 : 1);
}

await main();
