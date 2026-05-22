import { Workspace } from '@n8n/agents';

import { DaytonaFilesystem } from './daytona-filesystem';
import { DaytonaSandbox } from './daytona-sandbox';
import { LocalFilesystem } from './local-filesystem';
import { LocalSandbox } from './local-sandbox';
import { N8nSandboxFilesystem } from './n8n-sandbox-filesystem';
import { N8nSandboxServiceSandbox } from './n8n-sandbox-sandbox';
import type { Logger } from '../logger';

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

/**
 * Create a sandbox instance based on config.
 * Returns undefined when sandbox is disabled.
 *
 * - 'daytona': Isolated Docker container via Daytona API (production)
 * - 'local': Direct host execution via LocalSandbox (development only, no isolation)
 */
// eslint-disable-next-line @typescript-eslint/require-await -- kept async so callers can stay on `await createSandbox(...)`; future token-resolution work may re-introduce awaits.
export async function createSandbox(
	config: SandboxConfig,
): Promise<DaytonaSandbox | LocalSandbox | N8nSandboxServiceSandbox | undefined> {
	if (!config.enabled) return undefined;

	if (config.provider === 'daytona') {
		// Pass the auth source through to the sandbox so it owns the JWT lifecycle:
		// proxy mode mints fresh tokens on demand via `getAuthToken`; direct mode uses the static key.
		return new DaytonaSandbox({
			id: config.id,
			name: config.name,
			apiKey: config.getAuthToken ? undefined : config.daytonaApiKey,
			getAuthToken: config.getAuthToken,
			refreshSkewMs: config.refreshSkewMs,
			logger: config.logger,
			apiUrl: config.daytonaApiUrl,
			...(config.image ? { image: config.image } : {}),
			language: 'typescript',
			timeout: config.timeout ?? 300_000,
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

	if (sandbox instanceof LocalSandbox) {
		return new Workspace({
			sandbox,
			filesystem: new LocalFilesystem({ basePath: './workspace' }),
		});
	}

	if (sandbox instanceof N8nSandboxServiceSandbox) {
		return new Workspace({
			sandbox,
			filesystem: new N8nSandboxFilesystem(sandbox),
		});
	}

	return new Workspace({
		sandbox,
		filesystem: new DaytonaFilesystem(sandbox),
	});
}
