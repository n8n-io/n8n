// Compares guest runtimes on the cost of running contract actions. Each case runs the runtimes in
// turn, so machine load hits all alike, and checks each output against `in-process`.
// Usage: pnpm exec tsx scripts/bench-runtimes.ts --runtime in-process,worker+pool+chunk,wasm --scenario fixed,w2
// Scenarios: fixed w1 w2 w3 payload binary (default: all).
import type { IBinaryData, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { execFile } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { parseArgs, promisify } from 'node:util';

import {
	packageOf,
	sandboxCredentialTypeOf,
	versionsOf,
} from '../../nodes-integrations/dist/index.js';
import {
	loadExecutor,
	nodeDescriptionOf,
	type BinaryStore,
	type Executor,
	type ExecutorHost,
	type FrozenVersion,
} from '../src/runtime';
import { sandboxedVersionOf, type GuestRuntime, type SandboxOptions } from '../src/sandbox';
import type { MockRoute } from '../src/testing';
import { parseFixtures } from '../src/version';
import { pooledRuntime } from '../src/runtimes/pool';
import { IN_PROCESS, runtimeByName } from './runtimes';

/** A runtime under test. Without `runtime`, the bundle runs in this process. */
interface Runtime {
	readonly name: string;
	readonly runtime: GuestRuntime | undefined;
	/** `+chunk`: per-item actions run their items in one guest run. */
	readonly chunkItems?: boolean;
}

interface Workload {
	readonly items: readonly IDataObject[];
	readonly params: Readonly<Record<string, unknown>>;
	readonly routes?: readonly MockRoute[];
	readonly latencyMs?: number;
}

const IN_PROCESS_RUNTIME: Runtime = { name: IN_PROCESS, runtime: undefined };

// Under the package, not the OS temp dir: Docker in a VM (colima) mounts only shared paths.
const CACHE_ROOT = path.resolve(__dirname, '../node_modules/.cache');
mkdirSync(CACHE_ROOT, { recursive: true });
const cacheDir = mkdtempSync(path.join(CACHE_ROOT, 'bench-runtimes-'));
const credentialType = sandboxCredentialTypeOf(() => true);
const sandboxOptions = (
	runtime: GuestRuntime,
	cache = cacheDir,
	chunkItems = false,
): SandboxOptions => ({
	runtime,
	cacheDir: cache,
	chunkItems,
	credentialType,
});

const now = () => performance.now();
const sorted = (xs: readonly number[]) => [...xs].sort((a, b) => a - b);
const median = (xs: readonly number[]) => sorted(xs)[Math.floor(xs.length / 2)] ?? NaN;
const p95 = (xs: readonly number[]) =>
	sorted(xs)[Math.min(xs.length - 1, Math.floor(xs.length * 0.95))] ?? NaN;
const fmt = (ms: number) =>
	ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(ms < 1 ? 3 : 1)} ms`;
const mb = (kb: number) => `${(kb / 1024).toFixed(0)} MB`;
const messageOf = (error: unknown) =>
	(error instanceof Error ? error.message : String(error)).split('\n')[0].slice(0, 120);
const table = (...columns: string[]) =>
	console.log(`| ${columns.join(' | ')} |\n|${columns.map(() => '---').join('|')}|`);
const row = (...cells: string[]) => console.log(`| ${cells.join(' | ')} |`);

const fixtureOf = (id: string, index = 0) => {
	const fixture = parseFixtures(
		readFileSync(path.join(packageOf(id).dir, 'fixtures', `${id}.json`), 'utf8'),
	).executions[index];
	if (!fixture) throw new Error(`${id} has no fixture ${index}`);
	return fixture;
};

const headOf = (id: string): FrozenVersion => {
	const [head] = versionsOf(id);
	if (!head) throw new Error(`${id} has no bundled HEAD`);
	return head;
};

const executors = new Map<string, Promise<Executor>>();
const executorFor = async (id: string, { name, runtime, chunkItems }: Runtime) => {
	const key = `${id}/${name}`;
	const head = headOf(id);
	const executor =
		executors.get(key) ??
		(runtime
			? sandboxedVersionOf(head, sandboxOptions(runtime, cacheDir, chunkItems)).then(
					({ executor }) => executor,
				)
			: loadExecutor(head));
	executors.set(key, executor);
	return await executor;
};

const binaries = new Map<string, { bytes: Buffer; meta: IBinaryData }>();
const addBinary = (fileName: string, bytes: Buffer, mimeType: string) =>
	binaries.set(fileName, {
		bytes,
		meta: { data: '', mimeType, fileName, fileSize: String(bytes.length), bytes: bytes.length },
	});

const binaryStore: BinaryStore = {
	input: async (_itemIndex, value) => {
		const entry = typeof value === 'string' ? binaries.get(value) : undefined;
		if (!entry) throw new Error(`no binary ${String(value)}`);
		return entry.meta;
	},
	read: async (meta) => {
		const entry =
			binaries.get(meta.fileName ?? '') ??
			[...binaries.values()].find(
				({ bytes }) => bytes.length === Number(meta.bytes ?? meta.fileSize),
			);
		if (!entry) throw new Error(`no binary for ${JSON.stringify(meta).slice(0, 200)}`);
		return Readable.from([entry.bytes]);
	},
	write: async (stream, { mimeType, fileName }) => {
		const chunks: Buffer[] = [];
		for await (const chunk of stream) chunks.push(Buffer.from(chunk));
		const bytes = Buffer.concat(chunks);
		const key = fileName ?? `written-${binaries.size}`;
		addBinary(key, bytes, mimeType ?? 'application/octet-stream');
		return binaries.get(key)?.meta ?? { data: '', mimeType: 'application/octet-stream' };
	},
};

const hostFor = (
	head: FrozenVersion,
	{ items, params, routes = [], latencyMs = 0 }: Workload,
): ExecutorHost => {
	const description = nodeDescriptionOf(head.manifest);
	const defaults = new Map(description.properties.map((p) => [p.name, p.default]));
	const calls = { count: 0 };
	return {
		items: items.map((json) => ({ json })),
		inputItems: () => [],
		node: {
			id: 'bench',
			name: head.manifest.id,
			type: description.name,
			typeVersion: head.manifest.contract.version,
			position: [0, 0],
			parameters: {},
			credentials: Object.fromEntries(
				head.manifest.contract.credentials.map((type) => [type, { id: 'bench', name: type }]),
			),
		},
		parameter: (name) => params[name] ?? defaults.get(name),
		request: async (options) => {
			// The network drains a streamed upload body.
			if (options.body instanceof Readable) for await (const _ of options.body);
			if (latencyMs) await new Promise((resolve) => setTimeout(resolve, latencyMs));
			const {
				json,
				headers = {},
				status = 200,
			} = routes[calls.count++ % Math.max(routes.length, 1)]?.reply ?? {};
			return options.returnFullResponse ? { body: json, headers, statusCode: status } : json;
		},
		continueOnFail: () => false,
		binary: binaryStore,
		credentialData: async () => ({ accessToken: 'bench', apiKey: 'bench', token: 'bench' }),
	};
};

const runOnce = async (id: string, runtime: Runtime, workload: Workload) => {
	const executor = await executorFor(id, runtime);
	const started = now();
	const out = await executor(hostFor(headOf(id), workload));
	return { ms: now() - started, out };
};

const jsonOf = (out: INodeExecutionData[][]) =>
	JSON.stringify(out.map((items) => items.map(({ json }) => json)));

/** `undefined` when the output of `runtime` is the output of `in-process`, else what differs. */
const outputCheck = async (id: string, runtime: Runtime, workload: Workload) => {
	if (runtime.name === IN_PROCESS) return undefined;
	const [expected, actual] = await Promise.allSettled(
		[IN_PROCESS_RUNTIME, runtime].map(async (each) =>
			jsonOf((await runOnce(id, each, workload)).out),
		),
	);
	if (actual.status === 'rejected') return `FAIL: ${messageOf(actual.reason)}`;
	if (expected.status === 'rejected') return undefined;
	return expected.value === actual.value ? undefined : 'output differs';
};

/** One row: the median, p95 and ratio to `in-process` of each runtime, run in turn. */
async function compare(
	label: string,
	id: string,
	workload: Workload,
	runs: number,
	runtimes: readonly Runtime[],
) {
	const notes = new Map<string, string | undefined>();
	for (const runtime of runtimes) notes.set(runtime.name, await outputCheck(id, runtime, workload));
	const times = new Map<string, number[]>(runtimes.map(({ name }) => [name, []]));
	for (let run = 0; run < runs; run++) {
		for (const runtime of runtimes) {
			if (notes.get(runtime.name)?.startsWith('FAIL')) continue;
			try {
				times.get(runtime.name)?.push((await runOnce(id, runtime, workload)).ms);
			} catch (error) {
				notes.set(runtime.name, `FAIL: ${messageOf(error)}`);
			}
		}
	}
	const baseline = median(times.get(IN_PROCESS) ?? []);
	const cellOf = ({ name }: Runtime) => {
		const note = notes.get(name);
		if (note?.startsWith('FAIL')) return note;
		const ms = times.get(name) ?? [];
		const ratio = Number.isNaN(baseline) ? '' : `, ${(median(ms) / baseline).toFixed(1)}x`;
		return `${fmt(median(ms))} (p95 ${fmt(p95(ms))}${ratio})${note ? ` **${note}**` : ''}`;
	};
	row(label, ...runtimes.map(cellOf));
}

const caseTable = (runtimes: readonly Runtime[]) =>
	table('case', ...runtimes.map(({ name }) => `${name} median (p95, ratio)`));

const person = (i: number) => ({
	id: i,
	name: `user ${i}`,
	email: `user${i}@example.com`,
	age: 18 + (i % 60),
	team: ['core', 'kernel', 'web'][i % 3],
	tags: ['a', 'b', 'c'].slice(0, i % 4),
});
const people = (count: number) => Array.from({ length: count }, (_, i) => person(i));

const timed = async (work: () => Promise<unknown>) => {
	const started = now();
	await work();
	return now() - started;
};

async function fixed(runtimes: readonly Runtime[]) {
	console.log('\n### Fixed costs\n');
	table(
		'runtime',
		'first bundle, empty cache',
		'next bundle',
		'same bundle again',
		'session start + close (median of 10)',
	);
	for (const { name, runtime } of runtimes) {
		if (!runtime) {
			const load = async (id: string) => await timed(async () => await loadExecutor(headOf(id)));
			const [first, next, again] = [
				await load('items.set'),
				await load('slack.message.send'),
				await load('slack.message.send'),
			];
			row(name, fmt(first), fmt(next), fmt(again), '—');
			continue;
		}
		const fresh = mkdtempSync(path.join(CACHE_ROOT, 'bench-runtimes-fixed-'));
		try {
			const load = async (id: string) =>
				await timed(
					async () => await sandboxedVersionOf(headOf(id), sandboxOptions(runtime, fresh)),
				);
			const [first, next, again] = [
				await load('items.set'),
				await load('slack.message.send'),
				await load('slack.message.send'),
			];
			const { start } = await sandboxedVersionOf(
				headOf('items.set'),
				sandboxOptions(runtime, fresh),
			);
			const sessions: number[] = [];
			for (let i = 0; i < 10; i++) sessions.push(await timed(async () => (await start()).close()));
			row(name, fmt(first), fmt(next), fmt(again), fmt(median(sessions)));
		} catch (error) {
			row(name, `FAIL: ${messageOf(error)}`, '', '', '');
		} finally {
			rmSync(fresh, { recursive: true, force: true });
		}
	}
}

const run = promisify(execFile);

/** The processes this process started, e.g. sidecars and guest processes, and their RSS sum. */
async function guestProcesses() {
	const { stdout } = await run('ps', ['-A', '-o', 'pid=,ppid=,rss=,comm=']);
	const rows = stdout
		.trim()
		.split('\n')
		.map((line) => line.trim().split(/\s+/))
		.filter(([, , , command]) => path.basename(command ?? '') !== 'ps')
		.map(([pid, ppid, rss]) => ({ pid: Number(pid), ppid: Number(ppid), rss: Number(rss) }));
	const descendants = (pid: number): typeof rows =>
		rows.filter((each) => each.ppid === pid).flatMap((each) => [each, ...descendants(each.pid)]);
	const guests = descendants(process.pid);
	return { count: guests.length, kb: guests.reduce((sum, { rss }) => sum + rss, 0) };
}

/** Samples `guestProcesses` and the host RSS until `stop`, and keeps the peaks. */
function rssSampler() {
	const peak = { count: 0, kb: 0, hostKb: 0, busy: false };
	const sampleHost = () => {
		peak.hostKb = Math.max(peak.hostKb, process.memoryUsage.rss() / 1024);
	};
	const timer = setInterval(() => {
		sampleHost();
		if (peak.busy) return;
		peak.busy = true;
		void guestProcesses()
			.then((sample) => {
				if (sample.kb > peak.kb) Object.assign(peak, sample);
			})
			.catch(() => undefined)
			.finally(() => {
				peak.busy = false;
			});
	}, 100);
	return () => {
		clearInterval(timer);
		sampleHost();
		return peak;
	};
}

async function w1(runtimes: readonly Runtime[]) {
	const id = 'slack.message.send';
	const total = 200;
	console.log(`\n### W1: ${id}, 1 item, ${total} executions in parallel\n`);
	table(
		'parallel',
		'runtime',
		'total',
		'execs/s',
		'peak guest processes',
		'peak guest RSS (sum)',
		'RSS per guest',
		'peak host RSS',
	);
	const { params, routes } = fixtureOf(id);
	const workload: Workload = { items: [{}], params, routes };
	const checks = new Map<string, string | undefined>();
	for (const runtime of runtimes)
		checks.set(runtime.name, await outputCheck(id, runtime, workload));
	for (const parallel of [1, 10, 50]) {
		for (const runtime of runtimes) {
			const note = checks.get(runtime.name);
			if (note?.startsWith('FAIL')) {
				row(String(parallel), runtime.name, note, '', '', '', '', '');
				continue;
			}
			const stop = rssSampler();
			const queue = { next: 0 };
			const ms = await timed(
				async () =>
					await Promise.all(
						Array.from({ length: parallel }, async () => {
							while (queue.next < total) {
								queue.next++;
								await runOnce(id, runtime, workload);
							}
						}),
					),
			).catch((error: unknown) => {
				row(String(parallel), runtime.name, `FAIL: ${messageOf(error)}`, '', '', '', '', '');
				return undefined;
			});
			const peak = stop();
			if (ms === undefined) continue;
			row(
				String(parallel),
				runtime.name + (note ? ` **${note}**` : ''),
				fmt(ms),
				(total / (ms / 1000)).toFixed(0),
				String(peak.count),
				mb(peak.kb),
				peak.count ? mb(peak.kb / peak.count) : '',
				mb(peak.hostKb),
			);
		}
	}
}

