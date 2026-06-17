import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import {
	createSandbox,
	createWorkspace,
	setupSandboxWorkspace,
	type InstanceAiContext,
	type Logger,
	type ManagedBackgroundTask,
	type SandboxConfig,
} from '@n8n/instance-ai';
import type { ErrorReporter } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { N8N_VERSION } from '@/constants';

import { normalizeSandboxProvider, requireN8nSandboxServiceUrl } from '../sandbox-provider';

const SANDBOX_NAME_MAX_LEN = 63;
const SANDBOX_LABEL_MAX_LEN = 63;
const NAME_PREFIX_SLUG_MAX_LEN = 24;
const DEFAULT_SANDBOX_TTL_MS = 15 * 60 * 1000;

/** Cached runtime sandbox + workspace pair for a single thread. */
export type RuntimeSandboxEntry = {
	sandbox: NonNullable<Awaited<ReturnType<typeof createSandbox>>>;
	workspace: NonNullable<ReturnType<typeof createWorkspace>>;
	setupComplete: boolean;
	setupPromise: Promise<void> | undefined;
	expiresAt: number;
	cleanupTimer?: ReturnType<typeof setTimeout>;
};

function slugifySandboxName(value: string, maxLen: number): string {
	const slug = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug.slice(0, maxLen).replace(/-+$/, '');
}

function slugifySandboxLabel(value: string, maxLen: number): string {
	return value
		.replace(/[^A-Za-z0-9_.-]+/g, '-')
		.replace(/^[-.]+|[-.]+$/g, '')
		.slice(0, maxLen)
		.replace(/[-.]+$/, '');
}

function getThreadScopedSandboxName(threadId: string): string {
	return `instance-ai-thread-${threadId}`;
}

function buildThreadScopedSandboxName(threadId: string, namePrefix: string | undefined): string {
	const parts: string[] = [];
	if (namePrefix) {
		const prefixSlug = slugifySandboxName(namePrefix, NAME_PREFIX_SLUG_MAX_LEN);
		if (prefixSlug) parts.push(prefixSlug);
	}
	const threadSlug = slugifySandboxName(getThreadScopedSandboxName(threadId), SANDBOX_NAME_MAX_LEN);
	if (threadSlug) parts.push(threadSlug);
	const name = slugifySandboxName(parts.join('-'), SANDBOX_NAME_MAX_LEN);
	if (!name) throw new UnexpectedError('Failed to build thread-scoped sandbox name');
	return name;
}

function buildThreadScopedSandboxLabels(
	threadId: string,
	namePrefix: string | undefined,
): Record<string, string> {
	const baseName = getThreadScopedSandboxName(threadId);
	const labels: Record<string, string> = {
		'n8n-builder': slugifySandboxLabel(baseName, SANDBOX_LABEL_MAX_LEN),
		thread_id: slugifySandboxLabel(threadId, SANDBOX_LABEL_MAX_LEN),
	};
	if (namePrefix) labels.name_prefix = slugifySandboxLabel(namePrefix, SANDBOX_LABEL_MAX_LEN);
	return labels;
}

function withThreadScopedSandboxIdentity(config: SandboxConfig, threadId: string): SandboxConfig {
	if (!config.enabled || config.provider !== 'daytona') return config;

	const name = buildThreadScopedSandboxName(threadId, config.namePrefix);
	return {
		...config,
		id: name,
		name,
		labels: {
			...buildThreadScopedSandboxLabels(threadId, config.namePrefix),
			...config.labels,
		},
	};
}

/** Thread-run state the sandbox lifecycle consults to know when a workspace is still in use. */
export type InstanceAiSandboxRunState = {
	getActiveRunId: (threadId: string) => string | undefined;
	hasSuspendedRun: (threadId: string) => boolean;
};

/** Background-task view the sandbox lifecycle consults to know when a workspace is still in use. */
export type InstanceAiSandboxBackgroundTasks = {
	getRunningTasks: (threadId: string) => ManagedBackgroundTask[];
};

