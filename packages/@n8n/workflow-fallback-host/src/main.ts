#!/usr/bin/env node
/**
 * Starts the fallback host.
 *
 *   wf-fallback-host [--socket <path>] [--workers <n>]
 *
 * The primary process only supervises: it starts one server process and
 * starts a new one when it stops (a native crash, for example). The server
 * process runs the steps on `--workers` worker processes (default 2,
 * `worker-pool.ts`). `--workers 0` runs them in the server process itself,
 * without the step limits.
 *
 * Environment:
 *   WF_FALLBACK_SOCKET          socket path, when `--socket` is not given
 *   WF_FALLBACK_CREDENTIALS     JSON file `{ "<slot>": { ...credential data } }`. A step
 *                               frame with `credential` (or `credentials` by slot) comes first.
 *   WF_FALLBACK_MAX_BINARY_BYTES  largest base64 binary data in one step result (default 32 MiB)
 *   WF_FALLBACK_CODE_ALLOW_MODULES  modules that `require` in JavaScript code steps may load
 *   WF_FALLBACK_PYTHON          Python executable for Python code steps (default python3)
 *   WF_FALLBACK_PYTHON_STDLIB_ALLOW / WF_FALLBACK_PYTHON_EXTERNAL_ALLOW  Python import allowlists
 *   WF_FALLBACK_CODE_TIMEOUT_MS longest run of one code step (default 5000)
 *   WF_FALLBACK_STEP_TIMEOUT_MS longest wall-clock time of one step (default 300000)
 *   WF_FALLBACK_BLOCKED_MS      a worker that does not answer for this time is stopped (default 30000)
 *   WF_FALLBACK_WORKER_MEMORY_MB  heap limit of each worker process (default 4096)
 *   WF_FALLBACK_RECYCLE_STEPS   a worker is replaced after this many steps (default 20000)
 *   WF_FALLBACK_RECYCLE_RSS_MB  a worker is replaced above this resident memory (default 1536)
 *   WF_FALLBACK_DIRECT          0: answer the hello of the runtime as a version 1 host, so
 *                               each step goes through the server process (default 1)
 *   WF_FALLBACK_DEDUPLICATION   file: keep the deduplication data in files (the test bed).
 *                               Else steps ask n8n through the runtime (service calls)
 *   N8N_USER_FOLDER             n8n-core settings folder (default: a folder in the temp dir)
 */
import cluster from 'node:cluster';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { DEFAULT_CODE_TIMEOUT_MS } from './code-step';
import { fileCredentialStore } from './credentials';
import { keepRunningOnUnhandledRejection } from './process-guard';
import { createFallbackServer } from './server';
import {
	DEFAULT_BLOCKED_MS,
	DEFAULT_RECYCLE_RSS_MB,
	DEFAULT_RECYCLE_STEPS,
	DEFAULT_STEP_TIMEOUT_MS,
	DEFAULT_WORKER_MEMORY_MB,
	WorkerPool,
} from './worker-pool';

interface HostConfig {
	socketPath: string;
	workers: number;
}

function readConfig(): HostConfig {
	const { values } = parseArgs({
		options: { socket: { type: 'string' }, workers: { type: 'string' } },
	});
	const socketPath = values.socket ?? process.env.WF_FALLBACK_SOCKET;
	if (!socketPath) {
		throw new Error('Give the socket path with --socket or WF_FALLBACK_SOCKET');
	}
	const workers = Number(values.workers ?? '2');
	if (!Number.isInteger(workers) || workers < 0) {
		throw new Error('--workers must be 0 or a positive integer');
	}
	return { socketPath, workers };
}

function log(message: string): void {
	process.stderr.write(`[wf-fallback-host ${process.pid}] ${message}\n`);
}

function removeStaleSocket(socketPath: string): void {
	if (existsSync(socketPath)) unlinkSync(socketPath);
}

/**
 * n8n-core reads and writes its settings in the n8n user folder. The host
 * uses its own folder, so it does not touch the folder of a local n8n.
 */
function ensureUserFolder(): void {
	if (process.env.N8N_USER_FOLDER) return;
	const folder = join(tmpdir(), 'wf-fallback-host');
	mkdirSync(folder, { recursive: true });
	process.env.N8N_USER_FOLDER = folder;
}

/** A positive number from the environment, or the default. */
function envNumber(name: string, fallback: number): number {
	const value = Number(process.env[name] ?? fallback);
	return Number.isFinite(value) && value > 0 ? value : fallback;
}

function startServer(config: HostConfig): void {
	const codeTimeoutMs = envNumber('WF_FALLBACK_CODE_TIMEOUT_MS', DEFAULT_CODE_TIMEOUT_MS);
	const pool =
		config.workers > 0
			? new WorkerPool({
					script: join(__dirname, 'step-worker.js'),
					size: config.workers,
					workerData: {
						credentialsFile: process.env.WF_FALLBACK_CREDENTIALS,
						codeTimeoutMs,
						stepTimeoutMs: envNumber('WF_FALLBACK_STEP_TIMEOUT_MS', DEFAULT_STEP_TIMEOUT_MS),
					},
					stepTimeoutMs: envNumber('WF_FALLBACK_STEP_TIMEOUT_MS', DEFAULT_STEP_TIMEOUT_MS),
					blockedMs: envNumber('WF_FALLBACK_BLOCKED_MS', DEFAULT_BLOCKED_MS),
					memoryMb: envNumber('WF_FALLBACK_WORKER_MEMORY_MB', DEFAULT_WORKER_MEMORY_MB),
					recycleSteps: envNumber('WF_FALLBACK_RECYCLE_STEPS', DEFAULT_RECYCLE_STEPS),
					recycleRssMb: envNumber('WF_FALLBACK_RECYCLE_RSS_MB', DEFAULT_RECYCLE_RSS_MB),
					log,
				})
			: undefined;
	const server = createFallbackServer({
		credentials: fileCredentialStore(process.env.WF_FALLBACK_CREDENTIALS),
		codeTimeoutMs,
		log,
		runner: pool,
		direct: process.env.WF_FALLBACK_DIRECT !== '0',
	});
	// Node.js reports a connection hand-over that failed only as a warning.
	process.on('warning', (warning) => log(`Warning: ${warning.name}: ${warning.message}`));
	server.listen(config.socketPath, () => log(`Listening on ${config.socketPath}`));

	const stop = () => {
		server.close();
		process.exit(0);
	};
	process.on('SIGTERM', stop);
	process.on('SIGINT', stop);
}

/**
 * The primary process supervises one server process (`cluster`), so a crash
 * of the server process does not end the host. The runtime connects again.
 */
function main(): void {
	keepRunningOnUnhandledRejection(log);
	// Steps run in worker processes; an error here is a host bug. Log it and serve on.
	process.on('uncaughtException', (error) => log(`Uncaught exception: ${error.message}`));
	const config = readConfig();
	ensureUserFolder();

	if (!cluster.isPrimary) {
		startServer(config);
		return;
	}

	removeStaleSocket(config.socketPath);
	let started = 0;
	const fork = () => {
		started = Date.now();
		cluster.fork();
	};
	fork();
	cluster.on('exit', (worker, code, signal) => {
		log(`Server process ${worker.process.pid} stopped (${signal ?? code}). Starting a new one.`);
		// A process that stops at once would otherwise restart in a tight loop.
		setTimeout(fork, Date.now() - started < 5_000 ? 1_000 : 0);
	});
	const stop = () => {
		for (const worker of Object.values(cluster.workers ?? {})) worker?.kill();
		process.exit(0);
	};
	process.on('SIGTERM', stop);
	process.on('SIGINT', stop);
}

main();
