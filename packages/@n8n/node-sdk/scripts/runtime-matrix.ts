// Checks each guest runtime against the full fixture replay and the escape probes, and prints a
// markdown matrix. A FAIL of an escape probe is a result about the runtime, not a bug.
// Usage: pnpm exec tsx scripts/runtime-matrix.ts --runtime in-process,worker,wasm,container --timeout 120
// Default: every runtime of the registry, 120 s for each.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { parseArgs } from 'node:util';
import type { IHttpRequestOptions } from 'n8n-workflow';

import {
	firstPartyActionIds,
	firstPartyCredentialType,
	firstPartyVersionsOf as versionsOf,
	fixturesFileOf,
} from '../src/__tests__/first-party';
import { escapeProbes } from '../src/__tests__/escape-probes';
import { compat, defineCredential, field } from '../src/credentials';
import { freezeAction } from '../src/freeze';
import { replayFixtures } from '../src/publish';
import {
	hostRuntime,
	loadExecutor,
	type Executor,
	type ExecutorHost,
	type FrozenVersion,
} from '../src/runtime';
import { sandboxedVersionOf, type GuestRuntime, type SandboxOptions } from '../src/sandbox';
import { parseFixtures } from '../src/version';
import { RUNTIME_NAMES, runtimeByName } from './runtimes';

// One host runtime for every run of the script.
const HOST = hostRuntime();

const LIMITS = { cpuMs: 1_000, memoryMb: 64, wallMs: 3_000 };
/** A probe that runs longer than this was not stopped by its runtime. */
const GUARD_MS = 10_000;
const TIMEOUT = 'timeout';
const SECRET = 'key-secret-1';

const acmeToken = defineCredential({
	id: 'acme.token',
	legacyName: 'acmeApi',
	displayName: 'Acme API',
	fields: { account: field.text('Account ID'), apiKey: field.secret('API Key') },
	baseUrl: 'https://api.acme.test',
	auth: (a) => a.bearer('apiKey'),
});
const shippedCredentialType = (name: string) => firstPartyCredentialType(name) ?? compat(name);
const credentialType = (name: string) =>
	name === 'acmeApi' ? acmeToken : shippedCredentialType(name);

// Under the package, not the OS temp dir: Docker in a VM can bind-mount only shared paths.
const CACHE_ROOT = path.resolve(__dirname, '../node_modules/.cache');
mkdirSync(CACHE_ROOT, { recursive: true });
const workDir = mkdtempSync(path.join(CACHE_ROOT, 'runtime-matrix-'));
const sandboxOptions = (runtime: GuestRuntime, limits = {}): SandboxOptions => ({
	runtime,
	cacheDir: path.join(workDir, 'cache'),
	credentialType,
	limits,
});

const messageOf = (error: unknown) =>
	(error instanceof Error ? error.message : String(error)).split('\n')[0].slice(0, 100);
const cellText = (text: string) => text.replaceAll('|', '\\|').replaceAll('\n', ' ');

interface Runtime {
	readonly name: string;
	readonly runtime: GuestRuntime | undefined;
}

/** Rejects `work` when it takes longer than `ms`. The work itself goes on. */
const raced = async <T>(work: Promise<T>, ms: number, message: string) =>
	await Promise.race([
		work,
		new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error(message)), Math.max(0, ms)).unref(),
		),
	]);

/** The time of one runtime: every step after `ms` rejects with `TIMEOUT`. */
const budgetOf = (ms: number) => {
	const end = Date.now() + ms;
	return {
		expired: () => Date.now() >= end,
		within: async <T>(work: Promise<T>) => await raced(work, end - Date.now(), TIMEOUT),
	};
};
type Budget = ReturnType<typeof budgetOf>;

/** The replay issues of every action, as in `versions.test.ts`. Stops at the end of `budget`. */
async function replayAll({ runtime }: Runtime, budget: Budget) {
	const issues: string[] = [];
	for (const id of firstPartyActionIds) {
		if (budget.expired()) return [...issues, TIMEOUT];
		const [head] = versionsOf(id);
		if (!head) {
			issues.push(`${id} has no bundled HEAD`);
			continue;
		}
		const loaded = runtime
			? await budget
					.within(sandboxedVersionOf(head, sandboxOptions(runtime), HOST))
					.catch((error: unknown) => new Error(messageOf(error)))
			: undefined;
		if (loaded instanceof Error) {
			issues.push(`${id} refused: ${loaded.message}`);
			continue;
		}
		const fixtures = parseFixtures(readFileSync(fixturesFileOf(id), 'utf8'));
		const replayed = await budget
			.within(
				replayFixtures(
					{ manifest: head.manifest, bundle: await head.readBundle() },
					fixtures,
					loaded && { contract: loaded.action, executor: loaded.executor, migrate: loaded.migrate },
				),
			)
			.catch((error: unknown) => [`${id}: ${messageOf(error)}`]);
		issues.push(...replayed);
	}
	return issues;
}