async function w2(runtimes: readonly Runtime[]) {
	console.log('\n### W2: items per node execution (item ~130 B)\n');
	caseTable(runtimes);
	const cases = [
		['items.set', 'per-item'],
		['condition.filter', 'per-item'],
		['items.sort', 'batch'],
		['items.aggregate', 'batch'],
	];
	for (const [id, kind] of cases) {
		const { params, routes } = fixtureOf(id);
		for (const count of [1, 100, 1000, 10000]) {
			const runs = count >= 10000 ? 3 : count >= 1000 ? 5 : 10;
			const workload = { items: people(count), params, routes };
			await compare(`${id} (${kind}) × ${count}`, id, workload, runs, runtimes);
		}
	}
}

async function w3(runtimes: readonly Runtime[]) {
	const id = 'notion.databasePage.getAll';
	const loop = 100;
	const rounds = 3;
	console.log(`\n### W3: ${id}, ${loop} executions in a row (median of ${rounds} rounds)\n`);
	table('runtime', `${loop} executions`, 'per execution');
	const { items, params, routes } = fixtureOf(id);
	const workload: Workload = { items: items ?? [{}], params, routes };
	const notes = new Map<string, string | undefined>();
	for (const runtime of runtimes) notes.set(runtime.name, await outputCheck(id, runtime, workload));
	const totals = new Map<string, number[]>(runtimes.map(({ name }) => [name, []]));
	for (let round = 0; round < rounds; round++) {
		for (const runtime of runtimes) {
			if (notes.get(runtime.name)?.startsWith('FAIL')) continue;
			try {
				const ms = await timed(async () => {
					for (let i = 0; i < loop; i++) await runOnce(id, runtime, workload);
				});
				totals.get(runtime.name)?.push(ms);
			} catch (error) {
				notes.set(runtime.name, `FAIL: ${messageOf(error)}`);
			}
		}
	}
	for (const { name } of runtimes) {
		const note = notes.get(name);
		const total = median(totals.get(name) ?? []);
		if (note?.startsWith('FAIL')) row(name, note, '');
		else row(name + (note ? ` **${note}**` : ''), fmt(total), fmt(total / loop));
	}
}

