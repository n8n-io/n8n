import { Workspace, LocalFilesystem, LocalSandbox } from '@mastra/core/workspace';
import { DaytonaSandbox } from '@mastra/daytona';

import { DaytonaFilesystem } from './daytona-filesystem';
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
	daytonaApiUrl?: string;
	daytonaApiKey?: string;
	image?: string;
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
	logger?: Logger,
): Promise<DaytonaSandbox | LocalSandbox | N8nSandboxServiceSandbox | undefined> {
	if (!config.enabled) {
		logger?.debug('[create-sandbox] sandbox disabled');
		return undefined;
	}

	if (config.provider === 'daytona') {
		// In proxy mode, resolve a fresh token via getAuthToken; in direct mode use the static key.
		const apiKey = config.getAuthToken ? await config.getAuthToken() : config.daytonaApiKey;
		logger?.debug('[create-sandbox] creating DaytonaSandbox (thread-level)', {
			apiUrl: config.daytonaApiUrl,
			hasImage: !!config.image,
			hasApiKey: !!apiKey,
			proxyMode: !!config.getAuthToken,
			timeout: config.timeout,
		});
		return new DaytonaSandbox({
			apiKey,
			apiUrl: config.daytonaApiUrl,
			...(config.image ? { image: config.image } : {}),
			language: 'typescript',
			timeout: config.timeout ?? 300_000,
		});
	}

	if (config.provider === 'n8n-sandbox') {
		logger?.debug('[create-sandbox] creating N8nSandboxServiceSandbox', {
			serviceUrl: config.serviceUrl,
		});
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

	logger?.debug('[create-sandbox] creating LocalSandbox (dev mode)');
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
	logger?: Logger,
): Workspace | undefined {
	if (!sandbox) {
		logger?.debug('[create-workspace] no sandbox provided — returning undefined');
		return undefined;
	}

	if (sandbox instanceof LocalSandbox) {
		logger?.debug('[create-workspace] creating Workspace with LocalSandbox + LocalFilesystem');
		return new Workspace({
			sandbox,
			filesystem: new LocalFilesystem({ basePath: './workspace' }),
		});
	}

	if (sandbox instanceof N8nSandboxServiceSandbox) {
		logger?.debug('[create-workspace] creating Workspace with N8nSandboxServiceSandbox');
		return new Workspace({
			sandbox,
			filesystem: new N8nSandboxFilesystem(sandbox),
		});
	}

	logger?.debug('[create-workspace] creating Workspace with DaytonaSandbox + DaytonaFilesystem');
	return new Workspace({
		sandbox,
		filesystem: new DaytonaFilesystem(sandbox, logger),
	});
}
