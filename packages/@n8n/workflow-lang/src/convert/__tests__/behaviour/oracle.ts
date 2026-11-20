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
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BehaviourCase } from './case.ts';
import type { OracleWorkflow, ServiceCall } from './oracle-engine.ts';
import { runOracle } from './oracle-engine.ts';
import { answerOf, answerParts, ORACLE_PORT } from './case.ts';

const here = dirname(fileURLToPath(import.meta.url));

interface Captured {
	requests: Array<{ path: string; method: string; body: unknown }>;
	responses: unknown[];
}

type Loose = Record<string, unknown>;

/** The class of a credential type of n8n-nodes-base. */
function credentialType(name: string): Loose {
	const req = createRequire(join(here, '../../../../../workflow-fallback-host/package.json'));
	const root = dirname(req.resolve('n8n-nodes-base/package.json'));
	const known: Record<string, { className: string; sourcePath: string } | undefined> = req(
		join(root, 'dist/known/credentials.json'),
	);
	const entry = known[name];
	if (!entry) throw new Error(`unknown credential type ${name}`);
	const mod: Record<string, new () => Loose> = req(join(root, entry.sourcePath));
	return new mod[entry.className]();
}

/**
 * The credentials helper of n8n's CLI, reduced to what a case needs: the data of the case,
 * and `authenticate` of a credential type (a function, or the generic form with
 * `{{$credentials.x}}` expressions), as `CredentialsHelper.authenticate` applies it.
 */
function credentialsHelper(data: Record<string, Record<string, unknown>>) {
	const resolve = (value: unknown, credentials: Loose): string =>
		String(value)
			.replace(/^=/, '')
			.replace(/\{\{\s*\$credentials\.(\w+)\s*\}\}/g, (_all, key: string) =>
				String(credentials[key] ?? ''),
			);
	return {
		getParentTypes: (name: string): string[] => {
			const parents = credentialType(name).extends;
			return Array.isArray(parents) ? parents.map(String) : [];
		},
		isCredentialUsableByNode: () => true,
		async authenticate(credentials: Loose, typeName: string, requestOptions: Loose) {
			const type = credentialType(typeName);
			const auth = type.authenticate;
			if (typeof auth === 'function') return await auth.call(type, credentials, requestOptions);
			if (typeof auth !== 'object' || auth === null) return requestOptions;
			const properties: Record<string, Loose> = Reflect.get(auth, 'properties');
			for (const [outer, values] of Object.entries(properties)) {
				const target: Loose = { ...(requestOptions[outer] as Loose | undefined) };
				for (const [key, value] of Object.entries(values)) {
					target[resolve(key, credentials)] = resolve(value, credentials);
				}
				requestOptions[outer] = target;
			}
			return requestOptions;
		},
		preAuthentication: async () => undefined,
		runPreAuthentication: async () => undefined,
		getDecrypted: async (_additionalData: unknown, _node: unknown, type: string) =>
			structuredClone(data[type] ?? {}),
		updateCredentials: async () => {},
		updateCredentialsOauthTokenData: async () => {},
		getCredentialsProperties: () => [],
	};
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
	const services: ServiceCall[] = [];
	const answered = new Map<string, number>();
	const deduplication = (call: ServiceCall) => {
		const n = answered.get(call.step) ?? 0;
		answered.set(call.step, n + 1);
		services.push(call);
		return spec.services?.[call.step]?.[n];
	};
	const result = await runOracle(parsed, {
		start: triggerNode.name,
		item,
		mode,
		...(spec.runDetails ? { withRunDetails: true } : {}),
		...(spec.runTimeoutMs === undefined ? {} : { timeoutMs: spec.runTimeoutMs }),
		...(spec.services ? { deduplication } : {}),
		...(spec.credentials
			? { additionalData: { credentialsHelper: credentialsHelper(spec.credentials) } }
			: {}),
	});
	captured.responses.push(...result.responses);
	return {
		...(spec.services ? { services } : {}),
		...(result.customData ? { customData: result.customData } : {}),
		...(result.nodeMetadata ? { nodeMetadata: result.nodeMetadata } : {}),
		...(result.pairedItems ? { pairedItems: result.pairedItems } : {}),
		...(result.runSizes ? { runSizes: result.runSizes } : {}),
		...(result.runs ? { runs: result.runs } : {}),
		generatedBy: 'oracle.ts: n8n-core WorkflowExecute with n8n-nodes-base, executionOrder v1',
		error: result.error,
		...(result.errorDescription ? { errorDescription: result.errorDescription } : {}),
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
				const found = answerOf(spec, url.pathname, counters);
				let parsed: unknown = body;
				try {
					parsed = body === '' ? undefined : JSON.parse(body);
				} catch {}
				if (!found) {
					response.writeHead(404).end();
					return;
				}
				captured.requests.push({
					path: `${url.pathname}${url.search}`,
					method: request.method ?? '',
					body: parsed,
				});
				const parts = answerParts(found.answer);
				response.writeHead(parts.status, parts.headers);
				response.end(parts.body);
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
