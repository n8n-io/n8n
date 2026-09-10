import type { Workspace, WorkspaceFilesystem } from '@n8n/agents';
import { createScopedWorkspace } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import type { AppPreviewStatus } from '@n8n/api-types';
import { getWorkspaceRoot, N8N_SANDBOX_WORKSPACE_ROOT } from '@n8n/agents/sandbox';
import { Service } from '@n8n/di';
import { SandboxClient, SandboxServiceError } from '@n8n/sandbox-client';
import { nanoid } from 'nanoid';

import { JwtService } from '@/services/jwt.service';

import { buildThreadScopedSandboxUuid } from '../sandbox/instance-ai-sandbox.service';

export const APP_PREVIEW_PORT = 5173;
export const APP_PREVIEW_PATH_PREFIX = '/apps-preview';
/** Output of the fallback build inside the app directory; excluded from source tarballs like the dev log. */
export const APP_PREVIEW_DIST_DIR = '.n8n-preview-dist';
const TOKEN_TTL_SECONDS = 8 * 60 * 60;
/** Separates preview tokens from the session, invite and reset tokens signed with the same secret. */
const TOKEN_AUDIENCE = 'app-preview';
const PROBE_TIMEOUT_MS = 3_000;
/** A start slower than this answers `starting` and lets the client poll. */
const START_HANDOFF_MS = 2_000;
/** An ensure waits this long for a rebuild in flight, so the frame reloads only once the new dist exists. */
const REBUILD_WAIT_MS = 45_000;
const START_TIMEOUT_MS = 600_000;
const UNSUPPORTED_ROUTE_CACHE_MS = 10 * 60 * 1000;
const LOG_TAIL_BYTES = 4096;
/** Written by the start script inside the app directory; the sandbox image has no `pkill`. */
const DEV_SERVER_PID_FILE = '.n8n-dev.pid';
/** Same staging directory and install flags as the `apps` tool's restore (`apps.tool.ts`). */
const RESTORE_STAGING_DIR = '.app-builds';
const NPM_INSTALL_FLAGS = '--ignore-scripts --no-audit --no-fund --prefer-offline';

export type AppPreviewSandbox = { url: string; apiKey?: string };

/** Where a built preview's files live: root-relative `dir` inside the thread workspace's `filesystem`. */
export type AppPreviewBuiltDist = { filesystem: WorkspaceFilesystem; dir: string };

type AppPreviewEntryBase = {
	token: string;
	jti: string;
	sandboxId: string;
	appId: string;
	projectId: string;
	namespace: string;
	userId: string;
	threadId: string;
	startedAt: Date;
	expiresAt: Date;
	starting?: Promise<AppPreviewStatus>;
	/** The start settled with this failure after the handoff; the next ensure reports it once. */
	failed?: AppPreviewStatus;
};

/** A dev server in the sandbox, reached through the sandbox service's port route. */
export type AppPreviewDevEntry = AppPreviewEntryBase & {
	kind: 'dev';
	sandbox: AppPreviewSandbox;
	port: number;
};

/**
 * A `vite build` output served from the sandbox filesystem; rebuilt after every
 * completed turn. Started during a run, the entry stays without `dist` until
 * the turn's rebuild, so the frame never shows the untouched template.
 */
export type AppPreviewBuiltEntry = AppPreviewEntryBase & {
	kind: 'built';
	/** Bumped on every rebuild; the preview URL carries it so the frame reloads. */
	buildSeq: number;
	builtAt: Date;
	/** Absent until the first build succeeded; `ensure` answers `starting` without one. */
	dist?: AppPreviewBuiltDist;
	rebuilding?: Promise<void>;
};

/** One preview, reachable through the capability URL its token names. */
export type AppPreviewEntry = AppPreviewDevEntry | AppPreviewBuiltEntry;

