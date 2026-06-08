import { Workspace } from '@n8n/agents';
import {
	createFilesystem,
	createSandbox as createSharedSandbox,
	type CreateSandboxOptions,
	type DaytonaSandboxConfig,
	type DisabledSandboxConfig,
	type N8nSandboxConfig,
	type SandboxConfig as SharedSandboxConfig,
	type SandboxInstance,
	type SandboxProvider,
	loadDaytona,
} from '@n8n/agents/sandbox';

import type { Logger } from '../logger';
import { SnapshotManager } from './snapshot-manager';

export type InstanceAiDaytonaSandboxConfig = DaytonaSandboxConfig & {
	/** Running n8n version, used to resolve a versioned prebuilt snapshot. */
	n8nVersion?: string;
	/** Prefix prepended to the Daytona sandbox name and surfaced as a label. */
	namePrefix?: string;
};

export type InstanceAiSandboxConfig =
	| DisabledSandboxConfig
	| InstanceAiDaytonaSandboxConfig
	| N8nSandboxConfig;

export type SandboxConfig = InstanceAiSandboxConfig;
export { type SandboxInstance, type SandboxProvider };

export interface InstanceAiCreateSandboxOptions extends CreateSandboxOptions {
	useSnapshotFallback?: boolean;
}

const NOOP_LOGGER: Logger = {
	info: () => {},
	warn: () => {},
	error: () => {},
	debug: () => {},
};

function toSharedDaytonaSandboxConfig(
	config: InstanceAiDaytonaSandboxConfig,
): DaytonaSandboxConfig {
	const sharedConfig = { ...config };
	delete sharedConfig.n8nVersion;
	delete sharedConfig.namePrefix;
	return sharedConfig;
}

function toSharedSandboxConfig(config: InstanceAiSandboxConfig): SharedSandboxConfig {
	if (!config.enabled || config.provider !== 'daytona') return config;
	return toSharedDaytonaSandboxConfig(config);
}

/**
 * Create a sandbox instance based on config.
 * Returns undefined when sandbox is disabled.
 *
 * - 'daytona': Isolated Docker container via Daytona API.
 * - 'n8n-sandbox': n8n sandbox service-backed container.
 */
export async function createSandbox(
	config: InstanceAiSandboxConfig,
	options: InstanceAiCreateSandboxOptions = {},
): Promise<SandboxInstance | undefined> {
	if (!config.enabled) return undefined;

	if (config.provider !== 'daytona' || options.useSnapshotFallback !== true) {
		return await createSharedSandbox(toSharedSandboxConfig(config), {
			logger: options.logger,
			errorReporter: options.errorReporter,
		});
	}

	const mode = config.getAuthToken ? 'proxy' : 'direct';
	const logger = options.logger ?? config.logger ?? NOOP_LOGGER;
	const snapshotManager = new SnapshotManager(
		typeof config.image === 'string' ? config.image : undefined,
		logger,
		config.n8nVersion,
		options.errorReporter,
	);

	const snapshot =
		mode === 'direct'
			? await snapshotManager.ensureSnapshot(
					new (loadDaytona().Daytona)({
						apiKey: config.daytonaApiKey,
						apiUrl: config.daytonaApiUrl,
					}),
					mode,
				)
			: await snapshotManager.ensureSnapshot(undefined, mode);
	const image = await snapshotManager.ensureImage();

	return await createSharedSandbox(
		{
			...toSharedDaytonaSandboxConfig(config),
			image,
			...(snapshot ? { snapshot } : {}),
		},
		{
			logger: options.logger,
			errorReporter: options.errorReporter,
		},
	);
}

/**
 * Create a Workspace wrapping a sandbox instance.
 */
export function createWorkspace(sandbox: SandboxInstance | undefined): Workspace | undefined {
	if (!sandbox) return undefined;

	const filesystem = createFilesystem(sandbox);

	return new Workspace({
		sandbox,
		filesystem,
	});
}
