import { createHash } from 'node:crypto';

import {
	getSandboxFailureClass,
	isSandboxProvider,
	isSandboxProviderUnavailableError,
	SandboxAcquisitionError,
	SandboxProviderHealth,
	type SandboxProvider,
} from '@n8n/agents/sandbox';
import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import {
	createSandbox,
	createWorkspace,
	isSandboxWorkspaceInitialized,
	setupSandboxWorkspace,
	traceSandboxOperation,
	withSandboxLifecycleTrace,
	type BuilderTemplatesService,
	type ServiceProxyConfig,
	type InstanceAiContext,
	type Logger,
	type ManagedBackgroundTask,
	type SandboxConfig,
	type VerifiedWorkspaceBundles,
} from '@n8n/instance-ai';
import type { ErrorReporter } from 'n8n-core';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { OperationalError, UnexpectedError } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { v5 as uuidv5 } from 'uuid';

import { N8N_VERSION } from '@/constants';
import type { Telemetry } from '@/telemetry';
import { callAiServiceWithRetry } from '@/utils/ai-service-retry';

import { normalizeSandboxProvider, requireN8nSandboxServiceUrl } from '../sandbox-provider';

const SANDBOX_NAME_MAX_LEN = 63;
const SANDBOX_LABEL_MAX_LEN = 63;
const NAME_PREFIX_SLUG_MAX_LEN = 24;
const DEFAULT_SANDBOX_TTL_MS = 15 * 60 * 1000;

/** Cached runtime sandbox + workspace pair for a single thread. */
export type RuntimeSandboxEntry = {
	userId: string;
	sandbox: NonNullable<Awaited<ReturnType<typeof createSandbox>>>;
	workspace: NonNullable<ReturnType<typeof createWorkspace>>;
	/** Provider that created the sandbox. The thread keeps it until it needs a new sandbox. */
	provider: SandboxProvider;
	/** Primary provider, when the sandbox was created on the fallback provider instead. */
	failedOverFrom?: SandboxProvider;
	configFingerprint: string;
	/** Prebaked bundles already verified in this sandbox, shared across runs. */
	verifiedBundles: VerifiedWorkspaceBundles;
	setupComplete: boolean;
	setupPromise: Promise<void> | undefined;
	expiresAt: number;
	cleanupTimer?: ReturnType<typeof setTimeout>;
};

/** A provider config, or the error that its resolution raised. */
type ProviderConfigResult =
	| { provider: SandboxProvider; config: SandboxConfig }
	| { provider: SandboxProvider; error: unknown };

type SandboxCacheState = {
	fingerprint: string;
	/** Resolved configs in provider order. Unset in proxy mode, which resolves them at creation. */
	results?: ProviderConfigResult[];
};

type StartedSandbox = {
	sandbox: RuntimeSandboxEntry['sandbox'];
	workspace: RuntimeSandboxEntry['workspace'];
};

function sandboxConfigFingerprint(config: object): string {
	return createHash('sha256').update(JSON.stringify(config)).digest('hex');
}

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

/**
 * Fixed UUIDv5 namespace for deriving thread-scoped n8n-sandbox ids. Never
 * change it: any main must be able to recompute the id of a sandbox created
 * by an older process to reattach to it.
 */
const N8N_SANDBOX_THREAD_ID_NAMESPACE = '5e6c2f7a-93a1-4b0e-8f27-c1d6a3b9e514';

/** The n8n sandbox service only accepts lowercase UUID ids, so hash the thread-scoped name into a stable UUIDv5. */
function buildThreadScopedSandboxUuid(threadId: string): string {
	return uuidv5(getThreadScopedSandboxName(threadId), N8N_SANDBOX_THREAD_ID_NAMESPACE);
}

/**
 * Give the sandbox a deterministic, thread-derived identity so any process —
 * after a restart, a cache eviction, or on another main — resolves the same
 * remote sandbox instead of creating a duplicate and orphaning the old one.
 */
function withThreadScopedSandboxIdentity(config: SandboxConfig, threadId: string): SandboxConfig {
	if (!config.enabled) return config;

	if (config.provider === 'n8n-sandbox') {
		return { ...config, id: buildThreadScopedSandboxUuid(threadId) };
	}

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
	resolveDaytonaConfig: () => Promise<{ apiUrl?: string; apiKey?: string }>;
	resolveN8nSandboxConfig: () => Promise<{ serviceUrl?: string; apiKey?: string }>;
};

