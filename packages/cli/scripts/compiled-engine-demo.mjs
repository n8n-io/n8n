#!/usr/bin/env node
/**
 * End-to-end check of the compiled engine against a running n8n.
 *
 * Start n8n with the `compiled-engine` module first (see
 * `src/modules/compiled-engine/README.md`). Then run:
 *
 *   N8N_URL=http://localhost:5678 N8N_EMAIL=... N8N_PASSWORD=... \
 *   WFRT_URL=http://127.0.0.1:5690 node packages/cli/scripts/compiled-engine-demo.mjs
 *
 * The script sets up the owner when the instance has none. It creates the
 * workflow Webhook -> IF -> Set -> HTTP Request -> Respond to Webhook, with
 * the HTTP Request calling a local echo server. It selects the compiled
 * engine, reads the compile diagnostics, publishes the workflow, calls the
 * production webhook, and checks the response and the execution record. Then
 * it runs the workflow manually and checks the run data of each node.
 *
 * It also publishes a Schedule Trigger workflow that fires every 2 seconds,
 * checks that executions appear and that unpublish stops them, and stops a
 * manual run that waits in a Wait node. Then it resumes a Wait (on webhook
 * call) node through the n8n URL that `$execution.resumeUrl` gives, and
 * uploads a file to a webhook.
 *
 * Exit code 0 means that all checks passed.
 */
import { createServer } from 'node:http';
import { parse } from 'flatted';

const BASE = (process.env.N8N_URL ?? 'http://localhost:5678').replace(/\/$/, '');
const EMAIL = process.env.N8N_EMAIL ?? 'demo@example.com';
const PASSWORD = process.env.N8N_PASSWORD ?? 'Demo-password-1';
const ECHO_PORT = Number(process.env.ECHO_PORT ?? 19998);
const PATH = `compiled-demo-${Date.now().toString(36)}`;
// The public port of wfrt, to check that wfrt itself refuses a wrong signature.
const WFRT_URL = (process.env.WFRT_URL ?? 'http://127.0.0.1:5690').replace(/\/$/, '');

/** The URL with its `signature` query parameter replaced, or removed when `value` is null. */
function withSignature(url, value) {
	const u = new URL(url);
	if (value === null) u.searchParams.delete('signature');
	else u.searchParams.set('signature', value);
	return u.toString();
}

function wrongSignature(url) {
	const s = new URL(url).searchParams.get('signature') ?? '';
	return s.replace(/./g, (c) => (c === '0' ? '1' : '0'));
}

let cookie = '';
let failures = 0;

function check(label, condition, detail) {
	if (condition) {
		console.log(`  ok   ${label}`);
	} else {
		failures++;
		console.log(`  FAIL ${label}${detail === undefined ? '' : `: ${JSON.stringify(detail)}`}`);
	}
}

async function rest(method, path, body) {
	const response = await fetch(`${BASE}/rest${path}`, {
		method,
		headers: { 'content-type': 'application/json', cookie, 'browser-id': 'compiled-demo' },
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
	if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 500)}`);
	return json?.data ?? json;
}

async function login() {
	try {
		await rest('POST', '/login', { emailOrLdapLoginId: EMAIL, password: PASSWORD });
	} catch {
		await rest('POST', '/owner/setup', {
			email: EMAIL,
			firstName: 'Demo',
			lastName: 'Owner',
			password: PASSWORD,
		});
	}
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForExecution(filter) {
	for (let i = 0; i < 50; i++) {
		const list = await rest('GET', `/executions?filter=${encodeURIComponent(JSON.stringify(filter))}`);
		const results = list.results ?? list;
		const done = results.find((e) => e.status !== 'running' && e.status !== 'new');
		if (done) return await rest('GET', `/executions/${done.id}`);
		await sleep(200);
	}
	throw new Error('No finished execution');
}

async function waitForExecutionId(id) {
	for (let i = 0; i < 50; i++) {
		const execution = await rest('GET', `/executions/${id}`);
		if (execution.status !== 'running' && execution.status !== 'new') return execution;
		await sleep(200);
	}
	throw new Error(`Execution ${id} did not finish`);
}

function runDataOf(execution) {
	const data = typeof execution.data === 'string' ? parse(execution.data) : execution.data;
	return data.resultData.runData;
}

function workflowBody() {
	return {
		name: `Compiled engine demo ${PATH}`,
		settings: { engineType: 'compiled', executionOrder: 'v1' },
		nodes: [
			{
				id: '1',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				webhookId: PATH,
				parameters: { path: PATH, httpMethod: 'POST', responseMode: 'responseNode' },
			},
			{
				id: '2',
				name: 'IF',
				type: 'n8n-nodes-base.if',
				typeVersion: 2,
				position: [200, 0],
				parameters: {
					conditions: {
						combinator: 'and',
						conditions: [
							{
								leftValue: '={{ $json.body.amount }}',
								rightValue: 10,
								operator: { type: 'number', operation: 'gt' },
							},
						],
					},
				},
			},
			{
				id: '3',
				name: 'Set',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [400, 0],
				parameters: {
					assignments: {
						assignments: [
							{ id: 'a', name: 'big', value: true, type: 'boolean' },
							{ id: 'b', name: 'amount', value: '={{ $json.body.amount }}', type: 'number' },
						],
					},
				},
			},
			{
				id: '4',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [600, 0],
				parameters: {
					method: 'POST',
					url: `http://127.0.0.1:${ECHO_PORT}/echo`,
					sendBody: true,
					specifyBody: 'json',
					jsonBody: '={{ JSON.stringify($json) }}',
				},
			},
			{
				id: '5',
				name: 'Respond',
				type: 'n8n-nodes-base.respondToWebhook',
				typeVersion: 1.1,
				position: [800, 0],
				parameters: { respondWith: 'allIncomingItems' },
			},
		],
		connections: {
			Webhook: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
			IF: { main: [[{ node: 'Set', type: 'main', index: 0 }], []] },
			Set: { main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]] },
			'HTTP Request': { main: [[{ node: 'Respond', type: 'main', index: 0 }]] },
		},
	};
}

