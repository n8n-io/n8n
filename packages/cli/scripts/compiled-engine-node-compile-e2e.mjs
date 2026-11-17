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
 * Exit code 0 means that all other cases passed. `RESULTS_FILE` gets the
 * details. `ONLY=b,c` runs only the named cases.
 */
import { writeFileSync } from 'node:fs';
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
		// The `accept` header of a compiled node is a known difference: only the HTTP Request
		// node of the case `p` is compared.
		...(r.path.startsWith('/plain/') ? { accept: r.headers.accept } : {}),
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

const webhook = (path) => ({
	id: 'w',
	name: 'Webhook',
	type: 'n8n-nodes-base.webhook',
	typeVersion: 2,
	position: [0, 0],
	webhookId: path,
	parameters: { path, httpMethod: 'POST', responseMode: 'responseNode' },
});

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

function workflowBody(name, engine, path, nodes) {
	const all = [webhook(path), ...nodes, respond];
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
		const workflow = await rest(
			'POST',
			'/workflows',
			workflowBody(spec.key, engine, path, spec.nodes),
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
		for (const call of spec.calls) {
			stub.requests = [];
			stub.failWith = call.failWith ?? 0;
			stub.unauthorizedOnce = call.unauthorizedOnce ?? false;
			const response = await fetch(`${BASE}/webhook/${path}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
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
	} catch (error) {
		out.error = error instanceof Error ? error.message : String(error);
	}
	return out;
}

async function runCase(spec) {
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
			check: (run) => run.calls[0]?.requests[0]?.userAgent === 'n8n',
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
			open: 'before node version 4.4, v1 sends the Authorization header to the other host',
		},
	];
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
	const failures = results.filter((r) => !r.pass && !r.open).length;
	const open = results.filter((r) => !r.pass && r.open).length;
	console.log(
		(failures === 0 ? 'All cases passed' : `${failures} case(s) failed`) +
			(open > 0 ? `; ${open} known difference(s) are open` : ''),
	);
	process.exit(failures === 0 ? 0 : 1);
}

await main();
