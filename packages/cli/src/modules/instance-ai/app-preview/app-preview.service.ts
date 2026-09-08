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
/** A start slower than this (cold `npm install`) answers `starting` and lets the client poll. */
const START_HANDOFF_MS = 2_000;
const START_TIMEOUT_MS = 600_000;
const UNSUPPORTED_ROUTE_CACHE_MS = 10 * 60 * 1000;
const LOG_TAIL_BYTES = 4096;

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
};

export type EnsureAppPreviewInput = {
	threadId: string;
	appId: string;
	projectId: string;
	namespace: string;
	userId: string;
	sandbox: AppPreviewSandbox;
};

type AppPreviewTokenClaims = { sub: string; appId: string; threadId: string; jti: string };

/**
 * Starts the app's dev server in the thread's sandbox with `setsid nohup` so it
 * outlives the exec, and waits for Vite's "ready in" line. Prints the log tail
 * and exits non-zero when it does not come up.
 */
export function buildDevServerStartScript(input: { namespace: string; token: string }): string {
	const base = `${APP_PREVIEW_PATH_PREFIX}/${input.token}/`;
	return [
		`cd apps/${input.namespace}`,
		'( [ -d node_modules ] || npm install --ignore-scripts --no-audit --no-fund --prefer-offline )',
		`( ulimit -c 0; APP_BASE=${base} VITE_N8N_API_BASE=/apps/${input.namespace}/api CI=true setsid nohup node_modules/.bin/vite --host 0.0.0.0 --port ${APP_PREVIEW_PORT} --strictPort > .n8n-dev.log 2>&1 & )`,
		`for i in $(seq 1 40); do grep -q 'ready in' .n8n-dev.log && exit 0; sleep 0.25; done; tail -c ${LOG_TAIL_BYTES} .n8n-dev.log; exit 1`,
	].join(' && ');
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
		if (!entry || entry.jti !== claims.jti || entry.starting) return undefined;
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
		const starting = this.runStart(entry).then(
			(status) => {
				if (this.entries.get(key) !== entry) return status;
				if (status.status === 'ready') {
					this.entries.set(key, { ...entry, starting: undefined });
				} else {
					this.entries.delete(key);
				}
				return status;
			},
			(error: unknown) => {
				if (this.entries.get(key) === entry) this.entries.delete(key);
				this.logger.warn('App preview dev server start failed', {
					appId: input.appId,
					error: error instanceof Error ? error.message : String(error),
				});
				return { status: 'unavailable', reason: 'sandbox' } satisfies AppPreviewStatus;
			},
		);
		entry.starting = starting;
		this.entries.set(key, entry);
		const handoff = new Promise<AppPreviewStatus>((resolve) => {
			const timer = setTimeout(() => resolve({ status: 'starting' }), START_HANDOFF_MS);
			void starting.finally(() => clearTimeout(timer));
		});
		return await Promise.race([starting, handoff]);
	}

	private async runStart(entry: AppPreviewEntry): Promise<AppPreviewStatus> {
		const client = this.client(entry.sandbox);
		const appDir = `${N8N_SANDBOX_WORKSPACE_ROOT}/apps/${entry.namespace}`;
		try {
			await client.getSandbox(entry.sandboxId);
		} catch (error) {
			if (error instanceof SandboxServiceError) return { status: 'unavailable', reason: 'sandbox' };
			throw error;
		}
		try {
			await client.stat(entry.sandboxId, `${appDir}/package.json`);
		} catch (error) {
			if (error instanceof SandboxServiceError && error.status === 404) {
				return { status: 'no-source' };
			}
			throw error;
		}

		// One dev server per sandbox: a preview of another app in this thread must yield its port.
		// A sibling still starting settles first, so its probe never hits this entry's dev server.
		const siblings = [...this.entries.values()].filter(
			(other) => other.sandboxId === entry.sandboxId && other.jti !== entry.jti,
		);
		await Promise.allSettled(siblings.map(async (other) => await other.starting));
		for (const other of siblings) this.markDead(other);
		await client.exec(entry.sandboxId, {
			command: 'pkill -f "vite --host" || true',
			workdir: N8N_SANDBOX_WORKSPACE_ROOT,
			timeoutMs: PROBE_TIMEOUT_MS,
		});

		const result = await client.exec(entry.sandboxId, {
			command: buildDevServerStartScript({ namespace: entry.namespace, token: entry.token }),
			workdir: N8N_SANDBOX_WORKSPACE_ROOT,
			timeoutMs: START_TIMEOUT_MS,
		});
		if (result.exitCode !== 0) {
			const log = `${result.stdout}${result.stderr}`.slice(-LOG_TAIL_BYTES);
			return { status: 'unavailable', reason: 'start-failed', ...(log ? { log } : {}) };
		}
		// Vite is up inside the sandbox; the probe tells whether the service can route to it.
		const probe = await this.probe(entry);
		if (probe === 'ready') return this.ready(entry);
		if (probe === 'unsupported') return { status: 'unsupported', reason: 'port-route' };
		return { status: 'unavailable', reason: 'sandbox' };
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
