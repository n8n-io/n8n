import { Logger } from '@n8n/backend-common';
import type { IExecutionDb } from '@n8n/db';
import { Service } from '@n8n/di';

import type {
	ExecutionRedaction,
	ExecutionRedactionOptions,
} from '@/executions/execution-redaction';

/**
 * Service responsible for redacting sensitive data from executions.
 * This service acts as a facade and delegates to the redaction module.
 */
@Service()
export class ExecutionRedactionService implements ExecutionRedaction {
	constructor(private readonly logger: Logger) {}

	/**
	 * Initializes the execution redaction service.
	 * This is a stub implementation that will be extended when the redaction module is fully implemented.
	 */
	async init(): Promise<void> {
		this.logger.debug('Initializing ExecutionRedactionService...');
	}

	/**
	 * Main entry point for redaction logic.
	 * Processes an execution and applies redaction based on the provided options.
	 *
	 * @param execution - The execution to process
	 * @param options - Options for redaction processing
	 * @returns The processed execution (currently returns unmodified execution as stub)
	 */
	async processExecution(
		execution: IExecutionDb,
		options: ExecutionRedactionOptions,
	): Promise<IExecutionDb> {
		this.logger.debug('Processing execution for redaction', {
			executionId: execution.id,
			redactExecutionData: options.redactExecutionData,
		});

		// Stub implementation: return unmodified execution
		return execution;
	}

	/**
	 * Checks whether a user has permission to reveal redacted data in an execution.
	 *
	 * @param userId - The ID of the user requesting access
	 * @param executionId - The ID of the execution to check
	 * @returns `true` if the user can reveal redacted data, `false` otherwise
	 *          (currently returns `false` as stub)
	 */
	async canUserReveal(userId: string, executionId: string): Promise<boolean> {
		this.logger.debug('Checking reveal permissions', {
			userId,
			executionId,
		});

		// Stub implementation: return false (no reveal permission)
		return false;
	}
}