/** Settings collaborator that resolves provider credentials from admin config. */
export type InstanceAiSandboxSettings = {
	resolveDaytonaConfig: (user: User) => Promise<{ apiUrl?: string; apiKey?: string }>;
	resolveN8nSandboxConfig: (user: User) => Promise<{ serviceUrl?: string; apiKey?: string }>;
};

/** Proxy collaborator that routes Daytona traffic through the AI assistant service. */
export type InstanceAiSandboxProxy = {
	isProxyEnabled: () => boolean;
	getClient: () => Promise<{
		getSandboxProxyConfig: () => Promise<{ image?: string }>;
		getSandboxProxyBaseUrl: () => string;
		getBuilderApiProxyToken: (
			user: { id: string },
			options: { userMessageId: string },
		) => Promise<{ accessToken: string }>;
	}>;
};

export type InstanceAiSandboxServiceOptions = {
	config: InstanceAiConfig;
	logger: Logger;
	errorReporter: ErrorReporter;
	runState: InstanceAiSandboxRunState;
	backgroundTasks: InstanceAiSandboxBackgroundTasks;
	settingsService: InstanceAiSandboxSettings;
	aiService: InstanceAiSandboxProxy;
};

/**
 * Owns the per-thread runtime sandbox/workspace lifecycle for Instance AI.
 *
 * Each conversation thread gets a single shared sandbox + workspace, created
 * lazily on first use and reused across runs and background tasks. Sandbox
 * names are deterministic (derived from the thread ID) so a restarted process
 * — or another main in a multi-main deployment — reconnects to the same remote
 * sandbox instead of spawning a duplicate. An in-process TTL drops idle cache
 * entries so the map cannot grow without bound; provider auto-stop reclaims the
 * remote sandbox itself, so an idle eviction never destroys live work.
 */
export class InstanceAiSandboxService {
	/**
	 * Shared runtime workspaces keyed by thread ID. This is only an in-process
	 * cache; deterministic sandbox names let providers reconnect after restart
	 * or from another main when the thread uses the workspace again.
	 */
	private readonly sandboxes = new Map<string, RuntimeSandboxEntry>();

	/** In-flight runtime workspace creations keyed by thread ID. */
	private readonly sandboxCreations = new Map<string, Promise<RuntimeSandboxEntry | undefined>>();

	constructor(private readonly options: InstanceAiSandboxServiceOptions) {}

	private get logger(): Logger {
		return this.options.logger;
	}

	private get instanceAiConfig(): InstanceAiConfig {
		return this.options.config;
	}

	getSandboxConfigFromEnv(): SandboxConfig {
		const {
			sandboxEnabled,
			sandboxProvider,
			daytonaApiUrl,
			daytonaApiKey,
			n8nSandboxServiceUrl,
			n8nSandboxServiceApiKey,
			sandboxImage,
			sandboxTimeout,
			sandboxNamePrefix,
			sandboxEphemeral,
			sandboxAutoStopMinutes,
			sandboxAutoArchiveMinutes,
			sandboxAutoDeleteMinutes,
			daytonaTokenRefreshSkewMs,
		} = this.instanceAiConfig;
		const provider = normalizeSandboxProvider(sandboxProvider);
		if (!sandboxEnabled) {
			return {
				enabled: false,
				provider,
				timeout: sandboxTimeout,
			};
		}

		if (provider === 'daytona') {
			return {
				enabled: true,
				provider: 'daytona',
				daytonaApiUrl: daytonaApiUrl || undefined,
				daytonaApiKey: daytonaApiKey || undefined,
				image: sandboxImage || undefined,
				n8nVersion: N8N_VERSION || undefined,
				timeout: sandboxTimeout,
				namePrefix: sandboxNamePrefix || undefined,
				ephemeral: sandboxEphemeral,
				autoStopInterval: sandboxAutoStopMinutes,
				autoArchiveInterval: sandboxAutoArchiveMinutes,
				// Ephemeral sandboxes delete on stop; Daytona forces autoDeleteInterval to 0 and warns
				// if we also pass a non-zero value, so leave it unset on the ephemeral path.
				autoDeleteInterval: sandboxEphemeral ? undefined : sandboxAutoDeleteMinutes,
				refreshSkewMs: daytonaTokenRefreshSkewMs,
			};
		}

		return {
			enabled: true,
			provider: 'n8n-sandbox',
			serviceUrl: requireN8nSandboxServiceUrl(n8nSandboxServiceUrl),
			apiKey: n8nSandboxServiceApiKey || undefined,
			timeout: sandboxTimeout,
		};
	}

