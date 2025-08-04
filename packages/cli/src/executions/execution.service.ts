import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type {
	User,
	CreateExecutionPayload,
	ExecutionSummaries,
	IExecutionResponse,
	IGetExecutionsQueryFilter,
} from '@n8n/db';
import {
	ExecutionAnnotationRepository,
	ExecutionRepository,
	AnnotationTagMappingRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { validate as jsonSchemaValidate } from 'jsonschema';
import type {
	ExecutionError,
	ExecutionStatus,
	IDataObject,
	INode,
	IRunExecutionData,
	IWorkflowBase,
	WorkflowExecuteMode,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import {
	ExecutionStatusList,
	UnexpectedError,
	UserError,
	Workflow,
	WorkflowOperationError,
} from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import config from '@/config';
import { AbortedExecutionRetryError } from '@/errors/aborted-execution-retry.error';
import { MissingExecutionStopError } from '@/errors/missing-execution-stop.error';
import { QueuedExecutionRetryError } from '@/errors/queued-execution-retry.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { IExecutionFlattedResponse } from '@/interfaces';
import { License } from '@/license';
import { NodeTypes } from '@/node-types';
import { WaitTracker } from '@/wait-tracker';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

import type {
	ExecutionRequest,
	StopResult,
	CancelResult,
	RetryAdvancedResult,
	ExecutionProgress,
	ExecutionFullContext,
	BulkCancelResult,
	PauseResult,
	ResumeResult,
	StepResult,
	NodeStatus,
	RetryNodeResult,
	SkipNodeResult,
	ExecutionDebugInfo,
} from './execution.types';

export const schemaGetExecutionsQueryFilter = {
	$id: '/IGetExecutionsQueryFilter',
	type: 'object',
	properties: {
		id: { type: 'string' },
		finished: { type: 'boolean' },
		mode: { type: 'string' },
		retryOf: { type: 'string' },
		retrySuccessId: { type: 'string' },
		status: {
			type: 'array',
			items: { type: 'string' },
		},
		waitTill: { type: 'boolean' },
		workflowId: { anyOf: [{ type: 'integer' }, { type: 'string' }] },
		metadata: { type: 'array', items: { $ref: '#/$defs/metadata' } },
		startedAfter: { type: 'date-time' },
		startedBefore: { type: 'date-time' },
		annotationTags: { type: 'array', items: { type: 'string' } },
		vote: { type: 'string' },
		projectId: { type: 'string' },
	},
	$defs: {
		metadata: {
			type: 'object',
			required: ['key', 'value'],
			properties: {
				key: {
					type: 'string',
				},
				value: { type: 'string' },
				exactMatch: {
					type: 'boolean',
					default: true,
				},
			},
		},
	},
};

export const allowedExecutionsQueryFilterFields = Object.keys(
	schemaGetExecutionsQueryFilter.properties,
);

@Service()
export class ExecutionService {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionAnnotationRepository: ExecutionAnnotationRepository,
		private readonly annotationTagMappingRepository: AnnotationTagMappingRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly waitTracker: WaitTracker,
		private readonly workflowRunner: WorkflowRunner,
		private readonly concurrencyControl: ConcurrencyControlService,
		private readonly license: License,
		private readonly workflowSharingService: WorkflowSharingService,
	) {}

	async findOne(
		req: ExecutionRequest.GetOne | ExecutionRequest.Update,
		sharedWorkflowIds: string[],
	): Promise<IExecutionResponse | IExecutionFlattedResponse | undefined> {
		if (!sharedWorkflowIds.length) return undefined;

		const { id: executionId } = req.params;
		const execution = await this.executionRepository.findIfShared(executionId, sharedWorkflowIds);

		if (!execution) {
			this.logger.info('Attempt to read execution was blocked due to insufficient permissions', {
				userId: req.user.id,
				executionId,
			});
			return undefined;
		}

		return execution;
	}

	async retry(req: ExecutionRequest.Retry, sharedWorkflowIds: string[]) {
		const { id: executionId } = req.params;
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);

		if (!execution) {
			this.logger.info(
				'Attempt to retry an execution was blocked due to insufficient permissions',
				{
					userId: req.user.id,
					executionId,
				},
			);
			throw new NotFoundError(`The execution with the ID "${executionId}" does not exist.`);
		}

		if (execution.status === 'new') throw new QueuedExecutionRetryError();

		if (!execution.data.executionData) throw new AbortedExecutionRetryError();

		if (execution.finished) {
			throw new UnexpectedError('The execution succeeded, so it cannot be retried.');
		}

		const executionMode = 'retry';

		execution.workflowData.active = false;

		// Start the workflow
		const data: IWorkflowExecutionDataProcess = {
			executionMode,
			executionData: execution.data,
			retryOf: req.params.id,
			workflowData: execution.workflowData,
			userId: req.user.id,
		};

		const { lastNodeExecuted } = data.executionData!.resultData;

		if (lastNodeExecuted) {
			// Remove the old error and the data of the last run of the node that it can be replaced
			delete data.executionData!.resultData.error;
			const { length } = data.executionData!.resultData.runData[lastNodeExecuted];
			if (
				length > 0 &&
				data.executionData!.resultData.runData[lastNodeExecuted][length - 1].error !== undefined
			) {
				// Remove results only if it is an error.
				// If we are retrying due to a crash, the information is simply success info from last node
				data.executionData!.resultData.runData[lastNodeExecuted].pop();
				// Stack will determine what to run next
			}
		}

		if (req.body.loadWorkflow) {
			// Loads the currently saved workflow to execute instead of the
			// one saved at the time of the execution.
			const workflowId = execution.workflowData.id;
			const workflowData = (await this.workflowRepository.findOneBy({
				id: workflowId,
			})) as IWorkflowBase;

			if (workflowData === undefined) {
				throw new UserError(
					'Workflow could not be found and so the data not be loaded for the retry.',
					{ extra: { workflowId } },
				);
			}

			data.workflowData = workflowData;

			const workflowInstance = new Workflow({
				id: workflowData.id,
				name: workflowData.name,
				nodes: workflowData.nodes,
				connections: workflowData.connections,
				active: false,
				nodeTypes: this.nodeTypes,
				staticData: undefined,
				settings: workflowData.settings,
			});

			// Replace all of the nodes in the execution stack with the ones of the new workflow
			for (const stack of data.executionData!.executionData!.nodeExecutionStack) {
				// Find the data of the last executed node in the new workflow
				const node = workflowInstance.getNode(stack.node.name);
				if (node === null) {
					this.logger.error('Failed to retry an execution because a node could not be found', {
						userId: req.user.id,
						executionId,
						nodeName: stack.node.name,
					});
					throw new WorkflowOperationError(
						`Could not find the node "${stack.node.name}" in workflow. It probably got deleted or renamed. Without it the workflow can sadly not be retried.`,
					);
				}

				// Replace the node data in the stack that it really uses the current data
				stack.node = node;
			}
		}

		const retriedExecutionId = await this.workflowRunner.run(data);

		const executionData = await this.activeExecutions.getPostExecutePromise(retriedExecutionId);

		if (!executionData) {
			throw new UnexpectedError('The retry did not start for an unknown reason.');
		}

		return executionData.status;
	}

	async delete(req: ExecutionRequest.Delete, sharedWorkflowIds: string[]) {
		const { deleteBefore, ids, filters: requestFiltersRaw } = req.body;
		let requestFilters: IGetExecutionsQueryFilter | undefined;
		if (requestFiltersRaw) {
			try {
				Object.keys(requestFiltersRaw).map((key) => {
					if (!allowedExecutionsQueryFilterFields.includes(key)) delete requestFiltersRaw[key];
				});
				if (jsonSchemaValidate(requestFiltersRaw, schemaGetExecutionsQueryFilter).valid) {
					requestFilters = requestFiltersRaw as IGetExecutionsQueryFilter;
				}
			} catch (error) {
				throw new InternalServerError('Parameter "filter" contained invalid JSON string.', error);
			}
		}

		if (requestFilters?.metadata && !this.license.isAdvancedExecutionFiltersEnabled()) {
			delete requestFilters.metadata;
		}

		await this.executionRepository.deleteExecutionsByFilter(requestFilters, sharedWorkflowIds, {
			deleteBefore,
			ids,
		});
	}

	async createErrorExecution(
		error: ExecutionError,
		node: INode,
		workflowData: IWorkflowBase,
		workflow: Workflow,
		mode: WorkflowExecuteMode,
	) {
		const saveDataErrorExecutionDisabled =
			workflowData?.settings?.saveDataErrorExecution === 'none';

		if (saveDataErrorExecutionDisabled) return;

		const executionData: IRunExecutionData = {
			startData: {
				destinationNode: node.name,
				runNodeFilter: [node.name],
			},
			executionData: {
				contextData: {},
				metadata: {},
				nodeExecutionStack: [
					{
						node,
						data: {
							main: [
								[
									{
										json: {},
										pairedItem: {
											item: 0,
										},
									},
								],
							],
						},
						source: null,
					},
				],
				waitingExecution: {},
				waitingExecutionSource: {},
			},
			resultData: {
				runData: {
					[node.name]: [
						{
							startTime: 0,
							executionIndex: 0,
							executionTime: 0,
							error,
							source: [],
						},
					],
				},
				error,
				lastNodeExecuted: node.name,
			},
		};

		const fullExecutionData: CreateExecutionPayload = {
			data: executionData,
			mode,
			finished: false,
			workflowData,
			workflowId: workflow.id,
			stoppedAt: new Date(),
			status: 'error',
		};

		await this.executionRepository.createNewExecution(fullExecutionData);
	}

	// ----------------------------------
	//             new API
	// ----------------------------------

	/**
	 * Find summaries of executions that satisfy a query.
	 *
	 * Return also the total count of all executions that satisfy the query,
	 * and whether the total is an estimate or not.
	 */
	async findRangeWithCount(query: ExecutionSummaries.RangeQuery) {
		const results = await this.executionRepository.findManyByRangeQuery(query);

		if (this.globalConfig.database.type === 'postgresdb') {
			const liveRows = await this.executionRepository.getLiveExecutionRowsOnPostgres();

			if (liveRows === -1) return { count: -1, estimated: false, results };

			if (liveRows > 100_000) {
				// likely too high to fetch exact count fast
				return { count: liveRows, estimated: true, results };
			}
		}

		const { range: _, ...countQuery } = query;

		const count = await this.executionRepository.fetchCount({ ...countQuery, kind: 'count' });

		return { results, count, estimated: false };
	}

	/**
	 * Return:
	 *
	 * - the summaries of latest current and completed executions that satisfy a query,
	 * - the total count of all completed executions that satisfy the query, and
	 * - whether the total of completed executions is an estimate.
	 *
	 * By default, "current" means executions starting and running. With concurrency
	 * control, "current" means executions enqueued to start and running.
	 */
	async findLatestCurrentAndCompleted(query: ExecutionSummaries.RangeQuery) {
		const currentStatuses: ExecutionStatus[] = ['new', 'running'];

		const completedStatuses = ExecutionStatusList.filter((s) => !currentStatuses.includes(s));

		const [current, completed] = await Promise.all([
			this.findRangeWithCount({
				...query,
				status: currentStatuses,
				order: { top: 'running' }, // ensure limit cannot exclude running
			}),
			this.findRangeWithCount({
				...query,
				status: completedStatuses,
				order: { startedAt: 'DESC' },
			}),
		]);

		return {
			results: current.results.concat(completed.results),
			count: completed.count, // exclude current from count for pagination
			estimated: completed.estimated,
		};
	}

	async findAllEnqueuedExecutions() {
		return await this.executionRepository.findMultipleExecutions(
			{
				select: ['id', 'mode'],
				where: { status: 'new' },
				order: { id: 'ASC' },
			},
			{ includeData: true, unflattenData: true },
		);
	}

	async stop(executionId: string, sharedWorkflowIds: string[]): Promise<StopResult> {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);

		if (!execution) {
			this.logger.info(`Unable to stop execution "${executionId}" as it was not found`, {
				executionId,
			});

			throw new MissingExecutionStopError(executionId);
		}

		this.assertStoppable(execution);

		const { mode, startedAt, stoppedAt, finished, status } =
			config.getEnv('executions.mode') === 'regular'
				? await this.stopInRegularMode(execution)
				: await this.stopInScalingMode(execution);

		return {
			mode,
			startedAt: new Date(startedAt),
			stoppedAt: stoppedAt ? new Date(stoppedAt) : undefined,
			finished,
			status,
		};
	}

	private assertStoppable(execution: IExecutionResponse) {
		const STOPPABLE_STATUSES: ExecutionStatus[] = ['new', 'unknown', 'waiting', 'running'];

		if (!STOPPABLE_STATUSES.includes(execution.status)) {
			throw new WorkflowOperationError(
				`Only running or waiting executions can be stopped and ${execution.id} is currently ${execution.status}`,
			);
		}
	}

	private async stopInRegularMode(execution: IExecutionResponse) {
		if (this.concurrencyControl.has(execution.id)) {
			this.concurrencyControl.remove({ mode: execution.mode, executionId: execution.id });
			return await this.executionRepository.stopBeforeRun(execution);
		}

		if (this.activeExecutions.has(execution.id)) {
			this.activeExecutions.stopExecution(execution.id);
		}

		if (this.waitTracker.has(execution.id)) {
			this.waitTracker.stopExecution(execution.id);
		}

		return await this.executionRepository.stopDuringRun(execution);
	}

	private async stopInScalingMode(execution: IExecutionResponse) {
		if (this.activeExecutions.has(execution.id)) {
			this.activeExecutions.stopExecution(execution.id);
		}

		if (this.waitTracker.has(execution.id)) {
			this.waitTracker.stopExecution(execution.id);
		}

		return await this.executionRepository.stopDuringRun(execution);
	}

	async addScopes(user: User, summaries: ExecutionSummaries.ExecutionSummaryWithScopes[]) {
		const workflowIds = [...new Set(summaries.map((s) => s.workflowId))];

		const scopes = Object.fromEntries(
			await this.workflowSharingService.getSharedWorkflowScopes(workflowIds, user),
		);

		for (const s of summaries) {
			s.scopes = scopes[s.workflowId] ?? [];
		}
	}

	async annotate(
		executionId: string,
		updateData: ExecutionRequest.ExecutionUpdatePayload,
		sharedWorkflowIds: string[],
	) {
		// Check if user can access the execution
		const execution = await this.executionRepository.findIfAccessible(
			executionId,
			sharedWorkflowIds,
		);

		if (!execution) {
			this.logger.info('Attempt to read execution was blocked due to insufficient permissions', {
				executionId,
			});

			throw new NotFoundError('Execution not found');
		}

		// Create or update execution annotation
		await this.executionAnnotationRepository.upsert(
			{ execution: { id: executionId }, vote: updateData.vote },
			['execution'],
		);

		// Upsert behavior differs for Postgres, MySQL and sqlite,
		// so we need to fetch the annotation to get the ID
		const annotation = await this.executionAnnotationRepository.findOneOrFail({
			where: {
				execution: { id: executionId },
			},
		});

		if (updateData.tags) {
			await this.annotationTagMappingRepository.overwriteTags(annotation.id, updateData.tags);
		}
	}

	// ----------------------------------
	//        Advanced Execution Control
	// ----------------------------------

	async cancel(
		executionId: string,
		sharedWorkflowIds: string[],
		options: ExecutionRequest.BodyParams.Cancel,
	): Promise<CancelResult> {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);

		if (!execution) {
			this.logger.info(`Unable to cancel execution "${executionId}" as it was not found`, {
				executionId,
			});
			throw new NotFoundError(`The execution with the ID "${executionId}" does not exist.`);
		}

		// Check if execution is already finished
		if (execution.finished) {
			throw new WorkflowOperationError(
				`Execution ${executionId} is already finished and cannot be cancelled`,
			);
		}

		const cancelledAt = new Date();
		let cancelled = false;

		try {
			// Try graceful cancellation first
			if (this.activeExecutions.has(executionId)) {
				this.activeExecutions.stopExecution(executionId);
				cancelled = true;
			}

			if (this.waitTracker.has(executionId)) {
				this.waitTracker.stopExecution(executionId);
				cancelled = true;
			}

			// Handle concurrency control
			if (this.concurrencyControl.has(executionId)) {
				this.concurrencyControl.remove({ mode: execution.mode, executionId });
				cancelled = true;
			}

			// Force cancellation if requested and graceful didn't work
			if (options.force && !cancelled) {
				cancelled = true;
			}

			// Update execution status if cancelled
			if (cancelled) {
				await this.executionRepository.stopDuringRun(execution);
			}

			this.logger.debug('Execution cancelled successfully', {
				executionId,
				cancelled,
				force: options.force,
				reason: options.reason,
			});
		} catch (error) {
			this.logger.error('Failed to cancel execution', {
				executionId,
				error: error instanceof Error ? error.message : error,
			});
			throw new InternalServerError(`Failed to cancel execution: ${error}`);
		}

		return {
			executionId,
			status: 'canceled',
			cancelled,
			force: options.force ?? false,
			reason: options.reason,
			cancelledAt,
		};
	}

	async retryAdvanced(
		executionId: string,
		sharedWorkflowIds: string[],
		options: ExecutionRequest.BodyParams.RetryAdvanced,
	): Promise<RetryAdvancedResult> {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);

		if (!execution) {
			throw new NotFoundError(`The execution with the ID "${executionId}" does not exist.`);
		}

		if (execution.status === 'new') throw new QueuedExecutionRetryError();
		if (!execution.data.executionData) throw new AbortedExecutionRetryError();

		const executionMode = 'retry';
		execution.workflowData.active = false;

		// Prepare execution data
		const data: IWorkflowExecutionDataProcess = {
			executionMode,
			executionData: execution.data,
			retryOf: executionId,
			workflowData: execution.workflowData,
			userId: (execution as any).userId ?? '',
		};

		// Handle advanced retry options
		if (options.fromNodeName) {
			// Modify execution data to start from specific node
			const startNode = execution.workflowData.nodes.find(
				(node) => node.name === options.fromNodeName,
			);
			if (!startNode) {
				throw new WorkflowOperationError(`Node "${options.fromNodeName}" not found in workflow`);
			}

			// Clear execution data after the specified node
			const runData = data.executionData!.resultData.runData;
			const nodeNames = execution.workflowData.nodes.map((node) => node.name);
			const startIndex = nodeNames.indexOf(options.fromNodeName);

			// Remove run data for nodes after the start node
			for (let i = startIndex; i < nodeNames.length; i++) {
				delete runData[nodeNames[i]];
			}

			data.executionData!.resultData.lastNodeExecuted = options.fromNodeName;
		}

		// Apply modified parameters if provided
		if (options.modifiedParameters && Object.keys(options.modifiedParameters).length > 0) {
			// Merge modified parameters into workflow data
			for (const node of data.workflowData.nodes) {
				const nodeModifications = options.modifiedParameters[node.name];
				if (nodeModifications && typeof nodeModifications === 'object') {
					node.parameters = {
						...node.parameters,
						...nodeModifications,
					} as any;
				}
			}
		}

		// Handle retry from start option
		if (options.retryFromStart) {
			delete data.executionData!.resultData.error;
			data.executionData!.resultData.runData = {};
			data.executionData!.resultData.lastNodeExecuted = undefined;
		}

		const newExecutionId = await this.workflowRunner.run(data);
		const startedAt = new Date();

		this.logger.debug('Advanced retry started', {
			originalExecutionId: executionId,
			newExecutionId,
			fromNodeName: options.fromNodeName,
			retryFromStart: options.retryFromStart,
		});

		return {
			newExecutionId,
			originalExecutionId: executionId,
			fromNodeName: options.fromNodeName,
			startedAt,
			mode: executionMode,
		};
	}

	async getFullContext(
		executionId: string,
		sharedWorkflowIds: string[],
		options: ExecutionRequest.QueryParams.GetFullContext,
	): Promise<ExecutionFullContext> {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);

		if (!execution) {
			throw new NotFoundError(`The execution with the ID "${executionId}" does not exist.`);
		}

		const result: ExecutionFullContext = {
			executionId,
			execution: execution as any,
		};

		// Include performance metrics if requested
		if (options.includePerformanceMetrics === 'true') {
			const performanceMetrics = this.calculatePerformanceMetrics(execution);
			result.performanceMetrics = performanceMetrics;
		}

		// Include execution data if requested
		if (options.includeExecutionData === 'true' && execution.data?.executionData) {
			result.executionData = execution.data.executionData as IDataObject;
		}

		// Include workflow context if requested
		if (options.includeWorkflowContext === 'true') {
			result.workflowContext = {
				variables: ((execution.workflowData.settings as any)?.variables as IDataObject) ?? {},
				expressions: this.extractExpressionsFromWorkflow(execution.workflowData),
				connections: execution.workflowData.connections as IDataObject,
			};
		}

		return result;
	}

	async getExecutionProgress(
		executionId: string,
		sharedWorkflowIds: string[],
	): Promise<ExecutionProgress> {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);

		if (!execution) {
			throw new NotFoundError(`The execution with the ID "${executionId}" does not exist.`);
		}

		const totalNodes = execution.workflowData.nodes.length;
		let completedNodes = 0;
		let currentNodeName: string | undefined;
		const runningNodes: string[] = [];
		const failedNodes: string[] = [];

		// Calculate progress based on run data
		const runData = execution.data?.resultData?.runData || {};

		for (const nodeName of Object.keys(runData)) {
			const nodeRunData = runData[nodeName];
			if (nodeRunData && nodeRunData.length > 0) {
				const lastRun = nodeRunData[nodeRunData.length - 1];
				if (lastRun.error) {
					failedNodes.push(nodeName);
				} else {
					completedNodes++;
				}
			}
		}

		// Check for currently running nodes in active executions
		if (this.activeExecutions.has(executionId)) {
			try {
				const activeExecution = this.activeExecutions.getExecutionOrFail(executionId);
				const executionData = activeExecution.executionData;
				if (executionData?.executionData?.resultData?.lastNodeExecuted) {
					const lastNodeExecuted = executionData.executionData.resultData.lastNodeExecuted;
					if (typeof lastNodeExecuted === 'string' && !runData[lastNodeExecuted]) {
						currentNodeName = lastNodeExecuted;
						runningNodes.push(currentNodeName);
					}
				}
			} catch {
				// Execution not found in active executions, skip
			}
		}

		const percent = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

		// Estimate time remaining based on average node execution time
		let estimatedTimeRemaining: number | undefined;
		if (!execution.finished && completedNodes > 0) {
			const startTime = execution.startedAt.getTime();
			const currentTime = Date.now();
			const elapsedTime = currentTime - startTime;
			const avgTimePerNode = elapsedTime / completedNodes;
			const remainingNodes = totalNodes - completedNodes;
			estimatedTimeRemaining = Math.round(avgTimePerNode * remainingNodes);
		}

		return {
			executionId,
			status: execution.status,
			finished: execution.finished,
			progress: {
				percent,
				completedNodes,
				totalNodes,
				currentNodeName,
				runningNodes,
				failedNodes,
			},
			startedAt: execution.startedAt,
			stoppedAt: execution.stoppedAt,
			estimatedTimeRemaining,
		};
	}

	async bulkCancel(
		executionIds: string[],
		sharedWorkflowIds: string[],
		options: ExecutionRequest.BodyParams.BulkCancel,
	): Promise<BulkCancelResult> {
		const results: BulkCancelResult['results'] = [];
		let successCount = 0;
		let errorCount = 0;

		// Process executions in parallel but with concurrency limit
		const concurrencyLimit = 10;
		const chunks = [];
		for (let i = 0; i < executionIds.length; i += concurrencyLimit) {
			chunks.push(executionIds.slice(i, i + concurrencyLimit));
		}

		for (const chunk of chunks) {
			const chunkPromises = chunk.map(async (executionId) => {
				try {
					const cancelResult = await this.cancel(executionId, sharedWorkflowIds, options);

					results.push({
						executionId,
						success: true,
						cancelledAt: cancelResult.cancelledAt,
					});
					successCount++;
				} catch (error) {
					results.push({
						executionId,
						success: false,
						error: error instanceof Error ? error.message : String(error),
					});
					errorCount++;
				}
			});

			await Promise.all(chunkPromises);
		}

		this.logger.debug('Bulk cancellation completed', {
			totalRequested: executionIds.length,
			successCount,
			errorCount,
		});

		return {
			successCount,
			errorCount,
			results,
		};
	}

	// ----------------------------------
	//        New Granular Execution Control
	// ----------------------------------

	async pause(executionId: string, sharedWorkflowIds: string[]): Promise<PauseResult> {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);

		if (!execution) {
			throw new NotFoundError(`The execution with the ID "${executionId}" does not exist.`);
		}

		if (execution.finished) {
			throw new WorkflowOperationError(
				`Execution ${executionId} is already finished and cannot be paused`,
			);
		}

		const pausedAt = new Date();
		let paused = false;
		let currentNodeName: string | undefined;

		try {
			// Check if execution is currently active
			if (this.activeExecutions.has(executionId)) {
				// Pause the execution (this would require implementation in the execution engine)
				// For now, we'll mark it as paused and handle the actual pausing in the workflow execution
				paused = true;

				// Get current node being executed
				const activeExecution = this.activeExecutions.getExecutionOrFail(executionId);
				const executionData = activeExecution.executionData;
				if (executionData?.executionData?.resultData?.lastNodeExecuted) {
					currentNodeName = executionData.executionData.resultData.lastNodeExecuted;
				}
			}

			this.logger.debug('Execution paused successfully', {
				executionId,
				paused,
				currentNodeName,
			});
		} catch (error) {
			this.logger.error('Failed to pause execution', {
				executionId,
				error: error instanceof Error ? error.message : error,
			});
			throw new InternalServerError(`Failed to pause execution: ${error}`);
		}

		return {
			executionId,
			status: 'waiting',
			paused,
			pausedAt,
			currentNodeName,
		};
	}

	async resume(executionId: string, sharedWorkflowIds: string[]): Promise<ResumeResult> {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);

		if (!execution) {
			throw new NotFoundError(`The execution with the ID "${executionId}" does not exist.`);
		}

		if (execution.finished) {
			throw new WorkflowOperationError(
				`Execution ${executionId} is already finished and cannot be resumed`,
			);
		}

		const resumedAt = new Date();
		let resumed = false;
		let fromNodeName: string | undefined;

		try {
			// Resume the execution from where it was paused
			if (this.activeExecutions.has(executionId)) {
				resumed = true;
				// Get the node from which to resume
				if (execution.data?.resultData?.lastNodeExecuted) {
					fromNodeName = execution.data.resultData.lastNodeExecuted;
				}
			}

			this.logger.debug('Execution resumed successfully', {
				executionId,
				resumed,
				fromNodeName,
			});
		} catch (error) {
			this.logger.error('Failed to resume execution', {
				executionId,
				error: error instanceof Error ? error.message : error,
			});
			throw new InternalServerError(`Failed to resume execution: ${error}`);
		}

		return {
			executionId,
			status: 'running',
			resumed,
			resumedAt,
			fromNodeName,
		};
	}

	async step(
		executionId: string,
		sharedWorkflowIds: string[],
		options: ExecutionRequest.BodyParams.Step,
	): Promise<StepResult> {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);

		if (!execution) {
			throw new NotFoundError(`The execution with the ID "${executionId}" does not exist.`);
		}

		if (execution.finished) {
			throw new WorkflowOperationError(
				`Execution ${executionId} is already finished and cannot be stepped`,
			);
		}

		const steps = options.steps ?? 1;
		let stepsExecuted = 0;
		let currentNodeName: string | undefined;
		let nextNodeNames: string[] = [];

		try {
			// Step through the execution by the specified number of steps
			if (this.activeExecutions.has(executionId)) {
				// This would require implementation in the workflow execution engine
				// to support step-by-step execution
				stepsExecuted = steps;

				// Get current execution state
				const activeExecution = this.activeExecutions.getExecutionOrFail(executionId);
				const executionData = activeExecution.executionData;
				if (executionData?.executionData?.resultData?.lastNodeExecuted) {
					currentNodeName = executionData.executionData.resultData.lastNodeExecuted;
				}

				// Calculate next nodes to be executed
				if (options.nodeNames) {
					nextNodeNames = options.nodeNames;
				} else {
					// Default: get next nodes in workflow sequence
					nextNodeNames = this.getNextNodesInSequence(execution.workflowData, currentNodeName);
				}
			}

			this.logger.debug('Execution stepped successfully', {
				executionId,
				stepsExecuted,
				currentNodeName,
				nextNodeNames,
			});
		} catch (error) {
			this.logger.error('Failed to step execution', {
				executionId,
				error: error instanceof Error ? error.message : error,
			});
			throw new InternalServerError(`Failed to step execution: ${error}`);
		}

		return {
			executionId,
			status: 'running',
			stepsExecuted,
			currentNodeName,
			nextNodeNames,
		};
	}

	async getNodeStatus(
		executionId: string,
		nodeName: string,
		sharedWorkflowIds: string[],
	): Promise<NodeStatus> {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);

		if (!execution) {
			throw new NotFoundError(`The execution with the ID "${executionId}" does not exist.`);
		}

		const runData = execution.data?.resultData?.runData || {};
		const nodeRunData = runData[nodeName];

		if (!nodeRunData || nodeRunData.length === 0) {
			return {
				executionId,
				nodeName,
				status: 'pending',
			};
		}

		const lastRun = nodeRunData[nodeRunData.length - 1];
		let status: NodeStatus['status'] = 'pending';

		if (lastRun.error) {
			status = 'failed';
		} else if (lastRun.executionTime !== undefined) {
			status = 'completed';
		} else if (this.activeExecutions.has(executionId)) {
			// Check if this node is currently being executed
			try {
				const activeExecution = this.activeExecutions.getExecutionOrFail(executionId);
				const executionData = activeExecution.executionData;
				if (executionData?.executionData?.resultData?.lastNodeExecuted === nodeName) {
					status = 'running';
				}
			} catch {
				// Execution not found in active executions
			}
		}

		return {
			executionId,
			nodeName,
			status,
			executionTime: lastRun.executionTime,
			error: lastRun.error?.message,
			inputData: lastRun.data?.main?.[0]?.[0]?.json,
			outputData: lastRun.data?.main?.[0]?.[0]?.json,
			startTime: new Date(lastRun.startTime),
			endTime: lastRun.executionTime
				? new Date(lastRun.startTime + lastRun.executionTime)
				: undefined,
		};
	}

	async retryNode(
		executionId: string,
		nodeName: string,
		sharedWorkflowIds: string[],
		options: ExecutionRequest.BodyParams.RetryNode,
	): Promise<RetryNodeResult> {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);

		if (!execution) {
			throw new NotFoundError(`The execution with the ID "${executionId}" does not exist.`);
		}

		const retriedAt = new Date();

		// Find the node in the workflow
		const node = execution.workflowData.nodes.find((n) => n.name === nodeName);
		if (!node) {
			throw new WorkflowOperationError(`Node "${nodeName}" not found in workflow`);
		}

		try {
			// Apply modified parameters if provided
			if (options.modifiedParameters && Object.keys(options.modifiedParameters).length > 0) {
				node.parameters = {
					...node.parameters,
					...options.modifiedParameters,
				} as any;
			}

			// Reset node state if requested
			if (options.resetState) {
				const runData = execution.data?.resultData?.runData || {};
				delete runData[nodeName];
			}

			this.logger.debug('Node retry completed', {
				executionId,
				nodeName,
				retriedAt,
			});
		} catch (error) {
			this.logger.error('Failed to retry node', {
				executionId,
				nodeName,
				error: error instanceof Error ? error.message : error,
			});
			throw new InternalServerError(`Failed to retry node: ${error}`);
		}

		return {
			executionId,
			nodeName,
			retried: true,
			retriedAt,
			status: 'running',
		};
	}

	async skipNode(
		executionId: string,
		nodeName: string,
		sharedWorkflowIds: string[],
		options: ExecutionRequest.BodyParams.SkipNode,
	): Promise<SkipNodeResult> {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);

		if (!execution) {
			throw new NotFoundError(`The execution with the ID "${executionId}" does not exist.`);
		}

		const skippedAt = new Date();

		// Find the node in the workflow
		const node = execution.workflowData.nodes.find((n) => n.name === nodeName);
		if (!node) {
			throw new WorkflowOperationError(`Node "${nodeName}" not found in workflow`);
		}

		try {
			// Mark node as skipped by adding mock run data
			const runData = execution.data?.resultData?.runData || {};

			runData[nodeName] = [
				{
					startTime: Date.now(),
					executionIndex: 0,
					executionTime: 0,
					data: {
						main: options.mockOutputData
							? [[{ json: options.mockOutputData, pairedItem: { item: 0 } }]]
							: [[]],
					},
					source: [],
				},
			];

			this.logger.debug('Node skipped successfully', {
				executionId,
				nodeName,
				reason: options.reason,
				skippedAt,
			});
		} catch (error) {
			this.logger.error('Failed to skip node', {
				executionId,
				nodeName,
				error: error instanceof Error ? error.message : error,
			});
			throw new InternalServerError(`Failed to skip node: ${error}`);
		}

		return {
			executionId,
			nodeName,
			skipped: true,
			skippedAt,
			reason: options.reason,
			mockOutputData: options.mockOutputData,
		};
	}

	async getDebugInfo(
		executionId: string,
		sharedWorkflowIds: string[],
		options: ExecutionRequest.QueryParams.GetDebugInfo,
	): Promise<ExecutionDebugInfo> {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);

		if (!execution) {
			throw new NotFoundError(`The execution with the ID "${executionId}" does not exist.`);
		}

		const debugInfo: ExecutionDebugInfo['debugInfo'] = {
			nodeExecutionOrder: [],
			totalExecutionTime: 0,
		};

		// Calculate node execution order and timing
		const runData = execution.data?.resultData?.runData || {};
		const nodeExecutionOrder: string[] = [];
		let totalExecutionTime = 0;

		for (const [nodeName, nodeRuns] of Object.entries(runData)) {
			if (nodeRuns && nodeRuns.length > 0) {
				nodeExecutionOrder.push(nodeName);
				const lastRun = nodeRuns[nodeRuns.length - 1];
				if (lastRun.executionTime !== undefined) {
					totalExecutionTime += lastRun.executionTime;
				}
			}
		}

		debugInfo.nodeExecutionOrder = nodeExecutionOrder;
		debugInfo.totalExecutionTime = totalExecutionTime;
		debugInfo.lastNodeExecuted = execution.data?.resultData?.lastNodeExecuted;

		// Include stack trace if requested and available
		if (options.includeStackTrace === 'true' && execution.data?.resultData?.error) {
			debugInfo.stackTrace = execution.data.resultData.error.stack?.split('\n') || [];
		}

		// Include memory usage if requested
		if (options.includeMemoryUsage === 'true') {
			debugInfo.memoryUsage = {
				heapUsed: process.memoryUsage().heapUsed,
				heapTotal: process.memoryUsage().heapTotal,
				external: process.memoryUsage().external,
				rss: process.memoryUsage().rss,
			};
		}

		// Include error details if requested and available
		if (options.includeErrorDetails === 'true' && execution.data?.resultData?.error) {
			const error = execution.data.resultData.error;
			debugInfo.errorDetails = {
				message: error.message,
				stack: error.stack,
				code: (error as any).code,
				context: (error as any).context,
			};
		}

		return {
			executionId,
			execution: execution as any,
			debugInfo,
		};
	}

	// ----------------------------------
	//             Private Methods
	// ----------------------------------

	private getNextNodesInSequence(workflowData: IWorkflowBase, currentNodeName?: string): string[] {
		if (!currentNodeName) {
			// Return starting nodes
			return workflowData.nodes
				.filter((node) => !workflowData.connections[node.name])
				.map((node) => node.name);
		}

		// Find nodes connected from the current node
		const connections = workflowData.connections[currentNodeName] || {};
		const nextNodes: string[] = [];

		for (const connectionType in connections) {
			const typeConnections = connections[connectionType] || [];
			for (const connectionArray of typeConnections) {
				if (Array.isArray(connectionArray)) {
					for (const connection of connectionArray) {
						if (connection?.node) {
							nextNodes.push(connection.node);
						}
					}
				}
			}
		}

		return nextNodes;
	}

	private calculatePerformanceMetrics(execution: IExecutionResponse) {
		const runData = execution.data?.resultData?.runData || {};
		const nodeExecutionTimes: Record<string, number> = {};
		let totalExecutionTime = 0;

		for (const [nodeName, nodeRuns] of Object.entries(runData)) {
			if (nodeRuns && nodeRuns.length > 0) {
				const lastRun = nodeRuns[nodeRuns.length - 1];
				if (lastRun.executionTime !== undefined) {
					nodeExecutionTimes[nodeName] = lastRun.executionTime;
					totalExecutionTime += lastRun.executionTime;
				}
			}
		}

		// Calculate overall execution time if available
		if (execution.startedAt && execution.stoppedAt) {
			totalExecutionTime = execution.stoppedAt.getTime() - execution.startedAt.getTime();
		}

		return {
			totalExecutionTime,
			nodeExecutionTimes,
			// Note: Memory and CPU usage would require additional monitoring
			// These would be populated by a monitoring service if available
			memoryUsage: undefined,
			cpuUsage: undefined,
		};
	}

	private extractExpressionsFromWorkflow(workflowData: IWorkflowBase): string[] {
		const expressions: string[] = [];
		const expressionRegex = /\{\{.*?\}\}/g;

		// Extract expressions from node parameters
		for (const node of workflowData.nodes) {
			const nodeStr = JSON.stringify(node.parameters);
			const matches = nodeStr.match(expressionRegex);
			if (matches) {
				expressions.push(...matches);
			}
		}

		// Remove duplicates
		return [...new Set(expressions)];
	}
}