async function listExecutions(workflowId) {
	const list = await rest(
		'GET',
		`/executions?filter=${encodeURIComponent(JSON.stringify({ workflowId }))}&limit=100`,
	);
	return list.results ?? list;
}

async function scheduleCheck() {
	console.log('Schedule workflow');
	const workflow = await rest('POST', '/workflows', {
		name: `Compiled engine schedule ${PATH}`,
		settings: { engineType: 'compiled', executionOrder: 'v1' },
		nodes: [
			{
				id: 's1',
				name: 'Schedule Trigger',
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1.2,
				position: [0, 0],
				parameters: { rule: { interval: [{ field: 'seconds', secondsInterval: 2 }] } },
			},
			{
				id: 's2',
				name: 'Set',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [200, 0],
				parameters: {
					assignments: { assignments: [{ id: 'a', name: 'tick', value: true, type: 'boolean' }] },
				},
			},
		],
		connections: { 'Schedule Trigger': { main: [[{ node: 'Set', type: 'main', index: 0 }]] } },
	});
	const compiled = await rest('GET', `/compiled-engine/workflows/${workflow.id}/compile`);
	check('the schedule workflow compiles', compiled.ok === true, compiled.diagnostics);
	await rest('POST', `/workflows/${workflow.id}/activate`, { versionId: workflow.versionId });
	await sleep(7000);
	const fired = await listExecutions(workflow.id);
	check('the schedule fired at least twice', fired.length >= 2, fired.length);
	check(
		'schedule executions succeeded with mode trigger',
		fired.length > 0 && fired.every((e) => e.mode === 'trigger' && e.status === 'success'),
		fired.map((e) => `${e.mode}/${e.status}`),
	);
	await rest('POST', `/workflows/${workflow.id}/deactivate`, {});
	await sleep(1000);
	const atStop = (await listExecutions(workflow.id)).length;
	await sleep(5000);
	const later = (await listExecutions(workflow.id)).length;
	check('unpublish stops the schedule', later === atStop, { atStop, later });
}

async function stopCheck() {
	console.log('Stop a waiting manual run');
	const workflow = await rest('POST', '/workflows', {
		name: `Compiled engine stop ${PATH}`,
		settings: { engineType: 'compiled', executionOrder: 'v1' },
		nodes: [
			{
				id: 't1',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				webhookId: `${PATH}-stop`,
				parameters: { path: `${PATH}-stop`, httpMethod: 'POST' },
			},
			{
				id: 't2',
				name: 'Wait',
				type: 'n8n-nodes-base.wait',
				typeVersion: 1.1,
				position: [200, 0],
				parameters: { resume: 'timeInterval', amount: 60, unit: 'seconds' },
			},
			{
				id: 't3',
				name: 'Set',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [400, 0],
				parameters: {
					assignments: { assignments: [{ id: 'a', name: 'done', value: true, type: 'boolean' }] },
				},
			},
		],
		connections: {
			Webhook: { main: [[{ node: 'Wait', type: 'main', index: 0 }]] },
			Wait: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
		},
	});
	const run = await rest('POST', `/workflows/${workflow.id}/run`, {
		triggerToStartFrom: {
			name: 'Webhook',
			data: {
				startTime: Date.now(),
				executionTime: 0,
				executionIndex: 0,
				source: [],
				data: { main: [[{ json: { headers: {}, params: {}, query: {}, body: {} } }]] },
			},
		},
	});
	let status = '';
	for (let i = 0; i < 25 && status !== 'waiting'; i++) {
		await sleep(200);
		status = (await rest('GET', `/executions/${run.executionId}`)).status;
	}
	check('the manual run waits in the Wait node', status === 'waiting', status);
	await rest('POST', `/executions/${run.executionId}/stop`, {});
	const stopped = await rest('GET', `/executions/${run.executionId}`);
	check('the stopped execution is canceled', stopped.status === 'canceled', stopped.status);
}