	async resolveSandboxConfig(user: User): Promise<SandboxConfig> {
		const base = this.getSandboxConfigFromEnv();
		if (!base.enabled) return base;
		if (base.provider === 'daytona') {
			// If AI assistant service is available, route Daytona calls through its sandbox proxy
			if (this.options.aiService.isProxyEnabled()) {
				const client = await this.options.aiService.getClient();
				const proxyConfig = await client.getSandboxProxyConfig();
				return {
					...base,
					daytonaApiUrl: client.getSandboxProxyBaseUrl(),
					image: proxyConfig.image,
					logger: this.logger,
					getAuthToken: async () => {
						const token = await client.getBuilderApiProxyToken(
							{ id: user.id },
							{ userMessageId: nanoid() },
						);

						return token.accessToken;
					},
				};
			}

			// Direct mode: Daytona credentials from env vars or admin credential
			const daytona = await this.options.settingsService.resolveDaytonaConfig(user);
			return {
				...base,
				daytonaApiUrl: daytona.apiUrl ?? base.daytonaApiUrl,
				daytonaApiKey: daytona.apiKey ?? base.daytonaApiKey,
			};
		}
		const sandbox = await this.options.settingsService.resolveN8nSandboxConfig(user);
		return {
			...base,
			serviceUrl: sandbox.serviceUrl ?? base.serviceUrl,
			apiKey: sandbox.apiKey ?? base.apiKey,
		};
	}

	async getOrCreateWorkspaceEntry(
		threadId: string,
		user: User,
	): Promise<RuntimeSandboxEntry | undefined> {
		const existing = this.sandboxes.get(threadId);
		if (existing) {
			if (this.isSandboxEntryExpired(existing) && !this.isSandboxInUse(threadId)) {
				this.evictSandboxEntry(threadId, existing);
			} else {
				this.touchSandboxEntry(threadId, existing);
				return existing;
			}
		}

		const pending = this.sandboxCreations.get(threadId);
		if (pending) return await pending;

		const creation = this.createWorkspaceEntry(threadId, user);
		this.sandboxCreations.set(threadId, creation);
		try {
			return await creation;
		} finally {
			this.sandboxCreations.delete(threadId);
		}
	}

	/** Get or create the shared runtime sandbox + workspace for a thread. */
	async getOrCreateWorkspace(
		threadId: string,
		user: User,
		context: InstanceAiContext,
	): Promise<RuntimeSandboxEntry | undefined> {
		const entry = await this.getOrCreateWorkspaceEntry(threadId, user);
		if (entry) await this.ensureWorkspaceSetup(entry, context);
		return entry;
	}

	private async ensureWorkspaceSetup(
		entry: RuntimeSandboxEntry,
		context: InstanceAiContext,
	): Promise<void> {
		if (entry.setupComplete) return;

		entry.setupPromise ??= setupSandboxWorkspace(entry.workspace, context)
			.then(() => {
				entry.setupComplete = true;
			})
			.finally(() => {
				entry.setupPromise = undefined;
			});

		await entry.setupPromise;
	}

