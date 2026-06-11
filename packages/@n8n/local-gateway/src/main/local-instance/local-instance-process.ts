import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { closeSync, mkdirSync, openSync } from 'node:fs';
import * as path from 'node:path';

import {
	LOCAL_INSTANCE_LOG_FILE,
	LOCAL_INSTANCE_URL,
	resolveN8nBinPath,
} from './local-instance-config';

const READINESS_INTERVAL_MS = 500;
const READINESS_TIMEOUT_MS = 120_000;
const STOP_GRACE_MS = 10_000;

interface LocalInstanceProcessEvents {
	exited: [code: number | null];
}

export interface LocalInstanceProcessDeps {
	/** Injected for tests; default to the real implementations. */
	spawnFn?: typeof spawn;
	fetchFn?: typeof fetch;
	sleep?: (ms: number) => Promise<void>;
}

/**
 * Owns the embedded n8n child process: spawns it Electron-as-Node (the app's own
 * binary doubles as the Node runtime, so no system Node is required), waits for
 * the readiness endpoint, and stops it gracefully on quit.
 */
export class LocalInstanceProcess extends EventEmitter<LocalInstanceProcessEvents> {
	private readonly spawnFn: typeof spawn;
	private readonly fetchFn: typeof fetch;
	private readonly sleep: (ms: number) => Promise<void>;
	private child: ChildProcess | null = null;

	constructor(deps: LocalInstanceProcessDeps = {}) {
		super();
		this.spawnFn = deps.spawnFn ?? spawn;
		this.fetchFn = deps.fetchFn ?? (async (...args) => await fetch(...args));
		this.sleep = deps.sleep ?? (async (ms) => await new Promise((r) => setTimeout(r, ms)));
	}

	isRunning(): boolean {
		return this.child !== null;
	}

	/** Spawn n8n with the given env overrides and resolve once it serves readiness. */
	async start(envOverrides: Record<string, string>): Promise<void> {
		if (this.child) return;

		mkdirSync(path.dirname(LOCAL_INSTANCE_LOG_FILE), { recursive: true });
		// The child writes to the log fd directly rather than piping through this
		// process: a pipe dies with the parent, and the orphan's broken stdout then
		// turns every n8n log line into an EPIPE uncaughtException (CPU spin, and a
		// shutdown that can never finish logging its way out).
		const logFd = openSync(LOCAL_INSTANCE_LOG_FILE, 'a');
		let child: ChildProcess;
		try {
			child = this.spawnFn(process.execPath, [resolveN8nBinPath(), 'start'], {
				env: { ...process.env, ...envOverrides },
				stdio: ['ignore', logFd, logFd],
			});
		} finally {
			closeSync(logFd);
		}
		this.child = child;

		child.once('exit', (code) => {
			this.child = null;
			this.emit('exited', code);
		});

		await this.waitUntilReady(child);
	}

	/** SIGTERM and wait for a graceful exit, escalating to SIGKILL after a grace period. */
	async stop(): Promise<void> {
		const child = this.child;
		if (!child) return;
		this.child = null;

		await new Promise<void>((resolve) => {
			const killTimer = setTimeout(() => child.kill('SIGKILL'), STOP_GRACE_MS);
			child.once('exit', () => {
				clearTimeout(killTimer);
				resolve();
			});
			child.kill('SIGTERM');
		});
	}

	private async waitUntilReady(child: ChildProcess): Promise<void> {
		let exited = false;
		child.once('exit', () => {
			exited = true;
		});

		const deadline = Date.now() + READINESS_TIMEOUT_MS;
		while (Date.now() < deadline) {
			if (exited) throw new Error('n8n exited during startup — see its log for details');
			try {
				const response = await this.fetchFn(`${LOCAL_INSTANCE_URL}/healthz/readiness`, {
					signal: AbortSignal.timeout(READINESS_INTERVAL_MS),
				});
				if (response.ok) return;
			} catch {
				// Not listening yet — keep polling.
			}
			await this.sleep(READINESS_INTERVAL_MS);
		}

		await this.stop();
		throw new Error('n8n did not become ready in time');
	}
}
