import { Logger } from '@n8n/backend-common';
import type { CreateExecutionPayload, IExecutionDb } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IRun,
	ExecutionStatus,
	IWorkflowExecutionDataProcess,
	StructuredChunk,
} from 'n8n-workflow';
import { createDeferredPromise, ExecutionCancelledError, sleep } from 'n8n-workflow';
import { strict as assert } from 'node:assert';
import type PCancelable from 'p-cancelable';

import { ExecutionNotFoundError } from '@/errors/execution-not-found-error';
import type { IExecutingWorkflowData, IExecutionsCurrentSummary } from '@/interfaces';
import { isWorkflowIdValid } from '@/utils';

import { ConcurrencyControlService } from './concurrency/concurrency-control.service';
import config from './config';
import { EventService } from './events/event.service';

@Service()
export class ActiveExecutions {
	/**
	 * Active executions in the current process, not globally.
	 */
	private activeExecutions: {
		[executionId: string]: IExecutingWorkflowData;
	} = {};

	/**
	 * Track execution cancellation sources for debugging
	 */
	private cancellationSources = new Map<string, string>();

	/**
	 * Execution timeout configuration
	 */
	private readonly EXECUTION_TIMEOUT_MS = config.getEnv('executions.timeout') * 1000 || 0;
	private readonly MAX_EXECUTION_TIME_MS = config.getEnv('executions.maxRuntime') * 1000 || 0;

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly concurrencyControl: ConcurrencyControlService,
		private readonly eventService: EventService,
	) {}

	has(executionId: string): boolean {
		return executionId in this.activeExecutions;
	}

	/**
	 * Add a new active execution
	 */
	async add(executionData: IWorkflowExecutionDataProcess, executionId?: string): Promise<string> {
		let executionStatus: ExecutionStatus = executionId ? 'running' : 'new';
		const mode = executionData.executionMode;

		try {
			if (executionId === undefined) {
				// Create new execution in database
				const fullExecutionData: CreateExecutionPayload = {
					data: executionData.executionData!,
					mode,
					finished: false,
					workflowData: executionData.workflowData,
					status: executionStatus,
					workflowId: executionData.workflowData?.id,
					retryOf: executionData.retryOf ?? undefined,
				};

				executionId = await this.executionRepository.createNewExecution(fullExecutionData);
				assert(executionId);

				if (config.getEnv('executions.mode') === 'regular') {
					// Check concurrency limits before proceeding
					if (!this.canAddExecution(mode)) {
						throw new Error(`Concurrency limit reached for mode: ${mode}`);
					}
					await this.concurrencyControl.throttle({ mode, executionId });
					await this.executionRepository.setRunning(executionId);
				}
				executionStatus = 'running';
			} else {
				// Update existing execution in database
				await this.concurrencyControl.throttle({ mode, executionId });

				const execution: Pick<IExecutionDb, 'id' | 'data' | 'waitTill' | 'status'> = {
					id: executionId,
					data: executionData.executionData!,
					waitTill: null,
					status: executionStatus,
				};

				await this.executionRepository.updateExistingExecution(executionId, execution);
			}
		} catch (error) {
			this.logger.error('Failed to add execution', {
				executionId,
				workflowId: executionData.workflowData?.id,
				mode,
				error: (error as Error).message,
			});
			throw error;
		}

		const resumingExecution = this.activeExecutions[executionId];
		const postExecutePromise = createDeferredPromise<IRun | undefined>();

		const execution: IExecutingWorkflowData = {
			executionData,
			startedAt: resumingExecution?.startedAt ?? new Date(),
			postExecutePromise,
			status: executionStatus,
			responsePromise: resumingExecution?.responsePromise,
			httpResponse: executionData.httpResponse ?? undefined,
		};
		this.activeExecutions[executionId] = execution;

		// Set up execution timeout protection
		this.setupExecutionTimeout(executionId, execution);

		// Enhanced cleanup with better error handling
		void postExecutePromise.promise
			.catch((error) => {
				if (error instanceof ExecutionCancelledError) {
					const source = this.cancellationSources.get(executionId) || 'Unknown';
					this.logger.info('Execution cancelled', {
						executionId,
						workflowId: executionData.workflowData?.id,
						source,
						reason: error.message,
					});
					return;
				}
				this.logger.error('Execution failed with unexpected error', {
					executionId,
					workflowId: executionData.workflowData?.id,
					error: (error as Error).message,
				});
				throw error;
			})
			.finally(() => {
				this.cleanupExecution(executionId, execution);
			});

		this.logger.debug('Execution added', {
			executionId,
			workflowId: executionData.workflowData?.id,
			mode,
			status: executionStatus,
		});

		return executionId;
	}

	/**
	 * Attach workflow execution to active execution
	 */
	attachWorkflowExecution(executionId: string, workflowExecution: PCancelable<IRun>): void {
		this.getExecutionOrFail(executionId).workflowExecution = workflowExecution;
	}

	/**
	 * Attach response promise to active execution
	 */
	attachResponsePromise(
		executionId: string,
		responsePromise: IDeferredPromise<IExecuteResponsePromiseData>,
	): void {
		this.getExecutionOrFail(executionId).responsePromise = responsePromise;
	}

	/**
	 * Resolve response promise for execution
	 */
	resolveResponsePromise(executionId: string, response: IExecuteResponsePromiseData): void {
		const execution = this.activeExecutions[executionId];
		if (!execution) {
			this.logger.warn('Cannot resolve response promise - execution not found', { executionId });
			return;
		}
		execution.responsePromise?.resolve(response);
	}

	/**
	 * Send chunk to streaming response
	 */
	sendChunk(executionId: string, chunkText: StructuredChunk): void {
		const execution = this.activeExecutions[executionId];
		if (!execution) {
			this.logger.warn('Cannot send chunk - execution not found', { executionId });
			return;
		}

		if (execution.httpResponse) {
			try {
				execution.httpResponse.write(JSON.stringify(chunkText) + '\n');
				execution.httpResponse.flush();
			} catch (error) {
				this.logger.error('Failed to send chunk', {
					executionId,
					error: (error as Error).message,
				});
			}
		}
	}

	/**
	 * Cancel execution with enhanced tracking and validation
	 */
	stopExecution(executionId: string, reason?: string, source = 'Manual'): void {
		const execution = this.activeExecutions[executionId];
		if (!execution) {
			this.logger.warn('Attempted to stop execution that does not exist', {
				executionId,
				reason,
				source,
			});
			return;
		}

		// Prevent duplicate cancellations
		if (execution.status === 'cancelled' || execution.status === 'crashed') {
			this.logger.debug('Execution already terminated', {
				executionId,
				status: execution.status,
				reason,
			});
			return;
		}

		// Track cancellation source for debugging
		this.cancellationSources.set(executionId, source);

		const workflowId = execution.executionData.workflowData?.id;
		const executionDuration = Date.now() - execution.startedAt.getTime();

		this.logger.warn('Stopping execution', {
			executionId,
			reason: reason || 'No reason provided',
			source,
			status: execution.status,
			workflowId,
			durationMs: executionDuration,
		});

		// Update status before cancellation
		execution.status = 'cancelled';

		this.eventService.emit('execution-cancelled', { executionId, reason, source });
		const error = new ExecutionCancelledError(executionId);
		if (reason) {
			error.message = `${error.message} - Reason: ${reason} (Source: ${source})`;
		}

		// Graceful cancellation with proper cleanup
		try {
			execution.responsePromise?.reject(error);
			if (execution.status === 'waiting') {
				// Waiting executions don't have valid workflowExecution or postExecutePromise
				delete this.activeExecutions[executionId];
			} else {
				execution.workflowExecution?.cancel();
				execution.postExecutePromise.reject(error);
			}
		} catch (cleanupError) {
			this.logger.error('Error during execution cancellation cleanup', {
				executionId,
				cleanupError: (cleanupError as Error).message,
			});
		}

		this.logger.debug('Execution cancelled successfully', {
			executionId,
			reason,
			source,
		});
	}

	/**
	 * Finalize execution and resolve post-execution promise
	 */
	finalizeExecution(executionId: string, fullRunData?: IRun): void {
		if (!this.has(executionId)) return;
		const execution = this.getExecutionOrFail(executionId);

		// Close HTTP response for streaming responses
		const httpResponse = execution.httpResponse || execution.executionData.httpResponse;
		if (httpResponse) {
			try {
				this.logger.debug('Closing response for execution', { executionId });
				httpResponse.end();
			} catch (error) {
				this.logger.error('Error closing streaming response', {
					executionId,
					error: (error as Error).message,
				});
			}
		}

		execution.postExecutePromise.resolve(fullRunData);
		this.logger.debug('Execution finalized', { executionId });
	}

	/**
	 * Resolve response promise for execution (used by Form nodes)
	 * TODO: Refactor this method - it's specific to Form node redirection chains
	 */
	resolveExecutionResponsePromise(executionId: string): void {
		if (!this.has(executionId)) return;
		const execution = this.getExecutionOrFail(executionId);

		if (execution.status !== 'waiting' && execution.responsePromise) {
			execution.responsePromise.resolve({});
			this.logger.debug('Execution response promise cleaned', { executionId });
		}
	}

	/**
	 * Get post-execution promise for given execution ID
	 */
	async getPostExecutePromise(executionId: string): Promise<IRun | undefined> {
		try {
			return await this.getExecutionOrFail(executionId).postExecutePromise.promise;
		} catch (error) {
			this.logger.error('Failed to get post-execute promise', {
				executionId,
				error: (error as Error).message,
			});
			throw error;
		}
	}

	/**
	 * Get summary of all currently active executions
	 */
	getActiveExecutions(): IExecutionsCurrentSummary[] {
		const activeExecutionsList: IExecutionsCurrentSummary[] = [];

		for (const [executionId, executionData] of Object.entries(this.activeExecutions)) {
			activeExecutionsList.push({
				id: executionId,
				retryOf: executionData.executionData.retryOf ?? undefined,
				startedAt: executionData.startedAt,
				mode: executionData.executionData.executionMode,
				workflowId: executionData.executionData.workflowData?.id,
				status: executionData.status,
			});
		}

		return activeExecutionsList;
	}

	/**
	 * Set execution status
	 */
	setStatus(executionId: string, status: ExecutionStatus): void {
		this.getExecutionOrFail(executionId).status = status;
	}

	/**
	 * Get execution status
	 */
	getStatus(executionId: string): ExecutionStatus {
		return this.getExecutionOrFail(executionId).status;
	}

	/**
	 * Gracefully shutdown with improved execution preservation
	 */
	async shutdown(cancelAll = false): Promise<void> {
		const isRegularMode = config.getEnv('executions.mode') === 'regular';
		this.logger.info('Starting graceful shutdown', {
			cancelAll,
			isRegularMode,
			activeExecutions: Object.keys(this.activeExecutions).length,
		});

		if (isRegularMode) {
			// Disable concurrency control to prevent new executions during shutdown
			this.concurrencyControl.disable();
		}

		const executionsToCancel: string[] = [];
		const initialExecutionIds = Object.keys(this.activeExecutions);

		// Process each active execution with better preservation logic
		for (const executionId of initialExecutionIds) {
			const execution = this.activeExecutions[executionId];
			if (!execution) continue;

			const { responsePromise, status } = execution;
			const shouldCancel =
				responsePromise || (isRegularMode && cancelAll && status !== 'running') || status === 'new';

			if (shouldCancel) {
				// Only cancel executions that can't be preserved
				this.stopExecution(executionId, 'Shutdown requested', 'Shutdown');
				executionsToCancel.push(executionId);
			} else if (status === 'waiting') {
				// Preserve waiting executions but clean up references
				delete execution.workflowExecution;
				this.logger.debug('Preserved waiting execution during shutdown', { executionId });
			} else if (status === 'running') {
				// Log running executions that will continue
				this.logger.info('Preserving running execution during shutdown', {
					executionId,
					workflowId: execution.executionData.workflowData?.id,
				});
			}
		}

		await this.concurrencyControl.removeAll(executionsToCancel);

		// Wait for remaining executions with timeout
		const shutdownTimeoutMs = 30000; // 30 seconds
		const startTime = Date.now();
		let pollCount = 0;
		let remainingExecutions = Object.keys(this.activeExecutions);

		while (remainingExecutions.length > 0 && Date.now() - startTime < shutdownTimeoutMs) {
			if (pollCount++ % 4 === 0) {
				this.logger.info(
					`Waiting for ${remainingExecutions.length} active executions to finish...`,
				);
			}

			await sleep(500);
			remainingExecutions = Object.keys(this.activeExecutions);
		}

		if (remainingExecutions.length > 0) {
			this.logger.warn(
				`Shutdown timeout reached with ${remainingExecutions.length} executions still active`,
			);
		} else {
			this.logger.info('All executions finished - shutdown complete');
		}
	}

	/**
	 * Check if new execution can be added based on concurrency limits
	 */
	private canAddExecution(mode: string): boolean {
		const maxConcurrency = config.getEnv('executions.concurrency.productionLimit');
		if (maxConcurrency <= 0) return true;

		const activeCount = Object.keys(this.activeExecutions).length;
		return activeCount < maxConcurrency;
	}

	/**
	 * Set up execution timeout protection to prevent runaway executions
	 */
	private setupExecutionTimeout(executionId: string, execution: IExecutingWorkflowData): void {
		const timeoutMs = this.MAX_EXECUTION_TIME_MS || this.EXECUTION_TIMEOUT_MS;
		if (timeoutMs <= 0) return;

		setTimeout(() => {
			if (this.activeExecutions[executionId] && execution.status === 'running') {
				this.logger.warn('Execution timeout reached', {
					executionId,
					timeoutMs,
					workflowId: execution.executionData.workflowData?.id,
				});
				this.stopExecution(executionId, `Execution timeout (${timeoutMs}ms)`, 'Timeout');
			}
		}, timeoutMs);
	}

	/**
	 * Enhanced cleanup with proper resource management
	 */
	private cleanupExecution(executionId: string, execution: IExecutingWorkflowData): void {
		try {
			this.concurrencyControl.release({ mode: execution.executionData.executionMode });
			this.cancellationSources.delete(executionId);

			if (execution.status === 'waiting') {
				// Don't hold reference to WorkflowExecute for waiting executions
				delete execution.workflowExecution;
			} else {
				delete this.activeExecutions[executionId];
				this.logger.debug('Execution cleaned up', {
					executionId,
					workflowId: execution.executionData.workflowData?.id,
				});
			}
		} catch (error) {
			this.logger.error('Error during execution cleanup', {
				executionId,
				error: (error as Error).message,
			});
		}
	}

	/**
	 * Get execution data or throw error if not found
	 */
	private getExecutionOrFail(executionId: string): IExecutingWorkflowData {
		const execution = this.activeExecutions[executionId];
		if (!execution) {
			throw new ExecutionNotFoundError(executionId);
		}
		return execution;
	}

	/**
	 * Get cancellation tracking information for debugging
	 */
	getCancellationSource(executionId: string): string | undefined {
		return this.cancellationSources.get(executionId);
	}

	/**
	 * Check execution health and detect potential issues
	 */
	checkExecutionHealth(): void {
		const now = Date.now();
		const maxAge = 24 * 60 * 60 * 1000; // 24 hours

		for (const [executionId, execution] of Object.entries(this.activeExecutions)) {
			const age = now - execution.startedAt.getTime();

			if (age > maxAge && execution.status === 'running') {
				this.logger.warn('Long-running execution detected', {
					executionId,
					ageHours: Math.round(age / (60 * 60 * 1000)),
					workflowId: execution.executionData.workflowData?.id,
				});
			}
		}
	}
}
