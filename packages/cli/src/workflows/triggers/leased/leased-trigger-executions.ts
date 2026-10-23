import { Logger } from '@n8n/backend-common';
import type { CreateExecutionPayload, OperationContext } from '@n8n/db';
import { TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import type { LeaseFence } from '@n8n/leases';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { ErrorReporter } from 'n8n-core';
import type {
	IExecuteData,
	IExecuteResponsePromiseData,
	INode,
	INodeExecutionData,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	IWorkflowExecutionDataProcess,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { OperationalError, UserError, createRunExecutionData } from 'n8n-workflow';

import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { PreExecuteBlockedError } from '@/errors/pre-execute-blocked.error';
import { ExecutionCrashService } from '@/executions/execution-crash.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowRunner } from '@/workflow-runner';
import { EngineV2ActiveTriggers } from '@/workflows/triggers/engine-v2-active-triggers';
import { getWorkflowProjectDetailsSafe } from '@/workflows/utils';

/** The lease a leased trigger emits under, and what to do once it turns out lost. */
export interface LeasedTriggerRun {
	fence: LeaseFence<OperationContext>;
	onLeaseLost: () => void;
}

/**
 * Starts the executions of a leased trigger. Each execution row is inserted in
 * the same transaction as the lease check, so a main that no longer holds the
 * lease creates no execution.
 */
@Service()
export class LeasedTriggerExecutions {
	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly transactionRunner: TransactionRunner,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly executionCrashService: ExecutionCrashService,
		private readonly workflowRunner: WorkflowRunner,
		private readonly ownershipService: OwnershipService,
		private readonly engineV2ActiveTriggers: EngineV2ActiveTriggers,
	) {
		this.logger = this.logger.scoped('workflow-activation');
	}

	async run(
		lease: LeasedTriggerRun,
		workflowData: IWorkflowBase,
		node: INode,
		data: INodeExecutionData[][],
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
		deduplicationKey?: string,
		callerAwaitsOutcome: IWorkflowExecutionDataProcess['callerAwaitsOutcome'] = 'none',
	): Promise<string | undefined> {
		if (this.engineV2ActiveTriggers.handles(workflowData, mode)) {
			const error = new UserError('Leased triggers run on engine v1 only');
			responsePromise?.reject(error);
			throw error;
		}

		const nodeExecutionStack: IExecuteData[] = [{ node, data: { main: data }, source: null }];
		const executionData = createRunExecutionData({ executionData: { nodeExecutionStack } });
		const { projectId, projectName } = await getWorkflowProjectDetailsSafe(
			this.ownershipService,
			workflowData.id,
		);
		const runData: IWorkflowExecutionDataProcess = {
			userId: additionalData.userId,
			executionMode: mode,
			executionData,
			workflowData,
			deduplicationKey,
			projectId,
			projectName,
			callerAwaitsOutcome,
		};

		const establishContextError = await this.workflowRunner.establishContextForPersistence(runData);
		if (establishContextError) {
			this.errorReporter.error(establishContextError, { shouldBeLogged: false });
			this.logger.error('Failed to prepare a leased trigger execution', {
				workflowId: workflowData.id,
				nodeName: node.name,
				error: establishContextError,
			});
			responsePromise?.reject(ensureError(establishContextError));
			return undefined;
		}

		try {
			await this.workflowRunner.prepareNewExecution(runData, true);
		} catch (error) {
			if (error instanceof PreExecuteBlockedError) {
				this.logger.error('Blocked a leased trigger execution before its row was inserted', {
					workflowId: workflowData.id,
					nodeName: node.name,
					error: error.cause,
				});
				responsePromise?.reject(error.cause);
				return undefined;
			}
			throw error;
		}

		const payload: CreateExecutionPayload = {
			data: executionData,
			mode,
			finished: false,
			workflowData,
			status: 'new',
			workflowId: workflowData.id,
			retryOf: runData.retryOf ?? undefined,
			tracingContext: runData.tracingContext ?? null,
			deduplicationKey,
		};
		const executionId = await this.transactionRunner.run({}, async (ctx) =>
			(await lease.fence.isHeld(ctx))
				? await this.executionPersistence.create(payload, ctx)
				: undefined,
		);
		if (executionId === undefined) return this.refuse(lease, workflowData, node, responsePromise);

		try {
			await this.workflowRunner.run(
				runData,
				false,
				undefined,
				{ executionId, expectedStatus: 'new' },
				responsePromise,
			);
		} catch (error) {
			if (error instanceof ExecutionAlreadyResumingError) {
				this.logger.debug('Leased trigger execution was already claimed, leaving it to its owner', {
					executionId,
				});
			} else {
				await this.crashFailedStart(executionId, error, responsePromise);
			}
		}

		return executionId;
	}

	private refuse(
		lease: LeasedTriggerRun,
		workflowData: IWorkflowBase,
		node: INode,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): undefined {
		this.logger.warn('Leased trigger started no execution: this main no longer holds its lease', {
			workflowId: workflowData.id,
			nodeId: node.id,
			nodeName: node.name,
		});
		responsePromise?.reject(
			new OperationalError('Leased trigger started no execution: the lease is lost'),
		);
		lease.onLeaseLost();
		return undefined;
	}

	/** Marks an inserted row that failed to start as crashed, so it does not stay `new`. */
	private async crashFailedStart(
		executionId: string,
		error: unknown,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): Promise<void> {
		this.errorReporter.error(error, { executionId, shouldBeLogged: false });
		this.logger.error('Failed to start a leased trigger execution', { executionId, error });
		responsePromise?.reject(ensureError(error));
		await this.executionCrashService.markAsCrashed(executionId, 'start-failure');
	}
}
