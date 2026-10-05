import { Service } from '@n8n/di';
import type {
	ExecutionSnapshot,
	StartExecutionRequest,
	StartExecutionResult,
	SearchExecutionsRequest,
	SearchExecutionsResponse,
} from '@n8n/engine';
import { OperationalError, UserError } from 'n8n-workflow';

import type { ExecutionIdV2 } from '@/executions/execution-id';

/** The engine refused the workflow before it saved an execution for it. */
export class EngineRejectedWorkflowError extends UserError {}

/** The engine did not admit the run, and saved no execution for it. */
export class EngineDidNotAdmitError extends OperationalError {}

/**
 * Whether a failed start guarantees that the engine saved no execution. Any
 * other failure, such as a server error or a lost response, can come after the
 * save, so a run can exist under the requested id.
 */
export const isStartRefusedBeforeSave = (error: unknown): boolean =>
	error instanceof EngineRejectedWorkflowError || error instanceof EngineDidNotAdmitError;

/**
 * Starts and reads executions on the engine v2 data plane.
 *
 * The control plane always reaches the engine over HTTP, even when the engine
 * runs in the same process, so this stays a network-shaped contract.
 */
export interface EngineDataPlaneProvider {
	searchExecutions(request: SearchExecutionsRequest): Promise<SearchExecutionsResponse>;

	/**
	 * Throws {@link EngineRejectedWorkflowError} or {@link EngineDidNotAdmitError}
	 * only when the engine saved no execution.
	 */
	startExecution(request: StartExecutionRequest): Promise<StartExecutionResult>;

	/**
	 * `undefined` when the data plane holds no execution under that id.
	 *
	 * @param options.includeSteps Also report the steps, on the same round trip.
	 */
	getExecution(
		id: ExecutionIdV2,
		options?: { includeSteps?: boolean; abortSignal?: AbortSignal },
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

	async searchExecutions(request: SearchExecutionsRequest): Promise<SearchExecutionsResponse> {
		if (!this.provider) return { items: [], nextCursor: null, total: 0 };
		return await this.provider.searchExecutions(request);
	}

	async startExecution(request: StartExecutionRequest): Promise<StartExecutionResult> {
		if (!this.provider) {
			throw new UserError(
				'Engine v2 is not available. Enable the `engine-v2` module with N8N_ENABLED_MODULES.',
			);
		}

		return await this.provider.startExecution(request);
	}

	/** No provider means no v2 execution can exist, so this is a miss, not an error. */
	async getExecution(
		id: ExecutionIdV2,
		options?: { includeSteps?: boolean; abortSignal?: AbortSignal },
	): Promise<ExecutionSnapshot | undefined> {
		if (!this.provider) return undefined;

		return await this.provider.getExecution(id, options);
	}
}