/** What this process saw outside the host calls: canary hits and errors that no run awaited. */
const observed = { canaryHits: 0, lateErrors: 0 };
process.on('unhandledRejection', () => {
	observed.lateErrors += 1;
});

/** What the host saw of one probe run. */
interface Seen {
	readonly requests: IHttpRequestOptions[];
	readonly canaryHits: number;
	readonly lateErrors: number;
}

const hostOf = (requests: IHttpRequestOptions[]): ExecutorHost => ({
	items: [{ json: {} }],
	node: {
		id: '1',
		name: 'Probe',
		type: 'probe',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: { acmeApi: { id: '1', name: 'Acme' } },
	},
	parameter: () => undefined,
	request: async (request) => {
		requests.push(request);
		return { body: { ok: true }, headers: {}, statusCode: 200 };
	},
	continueOnFail: () => false,
	credentialData: async () => ({ account: 'acc-1', apiKey: SECRET }),
});

type Outcome = { value: unknown } | { error: string };

/** `pass` or `FAIL`, with what was seen. */
type Judge = (outcome: Outcome, seen: Seen) => readonly [boolean, string];

const shown = (outcome: Outcome) =>
	'error' in outcome ? `refused: ${outcome.error}` : `ran: ${String(outcome.value).slice(0, 60)}`;
const refused =
	(pattern = /./): Judge =>
	(outcome) => ['error' in outcome && pattern.test(outcome.error), shown(outcome)];

/** Each probe and when its runtime holds. `stopsHost` would stop or crash the process it runs in. */
const CHECKS: ReadonlyArray<{
	label: string;
	probe: string;
	judge: Judge;
	stopsHost?: true;
}> = [
	{
		label: 'global `fetch`',
		probe: 'fetchProbe',
		judge: (outcome, seen) => [seen.canaryHits === 0, shown(outcome)],
	},
	{
		label: '`process.env`',
		probe: 'processProbe',
		judge: (outcome) => ['error' in outcome || outcome.value !== 'secret', shown(outcome)],
	},
	{ label: "`import('node:fs')`", probe: 'importProbe', judge: refused() },
	{
		label: "network through `process.getBuiltinModule('node:http')`",
		probe: 'builtinNetProbe',
		judge: (outcome, seen) => [seen.canaryHits === 0, shown(outcome)],
	},
	{
		label: '`setTimeout` after the run',
		probe: 'timerProbe',
		judge: (outcome, seen) => [
			seen.requests.length + seen.canaryHits + seen.lateErrors === 0,
			`${shown(outcome)}; late: ${seen.requests.length} requests, ${seen.lateErrors} errors`,
		],
	},
	{ label: 'endless loop', probe: 'loopProbe', judge: refused(), stopsHost: true },
	{ label: 'memory blow-up', probe: 'memoryProbe', judge: refused(), stopsHost: true },
	{
		label: 'ungranted import',
		probe: 'undeclaredProbe',
		// The guest grant check, or the import check of the in-process executor.
		judge: refused(/which its manifest does not grant|does not list "dataTables" in its imports/),
	},
	{
		label: 'egress outside the allowlist',
		probe: 'egressProbe',
		judge: (outcome, seen) => [
			'error' in outcome && seen.requests.length === 0,
			`${shown(outcome)}; ${seen.requests.length} requests`,
		],
	},
	{
		label: 'credential secret',
		probe: 'credentialProbe',
		judge: (outcome) => [
			'error' in outcome || !String(outcome.value).includes(SECRET),
			shown(outcome),
		],
	},
	{
		label: 'prototype pollution',
		probe: 'pollutionProbe',
		judge: (outcome) => {
			const leaked = 'polluted' in {};
			// The probe changed this realm. Undo it, so the later checks see a clean host.
			Reflect.deleteProperty(Object.prototype, 'polluted');
			return [!leaked, `${shown(outcome)}; host sees it: ${leaked}`];
		},
	},
];

