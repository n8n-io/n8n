/**
 * Builds and starts the gym, `wfrt` and the fallback host on free ports, as
 * the gym's host runtime does (`ai-gym/deploy/e2e/local.sh`, `host/lib.sh`):
 * a gym CA, vendor names that resolve to GYM_ADDR, and connections to
 * GYM_ADDR:443 that go to the gym's HTTPS listener. Node.js processes get
 * this from `resolve.cjs` (NODE_OPTIONS) and trust the CA through
 * NODE_EXTRA_CA_CERTS; `wfrt` gets it from `--gym-env` and `--ca-file`.
 * Each process runs in its own process group and stops by its PID.
 */
import type { ChildProcess } from 'node:child_process';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { packageRoot, repoRoot } from './sample.ts';
import { gymSource } from './services.ts';

export const GYM_ADDR = '10.255.0.53';
export const HARNESS_TOKEN = 'harness';

export async function freePort(): Promise<number> {
	return await new Promise((resolve, reject) => {
		const s = createServer();
		s.once('error', reject);
		s.listen(0, '127.0.0.1', () => {
			const addr = s.address();
			const port = typeof addr === 'object' && addr ? addr.port : 0;
			s.close(() => resolve(port));
		});
	});
}

export interface Managed {
	name: string;
	child: ChildProcess;
	log: string;
}

const started: Managed[] = [];

function start(
	name: string,
	cmd: string,
	args: string[],
	env: NodeJS.ProcessEnv,
	log: string,
): Managed {
	const fd = openSync(log, 'a');
	const child = spawn(cmd, args, { env, stdio: ['ignore', fd, fd], detached: true });
	closeSync(fd);
	const m = { name, child, log };
	started.push(m);
	return m;
}

/** Stops every started process group: TERM, then KILL after 3 s. */
export async function stopAll(): Promise<void> {
	for (const m of started) {
		const pid = m.child.pid;
		if (pid === undefined || m.child.exitCode !== null) continue;
		try {
			process.kill(-pid, 'SIGTERM');
		} catch {
			try {
				process.kill(pid, 'SIGTERM');
			} catch {
				// Gone.
			}
		}
	}
	const deadline = Date.now() + 3000;
	while (
		Date.now() < deadline &&
		started.some((m) => m.child.exitCode === null && m.child.signalCode === null)
	) {
		await new Promise((r) => setTimeout(r, 100));
	}
	for (const m of started) {
		const pid = m.child.pid;
		if (pid === undefined || m.child.exitCode !== null || m.child.signalCode !== null) continue;
		try {
			process.kill(-pid, 'SIGKILL');
		} catch {
			// Gone.
		}
	}
	started.length = 0;
}