async function payload(runtimes: readonly Runtime[]) {
	console.log('\n### Payload size\n');
	caseTable(runtimes);
	const set = fixtureOf('items.set');
	for (const kb of [10, 100, 1024, 10 * 1024, 50 * 1024]) {
		const size = kb >= 1024 ? `${kb / 1024} MB` : `${kb} KB`;
		const workload = { items: [{ id: 1, blob: 'x'.repeat(kb * 1024) }], params: set.params };
		await compare(
			`items.set, 1 item of ${size}`,
			'items.set',
			workload,
			kb >= 10240 ? 3 : 7,
			runtimes,
		);
	}
	const sort = fixtureOf('items.sort');
	for (const count of [10000, 50000, 100000]) {
		const items = people(count).map((each) => ({ ...each, pad: 'x'.repeat(1024) }));
		const label = `items.sort (batch), ${count} items × 1 KB = ${(count / 1024).toFixed(0)} MB`;
		await compare(label, 'items.sort', { items, params: sort.params }, 3, runtimes);
	}
}

async function binary(runtimes: readonly Runtime[]) {
	console.log('\n### Binary data\n');
	caseTable(runtimes);
	const gmail = fixtureOf('gmail.message.send', 1);
	for (const size of [0.1, 1, 10, 25]) {
		const fileName = `g-${size}.bin`;
		addBinary(
			fileName,
			Buffer.alloc(Math.round(size * 1024 * 1024), 7),
			'application/octet-stream',
		);
		const workload = {
			items: [{}],
			params: { ...gmail.params, attachments: [fileName] },
			routes: gmail.routes,
		};
		const label = `gmail.message.send, ${size} MB attachment (guest reads bytes)`;
		await compare(label, 'gmail.message.send', workload, size >= 10 ? 3 : 7, runtimes);
	}
	const drive = fixtureOf('googleDrive.file.upload');
	for (const size of [1, 10, 100]) {
		const fileName = `d-${size}.bin`;
		addBinary(fileName, Buffer.alloc(size * 1024 * 1024, 7), 'image/jpeg');
		const workload = {
			items: [{}],
			params: { ...drive.params, file: fileName },
			routes: drive.routes,
		};
		const label = `googleDrive.file.upload, ${size} MB (host streams bytes)`;
		await compare(label, 'googleDrive.file.upload', workload, size >= 100 ? 3 : 5, runtimes);
	}
}

