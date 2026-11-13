import { Logger } from '@n8n/backend-common';
import { UrlService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import { BinaryDataConfig, InstanceSettings } from 'n8n-core';
import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import { CompiledEngineConfig } from './compiled-engine.config';

const WFRT_RELATIVE_PATH = join('workflow-runtime', 'zig-out', 'bin', 'wfrt');
const HOST_RELATIVE_PATH = join('packages', '@n8n', 'workflow-fallback-host', 'dist', 'main.js');

/** The name of the environment variable that gives `wfrt` its admin secret. */
const ADMIN_SECRET_ENV = 'WFRT_ADMIN_SECRET';

/** Environment variables that the child processes need. n8n secrets are not passed on. */
const PASSED_ENV = ['PATH', 'HOME', 'TMPDIR', 'TZ', 'TZDIR', 'LANG', 'LC_ALL', 'NODE_OPTIONS'];

const MAX_RESTART_DELAY_MS = 30_000;

/** Unix socket paths are limited to about 100 bytes. */
const MAX_SOCKET_PATH_LENGTH = 100;

/** Finds `relative` in the folder of this file or in one of its parents. */
function findInParents(relative: string): string | undefined {
	let dir = __dirname;
	for (;;) {
		const candidate = join(dir, relative);
		if (existsSync(candidate)) return candidate;
		const parent = dirname(dir);
		if (parent === dir) return undefined;
		dir = parent;
	}
}

function pickEnv(extra: Record<string, string>): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = {};
	for (const key of PASSED_ENV) {
		const value = process.env[key];
		if (value !== undefined) env[key] = value;
	}
	return { ...env, ...extra };
}

interface ManagedProcess {
	name: string;
	child?: ChildProcess;
	restartDelay: number;
	restartTimer?: NodeJS.Timeout;
}

/**
 * Starts `wfrt` and the fallback host as child processes, restarts them when
 * they stop, and stops them at shutdown.
 */
@Service()
export class CompiledEngineProcesses {
	private stopping = false;

	private readonly wfrt: ManagedProcess = { name: 'wfrt', restartDelay: 1000 };

	private readonly host: ManagedProcess = { name: 'fallback host', restartDelay: 1000 };

	private secret = '';

	private socketPath = '';

	constructor(
		private readonly config: CompiledEngineConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly logger: Logger,
		private readonly binaryDataConfig: BinaryDataConfig,
	) {
		this.logger = this.logger.scoped('compiled-engine');
	}

	get dataDir() {
		return this.config.dataDir || join(this.instanceSettings.n8nFolder, 'compiled-engine');
	}

	/** The admin secret: the configured one, else a random one for this process. */
	get adminSecret() {
		this.secret ||= this.config.adminSecret || randomBytes(32).toString('hex');
		return this.secret;
	}

	resolveWfrtPath() {
		const path = this.config.wfrtPath
			? resolve(this.config.wfrtPath)
			: findInParents(WFRT_RELATIVE_PATH);
		if (!path || !existsSync(path)) {
			throw new UserError(
				'The compiled engine cannot find the wfrt binary. Build it with `cd workflow-runtime && zig build -Drelease=true`, or set N8N_COMPILED_ENGINE_WFRT_PATH.',
			);
		}
		return path;
	}

	private resolveHostPath() {
		const path = this.config.fallbackHostPath
			? resolve(this.config.fallbackHostPath)
			: findInParents(HOST_RELATIVE_PATH);
		return path && existsSync(path) ? path : undefined;
	}

	private resolveSocketPath() {
		const preferred = join(this.dataDir, 'fallback.sock');
		if (preferred.length <= MAX_SOCKET_PATH_LENGTH) return preferred;
		const hash = createHash('sha256').update(this.dataDir).digest('hex').slice(0, 12);
		return join(tmpdir(), `n8n-wfrt-${hash}.sock`);
	}

	async start() {
		this.stopping = false;
		const wfrtPath = this.resolveWfrtPath();
		mkdirSync(join(this.dataDir, 'log'), { recursive: true });

		const hostPath = this.resolveHostPath();
		if (hostPath) {
			this.socketPath = this.resolveSocketPath();
			this.startHost(hostPath);
			await this.waitForSocket(this.socketPath, 15_000);
		} else {
			this.logger.warn(
				'The fallback host is not built, so nodes that need it fail. Build it with `pnpm --filter @n8n/workflow-fallback-host build`, or set N8N_COMPILED_ENGINE_FALLBACK_HOST_PATH.',
			);
		}
		this.startWfrt(wfrtPath);
	}

	private wfrtArgs() {
		const args = [
			'serve',
			// Small idle memory; large requests use a pool of buffers.
			'--profile',
			'embedded',
			// The same limit as n8n's own request bodies (N8N_PAYLOAD_SIZE_MAX).
			'--max-request-mb',
			String(this.globalConfig.endpoints.payloadSizeMax),
			'--port',
			String(this.config.port),
			'--admin-port',
			String(this.config.adminPort),
			'--admin-secret-env',
			ADMIN_SECRET_ENV,
			'--log-dir',
			join(this.dataDir, 'log'),
		];
		// Sizing by Little's law (executions in flight = rate x latency). It comes
		// after the profile, and an explicit --max-conns below still wins.
		if (this.config.targetRate > 0) {
			args.push('--target-rate', String(this.config.targetRate));
			args.push('--vendor-latency-ms', String(this.config.vendorLatencyMs));
			if (this.config.memoryMb > 0) args.push('--memory-mb', String(this.config.memoryMb));
		}
		if (this.config.maxConnections > 0) {
			args.push('--max-conns', String(this.config.maxConnections));
		}
		args.push('--egress-h2', this.config.http2 ? 'on' : 'off');
		args.push('--egress-pool', this.config.connectionPool);
		if (this.config.readTimeoutMs > 0) {
			args.push('--egress-read-timeout-ms', String(this.config.readTimeoutMs));
		}
		for (const rule of this.config.originLimits.split(';')) {
			if (rule.trim().length > 0) args.push('--egress-origin', rule.trim());
		}
		if (this.socketPath) args.push('--fallback', this.socketPath);
		return args;
	}

