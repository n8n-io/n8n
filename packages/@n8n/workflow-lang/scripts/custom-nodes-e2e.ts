/**
 * End-to-end test of community and custom nodes: a workflow with the nodes of
 * the hand-written fixture package (`workflow-fallback-host/test-fixtures`) is
 * converted, compiled, and run on `wfrt` with the fallback host. The host
 * loads the package from a nodes folder and the custom node from a custom
 * extension folder, as n8n does.
 *
 *   node scripts/custom-nodes-e2e.ts
 *
 * Needs the built host (`pnpm --filter @n8n/workflow-fallback-host build`) and
 * `wfrt` (`workflow-runtime/zig-out/bin/wfrt`). Exits 1 when a check fails.
 */
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { compile } from '../src/compiler/index.ts';
import { convertWorkflow } from '../src/convert/index.ts';
import { packageRoot } from './gym/sample.ts';
import { startLocalEngine, stopAll } from './gym/processes.ts';
import { WfrtClient } from './gym/wfrt.ts';

const fixtures = join(packageRoot, '..', 'workflow-fallback-host', 'test-fixtures');
const work = mkdtempSync(join(tmpdir(), 'wfrt-custom-nodes-'));

const keys: string[] = [];
const server = createServer((request, response) => {
	keys.push(String(request.headers['x-acme-key'] ?? ''));
	response.setHeader('content-type', 'application/json');
	response.end(
		request.url === '/items'
			? JSON.stringify([{ id: 1 }, { id: 2 }])
			: JSON.stringify({ hello: 'world' }),
	);
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

const credentials = { acmeApi: { id: 'acme-1', name: 'Acme account' } };
const workflow = {
	name: 'Custom nodes',
	nodes: [
		{
			name: 'Hook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [0, 0],
			parameters: { path: 'acme', httpMethod: 'POST' },
		},
		{
			name: 'Acme',
			type: 'n8n-nodes-acme.acme',
			typeVersion: 1,
			position: [200, 0],
			parameters: { path: '/hello' },
			credentials,
		},
		{
			name: 'Acme Items',
			type: 'n8n-nodes-acme.acmeItems',
			typeVersion: 1,
			position: [400, 0],
			parameters: { operation: 'list' },
			credentials,
		},
		{
			name: 'Echo',
			type: 'CUSTOM.acmeEcho',
			typeVersion: 1,
			position: [600, 0],
			parameters: { mark: '={{ $json.id * 10 }}' },
		},
	],
	connections: {
		Hook: { main: [[{ node: 'Acme', type: 'main', index: 0 }]] },
		Acme: { main: [[{ node: 'Acme Items', type: 'main', index: 0 }]] },
		'Acme Items': { main: [[{ node: 'Echo', type: 'main', index: 0 }]] },
	},
	settings: { executionOrder: 'v1' },
};

let failed = false;
const check = (ok: boolean, what: string) => {
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
	if (!ok) failed = true;
};

try {
	const converted = convertWorkflow(workflow, { trace: 'all' });
	check(converted.ok, `convert (${converted.diagnostics.map((d) => d.message).join('; ')})`);
	const compiled = compile(converted.source, { fileName: '/workflow.ts' });
	check(compiled.ok && compiled.module !== undefined, 'compile');
	if (!compiled.module) throw new Error('no module');

	cpSync(join(fixtures, 'n8n-nodes-acme'), join(work, 'nodes', 'node_modules', 'n8n-nodes-acme'), {
		recursive: true,
	});
	const credentialsFile = join(work, 'credentials.json');
	const slots = converted.credentials ?? {};
	const data: Record<string, unknown> = {};
	for (const [slot, ref] of Object.entries(slots)) {
		data[slot] = { type: ref.type, data: { url, apiKey: 'k-123' } };
	}
	writeFileSync(credentialsFile, JSON.stringify(data), { mode: 0o600 });

	const engine = await startLocalEngine(work, {
		WF_FALLBACK_NODES_DIR: join(work, 'nodes'),
		WF_FALLBACK_CUSTOM_EXTENSIONS: join(fixtures, 'custom'),
	});
	const wfrt = new WfrtClient(engine.wfrtAdmin, engine.wfrtSecret);
	await wfrt.open();
	await wfrt.putWorkflow('custom-nodes', {
		versionId: 'v1',
		module: Buffer.from(compiled.module).toString('base64'),
		active: false,
		webhookPrefix: '/webhook',
		credentials: data,
	});
	const run = await wfrt.run('custom-nodes', '1', { body: {}, headers: {}, query: {} }, 60_000);
	wfrt.close();
	const end = run.end;
	check(
		end?.type === 'finished' && end.status === 'ok',
		`run finished ok (${JSON.stringify(end)})`,
	);
	const trace = (step: string) =>
		run.events.find((e) => e.type === 'trace' && e.step === step)?.items;
	check(
		JSON.stringify(trace('Acme')) === JSON.stringify([{ hello: 'world', item: 0 }]),
		`programmatic node: ${JSON.stringify(trace('Acme'))}`,
	);
	check(
		JSON.stringify(trace('Acme Items')) === JSON.stringify([{ id: 1 }, { id: 2 }]),
		`declarative node: ${JSON.stringify(trace('Acme Items'))}`,
	);
	check(
		JSON.stringify(trace('Echo')) ===
			JSON.stringify([
				{ id: 1, mark: 10 },
				{ id: 2, mark: 20 },
			]),
		`custom folder node: ${JSON.stringify(trace('Echo'))}`,
	);
	check(
		keys.length === 2 && keys.every((k) => k === 'k-123'),
		`credential type signs: ${keys.join(',')}`,
	);
} finally {
	await stopAll();
	server.close();
	rmSync(work, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