const SCENARIOS = { fixed, w1, w2, w3, payload, binary };
const isScenario = (name: string): name is keyof typeof SCENARIOS => name in SCENARIOS;

async function main() {
	const { values } = parseArgs({
		options: {
			runtime: { type: 'string', default: `${IN_PROCESS},wasm` },
			scenario: { type: 'string', default: Object.keys(SCENARIOS).join(',') },
		},
	});
	const scenarios = values.scenario.split(',');
	const unknown = scenarios.filter((name) => !isScenario(name));
	if (unknown.length > 0) {
		throw new Error(
			`Unknown scenarios ${unknown.join(', ')}. Scenarios: ${Object.keys(SCENARIOS).join(', ')}`,
		);
	}
	const resolved = await Promise.all(
		values.runtime.split(',').map(async (name): Promise<Runtime | undefined> => {
			try {
				// `+pool` prestarts guests with `pooledRuntime`, so the start is off the request path.
				// `+chunk` runs the items of a per-item action in one guest run.
				const [base = name, ...flags] = name.split('+');
				const runtime = await runtimeByName(base);
				return {
					name,
					runtime:
						flags.includes('pool') && runtime ? pooledRuntime(runtime, { size: 2 }) : runtime,
					chunkItems: flags.includes('chunk'),
				};
			} catch (error) {
				console.log(`- skipped ${error instanceof Error ? error.message : String(error)}`);
				return undefined;
			}
		}),
	);
	const runtimes = resolved.filter((each): each is Runtime => each !== undefined);
	if (runtimes.length === 0) throw new Error('No runtime is available');
	const [cpu] = os.cpus();
	const load = os
		.loadavg()
		.map((each) => each.toFixed(1))
		.join(' ');
	console.log(`node ${process.version}, ${cpu?.model}, ${os.cpus().length} cores, load ${load}`);
	console.log(`runtimes: ${runtimes.map(({ name }) => name).join(', ')}`);
	for (const name of scenarios) if (isScenario(name)) await SCENARIOS[name](runtimes);
}

main()
	.catch((error: unknown) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(() => {
		rmSync(cacheDir, { recursive: true, force: true });
		// Pools and the wasm runtime keep guests with open pipes, so the process would not exit.
		process.exit();
	});
