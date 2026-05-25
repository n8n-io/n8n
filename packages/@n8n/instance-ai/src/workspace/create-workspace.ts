import { Workspace } from '@n8n/agents';

import { DaytonaFilesystem } from './daytona-filesystem';
import { DaytonaSandbox } from './daytona-sandbox';
import { LocalFilesystem } from './local-filesystem';
import { LocalSandbox } from './local-sandbox';
import { N8nSandboxFilesystem } from './n8n-sandbox-filesystem';
import { N8nSandboxServiceSandbox } from './n8n-sandbox-sandbox';

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
	/** Prefix prepended to the Daytona sandbox name. Visible in the Daytona dashboard list view. */
	namePrefix?: string;
	/** Additional Daytona labels merged onto every sandbox created from this config. Used by consumers to attach lifecycle-specific labels (e.g. `thread_id`). */
	labels?: Record<string, string>;
	/**
	 * Seconds to wait for `daytona.create()` (image build + container boot).
	 * Cold image builds can exceed the SDK default; bump this in environments
	 * where the image has not been pre-warmed. Defaults to 300 in the factory
	 * to preserve existing behavior when unset.
	 */
	createTimeoutSeconds?: number;
	/** When provided, called before each Daytona interaction to get a fresh auth token (e.g. a short-lived JWT for proxy mode). */
	getAuthToken?: () => Promise<string>;
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
export async function createSandbox(
	config: SandboxConfig,
): Promise<DaytonaSandbox | LocalSandbox | N8nSandboxServiceSandbox | undefined> {
	if (!config.enabled) return undefined;

	if (config.provider === 'daytona') {
		// In proxy mode, resolve a fresh token via getAuthToken; in direct mode use the static key.
		const apiKey = config.getAuthToken ? await config.getAuthToken() : config.daytonaApiKey;
		return new DaytonaSandbox({
			id: config.id,
			name: config.name,
			apiKey,
			apiUrl: config.daytonaApiUrl,
			...(config.image ? { image: config.image } : {}),
			...(config.labels ? { labels: config.labels } : {}),
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