export type EnsureAppPreviewInput = {
	threadId: string;
	appId: string;
	projectId: string;
	namespace: string;
	userId: string;
	/** The n8n sandbox service the thread's sandbox runs in; undefined for other providers, which only get a built preview. */
	sandbox?: AppPreviewSandbox;
	/** Whether the thread's agent is mid-turn; a built preview then waits for the turn's rebuild instead of building. */
	hasActiveRun: () => boolean;
	/** Creates the thread's sandbox when it has none yet; undefined when the sandbox is disabled. */
	getWorkspace: () => Promise<Workspace | undefined>;
	/** The app's newest stored source; null when the app was never scaffolded. */
	getSourceTarball: () => Promise<{ data: Buffer } | null>;
};

type AppPreviewTokenClaims = { sub: string; appId: string; threadId: string; jti: string };

type ExecOutput = { exitCode: number; stdout: string; stderr: string };

/** Shell and file access to the thread's sandbox: the sandbox client for the dev server, the workspace for a built preview. */
type SandboxRunner = {
	root: string;
	exec(
		command: string,
		options?: { env?: Record<string, string>; timeoutMs?: number },
	): Promise<ExecOutput>;
	writeFile(path: string, content: Buffer): Promise<void>;
};

type WorkspaceRunner = SandboxRunner & { filesystem: WorkspaceFilesystem };

type StartOutcome = { status: AppPreviewStatus; entry: AppPreviewEntry };

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

/**
 * Builds the app under its preview base into the preview dist directory.
 * `VITE_N8N_PREVIEW` makes the template load its diagnostics bridge, which a
 * publish build leaves out. Prints the log tail and exits non-zero on failure.
 */
