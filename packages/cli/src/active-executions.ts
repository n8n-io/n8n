import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
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
	WebhookResponseMode,
} from 'n8n-workflow';
import {
	createDeferredPromise,
	ExecutionCancelledError,
	sleep,
	SystemShutdownExecutionCancelledError,
} from 'n8n-workflow';
import { strict as assert } from 'node:assert';
import type PCancelable from 'p-cancelable';

import { ExecutionNotFoundError } from '@/errors/execution-not-found-error';
import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import type { IExecutingWorkflowData, IExecutionsCurrentSummary } from '@/interfaces';
import { isWorkflowIdValid } from '@/utils';

import { ConcurrencyControlService } from './concurrency/concurrency-control.service';
import { EventService } from './events/event.service';
import { ConcurrencyCapacityReservation } from './concurrency/concurrency-capacity-reservation';

@Service()
export class ActiveExecutions {
	/**
	 * Active executions in the current process, not globally.
	 */
	private activeExecutions: {
		[executionId: string]: IExecutingWorkflowData;
	} = {};

	/** Response mode by execution ID, if webhook-initiated. */
	private responseModes = new Map<string, WebhookResponseMode>();

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly concurrencyControl: ConcurrencyControlService,
		private readonly eventService: EventService,
		private readonly executionsConfig: ExecutionsConfig,
	) {}

	has(executionId: string) {
		return this.activeExecutions[executionId] !== undefined;
	}

	/**
	 * Add a new active execution
	 */
	async add(
		executionData: IWorkflowExecutionDataProcess,
		maybeExecutionId?: string,
	): Promise<string> {
		let executionStatus: ExecutionStatus = maybeExecutionId ? 'running' : 'new';
		const mode = executionData.executionMode;
		const capacityReservation = new ConcurrencyCapacityReservation(this.concurrencyControl);

		try {
			if (maybeExecutionId === undefined) {
				const fullExecutionData: CreateExecutionPayload = {
					data: executionData.executionData!,
					mode,
					finished: false,
					workflowData: executionData.workflowData,
					status: executionStatus,
					workflowId: executionData.workflowData.id,
					retryOf: executionData.retryOf ?? undefined,
				};

				const workflowId = executionData.workflowData.id;
				if (workflowId !== undefined && isWorkflowIdValid(workflowId)) {
					fullExecutionData.workflowId = workflowId;
				}

				maybeExecutionId = await this.executionPersistence.create(fullExecutionData);
				assert(maybeExecutionId);

				await capacityReservation.reserve({ mode, executionId: maybeExecutionId });

				if (this.executionsConfig.mode === 'regular') {
					await this.executionRepository.setRunning(maybeExecutionId);
				}
				executionStatus = 'running';
			} else {
				// Is an existing execution we want to finish so update in DB

				await capacityReservation.reserve({ mode, executionId: maybeExecutionId });

				const execution: Pick<IExecutionDb, 'id' | 'data' | 'waitTill' | 'status'> = {
					id: maybeExecutionId,
					data: executionData.executionData!,
					waitTill: null,
					status: executionStatus,
					// this is resuming, so keep `startedAt` as it was
				};

				const updateSucceeded = await this.executionRepository.updateExistingExecution(
					maybeExecutionId,
					execution,
					'waiting', // Only update if status is 'waiting'
				);

				if (!updateSucceeded) {
					// Another process is already resuming this execution
					throw new ExecutionAlreadyResumingError(maybeExecutionId);
				}
			}
		} catch (error) {
			capacityReservation.release();
			throw error;
		}

		// At this point executionId is guaranteed to be defined - capture it for use in closures
		const executionId = maybeExecutionId;
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

		// Automatically remove execution once the postExecutePromise settles
		void postExecutePromise.promise
			.catch((error) => {
				if (error instanceof ExecutionCancelledError) return;
				throw error;
			})
			.finally(() => {
				capacityReservation.release();
				if (execution.status === 'waiting') {
					// Do not hold on a reference to the previous WorkflowExecute instance, since a resuming execution will use a new instance
					delete execution.workflowExecution;
				} else {
					delete this.activeExecutions[executionId];
					this.responseModes.delete(executionId);
					this.logger.debug('Execution removed', { executionId });
				}
			});

		this.logger.debug('Execution added', { executionId });

		return executionId;
	}

	/**
	 * Attaches an execution
	 */

	attachWorkflowExecution(executionId: string, workflowExecution: PCancelable<IRun>) {
		this.getExecutionOrFail(executionId).workflowExecution = workflowExecution;
	}

	attachResponsePromise(
		executionId: string,
		responsePromise: IDeferredPromise<IExecuteResponsePromiseData>,
	): void {
		this.getExecutionOrFail(executionId).responsePromise = responsePromise;
	}

	resolveResponsePromise(executionId: string, response: IExecuteResponsePromiseData): void {
		const execution = this.activeExecutions[executionId];
		execution?.responsePromise?.resolve(response);
	}

	/** Used for sending a chunk to a streaming response */
	sendChunk(executionId: string, chunkText: StructuredChunk): void {
		const execution = this.activeExecutions[executionId];
		if (execution?.httpResponse) {
			execution?.httpResponse.write(JSON.stringify(chunkText) + '\n');
			execution?.httpResponse.flush();
		}
	}

	/** Cancel the execution promise and reject its post-execution promise. */
	stopExecution(executionId: string, cancellationError: ExecutionCancelledError): void {
		const execution = this.activeExecutions[executionId];
		if (execution === undefined) {
			// There is no execution running with that id
			return;
		}

		this.logger.debug('Cancelling execution', { executionId, reason: cancellationError.reason });

		const workflowData = execution.executionData.workflowData;
		this.eventService.emit('execution-cancelled', {
			executionId,
			workflowId: workflowData?.id,
			workflowName: workflowData?.name,
			reason: cancellationError.reason,
		});
		execution.responsePromise?.reject(cancellationError);
		if (execution.status === 'waiting') {
			// A waiting execution will not have a valid workflowExecution or postExecutePromise
			// So we can't rely on the `.finally` on the postExecutePromise for the execution removal
			delete this.activeExecutions[executionId];
			this.responseModes.delete(executionId);
		} else {
			execution.workflowExecution?.cancel();
			execution.postExecutePromise.reject(cancellationError);
		}
		this.logger.debug('Execution cancelled', { executionId });
	}

	/** Resolve the post-execution promise in an execution. */
	finalizeExecution(executionId: string, fullRunData?: IRun) {
		if (!this.has(executionId)) return;
		const execution = this.getExecutionOrFail(executionId);

		// Close response if it exists (for streaming responses)
		if (execution.executionData.httpResponse) {
			try {
				this.logger.debug('Closing response for execution', { executionId });
				execution.executionData.httpResponse.end();
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

	/** Resolve the response promise in an execution. */
	resolveExecutionResponsePromise(executionId: string) {
		// TODO: This should probably be refactored.
		// The reason for adding this method is that the Form node works in 'responseNode' mode
		// and expects the next Form to 'sendResponse' to redirect to the current Form node.
		// Resolving responsePromise here is needed to complete the redirection chain; otherwise, a manual reload will be required.

		if (!this.has(executionId)) return;
		const execution = this.getExecutionOrFail(executionId);

		if (execution.status !== 'waiting' && execution?.responsePromise) {
			execution.responsePromise.resolve({});
			this.logger.debug('Execution response promise cleaned', { executionId });
		}
	}

	/**
	 * Returns a promise which will resolve with the data of the execution with the given id
	 */
	async getPostExecutePromise(executionId: string): Promise<IRun | undefined> {
		return await this.getExecutionOrFail(executionId).postExecutePromise.promise;
	}

	/**
	 * Returns all the currently active executions
	 */
	getActiveExecutions(): IExecutionsCurrentSummary[] {
		const returnData: IExecutionsCurrentSummary[] = [];

		let data;

		for (const id of Object.keys(this.activeExecutions)) {
			data = this.activeExecutions[id];
			returnData.push({
				id,
				retryOf: data.executionData.retryOf ?? undefined,
				startedAt: data.startedAt,
				mode: data.executionData.executionMode,
				workflowId: data.executionData.workflowData.id,
				status: data.status,
			});
		}

		return returnData;
	}

	setStatus(executionId: string, status: ExecutionStatus) {
		this.getExecutionOrFail(executionId).status = status;
	}

	getStatus(executionId: string): ExecutionStatus {
		return this.getExecutionOrFail(executionId).status;
	}

	setResponseMode(executionId: string, responseMode: WebhookResponseMode): void {
		this.responseModes.set(executionId, responseMode);
	}

	getResponseMode(executionId: string): WebhookResponseMode | undefined {
		return this.responseModes.get(executionId);
	}

	/** Wait for all active executions to finish */
	async shutdown(cancelAll = false) {
		const isRegularMode = this.executionsConfig.mode === 'regular';
		if (isRegularMode) {
			// removal of active executions will no longer release capacity back,
			// so that throttled executions cannot resume during shutdown
			this.concurrencyControl.disable();
		}

		let executionIds = Object.keys(this.activeExecutions);
		const toCancel: string[] = [];
		for (const executionId of executionIds) {
			const { status } = this.activeExecutions[executionId];
			if (isRegularMode && cancelAll) {
				this.stopExecution(executionId, new SystemShutdownExecutionCancelledError(executionId));
				toCancel.push(executionId);
			} else if (status === 'waiting' || status === 'new') {
				// Remove waiting and new executions to not block shutdown
				delete this.activeExecutions[executionId];
			}
		}

		await this.concurrencyControl.removeAll(toCancel);

		let count = 0;
		executionIds = Object.keys(this.activeExecutions);
		while (executionIds.length !== 0) {
			if (count++ % 4 === 0) {
				this.logger.info(`Waiting for ${executionIds.length} active executions to finish...`);
			}

			await sleep(500);
			executionIds = Object.keys(this.activeExecutions);
		}
	}

	getExecutionOrFail(executionId: string): IExecutingWorkflowData {
		const execution = this.activeExecutions[executionId];
		if (!execution) {
			throw new ExecutionNotFoundError(executionId);
		}
		return execution;
	}
}