async function publish(body) {
	const workflow = await rest('POST', '/workflows', body);
	const compiled = await rest('GET', `/compiled-engine/workflows/${workflow.id}/compile`);
	check(`"${body.name}" compiles`, compiled.ok === true, compiled.diagnostics);
	await rest('POST', `/workflows/${workflow.id}/activate`, { versionId: workflow.versionId });
	await sleep(500);
	return workflow;
}

async function resumeCheck() {
	console.log('Resume a Wait node through $execution.resumeUrl');
	const path = `${PATH}-resume`;
	const workflow = await publish({
		name: `Compiled engine resume ${PATH}`,
		settings: { engineType: 'compiled', executionOrder: 'v1' },
		nodes: [
			{
				id: 'r1',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				webhookId: path,
				parameters: { path, httpMethod: 'POST', responseMode: 'responseNode' },
			},
			{
				id: 'r2',
				name: 'Respond',
				type: 'n8n-nodes-base.respondToWebhook',
				typeVersion: 1.1,
				position: [200, 0],
				parameters: {
					respondWith: 'json',
					responseBody: '={"resumeUrl": "{{ $execution.resumeUrl }}"}',
				},
			},
			{
				id: 'r3',
				name: 'Wait',
				type: 'n8n-nodes-base.wait',
				typeVersion: 1.1,
				position: [400, 0],
				webhookId: `${path}-wait`,
				parameters: { resume: 'webhook', httpMethod: 'POST' },
			},
			{
				id: 'r4',
				name: 'Set',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [600, 0],
				parameters: {
					assignments: {
						assignments: [
							{ id: 'a', name: 'answer', value: '={{ $json.body.answer }}', type: 'number' },
						],
					},
				},
			},
		],
		connections: {
			Webhook: { main: [[{ node: 'Respond', type: 'main', index: 0 }]] },
			Respond: { main: [[{ node: 'Wait', type: 'main', index: 0 }]] },
			Wait: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
		},
	});

	const started = await fetch(`${BASE}/webhook/${path}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: '{}',
	});
	const { resumeUrl } = await started.json();
	check(
		'the response has an n8n resume URL',
		typeof resumeUrl === 'string' && resumeUrl.includes('/webhook-waiting/wfrt-'),
		resumeUrl,
	);

	let waiting;
	for (let i = 0; i < 25 && !waiting; i++) {
		await sleep(200);
		waiting = (await listExecutions(workflow.id)).find((e) => e.status === 'waiting');
	}
	check('the execution waits', Boolean(waiting));

	check('the resume URL is signed', /[?&]signature=[0-9a-f]{32}/.test(resumeUrl), resumeUrl);
	const post = async (url) =>
		await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ answer: 1 }),
		});
	const unsigned = await post(withSignature(resumeUrl, null));
	check('n8n refuses a resume without signature', unsigned.status === 401, unsigned.status);
	const wrong = await post(withSignature(resumeUrl, wrongSignature(resumeUrl)));
	check('n8n refuses a resume with a wrong signature', wrong.status === 401, wrong.status);
	const wfrtId = new URL(resumeUrl).pathname.split('/').at(-1);
	const direct = await post(`${WFRT_URL}/resume/${wfrtId}?signature=${wrongSignature(resumeUrl)}`);
	check('wfrt refuses a resume with a wrong signature', direct.status === 403, direct.status);
	const stillWaiting = waiting ? await rest('GET', `/executions/${waiting.id}`) : undefined;
	check('the execution still waits', stillWaiting?.status === 'waiting', stillWaiting?.status);

	const resumed = await fetch(resumeUrl, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ answer: 42 }),
	});
	check('the resume URL answers 200', resumed.status === 200, await resumed.text());
	const execution = waiting ? await waitForExecutionId(waiting.id) : undefined;
	check('the resumed execution succeeded', execution?.status === 'success', execution?.status);
	const runData = execution ? runDataOf(execution) : {};
	check(
		'Set has the answer of the resume request',
		runData.Set?.[0]?.data?.main[0][0]?.json?.answer === 42,
		runData.Set,
	);
	await rest('POST', `/workflows/${workflow.id}/deactivate`, {});
}

async function formCheck() {
	console.log('Fill in a Wait form through $execution.resumeFormUrl');
	const path = `${PATH}-form`;
	const workflow = await publish({
		name: `Compiled engine form ${PATH}`,
		settings: { engineType: 'compiled', executionOrder: 'v1' },
		nodes: [
			{
				id: 'f1',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				webhookId: path,
				parameters: { path, httpMethod: 'POST', responseMode: 'responseNode' },
			},
			{
				id: 'f2',
				name: 'Respond',
				type: 'n8n-nodes-base.respondToWebhook',
				typeVersion: 1.1,
				position: [200, 0],
				parameters: {
					respondWith: 'json',
					responseBody: '={"formUrl": "{{ $execution.resumeFormUrl }}"}',
				},
			},
			{
				id: 'f3',
				name: 'Wait',
				type: 'n8n-nodes-base.wait',
				typeVersion: 1.1,
				position: [400, 0],
				webhookId: `${path}-wait`,
				parameters: {
					resume: 'form',
					formTitle: 'Approve the order',
					formFields: { values: [{ fieldLabel: 'Name', requiredField: true }] },
				},
			},
			{
				id: 'f4',
				name: 'Set',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [600, 0],
				parameters: {
					assignments: {
						assignments: [{ id: 'a', name: 'who', value: '={{ $json.Name }}', type: 'string' }],
					},
				},
			},
		],
		connections: {
			Webhook: { main: [[{ node: 'Respond', type: 'main', index: 0 }]] },
			Respond: { main: [[{ node: 'Wait', type: 'main', index: 0 }]] },
			Wait: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
		},
	});

	const started = await fetch(`${BASE}/webhook/${path}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: '{}',
	});
	const { formUrl } = await started.json();
	check('the response has an n8n form URL', String(formUrl).includes('/form-waiting/wfrt-'), formUrl);
	await sleep(500);

	const unsignedPage = await fetch(withSignature(formUrl, null));
	check('n8n refuses the form page without signature', unsignedPage.status === 401, unsignedPage.status);
	const page = await fetch(formUrl);
	const html = await page.text();
	check('n8n serves the form page', page.status === 200 && html.includes('Approve the order'));

	const fields = new FormData();
	fields.append('field-0', 'Ada');
	const submitted = await fetch(formUrl, { method: 'POST', body: fields });
	check('the form submission answers 200', submitted.status === 200, await submitted.text());

	const execution = await waitForExecution({ workflowId: workflow.id });
	check('the form execution succeeded', execution.status === 'success', execution.status);
	check(
		'Set has the submitted name',
		runDataOf(execution).Set?.[0]?.data?.main[0][0]?.json?.who === 'Ada',
	);
	await rest('POST', `/workflows/${workflow.id}/deactivate`, {});
}