/** Proxy collaborator that routes Daytona traffic through the AI assistant service. */
export type InstanceAiSandboxProxy = {
	isProxyEnabled: () => boolean;
	getClient: () => Promise<{
		getSandboxProxyConfig: () => Promise<{ image?: string }>;
		getSandboxProxyBaseUrl: () => string;
		getInstanceAiApiProxyToken: (
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
	getTemplatesService: () => BuilderTemplatesService;
	resolveTracingConfig?: (
		threadId: string,
		userId?: string,
	) => Promise<{ userId: string; proxyConfig?: ServiceProxyConfig }>;
	telemetry?: Pick<Telemetry, 'track'>;
	/** Health of each provider. Inject a shared instance to share circuit state between services. */
	providerHealth?: SandboxProviderHealth;
};

/**
 * Owns the per-thread runtime sandbox/workspace lifecycle for Instance AI.
 *
 * Each conversation thread gets a single shared sandbox + workspace, created
 * lazily on first use and reused across runs and background tasks. Sandbox
 * identities are deterministic (derived from the thread ID — a name for
 * Daytona, a UUIDv5 for the n8n sandbox service) so a restarted process — or
 * another main in a multi-main deployment — reconnects to the same remote
 * sandbox instead of spawning a duplicate. An in-process TTL drops idle cache
 * entries so the map cannot grow without bound; the provider reclaims the
 * remote sandbox itself (Daytona auto-stop, sandbox-service idle reaping), so
 * an idle eviction never destroys live work.
 *
 * When a fallback provider is configured, a new sandbox goes to the fallback
 * provider if the primary provider is unavailable. A cached thread keeps the
 * provider of its sandbox until it needs a new sandbox.
 */
export class InstanceAiSandboxService {
	/**
	 * Shared runtime workspaces keyed by thread ID. This is only an in-process
	 * cache; deterministic sandbox identities let providers reconnect after restart
	 * or from another main when the thread uses the workspace again.
	 */
	private readonly sandboxes = new Map<string, RuntimeSandboxEntry>();

	/** In-flight runtime workspace creations keyed by thread ID. */
	private readonly sandboxCreations = new Map<
		string,
		{ fingerprint: string; promise: Promise<RuntimeSandboxEntry | undefined> }
	>();

	private cacheGeneration = 0;

	private readonly providerHealth: SandboxProviderHealth;

	/** Warnings already logged, so a setup problem is logged once and not on every turn. */
	private readonly loggedWarnings = new Set<string>();

	constructor(private readonly options: InstanceAiSandboxServiceOptions) {
		this.providerHealth = options.providerHealth ?? new SandboxProviderHealth();
	}

	private get logger(): Logger {
		return this.options.logger;
	}

	private get instanceAiConfig(): InstanceAiConfig {
		return this.options.config;
	}

	/** Providers to try for a new sandbox, the primary first. */
	getProviderChain(): SandboxProvider[] {
		const primary = normalizeSandboxProvider(this.instanceAiConfig.sandboxProvider);
		const fallback = this.instanceAiConfig.sandboxFallbackProvider?.trim();
		if (!fallback) return [primary];
		if (!isSandboxProvider(fallback)) {
			this.warnOnce(`invalid-fallback:${fallback}`, 'Ignoring unknown sandbox fallback provider', {
				fallbackProvider: fallback,
			});
			return [primary];
		}
		if (fallback === primary) {
			this.warnOnce(
				`same-fallback:${fallback}`,
				'Ignoring sandbox fallback provider because it is also the primary provider',
				{ provider: primary },
			);
			return [primary];
		}
		return [primary, fallback];
	}

	/** Environment config of the primary provider. */
	getSandboxConfigFromEnv(): SandboxConfig {
		return this.getProviderConfigFromEnv(
			normalizeSandboxProvider(this.instanceAiConfig.sandboxProvider),
		);
	}

	private getProviderConfigFromEnv(provider: SandboxProvider): SandboxConfig {
		const {
			sandboxEnabled,
			daytonaApiUrl,
			daytonaApiKey,
			n8nSandboxServiceUrl,
			n8nSandboxServiceApiKey,
			sandboxImage,
			sandboxSnapshot,
			sandboxTimeout,
			sandboxNamePrefix,
			sandboxEphemeral,
			sandboxAutoStopMinutes,
			sandboxAutoArchiveMinutes,
			sandboxAutoDeleteMinutes,
			daytonaTokenRefreshSkewMs,
		} = this.instanceAiConfig;
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
				snapshot: sandboxSnapshot || undefined,
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
			ephemeral: sandboxEphemeral,
		};
	}

	/**
	 * Resolve the config of the primary provider. When it cannot be resolved because a
	 * service is unavailable, resolve the fallback provider instead.
	 */
	async resolveSandboxConfig(user: User): Promise<SandboxConfig> {
		const [primary, ...fallbacks] = this.getProviderChain();
		try {
			return await this.resolveProviderConfig(primary, user);
		} catch (error) {
			if (fallbacks.length === 0 || !isSandboxProviderUnavailableError(error)) throw error;
			for (const fallback of fallbacks) {
				const result = await this.tryResolveProviderConfig(fallback, user);
				if ('config' in result) return result.config;
			}
			throw error;
		}
	}

	private async resolveProviderConfig(
		provider: SandboxProvider,
		user: User,
	): Promise<SandboxConfig> {
		const base = this.getProviderConfigFromEnv(provider);
		if (!base.enabled) return base;
		if (base.provider === 'daytona') {
			// If AI assistant service is available, route Daytona calls through its sandbox proxy
			if (this.options.aiService.isProxyEnabled()) {
				const client = await this.options.aiService.getClient();
				const proxyConfig = await callAiServiceWithRetry(
					'Sandbox proxy config fetch',
					async () => await client.getSandboxProxyConfig(),
					this.logger,
					this.options.errorReporter,
				);
				return {
					...base,
					daytonaApiUrl: client.getSandboxProxyBaseUrl(),
					image: proxyConfig.image,
					logger: this.logger,
					getAuthToken: async () => {
						const token = await callAiServiceWithRetry(
							'Sandbox proxy token mint',
							async () =>
								await client.getInstanceAiApiProxyToken(
									{ id: user.id },
									{ userMessageId: nanoid() },
								),
							this.logger,
							this.options.errorReporter,
						);

						return token.accessToken;
					},
				};
			}

			// Direct mode: Daytona credentials from env vars or admin credential
			const daytona = await this.options.settingsService.resolveDaytonaConfig();
			const daytonaApiKey = daytona.apiKey ?? base.daytonaApiKey;
			if (!daytonaApiKey) {
				throw new OperationalError(
					'The Daytona sandbox is enabled in direct mode but no API key is configured. Set the Daytona API key environment variable or connect the Daytona credential.',
				);
			}
			return {
				...base,
				daytonaApiUrl: daytona.apiUrl ?? base.daytonaApiUrl,
				daytonaApiKey,
			};
		}
		const sandbox = await this.options.settingsService.resolveN8nSandboxConfig();
		return {
			...base,
			serviceUrl: sandbox.serviceUrl ?? base.serviceUrl,
			apiKey: sandbox.apiKey ?? base.apiKey,
		};
	}

	private async tryResolveProviderConfig(
		provider: SandboxProvider,
		user: User,
	): Promise<ProviderConfigResult> {
		try {
			return { provider, config: await this.resolveProviderConfig(provider, user) };
		} catch (error) {
			return { provider, error };
		}
	}

	async getOrCreateWorkspaceEntry(
		threadId: string,
		user: User,
	): Promise<RuntimeSandboxEntry | undefined> {
		let outcome = 'acquired';
		return await traceSandboxOperation(
			'acquire',
			{
				inputs: { threadId },
				processResult: (entry) => ({
					outputs: {
						outcome: entry ? outcome : 'disabled',
						sandboxId: entry?.sandbox.id,
						provider: entry?.sandbox.provider,
						failedOver: Boolean(entry?.failedOverFrom),
					},
				}),
			},
			async () => {
				const cacheGeneration = this.cacheGeneration;
				const cacheState = await traceSandboxOperation(
					'resolve-config',
					{ inputs: { threadId } },
					async () => await this.resolveSandboxCacheState(user),
				);
				if (cacheGeneration !== this.cacheGeneration) {
					return await this.getOrCreateWorkspaceEntry(threadId, user);
				}
				const existing = this.sandboxes.get(threadId);
				if (existing) {
					if (
						existing.configFingerprint !== cacheState.fingerprint ||
						(this.isSandboxEntryExpired(existing) && !this.isSandboxInUse(threadId))
					) {
						this.evictSandboxEntry(
							threadId,
							existing,
							existing.configFingerprint !== cacheState.fingerprint ? 'config_changed' : 'idle',
						);
					} else {
						this.touchSandboxEntry(threadId, existing);
						outcome = 'cached';
						return existing;
					}
				}

				const pending = this.sandboxCreations.get(threadId);
				if (pending?.fingerprint === cacheState.fingerprint) {
					outcome = 'shared_acquisition';
					return await pending.promise;
				}

				const creation = this.createWorkspaceEntry(threadId, user, cacheState);
				const pendingCreation = { fingerprint: cacheState.fingerprint, promise: creation };
				this.sandboxCreations.set(threadId, pendingCreation);
				try {
					const entry = await creation;
					if (
						entry &&
						cacheGeneration === this.cacheGeneration &&
						this.sandboxCreations.get(threadId) === pendingCreation
					) {
						this.sandboxes.set(threadId, entry);
						this.scheduleSandboxExpiry(threadId, entry);
					}
					return entry;
				} finally {
					if (this.sandboxCreations.get(threadId) === pendingCreation) {
						this.sandboxCreations.delete(threadId);
					}
				}
			},
		);
	}

	/** Get or create the shared runtime sandbox + workspace for a thread. */
	async getOrCreateWorkspace(
		threadId: string,
		user: User,
		context: InstanceAiContext,
	): Promise<RuntimeSandboxEntry | undefined> {
		const entry = await this.getOrCreateWorkspaceEntry(threadId, user);
		if (!entry) return entry;
		try {
			await this.ensureWorkspaceSetup(entry, context);
		} catch (error) {
			this.dropEntryOfUnavailableProvider(threadId, entry, error);
			throw error;
		}
		return entry;
	}

	/**
	 * When the provider of a cached sandbox goes down after acquisition, drop the cache
	 * entry so that the next acquisition can use the fallback provider. The remote
	 * sandbox stays, and a later acquisition can reattach to it.
	 */
	private dropEntryOfUnavailableProvider(
		threadId: string,
		entry: RuntimeSandboxEntry,
		error: unknown,
	): void {
		if (this.getProviderChain().length < 2 || !isSandboxProviderUnavailableError(error)) return;
		this.recordProviderHealth(entry.provider, error);
		this.evictSandboxEntry(threadId, entry, 'provider_unavailable');
	}

	private async ensureWorkspaceSetup(
		entry: RuntimeSandboxEntry,
		context: InstanceAiContext,
	): Promise<void> {
		if (entry.setupComplete) {
			// The n8n sandbox service can remove a sandbox while this entry is cached
			// (idle reaping, runner restart), and the provider recreates it empty. The
			// marker inside the sandbox is the only reliable record of setup.
			if (
				entry.sandbox.provider !== 'n8n-sandbox' ||
				(await isSandboxWorkspaceInitialized(entry.workspace))
			) {
				return;
			}
			entry.setupComplete = false;
			entry.verifiedBundles.clear();
		}

		entry.setupPromise ??= setupSandboxWorkspace(entry.workspace, context, {
			verifiedBundles: entry.verifiedBundles,
		})
			.then(() => {
				entry.setupComplete = true;
			})
			.finally(() => {
				entry.setupPromise = undefined;
			});

		await entry.setupPromise;
	}

	/**
	 * Create the sandbox on the first provider of the chain that works. The next provider
	 * is tried only when a provider is unavailable (network failure, timeout, 5xx, 429)
	 * or its circuit is open. Other failures, such as authentication or configuration
	 * errors, fail the acquisition so that the operator sees them.
	 */
	private async createWorkspaceEntry(
		threadId: string,
		user: User,
		cacheState: SandboxCacheState,
	): Promise<RuntimeSandboxEntry | undefined> {
		const chain = this.getProviderChain();
		const [primary] = chain;
		const useHealth = chain.length > 1;
		let firstError: { error: unknown } | undefined;
		let primaryFailure: { failureClass: string | null; circuitOpen: boolean } | undefined;

		for (const [index, provider] of chain.entries()) {
			const isLast = index === chain.length - 1;
			// The last provider is always tried, so an open circuit never blocks every provider.
			if (useHealth && !isLast && !this.providerHealth.isAvailable(provider)) {
				if (provider === primary) primaryFailure = { failureClass: null, circuitOpen: true };
				continue;
			}

			let started: StartedSandbox | undefined;
			try {
				const config = await this.getProviderConfig(provider, user, cacheState);
				if (!config.enabled) return undefined;
				started = await this.startWorkspace(threadId, config);
			} catch (error) {
				const unavailable = isSandboxProviderUnavailableError(error);
				if (useHealth) this.recordProviderHealth(provider, unavailable ? error : undefined);
				firstError ??= { error };
				if (!unavailable || isLast) {
					if (firstError.error !== error) {
						this.logger.warn('The sandbox fallback provider also failed', {
							threadId,
							provider,
							error: error instanceof Error ? error.message : String(error),
						});
					}
					throw this.toAcquisitionFailure(firstError.error);
				}
				const failureClass = getSandboxFailureClass(error);
				if (provider === primary) primaryFailure = { failureClass, circuitOpen: false };
				this.logger.warn('Sandbox provider is unavailable, trying the next provider', {
					threadId,
					provider,
					nextProvider: chain[index + 1],
					failureClass,
				});
				continue;
			}

			if (!started) return undefined;
			if (useHealth) this.providerHealth.recordAvailable(provider);
			const failedOverFrom = provider === primary ? undefined : primary;
			if (failedOverFrom) this.reportFailover(threadId, failedOverFrom, provider, primaryFailure);

			const entry: RuntimeSandboxEntry = {
				userId: user.id,
				sandbox: started.sandbox,
				workspace: started.workspace,
				provider,
				failedOverFrom,
				configFingerprint: cacheState.fingerprint,
				verifiedBundles: new Map(),
				setupComplete: false,
				setupPromise: undefined,
				expiresAt: this.nextSandboxExpiry(),
			};
			return entry;
		}

		throw new UnexpectedError('No sandbox provider was tried');
	}

	private async getProviderConfig(
		provider: SandboxProvider,
		user: User,
		cacheState: SandboxCacheState,
	): Promise<SandboxConfig> {
		const cached = cacheState.results?.find((result) => result.provider === provider);
		if (!cached) return await this.resolveProviderConfig(provider, user);
		if ('error' in cached) throw cached.error;
		return cached.config;
	}

	/** Create and start the sandbox of one provider. Cleans up when the start fails. */
	private async startWorkspace(
		threadId: string,
		providerConfig: SandboxConfig,
	): Promise<StartedSandbox | undefined> {
		const config = withThreadScopedSandboxIdentity(providerConfig, threadId);
		if (!config.enabled) return undefined;

		const sandbox = await createSandbox(config, {
			logger: this.logger,
			errorReporter: this.options.errorReporter,
			useSnapshotFallback: true,
			templatesService: this.options.getTemplatesService(),
		});
		const workspace = createWorkspace(sandbox);
		if (!sandbox || !workspace) return undefined;
		try {
			await traceSandboxOperation(
				'start',
				{ inputs: { threadId, sandboxId: sandbox.id, provider: sandbox.provider } },
				async () => await workspace.init(),
			);
		} catch (error) {
			try {
				await traceSandboxOperation(
					'cleanup-failed-start',
					{ inputs: { threadId, sandboxId: sandbox.id } },
					async () => await workspace.destroy(),
				);
			} catch {
				// Best-effort cleanup when the sandbox cannot start
			}
			throw error;
		}
		return { sandbox, workspace };
	}

	private toAcquisitionFailure(error: unknown): unknown {
		// Only the generic transient wrap is downgraded to a non-reported warning.
		// Classified subclasses (name conflict, sandbox not ready) keep their identity
		// so they stay visible in Sentry as distinct issues.
		if (error instanceof SandboxAcquisitionError && error.constructor === SandboxAcquisitionError) {
			return new OperationalError(error.message, { cause: error });
		}
		return error;
	}

	/** Pass the error when the provider was unavailable, or nothing when it answered. */
	private recordProviderHealth(provider: SandboxProvider, unavailableError?: unknown): void {
		if (unavailableError === undefined) {
			this.providerHealth.recordAvailable(provider);
			return;
		}
		if (!this.providerHealth.recordUnavailable(provider)) return;
		this.logger.warn('Sandbox provider is unavailable. New sandboxes skip it for a while', {
			provider,
			failureClass: getSandboxFailureClass(unavailableError),
		});
		this.options.errorReporter.warn(
			new OperationalError(`Sandbox provider "${provider}" is unavailable`, {
				cause: unavailableError,
			}),
		);
	}

	private reportFailover(
		threadId: string,
		from: SandboxProvider,
		to: SandboxProvider,
		primaryFailure: { failureClass: string | null; circuitOpen: boolean } | undefined,
	): void {
		this.logger.warn('Created the thread sandbox on the fallback provider', {
			threadId,
			fromProvider: from,
			toProvider: to,
			failureClass: primaryFailure?.failureClass ?? undefined,
			circuitOpen: primaryFailure?.circuitOpen ?? false,
		});
		this.options.telemetry?.track(TELEMETRY_EVENT.INSTANCE_AI.AI_ASSISTANT_SANDBOX_FAILED_OVER, {
			from_provider: from,
			to_provider: to,
			failure_class: primaryFailure?.failureClass ?? null,
			circuit_open: primaryFailure?.circuitOpen ?? false,
		});
	}

	private async resolveSandboxCacheState(user: User): Promise<SandboxCacheState> {
		const [primary, ...fallbacks] = this.getProviderChain();
		if (this.options.aiService.isProxyEnabled()) {
			return {
				fingerprint: sandboxConfigFingerprint({
					mode: 'proxy',
					config: this.getProviderConfigFromEnv(primary),
					fallbacks: fallbacks.map((provider) => this.getFallbackConfigFromEnv(provider)),
				}),
			};
		}

		if (fallbacks.length === 0) {
			const config = await this.resolveProviderConfig(primary, user);
			return {
				results: [{ provider: primary, config }],
				fingerprint: sandboxConfigFingerprint([config]),
			};
		}

		const results = await Promise.all(
			[primary, ...fallbacks].map(
				async (provider) => await this.tryResolveProviderConfig(provider, user),
			),
		);
		for (const result of results.slice(1)) {
			if ('error' in result) {
				this.warnOnce(
					`fallback-config:${result.provider}`,
					'The sandbox fallback provider is not configured, so it is not used',
					{
						provider: result.provider,
						error: result.error instanceof Error ? result.error.message : String(result.error),
					},
				);
			}
		}
		return {
			results,
			fingerprint: sandboxConfigFingerprint(
				results.map((result) =>
					'config' in result
						? result.config
						: { provider: result.provider, error: String(result.error) },
				),
			),
		};
	}

	private getFallbackConfigFromEnv(provider: SandboxProvider): object {
		try {
			return this.getProviderConfigFromEnv(provider);
		} catch (error) {
			return { provider, error: error instanceof Error ? error.message : String(error) };
		}
	}

	private warnOnce(key: string, message: string, meta: Record<string, unknown>): void {
		if (this.loggedWarnings.has(key)) return;
		this.loggedWarnings.add(key);
		this.logger.warn(message, meta);
	}

	invalidateCachedWorkspaces(): void {
		this.cacheGeneration++;
		this.sandboxCreations.clear();
		for (const [threadId, entry] of this.sandboxes) {
			this.evictSandboxEntry(threadId, entry);
		}
	}

	private evictSandboxEntry(
		threadId: string,
		entry: RuntimeSandboxEntry,
		reason = 'settings_changed',
		detached = false,
	): void {
		if (this.sandboxes.get(threadId) !== entry) return;

		this.sandboxes.delete(threadId);
		if (entry.cleanupTimer) {
			clearTimeout(entry.cleanupTimer);
			entry.cleanupTimer = undefined;
		}
		void withSandboxLifecycleTrace(
			threadId,
			'evict-cache',
			{
				reason,
				sandboxId: entry.sandbox.id,
				provider: entry.sandbox.provider,
				occurredAt: new Date().toISOString(),
				remoteDestroyed: false,
			},
			async () => {},
			{ resolveConfig: this.lifecycleTraceConfig(threadId, entry.userId), detached },
		).catch(() => {
			// Cache eviction does not depend on trace delivery.
		});
	}

	/** Destroy and remove the shared runtime workspace for a thread. */
	async destroySandbox(
		threadId: string,
		reason = 'thread_cleanup',
		userId?: string,
	): Promise<void> {
		const entry = this.sandboxes.get(threadId);
		if (!entry?.sandbox) {
			await this.destroyUncachedSandbox(threadId, reason, userId);
			return;
		}

		this.evictSandboxEntry(threadId, entry, reason);
		try {
			await withSandboxLifecycleTrace(
				threadId,
				'destroy',
				{ reason, sandboxId: entry.sandbox.id, provider: entry.sandbox.provider },
				async () => await entry.workspace.destroy(),
				{ resolveConfig: this.lifecycleTraceConfig(threadId, entry.userId) },
			);
		} catch (error) {
			this.logger.warn('Failed to destroy sandbox', {
				threadId,
				reason,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Delete the remote sandbox for a thread with no cache entry (after a
	 * restart or an idle eviction). Only the n8n-sandbox provider supports
	 * this: its id is recomputable from the thread id, and a delete for an id
	 * that never existed is a cheap 404. This also applies when n8n-sandbox is
	 * the fallback provider, because the thread may have failed over to it.
	 * Daytona is left to its own auto-stop/auto-delete lifecycle.
	 */
	private async destroyUncachedSandbox(
		threadId: string,
		reason: string,
		userId?: string,
	): Promise<void> {
		try {
			if (!this.instanceAiConfig.sandboxEnabled || !this.getProviderChain().includes('n8n-sandbox'))
				return;

			await withSandboxLifecycleTrace(
				threadId,
				'destroy',
				{ reason, cached: false },
				async () => {
					const base = this.getProviderConfigFromEnv('n8n-sandbox');
					if (!base.enabled || base.provider !== 'n8n-sandbox') return;

					const settings = await this.options.settingsService.resolveN8nSandboxConfig();
					const config = withThreadScopedSandboxIdentity(
						{
							...base,
							serviceUrl: settings.serviceUrl ?? base.serviceUrl,
							apiKey: settings.apiKey ?? base.apiKey,
						},
						threadId,
					);
					// Constructing the adapter makes no remote calls; destroy() issues the delete.
					const sandbox = await createSandbox(config, {
						logger: this.logger,
						errorReporter: this.options.errorReporter,
					});
					await traceSandboxOperation(
						'destroy-remote',
						{
							inputs: { sandboxId: sandbox?.id, provider: base.provider },
						},
						async () => await sandbox?.destroy?.(),
					);
				},
				{ resolveConfig: this.lifecycleTraceConfig(threadId, userId) },
			);
		} catch (error) {
			this.logger.warn('Failed to destroy sandbox', {
				threadId,
				reason,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private lifecycleTraceConfig(threadId: string, userId?: string) {
		const resolve = this.options.resolveTracingConfig;
		return resolve ? async () => await resolve(threadId, userId) : undefined;
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

		// The provider reclaims the remote sandbox (Daytona auto-stop, sandbox-service
		// idle reaping), and the deterministic identity lets a later request reattach
		// while it is still alive. This timer only drops our in-process cache entry
		// so the map cannot grow indefinitely.
		const delay = Math.max(0, entry.expiresAt - Date.now());
		entry.cleanupTimer = setTimeout(() => {
			const current = this.sandboxes.get(threadId);
			if (current !== entry) return;
			if (this.isSandboxInUse(threadId)) {
				this.touchSandboxEntry(threadId, entry);
				return;
			}
			this.evictSandboxEntry(threadId, entry, 'idle', true);
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
