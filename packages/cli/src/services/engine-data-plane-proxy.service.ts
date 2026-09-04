import { Service } from '@n8n/di';
import type { ExecutionSnapshot, StartExecutionRequest, StartExecutionResult } from '@n8n/engine';
import { UserError } from 'n8n-workflow';

import type { ExecutionIdV2 } from '@/executions/execution-id';

/**
 * Starts and reads executions on the engine 2.0 data plane.
 *
 * The control plane always reaches the engine over HTTP, even when the engine
 * runs in the same process, so this stays a network-shaped contract.
 */
export interface EngineDataPlaneProvider {
	startExecution(request: StartExecutionRequest): Promise<StartExecutionResult>;

	/**
	 * `undefined` when the data plane holds no execution under that id.
	 *
	 * @param options.includeSteps Also report the steps, on the same round trip.
	 */
	getExecution(
		id: ExecutionIdV2,
		options?: { includeSteps?: boolean },
	): Promise<ExecutionSnapshot | undefined>;
}

/**
 * Seam between the control plane and the `engine-v2` module.
 *
 * The module registers itself here on init. Without the module enabled there is
 * no provider, and calling into the engine throws rather than degrading silently:
 * a dropped execution would be worse than a loud failure.
 */
@Service()
export class EngineDataPlaneProxyService implements EngineDataPlaneProvider {
	private provider: EngineDataPlaneProvider | null = null;

	registerProvider(provider: EngineDataPlaneProvider): void {
		this.provider = provider;
	}

	/** Whether the `engine-v2` module is enabled and has registered itself. */
	isAvailable(): boolean {
		return this.provider !== null;
	}

	async startExecution(request: StartExecutionRequest): Promise<StartExecutionResult> {
		if (!this.provider) {
			throw new UserError(
				'Engine 2.0 is not available. Enable the `engine-v2` module with N8N_ENABLED_MODULES.',
			);
		}

		return await this.provider.startExecution(request);
	}

	/** No provider means no v2 execution can exist, so this is a miss, not an error. */
	async getExecution(
		id: ExecutionIdV2,
		options?: { includeSteps?: boolean },
	): Promise<ExecutionSnapshot | undefined> {
		if (!this.provider) return undefined;

		return await this.provider.getExecution(id, options);
	}
}