async function uploadCheck() {
	console.log('Upload a file to a webhook');
	const path = `${PATH}-upload`;
	const workflow = await publish({
		name: `Compiled engine upload ${PATH}`,
		settings: { engineType: 'compiled', executionOrder: 'v1' },
		nodes: [
			{
				id: 'u1',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				webhookId: path,
				parameters: { path, httpMethod: 'POST' },
			},
			{
				id: 'u2',
				name: 'Set',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [200, 0],
				parameters: {
					assignments: {
						assignments: [{ id: 'a', name: 'note', value: '={{ $json.body.note }}', type: 'string' }],
					},
				},
			},
		],
		connections: { Webhook: { main: [[{ node: 'Set', type: 'main', index: 0 }]] } },
	});

	const form = new FormData();
	form.append('note', 'hello');
	// About 10 MB, below n8n's default request limit of 16 MB.
	const fileText = 'compiled engine upload\n'.repeat(10 * 1024 * 1024 / 23);
	form.append('file', new Blob([fileText], { type: 'text/plain' }), 'hello.txt');
	const response = await fetch(`${BASE}/webhook/${path}`, { method: 'POST', body: form });
	check('the upload answers 200', response.status === 200, await response.text());

	const execution = await waitForExecution({ workflowId: workflow.id });
	const item = runDataOf(execution).Webhook?.[0]?.data?.main[0][0];
	check('the trigger item has the text field', item?.json?.body?.note === 'hello', item?.json);
	check(
		'the trigger item has the file as binary data',
		item?.binary?.file?.fileName === 'hello.txt' && item?.binary?.file?.mimeType === 'text/plain',
		item?.binary && Object.keys(item.binary),
	);
	const size = item?.binary?.file?.data ? Buffer.from(item.binary.file.data, 'base64').length : 0;
	// The execution keeps the base64 data, or an id in the binary data store with the size.
	const bytes = Buffer.byteLength(fileText);
	const fileSize = String(item?.binary?.file?.fileSize ?? '');
	check('the binary data has the whole file', size === bytes || fileSize.startsWith(String(bytes)), {
		size,
		fileSize,
		expected: bytes,
	});
	await rest('POST', `/workflows/${workflow.id}/deactivate`, {});
}

