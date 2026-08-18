import { Service } from '@n8n/di';
import type { StartExecutionRequest, StartExecutionResult } from '@n8n/engine';
import { OperationalError } from 'n8n-workflow';

/**
 * Starts an execution on the engine 2.0 data plane.
 *
 * The control plane always reaches the engine over HTTP, even when the engine
 * runs in the same process, so this stays a network-shaped contract.
 */
export interface EngineDataPlaneProvider {
	startExecution(request: StartExecutionRequest): Promise<StartExecutionResult>;
}

/**
 * Seam between the control plane and the `engine-v2` module.
 *
 * The module registers itself here on init. Without the module enabled there is
 * no provider, and calling into the engine is a programming error rather than a
 * silent fallback: the caller is expected to check {@link isAvailable} first.
 *
 * TODO(CAT-2877): nothing calls this yet. The dispatch that routes on the
 * per-workflow `engineType` setting lands with the parent ticket.
 */
@Service()
export class EngineDataPlaneProxyService implements EngineDataPlaneProvider {
	private provider: EngineDataPlaneProvider | null = null;

	registerProvider(provider: EngineDataPlaneProvider): void {
		this.provider = provider;
	}

	isAvailable(): boolean {
		return this.provider !== null;
	}

	async startExecution(request: StartExecutionRequest): Promise<StartExecutionResult> {
		if (!this.provider) {
			throw new OperationalError(
				'Engine 2.0 is not available. Enable the `engine-v2` module with N8N_ENABLED_MODULES.',
			);
		}

		return await this.provider.startExecution(request);
	}
}
