import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type {
	CreateExecutionPayload,
	ExecutionSummaries,
	IExecutionResponse,
	IGetExecutionsQueryFilter,
	User,
} from '@n8n/db';
import {
	AnnotationTagMappingRepository,
	ExecutionAnnotationRepository,
	ExecutionRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { validate as jsonSchemaValidate } from 'jsonschema';
import type {
	ExecutionError,
	ExecutionStatus,
	INode,
	IRunExecutionData,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	ExecutionStatusList,
	ManualExecutionCancelledError,
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

import type { ExecutionRequest, StopResult } from './execution.types';

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
	): Promise<IExecutionFlattedResponse | undefined> {
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

	async retry(
		req: ExecutionRequest.Retry,
		sharedWorkflowIds: string[],
	): Promise<Omit<IExecutionResponse, 'createdAt'>> {
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

		return {
			id: retriedExecutionId,
			mode: executionData.mode,
			startedAt: executionData.startedAt,
			workflowId: execution.workflowId,
			finished: executionData.finished ?? false,
			retryOf: executionId,
			status: executionData.status,
			waitTill: executionData.waitTill,
			data: executionData.data,
			workflowData: execution.workflowData,
			customData: execution.customData,
			annotation: execution.annotation,
		};
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

		const { range: _, ...countQuery } = query;

		const executionCount = await this.getExecutionsCountForQuery({ ...countQuery, kind: 'count' });

		return { results, ...executionCount };
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

		const completedQuery: ExecutionSummaries.RangeQuery = {
			...query,
			status: completedStatuses,
			order: { startedAt: 'DESC' },
		};
		const { range: _, ...countQuery } = completedQuery;

		const currentQuery: ExecutionSummaries.RangeQuery = {
			...query,
			status: currentStatuses,
			order: { top: 'running' }, // ensure limit cannot exclude running
		};

		const [current, completed, completedCount] = await Promise.all([
			this.executionRepository.findManyByRangeQuery(currentQuery),
			this.executionRepository.findManyByRangeQuery(completedQuery),
			this.getExecutionsCountForQuery({ ...countQuery, kind: 'count' }),
		]);

		return {
			results: current.concat(completed),
			count: completedCount.count, // exclude current from count for pagination
			estimated: completedCount.estimated,
		};
	}

	/**
	 * @returns
	 *  - the number of concurrent executions
	 *  - `-1` if the count is not applicable (e.g. in 'queue' mode or if concurrency control is disabled)
	 *
	 * In 'queue' mode, concurrency control is applied per worker, so returning a global count of concurrent executions
	 * would not be meaningful or helpful.
	 */
	async getConcurrentExecutionsCount() {
		if (!this.isConcurrentExecutionsCountSupported()) {
			return -1;
		}

		return await this.executionRepository.getConcurrentExecutionsCount();
	}

	private isConcurrentExecutionsCountSupported(): boolean {
		const isConcurrencyEnabled = this.globalConfig.executions.concurrency.productionLimit !== -1;
		const isInRegularMode = config.getEnv('executions.mode') === 'regular';

		if (!isConcurrencyEnabled || !isInRegularMode) {
			return false;
		}

		return true;
	}

	/**
	 * @param countQuery the query to count executions
	 * @returns
	 *  - the count of executions that satisfy the query
	 *  - whether the count is an estimate or not
	 */
	private async getExecutionsCountForQuery(countQuery: ExecutionSummaries.CountQuery) {
		if (this.globalConfig.database.type === 'postgresdb') {
			const liveRows = await this.executionRepository.getLiveExecutionRowsOnPostgres();

			if (liveRows === -1) return { count: -1, estimated: false };

			if (liveRows > 100_000) {
				// likely too high to fetch exact count fast
				return { count: liveRows, estimated: true };
			}
		}

		const count = await this.executionRepository.fetchCount(countQuery);

		return { count, estimated: false };
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
			this.activeExecutions.stopExecution(
				execution.id,
				new ManualExecutionCancelledError(execution.id),
			);
		}

		if (this.waitTracker.has(execution.id)) {
			this.waitTracker.stopExecution(execution.id);
		}

		return await this.executionRepository.stopDuringRun(execution);
	}

	private async stopInScalingMode(execution: IExecutionResponse) {
		if (this.activeExecutions.has(execution.id)) {
			this.activeExecutions.stopExecution(
				execution.id,
				new ManualExecutionCancelledError(execution.id),
			);
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
}
