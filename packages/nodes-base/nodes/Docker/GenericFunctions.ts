import type { IExecuteFunctions } from 'n8n-workflow';

import type { ContainerRunRequest, ContainerRunResult } from './SandboxContract';
import { runContainerViaHttp } from './SandboxHttpClient';

export type {
	ContainerFile,
	ContainerRunRequest,
	ContainerRunResult,
	EnvironmentVariable,
} from './SandboxContract';
export { isValidJobFilePath } from './SandboxContract';

export type SandboxClientImplementation = 'http' | 'sdk';

const resolveImplementation = (): SandboxClientImplementation =>
	process.env.N8N_SANDBOX_CLIENT === 'sdk' ? 'sdk' : 'http';

/**
 * Runs a container as a one-shot job on the DinD sandbox service and resolves
 * with its outcome (exit code, stdout/stderr, timings).
 *
 * Dispatches to one of two interchangeable implementations of the Jobs API
 * contract v1, selected with the N8N_SANDBOX_CLIENT environment variable:
 * - 'http' (default): built on `this.helpers.httpRequest`
 * - 'sdk': built on `@n8n/sandbox-client` (lazy-loaded, so its transport is
 *   only pulled in when selected)
 */
export async function runContainer(
	this: IExecuteFunctions,
	request: ContainerRunRequest,
): Promise<ContainerRunResult> {
	const implementation = resolveImplementation();
	this.logger.info('Docker node: sandbox client implementation selected', { implementation });
	if (implementation === 'sdk') {
		const { runContainerViaSdk } = await import('./SandboxSdkClient.js');
		return await runContainerViaSdk.call(this, request);
	}
	return await runContainerViaHttp.call(this, request);
}
