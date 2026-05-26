import { Workspace, type WorkspaceFilesystem } from '@n8n/agents';

import type { ErrorReporter, Logger } from '../logger';
import { DaytonaFilesystem } from './daytona-filesystem';
import { DaytonaSandbox } from './daytona-sandbox';
import { loadDaytona } from './lazy-daytona';
import { LocalFilesystem } from './local-filesystem';
import { LocalSandbox } from './local-sandbox';
import { N8nSandboxFilesystem } from './n8n-sandbox-filesystem';
import { N8nSandboxServiceSandbox } from './n8n-sandbox-sandbox';
import { SnapshotManager } from './snapshot-manager';

export type SandboxProvider = 'daytona' | 'local' | 'n8n-sandbox';

interface SandboxConfigBase {
	provider: SandboxProvider;
	timeout?: number;
}

interface DisabledSandboxConfig extends SandboxConfigBase {
	enabled: false;
}

interface DaytonaSandboxConfig extends SandboxConfigBase {
	enabled: true;
	provider: 'daytona';
	id?: string;
	name?: string;
	labels?: Record<string, string>;
	daytonaApiUrl?: string;
	daytonaApiKey?: string;
	image?: string;
	/** Running n8n version, used to resolve a versioned prebuilt snapshot (`n8n-instance-ai-<version>`). */
	n8nVersion?: string;
	/** Prefix prepended to the Daytona sandbox name; also surfaced as a `name_prefix` label. */
	namePrefix?: string;
	/**
	 * Seconds to wait for `daytona.create()` (image build + container boot).
	 * Cold image builds can exceed the SDK default; bump this in environments
	 * where the image has not been pre-warmed. Defaults to 300 in the factory
	 * to preserve existing behavior when unset.
	 */
	createTimeoutSeconds?: number;
	/** When provided, called before each Daytona interaction to get a fresh auth token (e.g. a short-lived JWT for proxy mode). */
	getAuthToken?: () => Promise<string>;
	/** Optional override (ms) for the JWT refresh skew window. Only used in proxy mode. */
	refreshSkewMs?: number;
	/** Optional logger forwarded to the auth manager for refresh-event logging. */
	logger?: Logger;
}

interface LocalSandboxConfig extends SandboxConfigBase {
	enabled: true;
	provider: 'local';
}

interface N8nSandboxConfig extends SandboxConfigBase {
	enabled: true;
	provider: 'n8n-sandbox';
	serviceUrl?: string;
	apiKey?: string;
}

export type SandboxConfig =
	| DisabledSandboxConfig
	| DaytonaSandboxConfig
	| LocalSandboxConfig
	| N8nSandboxConfig;

export interface CreateSandboxOptions {
	logger?: Logger;
	errorReporter?: ErrorReporter;
	useSnapshotFallback?: boolean;
}

const NOOP_LOGGER: Logger = {
	info: () => {},
	warn: () => {},
	error: () => {},
	debug: () => {},
};

/**
 * Create a sandbox instance based on config.
 * Returns undefined when sandbox is disabled.
 *
 * - 'daytona': Isolated Docker container via Daytona API (production)
 * - 'local': Direct host execution via LocalSandbox (development only, no isolation)
 */
export async function createSandbox(
	config: SandboxConfig,
	options: CreateSandboxOptions = {},
): Promise<DaytonaSandbox | LocalSandbox | N8nSandboxServiceSandbox | undefined> {
	if (!config.enabled) return undefined;

	if (config.provider === 'daytona') {
		const mode = config.getAuthToken ? 'proxy' : 'direct';
		const logger = options.logger ?? config.logger;
		const snapshotManager = options.useSnapshotFallback
			? new SnapshotManager(
					config.image,
					logger ?? NOOP_LOGGER,
					config.n8nVersion,
					options.errorReporter,
				)
			: undefined;
		const snapshot =
			snapshotManager && mode === 'direct'
				? await snapshotManager.ensureSnapshot(
						new (loadDaytona().Daytona)({
							apiKey: config.daytonaApiKey,
							apiUrl: config.daytonaApiUrl,
						}),
						mode,
					)
				: await snapshotManager?.ensureSnapshot(undefined, mode);
		const image = snapshotManager ? snapshotManager.ensureImage() : config.image;

		// Pass the auth source through to the sandbox so it owns the JWT lifecycle:
		// proxy mode mints fresh tokens on demand via `getAuthToken`; direct mode uses the static key.
		return new DaytonaSandbox({
			id: config.id,
			name: config.name,
			apiKey: config.getAuthToken ? undefined : config.daytonaApiKey,
			getAuthToken: config.getAuthToken,
			refreshSkewMs: config.refreshSkewMs,
			logger,
			apiUrl: config.daytonaApiUrl,
			labels: config.labels,
			...(image ? { image } : {}),
			...(snapshot ? { snapshot } : {}),
			ephemeral: true,
			language: 'typescript',
			timeout: config.timeout ?? 300_000,
			createTimeoutSeconds: config.createTimeoutSeconds ?? 300,
			errorReporter: options.errorReporter,
			createStrategyMode: mode,
		});
	}

	if (config.provider === 'n8n-sandbox') {
		return new N8nSandboxServiceSandbox({
			apiKey: config.apiKey,
			serviceUrl: config.serviceUrl,
			timeout: config.timeout ?? 300_000,
		});
	}

	// Local fallback for development — no isolation, runs commands directly on host.
	// Block in production to prevent unrestricted host command execution.
	if (process.env.NODE_ENV === 'production') {
		throw new Error(
			'LocalSandbox (provider: "local") is not allowed in production. Use "daytona" provider for isolated sandbox execution.',
		);
	}

	return new LocalSandbox({
		workingDirectory: './workspace',
	});
}

/**
 * Create a Workspace wrapping a sandbox instance.
 * When sandbox is a LocalSandbox, also provides a local filesystem.
 */
export function createWorkspace(
	sandbox: DaytonaSandbox | LocalSandbox | N8nSandboxServiceSandbox | undefined,
): Workspace | undefined {
	if (!sandbox) return undefined;

	const createWorkspaceWithFilesystem = (filesystem: WorkspaceFilesystem) =>
		new Workspace({ sandbox, filesystem });

	if (sandbox instanceof LocalSandbox) {
		return createWorkspaceWithFilesystem(new LocalFilesystem({ basePath: './workspace' }));
	}

	if (sandbox instanceof N8nSandboxServiceSandbox) {
		return createWorkspaceWithFilesystem(new N8nSandboxFilesystem(sandbox));
	}

	return createWorkspaceWithFilesystem(new DaytonaFilesystem(sandbox));
}

export async function cleanupWorkspaceProcesses(workspace: Workspace | undefined): Promise<void> {
	const processManager = workspace?.sandbox?.processes;
	if (!processManager) return;

	let processes: Awaited<ReturnType<typeof processManager.list>>;
	try {
		processes = await processManager.list();
	} catch {
		return;
	}

	for (const process of processes) {
		try {
			if (process.exitCode === undefined) {
				await processManager.kill(process.pid);
			} else {
				await processManager.get(process.pid);
			}
		} catch {
			// Best-effort cleanup
		}
	}
}
