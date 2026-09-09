import type { Workspace } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import type { AppPreviewStatus } from '@n8n/api-types';
import { N8N_SANDBOX_WORKSPACE_ROOT } from '@n8n/agents/sandbox';
import { Service } from '@n8n/di';
import { SandboxClient, SandboxServiceError } from '@n8n/sandbox-client';
import { nanoid } from 'nanoid';

import { JwtService } from '@/services/jwt.service';

import { buildThreadScopedSandboxUuid } from '../sandbox/instance-ai-sandbox.service';

export const APP_PREVIEW_PORT = 5173;
export const APP_PREVIEW_PATH_PREFIX = '/apps-preview';
const TOKEN_TTL_SECONDS = 8 * 60 * 60;
/** Separates preview tokens from the session, invite and reset tokens signed with the same secret. */
const TOKEN_AUDIENCE = 'app-preview';
const PROBE_TIMEOUT_MS = 3_000;
/** A start slower than this answers `starting` and lets the client poll. */
const START_HANDOFF_MS = 2_000;
const START_TIMEOUT_MS = 600_000;
const UNSUPPORTED_ROUTE_CACHE_MS = 10 * 60 * 1000;
const LOG_TAIL_BYTES = 4096;
/** Written by the start script inside the app directory; the sandbox image has no `pkill`. */
const DEV_SERVER_PID_FILE = '.n8n-dev.pid';
/** Same staging directory and install flags as the `apps` tool's restore (`apps.tool.ts`). */
const RESTORE_STAGING_DIR = '.app-builds';
const NPM_INSTALL_FLAGS = '--ignore-scripts --no-audit --no-fund --prefer-offline';

export type AppPreviewSandbox = { url: string; apiKey?: string };

/** One running dev server, reachable through the capability URL its token names. */
export type AppPreviewEntry = {
	token: string;
	jti: string;
	sandboxId: string;
	sandbox: AppPreviewSandbox;
	appId: string;
	projectId: string;
	namespace: string;
	port: number;
	userId: string;
	threadId: string;
	startedAt: Date;
	expiresAt: Date;
	starting?: Promise<AppPreviewStatus>;
	/** The start settled with this failure after the handoff; the next ensure reports it once. */
	failed?: AppPreviewStatus;
};

export type EnsureAppPreviewInput = {
	threadId: string;
	appId: string;
	projectId: string;
	namespace: string;
	userId: string;
	sandbox: AppPreviewSandbox;
	/** Creates the thread's sandbox when it has none yet; undefined when the sandbox is disabled. */
	getWorkspace: () => Promise<Workspace | undefined>;
	/** The app's newest stored source; null when the app was never scaffolded. */
	getSourceTarball: () => Promise<{ data: Buffer } | null>;
};

type AppPreviewTokenClaims = { sub: string; appId: string; threadId: string; jti: string };

/** Kills the dev server whose pid the app directory records, if any. */
export function buildDevServerStopScript(namespace: string): string {
	return `cd apps/${namespace} && [ -f ${DEV_SERVER_PID_FILE} ] && kill "$(cat ${DEV_SERVER_PID_FILE})" 2>/dev/null`;
}

/**
 * Starts the app's dev server in the thread's sandbox with `setsid nohup` so it
 * outlives the exec, and waits for Vite's "ready in" line. Prints the log tail
 * and exits non-zero when it does not come up. A stale dev server from a
 * previous n8n process (same app directory, still bound to the port) is killed
 * first. The pid is `$$` of a shell that `exec`s Vite, so it names Vite whether
 * or not `setsid` forks.
 */
export function buildDevServerStartScript(input: { namespace: string; token: string }): string {
	const base = `${APP_PREVIEW_PATH_PREFIX}/${input.token}/`;
	return [
		`cd apps/${input.namespace}`,
		`{ [ -f ${DEV_SERVER_PID_FILE} ] && kill "$(cat ${DEV_SERVER_PID_FILE})" 2>/dev/null; sleep 0.3; }`,
		`( ulimit -c 0; APP_BASE=${base} VITE_N8N_API_BASE=/apps/${input.namespace}/api CI=true setsid nohup sh -c 'echo $$ > ${DEV_SERVER_PID_FILE}; exec node_modules/.bin/vite --host 0.0.0.0 --port ${APP_PREVIEW_PORT} --strictPort' > .n8n-dev.log 2>&1 & )`,
		`for i in $(seq 1 40); do grep -q 'ready in' .n8n-dev.log && exit 0; sleep 0.25; done; tail -c ${LOG_TAIL_BYTES} .n8n-dev.log; exit 1`,
	].join(' && ');
}

