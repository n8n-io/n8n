import { DaytonaFilesystem } from './daytona-filesystem';
import { DaytonaSandbox } from './daytona-sandbox';
import { N8nSandboxFilesystem } from './n8n-sandbox-filesystem';
import { N8nSandboxServiceSandbox } from './n8n-sandbox-sandbox';
import type {
	CreateSandboxOptions,
	SandboxConfig,
	SandboxFilesystem,
	SandboxInstance,
} from './types';

export async function createSandbox(
	config: SandboxConfig,
	options: CreateSandboxOptions = {},
): Promise<SandboxInstance | undefined> {
	if (!config.enabled) return undefined;

	if (config.provider === 'daytona') {
		const mode = config.getAuthToken ? 'proxy' : 'direct';
		const logger = options.logger ?? config.logger;
		return new DaytonaSandbox({
			id: config.id,
			name: config.name,
			apiKey: config.getAuthToken ? undefined : config.daytonaApiKey,
			getAuthToken: config.getAuthToken,
			refreshSkewMs: config.refreshSkewMs,
			logger,
			apiUrl: config.daytonaApiUrl,
			labels: config.labels,
			...(config.image ? { image: config.image } : {}),
			...(config.snapshot ? { snapshot: config.snapshot } : {}),
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

	const exhaustiveProvider: never = config;
	throw new Error(`Unsupported sandbox provider: ${JSON.stringify(exhaustiveProvider)}`);
}

export function createFilesystem(
	sandbox: SandboxInstance | undefined,
): SandboxFilesystem | undefined {
	if (!sandbox) return undefined;

	if (sandbox instanceof N8nSandboxServiceSandbox) {
		return new N8nSandboxFilesystem(sandbox);
	}

	if (sandbox instanceof DaytonaSandbox) {
		return new DaytonaFilesystem(sandbox);
	}

	throw new Error(`Unsupported sandbox instance: ${sandbox.name}`);
}