async function waitFor(check: () => Promise<boolean>, m: Managed, ms: number): Promise<void> {
	const deadline = Date.now() + ms;
	while (Date.now() < deadline) {
		if (m.child.exitCode !== null) throw new Error(`${m.name} exited; see ${m.log}`);
		try {
			if (await check()) return;
		} catch {
			// Not up yet.
		}
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error(`${m.name} did not start in ${ms} ms; see ${m.log}`);
}

export interface BuildOptions {
	gym: boolean;
	wfrt: boolean;
	host: boolean;
}

/** Builds what the run needs. Output goes to `<work>/build.log`. */
export function build(work: string, what: BuildOptions): void {
	const log = join(work, 'build.log');
	const run = (cmd: string, args: string[], cwd: string) => {
		const fd = openSync(log, 'a');
		try {
			execFileSync(cmd, args, { cwd, stdio: ['ignore', fd, fd] });
		} catch {
			throw new Error(`${cmd} ${args.join(' ')} failed; see ${log}`);
		} finally {
			closeSync(fd);
		}
	};
	if (what.gym) {
		run(
			'go',
			['build', '-trimpath', '-o', join(work, 'gym'), './cmd/gym'],
			join(gymSource, 'services', 'gym'),
		);
	}
	if (what.wfrt) run('zig', ['build', '-Drelease=true'], join(repoRoot, 'workflow-runtime'));
	if (what.host) run('pnpm', ['--filter', '@n8n/workflow-fallback-host', 'build'], repoRoot);
}

export interface Stack {
	gymAdmin: string;
	gymEnv: NodeJS.ProcessEnv;
	caFile: string;
	wfrtAdmin: string;
	wfrtSecret: string;
}

/** The host entry: `WF_HOST_MAIN` runs another build of the host (benchmarks). */
function hostMain(): string {
	return (
		process.env.WF_HOST_MAIN ?? join(packageRoot, '..', 'workflow-fallback-host', 'dist', 'main.js')
	);
}

/** The `wfrt` binary: `WFRT_BIN` runs another build (benchmarks). */
function wfrtBin(): string {
	return process.env.WFRT_BIN ?? join(repoRoot, 'workflow-runtime', 'zig-out', 'bin', 'wfrt');
}

/** Starts the gym, the fallback host and `wfrt`. */
export async function startStack(work: string, gymBin: string): Promise<Stack> {
	mkdirSync(join(work, 'out'), { recursive: true });
	const caDir = join(work, 'ca');
	if (!existsSync(join(caDir, 'ca.pem')))
		execFileSync(gymBin, ['ca', '-dir', caDir], { stdio: 'ignore' });
	const caFile = join(caDir, 'ca.pem');
	const [https, admin, dns, tds, redis] = [
		await freePort(),
		await freePort(),
		await freePort(),
		await freePort(),
		await freePort(),
	];
	const gym = start(
		'gym',
		gymBin,
		[
			`-data-dir=${join(work, 'gym-data')}`,
			`-dns-listen=127.0.0.1:${dns}`,
			`-dns-answer=${GYM_ADDR}`,
			`-bind-https=127.0.0.1:${https}`,
			`-admin=127.0.0.1:${admin}`,
			`-ca-dir=${caDir}`,
			'-egress-allow=127.0.0.1',
			`-bind-tds=127.0.0.1:${tds}`,
			`-bind-redis=127.0.0.1:${redis}`,
			'-mem-limit=1024',
			'-log-level=warn',
		],
		{
			...process.env,
			SIM_HARNESS_TOKEN: HARNESS_TOKEN,
			// The LLM fakes answer with the gym's built-in deterministic stub (kit/llmapi/gateway.go).
			LLM_BACKEND_URL: 'http://sim-llm-stub.ai-gym.svc.cluster.local:8000/v1',
			LLM_BACKEND_MODEL: 'stub',
		},
		join(work, 'out', 'gym.log'),
	);
	const gymAdmin = `http://127.0.0.1:${admin}`;
	await waitFor(async () => (await fetch(`${gymAdmin}/readyz`)).ok, gym, 30_000);
	const hosts = await gymHosts(gymAdmin);
	const gymEnv: NodeJS.ProcessEnv = {
		GYM_ADDR,
		GYM_HOSTS: hosts.join(','),
		GYM_DNS: `127.0.0.1:${dns}`,
		GYM_PORT_MAP: `443=${https},1433=${tds},6379=${redis}`,
	};
	const engine = await startEngine(work, gymEnv, caFile);
	return {
		gymAdmin,
		gymEnv: { ...gymEnv, NODE_OPTIONS: engine.nodeEnv.NODE_OPTIONS, NODE_EXTRA_CA_CERTS: caFile },
		caFile,
		wfrtAdmin: engine.wfrtAdmin,
		wfrtSecret: engine.wfrtSecret,
	};
}

export interface Engine {
	wfrtAdmin: string;
	wfrtSecret: string;
	/** Environment of Node.js processes that reach the gym. */
	nodeEnv: NodeJS.ProcessEnv;
}

/**
 * Starts the fallback host and `wfrt` against a running gym. `gymEnv` holds
 * GYM_ADDR, GYM_HOSTS, GYM_DNS and GYM_PORT_MAP; `caFile` is the gym CA.
 */
export async function startEngine(
	work: string,
	gymEnv: NodeJS.ProcessEnv,
	caFile: string,
): Promise<Engine> {
	mkdirSync(join(work, 'out'), { recursive: true });
	const resolveCjs = join(gymSource, 'deploy', 'e2e', 'host', 'resolve.cjs');
	const nodeEnv: NodeJS.ProcessEnv = {
		...process.env,
		...gymEnv,
		NODE_OPTIONS: `--require=${resolveCjs}`,
		NODE_EXTRA_CA_CERTS: caFile,
		N8N_USER_FOLDER: join(work, 'host-home'),
		TZ: 'UTC',
	};
	mkdirSync(join(work, 'host-home'), { recursive: true });
	// Unix socket paths have a limit of about 100 bytes.
	let socket = join(work, 'fb.sock');
	if (socket.length > 100) socket = join(tmpdir(), `gym-diff-${process.pid}.sock`);
	if (socket.length > 100) socket = `/tmp/gym-diff-${process.pid}.sock`;
	const host = start(
		'fallback host',
		process.execPath,
		[hostMain(), '--socket', socket],
		nodeEnv,
		join(work, 'out', 'host.log'),
	);
	await waitFor(async () => existsSync(socket), host, 30_000);
	mkdirSync(join(work, 'wfrt-log'), { recursive: true });
	const wfrtSecret = randomBytes(24).toString('hex');
	const [port, adminPort] = [await freePort(), await freePort()];
	const wfrt = start(
		'wfrt',
		wfrtBin(),
		[
			'serve',
			'--profile',
			'embedded',
			'--port',
			String(port),
			'--admin-port',
			String(adminPort),
			'--admin-secret-env',
			'WFRT_ADMIN_SECRET',
			'--log-dir',
			join(work, 'wfrt-log'),
			'--fallback',
			socket,
			'--shards',
			'1',
			'--gym-env',
			'--ca-file',
			caFile,
			// WFRT_EXTRA_ARGS adds options for a diagnosis, for example `--egress-stuck-ms 5000`.
			...(process.env.WFRT_EXTRA_ARGS ?? '').split(' ').filter((a) => a !== ''),
		],
		{ ...process.env, ...gymEnv, WFRT_ADMIN_SECRET: wfrtSecret, TZ: 'UTC' },
		join(work, 'out', 'wfrt.log'),
	);
	const wfrtAdmin = `http://127.0.0.1:${adminPort}`;
	await waitFor(
		async () =>
			(
				await fetch(`${wfrtAdmin}/_admin/workflows`, {
					headers: { authorization: `Bearer ${wfrtSecret}` },
				})
			).ok,
		wfrt,
		30_000,
	);
	return { wfrtAdmin, wfrtSecret, nodeEnv };
}

/**
 * Starts the fallback host and `wfrt` without a gym, for local tests. `hostEnv` is added to
 * the environment of the host (for example the folders of community and custom nodes).
 */
export async function startLocalEngine(
	work: string,
	hostEnv: NodeJS.ProcessEnv = {},
): Promise<Engine> {
	mkdirSync(join(work, 'out'), { recursive: true });
	mkdirSync(join(work, 'host-home'), { recursive: true });
	const nodeEnv: NodeJS.ProcessEnv = {
		...process.env,
		N8N_USER_FOLDER: join(work, 'host-home'),
		TZ: 'UTC',
		...hostEnv,
	};
	let socket = join(work, 'fb.sock');
	if (socket.length > 100) socket = join(tmpdir(), `wfrt-local-${process.pid}.sock`);
	const host = start(
		'fallback host',
		process.execPath,
		[hostMain(), '--socket', socket],
		nodeEnv,
		join(work, 'out', 'host.log'),
	);
	await waitFor(async () => existsSync(socket), host, 30_000);
	mkdirSync(join(work, 'wfrt-log'), { recursive: true });
	const wfrtSecret = randomBytes(24).toString('hex');
	const [port, adminPort] = [await freePort(), await freePort()];
	const wfrt = start(
		'wfrt',
		wfrtBin(),
		[
			'serve',
			'--profile',
			'embedded',
			'--port',
			String(port),
			'--admin-port',
			String(adminPort),
			'--admin-secret-env',
			'WFRT_ADMIN_SECRET',
			'--log-dir',
			join(work, 'wfrt-log'),
			'--fallback',
			socket,
			'--shards',
			'1',
		],
		{ ...process.env, WFRT_ADMIN_SECRET: wfrtSecret, TZ: 'UTC' },
		join(work, 'out', 'wfrt.log'),
	);
	const wfrtAdmin = `http://127.0.0.1:${adminPort}`;
	await waitFor(
		async () =>
			(
				await fetch(`${wfrtAdmin}/_admin/workflows`, {
					headers: { authorization: `Bearer ${wfrtSecret}` },
				})
			).ok,
		wfrt,
		30_000,
	);
	return { wfrtAdmin, wfrtSecret, nodeEnv };
}

/** The host patterns of every service of a gym (`list_services`). */
export async function gymHosts(gymAdmin: string, token = HARNESS_TOKEN): Promise<string[]> {
	const res = await fetch(`${gymAdmin}/_gym/v1/ops/list_services`, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
		body: '{}',
	});
	const listed: unknown = await res.json();
	const hosts = new Set<string>();
	const services =
		typeof listed === 'object' && listed !== null ? Reflect.get(listed, 'services') : [];
	for (const s of Array.isArray(services) ? services : []) {
		const h: unknown = typeof s === 'object' && s !== null ? Reflect.get(s, 'hosts') : [];
		for (const x of Array.isArray(h) ? h : []) if (typeof x === 'string') hosts.add(x);
	}
	return [...hosts];
}
