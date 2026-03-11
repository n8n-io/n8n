import { Workspace, LocalFilesystem, LocalSandbox } from '@mastra/core/workspace';
import { DaytonaSandbox } from '@mastra/daytona';

import { DaytonaFilesystem } from './daytona-filesystem';

export interface SandboxConfig {
	enabled: boolean;
	provider: 'daytona' | 'local';
	daytonaApiUrl?: string;
	daytonaApiKey?: string;
	image?: string;
	timeout?: number;
}

/**
 * Create a sandbox instance based on config.
 * Returns undefined when sandbox is disabled.
 *
 * - 'daytona': Isolated Docker container via Daytona API (production)
 * - 'local': Direct host execution via LocalSandbox (development only, no isolation)
 */
export function createSandbox(config: SandboxConfig): DaytonaSandbox | LocalSandbox | undefined {
	if (!config.enabled) return undefined;

	if (config.provider === 'daytona') {
		return new DaytonaSandbox({
			apiKey: config.daytonaApiKey,
			apiUrl: config.daytonaApiUrl,
			...(config.image ? { image: config.image } : {}),
			language: 'typescript',
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
	sandbox: DaytonaSandbox | LocalSandbox | undefined,
): Workspace | undefined {
	if (!sandbox) return undefined;

	if (sandbox instanceof LocalSandbox) {
		return new Workspace({
			sandbox,
			filesystem: new LocalFilesystem({ basePath: './workspace' }),
		});
	}

	return new Workspace({
		sandbox,
		filesystem: new DaytonaFilesystem(sandbox),
	});
}
