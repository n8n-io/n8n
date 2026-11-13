/**
 * Runs each behaviour case in n8n's real engine and writes `expected.json`.
 *
 * It loads `WorkflowExecute` from n8n-core and node classes from the built
 * n8n-nodes-base package (through the fallback host package, which depends on
 * both). HTTP Request nodes call a local server that answers from `case.json`.
 * The Code node needs a task runner process in n8n; this script gives it a
 * small stand-in that runs the code in `node:vm` with the real workflow data
 * proxy (`$input`, `$json`, `$(…)`).
 *
 * Run (needs built n8n-core and n8n-nodes-base):
 *   node src/convert/__tests__/behaviour/oracle.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BehaviourCase } from './case.ts';
import type { OracleWorkflow } from './oracle-engine.ts';
import { runOracle } from './oracle-engine.ts';
import { ORACLE_PORT } from './case.ts';

const here = dirname(fileURLToPath(import.meta.url));

interface Captured {
	requests: Array<{ path: string; method: string; body: unknown }>;
	responses: unknown[];
}

async function runCase(dir: string, port: number, captured: Captured): Promise<unknown> {
	const workflowJson = JSON.parse(
		readFileSync(join(dir, 'workflow.json'), 'utf8'),
	) as OracleWorkflow;
	const spec = JSON.parse(readFileSync(join(dir, 'case.json'), 'utf8')) as BehaviourCase;
	const text = JSON.stringify(workflowJson).replaceAll(
		`127.0.0.1:${ORACLE_PORT}`,
		`127.0.0.1:${port}`,
	);
	const parsed = JSON.parse(text) as OracleWorkflow;
	const triggerNode = parsed.nodes.find(
		(n) => n.type === 'n8n-nodes-base.webhook' || n.type.endsWith('Trigger'),
	);
	if (!triggerNode) throw new Error('no trigger');
	const mode = triggerNode.type === 'n8n-nodes-base.webhook' ? 'webhook' : 'trigger';
	const item =
		mode === 'webhook'
			? {
					headers: spec.trigger.headers ?? {},
					params: {},
					query: spec.trigger.query ?? {},
					body: spec.trigger.body,
				}
			: { scheduledAt: spec.trigger.scheduledAt };
	const result = await runOracle(parsed, { start: triggerNode.name, item, mode });
	captured.responses.push(...result.responses);
	return {
		generatedBy: 'oracle.ts: n8n-core WorkflowExecute with n8n-nodes-base, executionOrder v1',
		error: result.error,
		order: result.order,
		nodes: result.nodes,
		requests: captured.requests,
		responses: captured.responses,
	};
}

async function main() {
	const casesDir = join(here, 'cases');
	const only = process.argv[2];
	for (const name of readdirSync(casesDir).sort()) {
		if (only && name !== only) continue;
		const dir = join(casesDir, name);
		const spec = JSON.parse(readFileSync(join(dir, 'case.json'), 'utf8')) as BehaviourCase;
		const captured: Captured = { requests: [], responses: [] };
		const counters = new Map<string, number>();
		const server = createServer((request, response) => {
			let body = '';
			request.on('data', (c: Buffer) => {
				body += c.toString();
			});
			request.on('end', () => {
				const url = new URL(request.url ?? '/', 'http://localhost');
				const segment = url.pathname.split('/')[1] ?? '';
				const step = Object.entries(spec.http ?? {}).find(([, v]) => v.path === segment);
				let parsed: unknown = body;
				try {
					parsed = body === '' ? undefined : JSON.parse(body);
				} catch {}
				captured.requests.push({
					path: `${url.pathname}${url.search}`,
					method: request.method ?? '',
					body: parsed,
				});
				if (!step) {
					response.writeHead(404).end();
					return;
				}
				const n = counters.get(step[0]) ?? 0;
				counters.set(step[0], n + 1);
				const answer = step[1].responses[n % step[1].responses.length];
				response.writeHead(answer.status ?? 200, { 'content-type': 'application/json' });
				response.end(JSON.stringify(answer.body ?? {}));
			});
		});
		await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
		const { port } = server.address() as AddressInfo;
		try {
			const expected = await runCase(dir, port, captured);
			const text = JSON.stringify(expected, null, '\t').replaceAll(
				`127.0.0.1:${port}`,
				`127.0.0.1:${ORACLE_PORT}`,
			);
			writeFileSync(join(dir, 'expected.json'), `${text}\n`);
			console.log(`${name}: ok`);
		} catch (e) {
			console.log(`${name}: ${e instanceof Error ? e.stack : String(e)}`);
		} finally {
			server.close();
		}
	}
	process.exit(0);
}

await main();