	private async createWorkspaceEntry(
		threadId: string,
		user: User,
	): Promise<RuntimeSandboxEntry | undefined> {
		const config = withThreadScopedSandboxIdentity(await this.resolveSandboxConfig(user), threadId);
		if (!config.enabled) return undefined;

		const sandbox = await createSandbox(config, {
			logger: this.logger,
			errorReporter: this.options.errorReporter,
			useSnapshotFallback: true,
		});
		const workspace = createWorkspace(sandbox);
		if (!sandbox || !workspace) return undefined;
		try {
			await workspace.init();
		} catch (error) {
			try {
				await workspace.destroy();
			} catch {
				// Best-effort cleanup when the sandbox cannot start
			}
			throw error;
		}

		const entry: RuntimeSandboxEntry = {
			sandbox,
			workspace,
			setupComplete: false,
			setupPromise: undefined,
			expiresAt: this.nextSandboxExpiry(),
		};
		this.sandboxes.set(threadId, entry);
		this.scheduleSandboxExpiry(threadId, entry);
		return entry;
	}

	private evictSandboxEntry(threadId: string, entry: RuntimeSandboxEntry): void {
		if (this.sandboxes.get(threadId) !== entry) return;

		this.sandboxes.delete(threadId);
		if (entry.cleanupTimer) {
			clearTimeout(entry.cleanupTimer);
			entry.cleanupTimer = undefined;
		}
	}

	/** Destroy and remove the shared runtime workspace for a thread. */
	async destroySandbox(threadId: string, reason = 'thread_cleanup'): Promise<void> {
		const entry = this.sandboxes.get(threadId);
		if (!entry?.sandbox) return;

		this.evictSandboxEntry(threadId, entry);
		try {
			await entry.workspace?.destroy();
		} catch (error) {
			this.logger.warn('Failed to destroy sandbox', {
				threadId,
				reason,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private get sandboxTtlMs(): number {
		return this.instanceAiConfig?.builderSandboxTtlMs ?? DEFAULT_SANDBOX_TTL_MS;
	}

	private nextSandboxExpiry(): number {
		return Date.now() + this.sandboxTtlMs;
	}

	private isSandboxEntryExpired(entry: RuntimeSandboxEntry): boolean {
		return this.sandboxTtlMs > 0 && entry.expiresAt <= Date.now();
	}

	private touchSandboxEntry(threadId: string, entry: RuntimeSandboxEntry): void {
		if (this.sandboxTtlMs <= 0) return;
		entry.expiresAt = this.nextSandboxExpiry();
		this.scheduleSandboxExpiry(threadId, entry);
	}

	private isSandboxInUse(threadId: string): boolean {
		return Boolean(
			this.options.runState.getActiveRunId(threadId) ||
				this.options.runState.hasSuspendedRun(threadId) ||
				this.options.backgroundTasks.getRunningTasks(threadId).length > 0,
		);
	}

	private scheduleSandboxExpiry(threadId: string, entry: RuntimeSandboxEntry): void {
		if (this.sandboxTtlMs <= 0) return;
		if (entry.cleanupTimer) clearTimeout(entry.cleanupTimer);

		// Provider auto-stop handles remote Daytona sandboxes. This timer only
		// drops our in-process cache entry so the map cannot grow indefinitely.
		const delay = Math.max(0, entry.expiresAt - Date.now());
		entry.cleanupTimer = setTimeout(() => {
			const current = this.sandboxes.get(threadId);
			if (current !== entry) return;
			if (this.isSandboxInUse(threadId)) {
				this.touchSandboxEntry(threadId, entry);
				return;
			}
			this.evictSandboxEntry(threadId, entry);
		}, delay);
		entry.cleanupTimer.unref();
	}

	stopSandboxExpiryTimers(): void {
		for (const entry of this.sandboxes.values()) {
			if (!entry.cleanupTimer) continue;
			clearTimeout(entry.cleanupTimer);
			entry.cleanupTimer = undefined;
		}
	}
}
