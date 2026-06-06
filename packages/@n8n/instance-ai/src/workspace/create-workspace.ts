import { Workspace } from '@n8n/agents';
import {
	createFilesystem,
	createSandbox as createSharedSandbox,
	type CreateSandboxOptions,
	type SandboxConfig,
	type SandboxInstance,
	type SandboxProvider,
} from '@n8n/ai-utilities/sandbox';

import type { Logger } from '../logger';
import { loadDaytona } from './lazy-daytona';
import { SnapshotManager } from './snapshot-manager';

export { type SandboxConfig, type SandboxInstance, type SandboxProvider };

export interface InstanceAiCreateSandboxOptions extends CreateSandboxOptions {
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
 * - 'daytona': Isolated Docker container via Daytona API.
 * - 'n8n-sandbox': n8n sandbox service-backed container.
 */
export async function createSandbox(
	config: SandboxConfig,
	options: InstanceAiCreateSandboxOptions = {},
): Promise<SandboxInstance | undefined> {
	if (!config.enabled) return undefined;

	if (config.provider !== 'daytona' || options.useSnapshotFallback !== true) {
		return await createSharedSandbox(config, {
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
			...config,
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
	if (!filesystem) return undefined;

	return new Workspace({
		sandbox,
		filesystem,
	});
}