	private startWfrt(path: string) {
		this.spawn(
			this.wfrt,
			path,
			this.wfrtArgs(),
			{ [ADMIN_SECRET_ENV]: this.adminSecret, ...this.binaryData('WFRT_BINARY_DATA_STORAGE_PATH') },
			() => this.startWfrt(path),
		);
	}

	private startHost(path: string) {
		const folder = join(this.dataDir, 'host');
		mkdirSync(folder, { recursive: true });
		if (existsSync(this.socketPath)) rmSync(this.socketPath);
		this.spawn(
			this.host,
			process.execPath,
			[path, '--socket', this.socketPath],
			{
				N8N_USER_FOLDER: folder,
				...this.hostUrls(),
				...this.hostExtensions(),
				...this.binaryData('N8N_BINARY_DATA_STORAGE_PATH'),
			},
			() => this.startHost(path),
		);
	}

	/**
	 * The binary data settings of this instance. The host stores binary data as n8n does,
	 * in the same storage path, so the n8n UI shows it and n8n's pruning deletes it.
	 * `wfrt` reads stored files from the path for binary responses.
	 */
	private binaryData(pathVariable: string): Record<string, string> {
		const { mode, localStoragePath } = this.binaryDataConfig;
		return {
			N8N_DEFAULT_BINARY_DATA_MODE: mode,
			...(mode === 'filesystem' ? { [pathVariable]: localStoragePath } : {}),
		};
	}

	/**
	 * The community and custom node folders of this instance. The host loads
	 * the same extensions as n8n, so a workflow with a custom node runs.
	 */
	private hostExtensions(): Record<string, string> {
		return {
			WF_FALLBACK_NODES_DIR: this.instanceSettings.nodesDownloadDir,
			WF_FALLBACK_CUSTOM_EXTENSIONS: this.loadNodesAndCredentials.getCustomDirectories().join(';'),
		};
	}

	/**
	 * The n8n URLs that the fallback host puts in messages, for example the
	 * approval links of a send-and-wait node.
	 */
	private hostUrls(): Record<string, string> {
		const webhookBase = this.urlService.getWebhookBaseUrl().replace(/\/$/, '');
		const { webhookWaiting, formWaiting, webhook, form } = this.globalConfig.endpoints;
		return {
			WF_FALLBACK_INSTANCE_BASE_URL: this.urlService.getInstanceBaseUrl(),
			WF_FALLBACK_WEBHOOK_BASE_URL: `${webhookBase}/${webhook}`,
			WF_FALLBACK_WEBHOOK_WAITING_BASE_URL: `${webhookBase}/${webhookWaiting}`,
			WF_FALLBACK_FORM_BASE_URL: `${webhookBase}/${form}`,
			WF_FALLBACK_FORM_WAITING_BASE_URL: `${webhookBase}/${formWaiting}`,
		};
	}

	private spawn(
		managed: ManagedProcess,
		command: string,
		args: string[],
		env: Record<string, string>,
		restart: () => void,
	) {
		this.logger.info(`Starting ${managed.name}: ${command} ${args.join(' ')}`);
		const child = spawn(command, args, { env: pickEnv(env), stdio: ['ignore', 'pipe', 'pipe'] });
		managed.child = child;
		const startedAt = Date.now();

		const forward = (chunk: Buffer) => {
			for (const line of chunk.toString('utf8').split('\n')) {
				if (line.trim()) this.logger.debug(`[${managed.name}] ${line}`);
			}
		};
		child.stdout?.on('data', forward);
		child.stderr?.on('data', forward);

		child.on('error', (error) => {
			this.logger.error(`Could not start ${managed.name}: ${error.message}`);
		});
		child.on('exit', (code, signal) => {
			managed.child = undefined;
			if (this.stopping) return;
			// A process that ran for a while starts again quickly; one that keeps crashing waits longer.
			if (Date.now() - startedAt > MAX_RESTART_DELAY_MS) managed.restartDelay = 1000;
			this.logger.warn(
				`${managed.name} stopped (code ${code ?? 'none'}, signal ${signal ?? 'none'}). Starting it again in ${managed.restartDelay} ms.`,
			);
			managed.restartTimer = setTimeout(restart, managed.restartDelay);
			managed.restartDelay = Math.min(managed.restartDelay * 2, MAX_RESTART_DELAY_MS);
		});
	}

	private async waitForSocket(path: string, timeoutMs: number) {
		const until = Date.now() + timeoutMs;
		while (!existsSync(path)) {
			if (Date.now() > until) {
				this.logger.warn(`The fallback host did not open ${path} in ${timeoutMs} ms`);
				return;
			}
			await new Promise((r) => setTimeout(r, 100));
		}
	}

	async stop() {
		this.stopping = true;
		await Promise.all([this.stopOne(this.wfrt), this.stopOne(this.host)]);
	}

	private async stopOne(managed: ManagedProcess) {
		clearTimeout(managed.restartTimer);
		const child = managed.child;
		if (!child || child.exitCode !== null) return;
		const exited = new Promise<void>((r) => child.once('exit', () => r()));
		child.kill('SIGTERM');
		const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
		await exited;
		clearTimeout(timer);
	}
}
