import { once } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { executeWorkflow, loadWorkflow } from '../src';

function codeWorkflow(jsCode: string) {
	return loadWorkflow({
		name: 'Code',
		nodes: [
			{
				id: '1',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: '2',
				name: 'Run',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [220, 0],
				parameters: { jsCode },
			},
		],
		connections: { Start: { main: [[{ node: 'Run', type: 'main', index: 0 }]] } },
	});
}

async function luxonCopies() {
	const fromWorkflow = createRequire(require.resolve('n8n-workflow'));
	const luxonDir = path.dirname(fromWorkflow.resolve('luxon/package.json'));
	const esm = await import(pathToFileURL(path.join(luxonDir, 'build/es6/luxon.mjs')).href);
	return [fromWorkflow('luxon'), esm] as Array<{ DateTime: { prototype: object } }>;
}

async function workflowCopies() {
	const esm = await import('n8n-workflow');
	return [createRequire(__filename)('n8n-workflow'), esm] as Array<typeof esm>;
}

test('leaves the test process unchanged after a Code node ran with an env option', async () => {
	const { allocUnsafe, poolSize } = Buffer;

	const result = await executeWorkflow(
		codeWorkflow('return [{ json: { region: $env.REGION } }];'),
		{ env: { REGION: 'eu' } },
	);

	expect(result.output).toEqual([{ region: 'eu' }]);
	expect(Buffer.poolSize).toBe(poolSize);
	expect(Buffer.allocUnsafe).toBe(allocUnsafe);
	expect(Object.isFrozen(Object.prototype)).toBe(false);
	for (const { DateTime } of await luxonCopies()) {
		expect(Object.isFrozen(DateTime.prototype)).toBe(false);
	}
	for (const { Workflow } of await workflowCopies()) {
		expect(Object.isFrozen(Workflow.prototype)).toBe(false);
	}
});

test('gives the code no direct network access', async () => {
	let received = 0;
	const server = createServer((_request, response) => {
		received += 1;
		response.end();
	});
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
	const attempt = (code: string) =>
		`(async () => { try { return String(await (async () => { ${code} })()); } catch (error) { return error.message; } })()`;

	let result: Awaited<ReturnType<typeof executeWorkflow>>;
	try {
		result = await executeWorkflow(
			codeWorkflow(`return [{ json: {
				fetch: typeof fetch,
				XMLHttpRequest: typeof XMLHttpRequest,
				WebSocket: typeof WebSocket,
				http: await ${attempt(`require('http').get('${url}')`)},
				https: await ${attempt(`require('https').get('${url}')`)},
				undici: await ${attempt(`require('undici').request('${url}')`)},
			} }];`),
		);
	} finally {
		server.close();
	}

	expect(result.output).toEqual([
		{
			fetch: 'undefined',
			XMLHttpRequest: 'undefined',
			WebSocket: 'undefined',
			http: expect.stringContaining("Module 'http' is disallowed"),
			https: expect.stringContaining("Module 'https' is disallowed"),
			undici: expect.stringContaining("Module 'undici' is disallowed"),
		},
	]);
	expect(received).toBe(0);
});
