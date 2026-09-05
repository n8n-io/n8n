import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { CreateExecutionPayload, IExecutionDb } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { createDeferredPromise, type IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { randomUUID } from 'crypto';
import type {
	IExecuteResponsePromiseData,
	IRun,
	ExecutionStatus,
	IWorkflowExecutionDataProcess,
	StructuredChunk,
	WebhookResponseMode,
} from 'n8n-workflow';
import {
	ExecutionCancelledError,
	OperationalError,
	SystemShutdownExecutionCancelledError,
} from 'n8n-workflow';
import { sleep } from '@n8n/utils/sleep';
import { strict as assert } from 'node:assert';
import type PCancelable from 'p-cancelable';

import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { ExecutionNotFoundError } from '@/errors/execution-not-found-error';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import type {
	IExecutingWorkflowData,
	IExecutionsCurrentSummary,
	ResumableExecution,
} from '@/interfaces';
import { isWorkflowIdValid } from '@/utils';
import { EXECUTION_ENDED_WITHOUT_RESPONSE } from '@/webhooks/constants';

import { ConcurrencyCapacityReservation } from './concurrency/concurrency-capacity-reservation';
import { ConcurrencyControlService } from './concurrency/concurrency-control.service';
import { EventService } from './events/event.service';

const DEFAULT_CANCEL_WRITE_TIMEOUT_MS = 3 * Time.seconds.toMilliseconds;

@Service()
export class ActiveExecutions {
	/**
	 * Active executions in the current process, not globally.
	 */
	private activeExecutions: {
		[executionId: string]: IExecutingWorkflowData;
	} = {};

	/**
	 * postExecutePromises of runs whose entry was overwritten by a resume, keyed by
	 * their `runId`. A run must only ever resolve its OWN promise: when `add` replaces
	 * an entry, the previous run's promise is parked here so its later
	 * `finalizeExecution` resolves the right promise instead of the resumed run's.
	 * Cleared as each orphaned promise is resolved.
	 */
	private readonly orphanedPromises = new Map<string, IDeferredPromise<IRun | undefined>>();

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
		existingExecution?: ResumableExecution,
	): Promise<string> {
		let executionStatus: ExecutionStatus = existingExecution ? 'running' : 'new';
		const mode = executionData.executionMode;
		const capacityReservation = new ConcurrencyCapacityReservation(this.concurrencyControl);

		// Evaluation executions are already gated instance-wide by the
		// test-runner fan-out, which throttles the shared evaluation
		// concurrency queue before launching each case (see
		// `test-runner.service.ee.ts`). Reserving capacity again here would
		// consume a second slot from the same queue for the same case; once
		// the fan-out fills the queue up to its cap, this nested reservation
		// blocks forever — before `setRunning` runs — leaving the execution
		// stuck at status 'new' with `startedAt` null (TRUST-144). Skip the
		// reservation for evaluation mode; `release()` below is a no-op when
		// nothing was reserved.
		const shouldReserveCapacity = mode !== 'evaluation';

		let executionId: string;

		try {
			if (existingExecution === undefined) {
				const fullExecutionData: CreateExecutionPayload = {
					data: executionData.executionData!,
					mode,
					finished: false,
					workflowData: executionData.workflowData,
					status: executionStatus,
					workflowId: executionData.workflowData.id,
					retryOf: executionData.retryOf ?? undefined,
					tracingContext: executionData.tracingContext ?? null,
					deduplicationKey: executionData.deduplicationKey,
				};

				const workflowId = executionData.workflowData.id;
				if (workflowId !== undefined && isWorkflowIdValid(workflowId)) {
					fullExecutionData.workflowId = workflowId;
				}

				executionId = await this.executionPersistence.create(fullExecutionData);
				assert(executionId);

				if (shouldReserveCapacity) {
					await capacityReservation.reserve({ mode, executionId });
				}

				if (this.executionsConfig.mode === 'regular') {
					await this.executionRepository.setRunning(executionId);
				}
				executionStatus = 'running';
			} else {
				// Is an existing execution we want to finish so update in DB
				executionId = existingExecution.executionId;

				if (shouldReserveCapacity) {
					await capacityReservation.reserve({ mode, executionId });
				}

				const execution: Pick<IExecutionDb, 'id' | 'data' | 'waitTill' | 'status'> = {
					id: executionId,
					data: executionData.executionData!,
					waitTill: null,
					status: executionStatus,
				};

				const updateSucceeded = await this.executionPersistence.updateExistingExecution(
					executionId,
					execution,
					// Only claim the execution if it is still in the status the caller expected
					{ requireStatus: existingExecution.expectedStatus },
				);

				if (!updateSucceeded) {
					// Another process is already resuming this execution
					throw new ExecutionAlreadyResumingError(executionId);
				}

				if (existingExecution.expectedStatus === 'new') {
					await this.executionRepository.setRunning(executionId);
				}
			}
		} catch (error) {
			capacityReservation.release();
			throw error;
		}

		const resumingExecution = this.activeExecutions[executionId];
		const postExecutePromise = createDeferredPromise<IRun | undefined>();
		const runId = randomUUID();

		// A previous entry for this id is about to be replaced. Park its postExecutePromise
		// so the previous run's OWN later finalize resolves the right promise instead of
		// this resumed run's — a run must never finalize an entry that isn't its own. Park
		// unconditionally: `workflowExecution` is also absent between `add` and
		// `attachWorkflowExecution`, and resolving an already-settled promise is a no-op.
		if (resumingExecution) {
			this.orphanedPromises.set(resumingExecution.runId, resumingExecution.postExecutePromise);
		}

		const execution: IExecutingWorkflowData = {
			executionData,
			startedAt: resumingExecution?.startedAt ?? new Date(),
			postExecutePromise,
			status: executionStatus,
			responsePromise: resumingExecution?.responsePromise,
			httpResponse: executionData.httpResponse ?? undefined,
			runId,
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
				// A resume may have replaced this entry before this run settled (its promise was
				// parked in `orphanedPromises`). Only touch the map if it still points at THIS
				// entry — otherwise a stale `running` status (queue mode never flips the main's
				// placeholder to `waiting`) would delete the resumed run's entry.
				if (this.activeExecutions[executionId] !== execution) return;
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

	/** Identity of the run currently owning the entry for `executionId`, stamped by `add`. */
	getRunId(executionId: string): string {
		return this.getExecutionOrFail(executionId).runId;
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

	/** Resolve the post-execution promise in an execution.
	 *
	 * @param runId Identity of the run that is finalizing, as returned by `getRunId`
	 * right after `attachWorkflowExecution`. When the entry for this id was replaced by
	 * a resume before this run finalized, `runId` no longer matches the current entry;
	 * the run must then resolve its OWN (parked) promise instead of the resumed run's,
	 * so the resumed run stays tracked and its later finalize is not lost. Omitting
	 * `runId` preserves the legacy "resolve whatever is at this id" behavior.
	 */
	finalizeExecution(executionId: string, fullRunData?: IRun, runId?: string) {
		// Identity check first, independent of whether an entry still exists: a stale
		// finalize from a run whose entry was replaced by a resume must resolve that run's
		// own parked promise (releasing its capacity) even if the resumed run has already
		// finished and been removed.
		if (runId !== undefined) {
			const orphaned = this.orphanedPromises.get(runId);
			if (orphaned) {
				this.orphanedPromises.delete(runId);
				orphaned.resolve(fullRunData);
				return;
			}
		}

		if (!this.has(executionId)) return;
		const execution = this.getExecutionOrFail(executionId);

		// A run must never finalize an entry that is not its own. Reaching here with a
		// mismatched `runId` and no parked promise means the run was already finalized.
		if (runId !== undefined && execution.runId !== runId) return;

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
			execution.responsePromise.resolve(EXECUTION_ENDED_WITHOUT_RESPONSE);
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

	getRunningExecutionIds(): string[] {
		return Object.keys(this.activeExecutions).filter(
			(executionId) => this.activeExecutions[executionId].status === 'running',
		);
	}

	/**
	 * @param writeDeadlineMs - How long to wait for the cancelled status to be recorded.
	 *   Pass what the caller's own shutdown window can still afford.
	 */
	async cancelRunningExecutions(
		writeDeadlineMs = DEFAULT_CANCEL_WRITE_TIMEOUT_MS,
	): Promise<string[]> {
		// An execution is registered before its workflow execution is attached. To
		// cancel inside that window records the execution as failed, not cancelled.
		const executionIds = this.getRunningExecutionIds().filter(
			(executionId) => this.activeExecutions[executionId].workflowExecution !== undefined,
		);

		if (executionIds.length === 0) return executionIds;

		// The engine's own write for a cancel is fire-and-forget and conditional on the
		// execution not being canceled, so recording first makes it a no-op, not a race.
		await this.recordAsCancelled(executionIds, writeDeadlineMs);

		for (const executionId of executionIds) {
			this.stopExecution(executionId, new SystemShutdownExecutionCancelledError(executionId));
		}

		return executionIds;
	}

	/** Record executions as cancelled, bounded so a stalling database cannot hold up shutdown. */
	private async recordAsCancelled(executionIds: string[], writeDeadlineMs: number) {
		let timeout: NodeJS.Timeout | undefined;

		try {
			await Promise.race([
				this.executionRepository.cancelManyRunning(executionIds),
				new Promise<never>((_, reject) => {
					timeout = setTimeout(
						() => reject(new OperationalError('Timed out writing the cancelled status')),
						writeDeadlineMs,
					);
				}),
			]);
		} catch (error) {
			this.logger.error(
				`Failed to record ${executionIds.length} cancelled executions: ${ensureError(error).message}`,
				{ executionIds },
			);
		} finally {
			clearTimeout(timeout);
		}
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