export function buildPreviewBuildScript(input: { namespace: string; token: string }): string {
	const base = `${APP_PREVIEW_PATH_PREFIX}/${input.token}/`;
	return `cd apps/${input.namespace} && ulimit -c 0 && APP_BASE=${base} VITE_N8N_API_BASE=/apps/${input.namespace}/api VITE_N8N_PREVIEW=1 CI=true node_modules/.bin/vite build --outDir ${APP_PREVIEW_DIST_DIR} > .n8n-dev.log 2>&1 || { tail -c ${LOG_TAIL_BYTES} .n8n-dev.log; exit 1; }`;
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

/** Resolves to true when `promise` settles within `ms`, false otherwise. */
async function settlesWithin(promise: Promise<unknown>, ms: number): Promise<boolean> {
	const settled = promise.then(
		() => true,
		() => true,
	);
	const timeout = new Promise<boolean>((resolve) => {
		const timer = setTimeout(() => resolve(false), ms);
		void settled.finally(() => clearTimeout(timer));
	});
	return await Promise.race([settled, timeout]);
}

@Service()
export class AppPreviewService {
	private readonly entries = new Map<string, AppPreviewEntry>();

	/** The sandbox service answered 404/501 on the port route; previews are built until this time. */
	private portRouteUnsupportedUntil = 0;

	constructor(
		private readonly jwtService: JwtService,
		private readonly logger: Logger,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	async ensure(input: EnsureAppPreviewInput): Promise<AppPreviewStatus> {
		const key = entryKey(input.threadId, input.appId);
		const existing = this.entries.get(key);
		if (existing?.starting) return { status: 'starting' };
		if (existing?.failed) {
			this.entries.delete(key);
			return existing.failed;
		}
		if (existing?.kind === 'built' && existing.rebuilding) {
			if (!(await settlesWithin(existing.rebuilding, REBUILD_WAIT_MS))) {
				return { status: 'starting' };
			}
			// The rebuild settled into the map: a failure to report, or a new build sequence.
			return await this.ensure(input);
		}
		if (existing?.kind === 'built' && !existing.dist) {
			// The first build waits for the turn to end; a run that did not complete leaves it to this ensure.
			if (input.hasActiveRun()) return { status: 'starting' };
			this.entries.delete(key);
			return await this.start(input, key);
		}
		if (existing) {
			const probe = await this.probe(existing);
			if (probe === 'ready') return this.ready(existing);
			if (probe === 'unsupported' && existing.kind === 'dev') {
				await this.stopDevServer(existing).catch(() => undefined);
			}
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

	/**
	 * Builds every built preview of the thread from the sandbox's current
	 * sources, so the frame shows the turn's edits; a preview started during the
	 * run gets its first build here. Marks the entries synchronously: an ensure
	 * that arrives meanwhile waits for the rebuild. A rebuild already in flight is
	 * followed by one more. Never rejects.
	 */
	async rebuildIfBuilt(threadId: string, workspace: Workspace): Promise<void> {
		const entries = [...this.entries.values()].filter(
			(entry): entry is AppPreviewBuiltEntry =>
				entry.threadId === threadId && entry.kind === 'built' && !entry.starting && !entry.failed,
		);
		await Promise.all(
			entries.map(async (entry) => {
				const previous = entry.rebuilding ?? Promise.resolve();
				const rebuilding = previous
					.then(async () => await this.rebuild(entry, workspace))
					.finally(() => {
						if (entry.rebuilding === rebuilding) entry.rebuilding = undefined;
					});
				entry.rebuilding = rebuilding;
				await rebuilding;
			}),
		);
	}

	private async rebuild(entry: AppPreviewBuiltEntry, workspace: Workspace): Promise<void> {
		const key = entryKey(entry.threadId, entry.appId);
		if (this.entries.get(key) !== entry || entry.failed) return;
		try {
			const runner = await this.workspaceRunner(workspace);
			if (!runner) throw new Error('The thread workspace has no sandbox');
			const result = await runner.exec(
				buildPreviewBuildScript({ namespace: entry.namespace, token: entry.token }),
				{ timeoutMs: START_TIMEOUT_MS },
			);
			if (this.entries.get(key) !== entry) return;
			if (result.exitCode !== 0) {
				entry.failed = this.startFailed(result);
				return;
			}
			entry.buildSeq += 1;
			entry.builtAt = new Date();
			entry.dist = { filesystem: runner.filesystem, dir: this.distDir(entry.namespace) };
		} catch (error) {
			this.logger.warn('App preview rebuild failed', {
				appId: entry.appId,
				error: error instanceof Error ? error.message : String(error),
			});
			if (this.entries.get(key) === entry) {
				entry.failed = { status: 'unavailable', reason: 'sandbox' };
			}
		}
	}

	private ready(entry: AppPreviewEntry): AppPreviewStatus {
		const base = `${APP_PREVIEW_PATH_PREFIX}/${entry.token}/`;
		return {
			status: 'ready',
			// The build sequence is a cache-buster for the frame; the server ignores it.
			url: entry.kind === 'built' ? `${base}?b=${entry.buildSeq}` : base,
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
		const base: AppPreviewEntryBase = {
			token,
			jti,
			sandboxId,
			appId: input.appId,
			projectId: input.projectId,
			namespace: input.namespace,
			userId: input.userId,
			threadId: input.threadId,
			startedAt,
			expiresAt: new Date(startedAt.getTime() + TOKEN_TTL_SECONDS * 1000),
		};
		const entry: AppPreviewEntry =
			input.sandbox && Date.now() >= this.portRouteUnsupportedUntil
				? { ...base, kind: 'dev', sandbox: input.sandbox, port: APP_PREVIEW_PORT }
				: this.builtEntry(base);
		// A sibling start or `clearThread` may have replaced or removed this entry meanwhile;
		// only the entry still in the map may settle itself. `starting` is a built preview
		// whose first build waits for the turn to end.
		const settle = (outcome: StartOutcome) => {
			if (this.entries.get(key) !== entry) return outcome.status;
			const settled: AppPreviewEntry =
				outcome.status.status === 'ready' || outcome.status.status === 'starting'
					? { ...outcome.entry, starting: undefined }
					: { ...entry, starting: undefined, failed: outcome.status };
			this.entries.set(key, settled);
			return outcome.status;
		};
		const starting = this.runStart(entry, input).then(settle, (error: unknown) => {
			this.logger.warn('App preview start failed', {
				appId: input.appId,
				error: error instanceof Error ? error.message : String(error),
			});
			return settle({ status: { status: 'unavailable', reason: 'sandbox' }, entry });
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

	private builtEntry(base: AppPreviewEntryBase): AppPreviewBuiltEntry {
		return { ...base, kind: 'built', buildSeq: 0, builtAt: base.startedAt };
	}

	private async runStart(
		entry: AppPreviewEntry,
		input: EnsureAppPreviewInput,
	): Promise<StartOutcome> {
		if (entry.kind === 'built') return await this.runBuild(entry, input);

		const client = this.client(entry.sandbox);
		const runner = this.clientRunner(client, entry.sandboxId);
		if (await this.needsRestore(client, entry)) {
			const tarball = await input.getSourceTarball();
			if (!tarball) return { status: { status: 'no-source' }, entry };
			if (!(await input.getWorkspace())) {
				return { status: { status: 'unavailable', reason: 'sandbox' }, entry };
			}
			const restored = await this.restore(runner, entry, tarball.data);
			if (restored) return { status: restored, entry };
		}

		await this.stopSiblings(entry);
		const result = await client.exec(entry.sandboxId, {
			command: buildDevServerStartScript({ namespace: entry.namespace, token: entry.token }),
			workdir: N8N_SANDBOX_WORKSPACE_ROOT,
			timeoutMs: START_TIMEOUT_MS,
		});
		if (result.exitCode !== 0) return { status: this.startFailed(result), entry };
		// Vite is up inside the sandbox; the probe tells whether the service can route to it.
		const probe = await this.probe(entry);
		if (probe === 'ready') return { status: this.ready(entry), entry };
		if (probe === 'gone') return { status: { status: 'unavailable', reason: 'sandbox' }, entry };
		// No port route: the dev server is useless here, a build from the sandbox filesystem takes over.
		await this.stopDevServer(entry).catch(() => undefined);
		const { sandbox: _sandbox, port: _port, kind: _kind, starting: _starting, ...base } = entry;
		return await this.runBuild(this.builtEntry(base), input);
	}

	/**
	 * Builds the app in the thread's workspace, whichever provider backs it,
	 * restoring the stored source first when the app directory is missing.
	 * During a run only the restore happens: the turn's edits are still coming,
	 * and `rebuildIfBuilt` builds the entry once the run completes.
	 */
	private async runBuild(
		entry: AppPreviewBuiltEntry,
		input: EnsureAppPreviewInput,
	): Promise<StartOutcome> {
		const workspace = await input.getWorkspace();
		const runner = workspace ? await this.workspaceRunner(workspace) : undefined;
		if (!runner) return { status: { status: 'unavailable', reason: 'sandbox' }, entry };

		if (!(await runner.filesystem.exists(`${runner.root}/apps/${entry.namespace}/package.json`))) {
			const tarball = await input.getSourceTarball();
			if (!tarball) return { status: { status: 'no-source' }, entry };
			const restored = await this.restore(runner, entry, tarball.data);
			if (restored) return { status: restored, entry };
		}

		await this.stopSiblings(entry);
		if (input.hasActiveRun()) return { status: { status: 'starting' }, entry };
		const result = await runner.exec(
			buildPreviewBuildScript({ namespace: entry.namespace, token: entry.token }),
			{ timeoutMs: START_TIMEOUT_MS },
		);
		if (result.exitCode !== 0) return { status: this.startFailed(result), entry };
		const built: AppPreviewBuiltEntry = {
			...entry,
			buildSeq: entry.buildSeq + 1,
			builtAt: new Date(),
			dist: { filesystem: runner.filesystem, dir: this.distDir(entry.namespace) },
		};
		return { status: this.ready(built), entry: built };
	}

	private distDir(namespace: string): string {
		return `apps/${namespace}/${APP_PREVIEW_DIST_DIR}`;
	}

	/**
	 * One dev server per sandbox: a preview of another app in this thread must
	 * yield its port. A sibling still starting settles first, so its probe never
	 * hits this entry's dev server. A built sibling has no process to stop.
	 */
	private async stopSiblings(entry: AppPreviewEntry): Promise<void> {
		const siblings = [...this.entries.values()].filter(
			(other) => other.sandboxId === entry.sandboxId && other.jti !== entry.jti,
		);
		await Promise.allSettled(siblings.map(async (other) => await other.starting));
		for (const other of siblings) {
			this.markDead(other);
			if (other.kind === 'dev') await this.stopDevServer(other);
		}
	}

	private async stopDevServer(entry: AppPreviewDevEntry): Promise<void> {
		await this.client(entry.sandbox).exec(entry.sandboxId, {
			command: buildDevServerStopScript(entry.namespace),
			workdir: N8N_SANDBOX_WORKSPACE_ROOT,
			timeoutMs: PROBE_TIMEOUT_MS,
		});
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
	 * Brings the app's newest stored source into the thread's sandbox. Resolves
	 * to a status that ends the start, or to undefined when the preview may
	 * start: after a restore, or without one when the agent already filled the
	 * app directory.
	 */
	private async restore(
		runner: SandboxRunner,
		entry: AppPreviewEntry,
		tarball: Buffer,
	): Promise<AppPreviewStatus | undefined> {
		const appDir = `${runner.root}/apps/${entry.namespace}`;
		const occupied = await runner.exec(buildOccupiedCheckScript(appDir), {
			timeoutMs: PROBE_TIMEOUT_MS,
		});
		if (occupied.exitCode === 0) return undefined;

		const stagingDir = `${runner.root}/${RESTORE_STAGING_DIR}`;
		const tarballPath = `${stagingDir}/${entry.namespace}-${Date.now()}-preview-restore.tgz`;
		const prepared = await runner.exec(`mkdir -p ${stagingDir} ${appDir}`, {
			timeoutMs: PROBE_TIMEOUT_MS,
		});
		if (prepared.exitCode !== 0) return this.startFailed(prepared);
		await runner.writeFile(tarballPath, tarball);
		const restored = await runner.exec(buildRestoreScript({ appDir, tarballPath }), {
			env: { CI: 'true' },
			timeoutMs: START_TIMEOUT_MS,
		});
		return restored.exitCode === 0 ? undefined : this.startFailed(restored);
	}

	private startFailed(result: ExecOutput): AppPreviewStatus {
		const log = `${result.stdout}${result.stderr}`.slice(-LOG_TAIL_BYTES);
		return { status: 'unavailable', reason: 'start-failed', ...(log ? { log } : {}) };
	}

	/**
	 * Dev server: fetches its root through the sandbox port route, which also
	 * refreshes the sandbox's `last_active_at`. Built: checks that the dist is
	 * still in the sandbox filesystem.
	 */
	private async probe(entry: AppPreviewEntry): Promise<'ready' | 'gone' | 'unsupported'> {
		if (entry.kind === 'built') {
			try {
				const present = await entry.dist?.filesystem.exists(`${entry.dist.dir}/index.html`);
				return present ? 'ready' : 'gone';
			} catch {
				return 'gone';
			}
		}
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
	private async sandboxExists(entry: AppPreviewDevEntry): Promise<boolean> {
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

	private clientRunner(client: SandboxClient, sandboxId: string): SandboxRunner {
		return {
			root: N8N_SANDBOX_WORKSPACE_ROOT,
			exec: async (command, options) =>
				await client.exec(sandboxId, {
					command,
					...(options?.env ? { env: options.env } : {}),
					workdir: N8N_SANDBOX_WORKSPACE_ROOT,
					timeoutMs: options?.timeoutMs ?? PROBE_TIMEOUT_MS,
				}),
			writeFile: async (path, content) => await client.writeFile(sandboxId, path, content),
		};
	}

	/** Undefined when the workspace cannot run commands or read files, which a preview needs. */
	private async workspaceRunner(workspace: Workspace): Promise<WorkspaceRunner | undefined> {
		const root = await getWorkspaceRoot(workspace);
		const scoped = createScopedWorkspace(workspace, root);
		const executeCommand = scoped.sandbox?.executeCommand?.bind(scoped.sandbox);
		const filesystem = scoped.filesystem;
		if (!executeCommand || !filesystem) return undefined;
		return {
			root,
			filesystem,
			exec: async (command, options) => {
				const result = await executeCommand(command, [], {
					cwd: root,
					env: options?.env,
					timeout: options?.timeoutMs ?? PROBE_TIMEOUT_MS,
				});
				return { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
			},
			writeFile: async (path, content) => await filesystem.writeFile(path, content),
		};
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