/** Rejects, and does not judge, when the runtime does not stop the probe or the budget ends. */
async function probeCell(
	{ runtime }: Runtime,
	frozen: FrozenVersion,
	judge: Judge,
	budget: Budget,
) {
	const before = { ...observed };
	const requests: IHttpRequestOptions[] = [];
	const executor: Executor = runtime
		? (await budget.within(sandboxedVersionOf(frozen, sandboxOptions(runtime, LIMITS), HOST)))
				.executor
		: await loadExecutor(frozen, HOST);
	const ran: Promise<Outcome> = executor(hostOf(requests)).then(
		(out) => ({ value: out[0]?.[0]?.json.value }),
		(error: unknown) => ({ error: messageOf(error) }),
	);
	const outcome = await budget.within(raced(ran, GUARD_MS, `not stopped after ${GUARD_MS} ms`));
	// A timer of the bundle gets time to fire.
	await new Promise((resolve) => setTimeout(resolve, 300));
	const [held, detail] = judge(outcome, {
		requests,
		canaryHits: observed.canaryHits - before.canaryHits,
		lateErrors: observed.lateErrors - before.lateErrors,
	});
	return `${held ? 'pass' : '**FAIL**'}: ${detail}`;
}

async function main() {
	const { values } = parseArgs({
		options: {
			runtime: { type: 'string', default: RUNTIME_NAMES.join(',') },
			timeout: { type: 'string', default: '120' },
		},
	});
	const resolved = await Promise.all(
		values.runtime.split(',').map(async (name) => {
			try {
				return { name, runtime: await runtimeByName(name) };
			} catch (error) {
				console.log(
					`- skipped ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`,
				);
				return undefined;
			}
		}),
	);
	const runtimes = resolved.filter((each): each is Runtime => each !== undefined);
	if (runtimes.length === 0) throw new Error('No runtime is available');

	const server = createServer((_request, response) => {
		observed.canaryHits += 1;
		response.end('reached');
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	const port = typeof address === 'object' && address ? address.port : 0;
	const probesFile = path.join(workDir, 'probes.ts');
	writeFileSync(probesFile, escapeProbes(`http://127.0.0.1:${port}/`));
	process.env.SANDBOX_CANARY = 'secret';
	const probeRuns = await Promise.all(
		CHECKS.map(async (check) => {
			const { manifest, bundle } = await freezeAction(probesFile, check.probe);
			const frozen: FrozenVersion = { manifest, origin: 'private', readBundle: async () => bundle };
			return { ...check, frozen };
		}),
	);

	const columns = new Map<string, string[]>();
	const replayIssues: string[] = [];
	for (const runtime of runtimes) {
		console.error(`# ${runtime.name}`);
		const budget = budgetOf(Number(values.timeout) * 1000);
		const issues = await replayAll(runtime, budget);
		const shownIssues = issues.slice(0, 10).map((issue) => `- ${runtime.name}: ${issue}`);
		const more = issues.length > 10 ? [`- ${runtime.name}: and ${issues.length - 10} more`] : [];
		replayIssues.push(...shownIssues, ...more);
		const replay = issues.includes(TIMEOUT)
			? `**timeout** after ${values.timeout} s`
			: issues.length === 0
				? `pass: ${firstPartyActionIds.length} actions`
				: `**FAIL**: ${issues.length} issues`;
		const probes: string[] = [];
		for (const { judge, stopsHost, frozen } of probeRuns) {
			if (!runtime.runtime && stopsHost) {
				probes.push('n/a: no limit, would stop this process');
				continue;
			}
			probes.push(
				await probeCell(runtime, frozen, judge, budget).catch((error: unknown) =>
					messageOf(error) === TIMEOUT
						? `**timeout** after ${values.timeout} s`
						: `**FAIL**: ${messageOf(error)}`,
				),
			);
		}
		columns.set(runtime.name, [replay, ...probes]);
	}

	const labels = ['fixture replay', ...CHECKS.map(({ label }) => label)];
	const names = runtimes.map(({ name }) => name);
	console.log(`\n| check | ${names.join(' | ')} |\n|---|${names.map(() => '---').join('|')}|`);
	labels.forEach((label, index) =>
		console.log(
			`| ${label} | ${names.map((name) => cellText(columns.get(name)?.[index] ?? '')).join(' | ')} |`,
		),
	);
	if (replayIssues.length > 0) console.log(`\nReplay issues:\n\n${replayIssues.join('\n')}`);
	await new Promise((resolve) => server.close(resolve));
}

main()
	.catch((error: unknown) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(() => {
		rmSync(workDir, { recursive: true, force: true });
		// A guest that its runtime did not stop may still hold the event loop.
		process.exit();
	});