/** Non-zero when `dir` is missing or empty; a restore may only fill an empty app directory. */
export function buildOccupiedCheckScript(dir: string): string {
	return `[ -d ${dir} ] && [ -n "$(ls -A ${dir})" ]`;
}

/**
 * Unpacks the stored source into the app directory and installs its
 * dependencies, so the dev server can start without the agent. The tarball is
 * removed whether or not the unpack succeeds.
 */
export function buildRestoreScript(input: { appDir: string; tarballPath: string }): string {
	return [
		`tar -xzf ${input.tarballPath} -C ${input.appDir}; rc=$?; rm -f ${input.tarballPath}`,
		`[ "$rc" -eq 0 ] && cd ${input.appDir} && (ulimit -c 0; npm install ${NPM_INSTALL_FLAGS})`,
	].join('; ');
}

const entryKey = (threadId: string, appId: string) => `${threadId}:${appId}`;

@Service()
export class AppPreviewService {
	private readonly entries = new Map<string, AppPreviewEntry>();

	/** The sandbox service answered 404/501 on the port route; do not retry until this time. */
	private portRouteUnsupportedUntil = 0;

	constructor(
		private readonly jwtService: JwtService,
		private readonly logger: Logger,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	async ensure(input: EnsureAppPreviewInput): Promise<AppPreviewStatus> {
		if (Date.now() < this.portRouteUnsupportedUntil) {
			return { status: 'unsupported', reason: 'port-route' };
		}
		const key = entryKey(input.threadId, input.appId);
		const existing = this.entries.get(key);
		if (existing?.starting) return { status: 'starting' };
		if (existing?.failed) {
			this.entries.delete(key);
			return existing.failed;
		}
		if (existing) {
			const probe = await this.probe(existing);
			if (probe === 'ready') return this.ready(existing);
			if (probe === 'unsupported') return { status: 'unsupported', reason: 'port-route' };
			this.entries.delete(key);
		}
		return await this.start(input, key);
	}

	/** The entry a capability token names, or undefined when the token is bad, expired or revoked. */
	resolveToken(token: string): AppPreviewEntry | undefined {
		const claims = this.verify(token);
		if (!claims) return undefined;
		const entry = this.entries.get(entryKey(claims.threadId, claims.appId));
		if (!entry || entry.jti !== claims.jti || entry.starting || entry.failed) return undefined;
		if (entry.expiresAt.getTime() <= Date.now()) {
			this.entries.delete(entryKey(entry.threadId, entry.appId));
			return undefined;
		}
		return entry;
	}

	/** The proxy saw the dev server go away; the next ensure starts a new one. */
	markDead(entry: AppPreviewEntry): void {
		const key = entryKey(entry.threadId, entry.appId);
		if (this.entries.get(key)?.jti === entry.jti) this.entries.delete(key);
	}

	/** The thread's sandbox is gone, and every dev server in it with it. */
	clearThread(threadId: string): void {
		for (const [key, entry] of this.entries) {
			if (entry.threadId === threadId) this.entries.delete(key);
		}
	}

	private ready(entry: AppPreviewEntry): AppPreviewStatus {
		return {
			status: 'ready',
			url: `${APP_PREVIEW_PATH_PREFIX}/${entry.token}/`,
			expiresAt: entry.expiresAt.toISOString(),
		};
	}

	private async start(input: EnsureAppPreviewInput, key: string): Promise<AppPreviewStatus> {
		const sandboxId = buildThreadScopedSandboxUuid(input.threadId);
		const jti = nanoid();
		const claims: AppPreviewTokenClaims = {
			sub: input.userId,
			appId: input.appId,
			threadId: input.threadId,
			jti,
		};
		const token = this.jwtService.sign(claims, {
			expiresIn: TOKEN_TTL_SECONDS,
			audience: TOKEN_AUDIENCE,
		});
		const startedAt = new Date();
		const entry: AppPreviewEntry = {
			token,
			jti,
			sandboxId,
			sandbox: input.sandbox,
			appId: input.appId,
			projectId: input.projectId,
			namespace: input.namespace,
			port: APP_PREVIEW_PORT,
			userId: input.userId,
			threadId: input.threadId,
			startedAt,
			expiresAt: new Date(startedAt.getTime() + TOKEN_TTL_SECONDS * 1000),
		};
		// A sibling start or `clearThread` may have replaced or removed this entry meanwhile;
		// only the entry still in the map may settle itself.
		const settle = (status: AppPreviewStatus) => {
			if (this.entries.get(key) !== entry) return status;
			const settled =
				status.status === 'ready'
					? { ...entry, starting: undefined }
					: { ...entry, starting: undefined, failed: status };
			this.entries.set(key, settled);
			return status;
		};
		const starting = this.runStart(entry, input).then(settle, (error: unknown) => {
			this.logger.warn('App preview dev server start failed', {
				appId: input.appId,
				error: error instanceof Error ? error.message : String(error),
			});
			return settle({ status: 'unavailable', reason: 'sandbox' });
		});
		entry.starting = starting;
		this.entries.set(key, entry);
		const handoff = new Promise<AppPreviewStatus>((resolve) => {
			const timer = setTimeout(() => resolve({ status: 'starting' }), START_HANDOFF_MS);
			void starting.finally(() => clearTimeout(timer));
		});
		const result = await Promise.race([starting, handoff]);
		// A failure delivered to this caller is reported; only one that missed the handoff waits for the next poll.
		const settled = this.entries.get(key);
		if (result.status !== 'starting' && settled?.jti === jti && settled.failed) {
			this.entries.delete(key);
		}
		return result;
	}

	private async runStart(
		entry: AppPreviewEntry,
		input: EnsureAppPreviewInput,
	): Promise<AppPreviewStatus> {
		const client = this.client(entry.sandbox);
		if (await this.needsRestore(client, entry)) {
			const restored = await this.restore(client, entry, input);
			if (restored) return restored;
		}

		// One dev server per sandbox: a preview of another app in this thread must yield its port.
		// A sibling still starting settles first, so its probe never hits this entry's dev server.
		const siblings = [...this.entries.values()].filter(
			(other) => other.sandboxId === entry.sandboxId && other.jti !== entry.jti,
		);
		await Promise.allSettled(siblings.map(async (other) => await other.starting));
		for (const other of siblings) {
			this.markDead(other);
			await client.exec(entry.sandboxId, {
				command: buildDevServerStopScript(other.namespace),
				workdir: N8N_SANDBOX_WORKSPACE_ROOT,
				timeoutMs: PROBE_TIMEOUT_MS,
			});
		}

		const result = await client.exec(entry.sandboxId, {
			command: buildDevServerStartScript({ namespace: entry.namespace, token: entry.token }),
			workdir: N8N_SANDBOX_WORKSPACE_ROOT,
			timeoutMs: START_TIMEOUT_MS,
		});
		if (result.exitCode !== 0) return this.startFailed(result);
		// Vite is up inside the sandbox; the probe tells whether the service can route to it.
		const probe = await this.probe(entry);
		if (probe === 'ready') return this.ready(entry);
		if (probe === 'unsupported') return { status: 'unsupported', reason: 'port-route' };
		return { status: 'unavailable', reason: 'sandbox' };
	}

	/** The sandbox or the app's `package.json` in it is missing: a new thread that has not held the app yet. */
	private async needsRestore(client: SandboxClient, entry: AppPreviewEntry): Promise<boolean> {
		try {
			await client.getSandbox(entry.sandboxId);
			await client.stat(
				entry.sandboxId,
				`${N8N_SANDBOX_WORKSPACE_ROOT}/apps/${entry.namespace}/package.json`,
			);
			return false;
		} catch (error) {
			if (error instanceof SandboxServiceError && error.status === 404) return true;
			throw error;
		}
	}

	/**
	 * Brings the app's newest stored source into the thread's sandbox, creating
	 * the sandbox first when the thread has none. Resolves to a status that ends
	 * the start, or to undefined when the dev server may start: after a restore,
	 * or without one when the agent already filled the app directory.
	 */
	private async restore(
		client: SandboxClient,
		entry: AppPreviewEntry,
		input: EnsureAppPreviewInput,
	): Promise<AppPreviewStatus | undefined> {
		const tarball = await input.getSourceTarball();
		if (!tarball) return { status: 'no-source' };
		if (!(await input.getWorkspace())) return { status: 'unavailable', reason: 'sandbox' };

		const appDir = `${N8N_SANDBOX_WORKSPACE_ROOT}/apps/${entry.namespace}`;
		const occupied = await client.exec(entry.sandboxId, {
			command: buildOccupiedCheckScript(appDir),
			timeoutMs: PROBE_TIMEOUT_MS,
		});
		if (occupied.exitCode === 0) return undefined;

		const stagingDir = `${N8N_SANDBOX_WORKSPACE_ROOT}/${RESTORE_STAGING_DIR}`;
		const tarballPath = `${stagingDir}/${entry.namespace}-${Date.now()}-preview-restore.tgz`;
		const prepared = await client.exec(entry.sandboxId, {
			command: `mkdir -p ${stagingDir} ${appDir}`,
			timeoutMs: PROBE_TIMEOUT_MS,
		});
		if (prepared.exitCode !== 0) return this.startFailed(prepared);
		await client.writeFile(entry.sandboxId, tarballPath, tarball.data);
		const restored = await client.exec(entry.sandboxId, {
			command: buildRestoreScript({ appDir, tarballPath }),
			env: { CI: 'true' },
			workdir: N8N_SANDBOX_WORKSPACE_ROOT,
			timeoutMs: START_TIMEOUT_MS,
		});
		return restored.exitCode === 0 ? undefined : this.startFailed(restored);
	}

	private startFailed(result: { stdout: string; stderr: string }): AppPreviewStatus {
		const log = `${result.stdout}${result.stderr}`.slice(-LOG_TAIL_BYTES);
		return { status: 'unavailable', reason: 'start-failed', ...(log ? { log } : {}) };
	}

	/**
	 * Fetches the dev server's root through the sandbox port route, which also
	 * refreshes the sandbox's `last_active_at`.
	 */
	private async probe(entry: AppPreviewEntry): Promise<'ready' | 'gone' | 'unsupported'> {
		const url = `${entry.sandbox.url.replace(/\/+$/, '')}/sandboxes/${entry.sandboxId}/ports/${entry.port}${APP_PREVIEW_PATH_PREFIX}/${entry.token}/`;
		try {
			const response = await fetch(url, {
				headers: entry.sandbox.apiKey ? { 'X-Api-Key': entry.sandbox.apiKey } : {},
				signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
			});
			if (response.ok) return 'ready';
			// Vite answers an HTML 404 for a path outside its base; the service's route 404 is plain.
			const isHtml = response.headers.get('content-type')?.includes('text/html') ?? false;
			if (
				response.status === 501 ||
				(response.status === 404 && !isHtml && (await this.sandboxExists(entry)))
			) {
				this.portRouteUnsupportedUntil = Date.now() + UNSUPPORTED_ROUTE_CACHE_MS;
				return 'unsupported';
			}
			return 'gone';
		} catch {
			return 'gone';
		}
	}

	/** A 404 on the port route is only "route missing" when the sandbox itself is still there. */
	private async sandboxExists(entry: AppPreviewEntry): Promise<boolean> {
		try {
			await this.client(entry.sandbox).getSandbox(entry.sandboxId);
			return true;
		} catch {
			return false;
		}
	}

	private client(sandbox: AppPreviewSandbox): SandboxClient {
		return new SandboxClient({ baseUrl: sandbox.url, apiKey: sandbox.apiKey });
	}

	private verify(token: string): AppPreviewTokenClaims | undefined {
		try {
			const claims = this.jwtService.verify<Partial<AppPreviewTokenClaims>>(token, {
				audience: TOKEN_AUDIENCE,
			});
			const { sub, appId, threadId, jti } = claims;
			if (
				typeof sub !== 'string' ||
				typeof appId !== 'string' ||
				typeof threadId !== 'string' ||
				typeof jti !== 'string'
			) {
				return undefined;
			}
			return { sub, appId, threadId, jti };
		} catch {
			return undefined;
		}
	}
}