async function main() {
	const echo = createServer((req, res) => {
		let body = '';
		req.on('data', (d) => (body += d));
		req.on('end', () => {
			res.setHeader('content-type', 'application/json');
			res.end(JSON.stringify({ echoed: JSON.parse(body || '{}') }));
		});
	}).listen(ECHO_PORT, '127.0.0.1');

	try {
		await login();
		console.log(`Logged in to ${BASE}`);

		const workflow = await rest('POST', '/workflows', workflowBody());
		console.log(`Created workflow ${workflow.id}`);
		check('the workflow keeps engineType "compiled"', workflow.settings?.engineType === 'compiled', workflow.settings);

		const compiled = await rest('GET', `/compiled-engine/workflows/${workflow.id}/compile`);
		console.log('Compile result:', JSON.stringify(compiled));
		check('the workflow compiles', compiled.ok === true, compiled.diagnostics);
		check('HTTP Request runs native', compiled.nodes?.['HTTP Request'] === 'native', compiled.nodes);
		check('IF becomes code', compiled.nodes?.IF === 'code', compiled.nodes);

		await rest('POST', `/workflows/${workflow.id}/activate`, { versionId: workflow.versionId });
		console.log('Published the workflow');
		await sleep(500);

		const response = await fetch(`${BASE}/webhook/${PATH}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ amount: 20 }),
		});
		const responseBody = await response.text();
		console.log(`Webhook answered ${response.status}: ${responseBody}`);
		check('the webhook answers 200', response.status === 200);
		check(
			'the webhook returns the echoed items',
			responseBody.includes('"echoed"') && responseBody.includes('"big":true'),
			responseBody,
		);

		const production = await waitForExecution({ workflowId: workflow.id });
		check('the production execution succeeded', production.status === 'success', production.status);
		check('the production execution has mode webhook', production.mode === 'webhook', production.mode);
		const prodRunData = runDataOf(production);
		check(
			'the production execution has run data of the trigger and the HTTP Request',
			prodRunData.Webhook && prodRunData['HTTP Request'],
			Object.keys(prodRunData),
		);

		const manual = await rest('POST', `/workflows/${workflow.id}/run`, {
			triggerToStartFrom: {
				name: 'Webhook',
				data: {
					startTime: Date.now(),
					executionTime: 0,
					executionIndex: 0,
					source: [],
					data: { main: [[{ json: { headers: {}, params: {}, query: {}, body: { amount: 42 } } }]] },
				},
			},
		});
		check('the manual run starts', typeof manual.executionId === 'string', manual);
		const execution = await waitForExecutionId(manual.executionId);
		check('the manual execution succeeded', execution.status === 'success', execution.status);
		const runData = runDataOf(execution);
		console.log('Manual run data by node:');
		for (const [name, runs] of Object.entries(runData)) {
			console.log(`  ${name}: ${JSON.stringify(runs[0]?.data?.main?.map((o) => o.map((i) => i.json)))}`);
		}
		check('the trigger has the request', runData.Webhook?.[0]?.data?.main[0][0]?.json?.body?.amount === 42);
		check(
			'HTTP Request has the echoed item',
			runData['HTTP Request']?.[0]?.data?.main[0][0]?.json?.echoed?.amount === 42,
			runData['HTTP Request'],
		);
		check('Respond has a run', Boolean(runData.Respond?.[0]), Object.keys(runData));

		await rest('POST', `/workflows/${workflow.id}/deactivate`, {});
		console.log('Unpublished the workflow');

		await scheduleCheck();
		await stopCheck();
		await resumeCheck();
		await formCheck();
		await uploadCheck();
	} finally {
		echo.close();
	}

	console.log(failures === 0 ? 'All checks passed' : `${failures} check(s) failed`);
	process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
