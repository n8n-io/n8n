'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ExecutionService =
	exports.allowedExecutionsQueryFilterFields =
	exports.schemaGetExecutionsQueryFilter =
		void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jsonschema_1 = require('jsonschema');
const n8n_workflow_1 = require('n8n-workflow');
const active_executions_1 = require('@/active-executions');
const concurrency_control_service_1 = require('@/concurrency/concurrency-control.service');
const config_2 = __importDefault(require('@/config'));
const aborted_execution_retry_error_1 = require('@/errors/aborted-execution-retry.error');
const missing_execution_stop_error_1 = require('@/errors/missing-execution-stop.error');
const queued_execution_retry_error_1 = require('@/errors/queued-execution-retry.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const license_1 = require('@/license');
const node_types_1 = require('@/node-types');
const wait_tracker_1 = require('@/wait-tracker');
const workflow_runner_1 = require('@/workflow-runner');
const workflow_sharing_service_1 = require('@/workflows/workflow-sharing.service');
exports.schemaGetExecutionsQueryFilter = {
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
exports.allowedExecutionsQueryFilterFields = Object.keys(
	exports.schemaGetExecutionsQueryFilter.properties,
);
let ExecutionService = class ExecutionService {
	constructor(
		globalConfig,
		logger,
		activeExecutions,
		executionAnnotationRepository,
		annotationTagMappingRepository,
		executionRepository,
		workflowRepository,
		nodeTypes,
		waitTracker,
		workflowRunner,
		concurrencyControl,
		license,
		workflowSharingService,
	) {
		this.globalConfig = globalConfig;
		this.logger = logger;
		this.activeExecutions = activeExecutions;
		this.executionAnnotationRepository = executionAnnotationRepository;
		this.annotationTagMappingRepository = annotationTagMappingRepository;
		this.executionRepository = executionRepository;
		this.workflowRepository = workflowRepository;
		this.nodeTypes = nodeTypes;
		this.waitTracker = waitTracker;
		this.workflowRunner = workflowRunner;
		this.concurrencyControl = concurrencyControl;
		this.license = license;
		this.workflowSharingService = workflowSharingService;
	}
	async findOne(req, sharedWorkflowIds) {
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
	async retry(req, sharedWorkflowIds) {
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
			throw new not_found_error_1.NotFoundError(
				`The execution with the ID "${executionId}" does not exist.`,
			);
		}
		if (execution.status === 'new')
			throw new queued_execution_retry_error_1.QueuedExecutionRetryError();
		if (!execution.data.executionData)
			throw new aborted_execution_retry_error_1.AbortedExecutionRetryError();
		if (execution.finished) {
			throw new n8n_workflow_1.UnexpectedError('The execution succeeded, so it cannot be retried.');
		}
		const executionMode = 'retry';
		execution.workflowData.active = false;
		const data = {
			executionMode,
			executionData: execution.data,
			retryOf: req.params.id,
			workflowData: execution.workflowData,
			userId: req.user.id,
		};
		const { lastNodeExecuted } = data.executionData.resultData;
		if (lastNodeExecuted) {
			delete data.executionData.resultData.error;
			const { length } = data.executionData.resultData.runData[lastNodeExecuted];
			if (
				length > 0 &&
				data.executionData.resultData.runData[lastNodeExecuted][length - 1].error !== undefined
			) {
				data.executionData.resultData.runData[lastNodeExecuted].pop();
			}
		}
		if (req.body.loadWorkflow) {
			const workflowId = execution.workflowData.id;
			const workflowData = await this.workflowRepository.findOneBy({
				id: workflowId,
			});
			if (workflowData === undefined) {
				throw new n8n_workflow_1.UserError(
					'Workflow could not be found and so the data not be loaded for the retry.',
					{ extra: { workflowId } },
				);
			}
			data.workflowData = workflowData;
			const workflowInstance = new n8n_workflow_1.Workflow({
				id: workflowData.id,
				name: workflowData.name,
				nodes: workflowData.nodes,
				connections: workflowData.connections,
				active: false,
				nodeTypes: this.nodeTypes,
				staticData: undefined,
				settings: workflowData.settings,
			});
			for (const stack of data.executionData.executionData.nodeExecutionStack) {
				const node = workflowInstance.getNode(stack.node.name);
				if (node === null) {
					this.logger.error('Failed to retry an execution because a node could not be found', {
						userId: req.user.id,
						executionId,
						nodeName: stack.node.name,
					});
					throw new n8n_workflow_1.WorkflowOperationError(
						`Could not find the node "${stack.node.name}" in workflow. It probably got deleted or renamed. Without it the workflow can sadly not be retried.`,
					);
				}
				stack.node = node;
			}
		}
		const retriedExecutionId = await this.workflowRunner.run(data);
		const executionData = await this.activeExecutions.getPostExecutePromise(retriedExecutionId);
		if (!executionData) {
			throw new n8n_workflow_1.UnexpectedError('The retry did not start for an unknown reason.');
		}
		return executionData.status;
	}
	async delete(req, sharedWorkflowIds) {
		const { deleteBefore, ids, filters: requestFiltersRaw } = req.body;
		let requestFilters;
		if (requestFiltersRaw) {
			try {
				Object.keys(requestFiltersRaw).map((key) => {
					if (!exports.allowedExecutionsQueryFilterFields.includes(key))
						delete requestFiltersRaw[key];
				});
				if (
					(0, jsonschema_1.validate)(requestFiltersRaw, exports.schemaGetExecutionsQueryFilter)
						.valid
				) {
					requestFilters = requestFiltersRaw;
				}
			} catch (error) {
				throw new internal_server_error_1.InternalServerError(
					'Parameter "filter" contained invalid JSON string.',
					error,
				);
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
	async createErrorExecution(error, node, workflowData, workflow, mode) {
		const saveDataErrorExecutionDisabled =
			workflowData?.settings?.saveDataErrorExecution === 'none';
		if (saveDataErrorExecutionDisabled) return;
		const executionData = {
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
		const fullExecutionData = {
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
	async findRangeWithCount(query) {
		const results = await this.executionRepository.findManyByRangeQuery(query);
		if (this.globalConfig.database.type === 'postgresdb') {
			const liveRows = await this.executionRepository.getLiveExecutionRowsOnPostgres();
			if (liveRows === -1) return { count: -1, estimated: false, results };
			if (liveRows > 100_000) {
				return { count: liveRows, estimated: true, results };
			}
		}
		const { range: _, ...countQuery } = query;
		const count = await this.executionRepository.fetchCount({ ...countQuery, kind: 'count' });
		return { results, count, estimated: false };
	}
	async findLatestCurrentAndCompleted(query) {
		const currentStatuses = ['new', 'running'];
		const completedStatuses = n8n_workflow_1.ExecutionStatusList.filter(
			(s) => !currentStatuses.includes(s),
		);
		const [current, completed] = await Promise.all([
			this.findRangeWithCount({
				...query,
				status: currentStatuses,
				order: { top: 'running' },
			}),
			this.findRangeWithCount({
				...query,
				status: completedStatuses,
				order: { startedAt: 'DESC' },
			}),
		]);
		return {
			results: current.results.concat(completed.results),
			count: completed.count,
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
	async stop(executionId, sharedWorkflowIds) {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);
		if (!execution) {
			this.logger.info(`Unable to stop execution "${executionId}" as it was not found`, {
				executionId,
			});
			throw new missing_execution_stop_error_1.MissingExecutionStopError(executionId);
		}
		this.assertStoppable(execution);
		const { mode, startedAt, stoppedAt, finished, status } =
			config_2.default.getEnv('executions.mode') === 'regular'
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
	assertStoppable(execution) {
		const STOPPABLE_STATUSES = ['new', 'unknown', 'waiting', 'running'];
		if (!STOPPABLE_STATUSES.includes(execution.status)) {
			throw new n8n_workflow_1.WorkflowOperationError(
				`Only running or waiting executions can be stopped and ${execution.id} is currently ${execution.status}`,
			);
		}
	}
	async stopInRegularMode(execution) {
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
	async stopInScalingMode(execution) {
		if (this.activeExecutions.has(execution.id)) {
			this.activeExecutions.stopExecution(execution.id);
		}
		if (this.waitTracker.has(execution.id)) {
			this.waitTracker.stopExecution(execution.id);
		}
		return await this.executionRepository.stopDuringRun(execution);
	}
	async addScopes(user, summaries) {
		const workflowIds = [...new Set(summaries.map((s) => s.workflowId))];
		const scopes = Object.fromEntries(
			await this.workflowSharingService.getSharedWorkflowScopes(workflowIds, user),
		);
		for (const s of summaries) {
			s.scopes = scopes[s.workflowId] ?? [];
		}
	}
	async annotate(executionId, updateData, sharedWorkflowIds) {
		const execution = await this.executionRepository.findIfAccessible(
			executionId,
			sharedWorkflowIds,
		);
		if (!execution) {
			this.logger.info('Attempt to read execution was blocked due to insufficient permissions', {
				executionId,
			});
			throw new not_found_error_1.NotFoundError('Execution not found');
		}
		await this.executionAnnotationRepository.upsert(
			{ execution: { id: executionId }, vote: updateData.vote },
			['execution'],
		);
		const annotation = await this.executionAnnotationRepository.findOneOrFail({
			where: {
				execution: { id: executionId },
			},
		});
		if (updateData.tags) {
			await this.annotationTagMappingRepository.overwriteTags(annotation.id, updateData.tags);
		}
	}
	async cancel(executionId, sharedWorkflowIds, options) {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);
		if (!execution) {
			this.logger.info(`Unable to cancel execution "${executionId}" as it was not found`, {
				executionId,
			});
			throw new not_found_error_1.NotFoundError(
				`The execution with the ID "${executionId}" does not exist.`,
			);
		}
		if (execution.finished) {
			throw new n8n_workflow_1.WorkflowOperationError(
				`Execution ${executionId} is already finished and cannot be cancelled`,
			);
		}
		const cancelledAt = new Date();
		let cancelled = false;
		try {
			if (this.activeExecutions.has(executionId)) {
				this.activeExecutions.stopExecution(executionId);
				cancelled = true;
			}
			if (this.waitTracker.has(executionId)) {
				this.waitTracker.stopExecution(executionId);
				cancelled = true;
			}
			if (this.concurrencyControl.has(executionId)) {
				this.concurrencyControl.remove({ mode: execution.mode, executionId });
				cancelled = true;
			}
			if (options.force && !cancelled) {
				cancelled = true;
			}
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
			throw new internal_server_error_1.InternalServerError(`Failed to cancel execution: ${error}`);
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
	async retryAdvanced(executionId, sharedWorkflowIds, options) {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);
		if (!execution) {
			throw new not_found_error_1.NotFoundError(
				`The execution with the ID "${executionId}" does not exist.`,
			);
		}
		if (execution.status === 'new')
			throw new queued_execution_retry_error_1.QueuedExecutionRetryError();
		if (!execution.data.executionData)
			throw new aborted_execution_retry_error_1.AbortedExecutionRetryError();
		const executionMode = 'retry';
		execution.workflowData.active = false;
		const data = {
			executionMode,
			executionData: execution.data,
			retryOf: executionId,
			workflowData: execution.workflowData,
			userId: execution.userId ?? '',
		};
		if (options.fromNodeName) {
			const startNode = execution.workflowData.nodes.find(
				(node) => node.name === options.fromNodeName,
			);
			if (!startNode) {
				throw new n8n_workflow_1.WorkflowOperationError(
					`Node "${options.fromNodeName}" not found in workflow`,
				);
			}
			const runData = data.executionData.resultData.runData;
			const nodeNames = execution.workflowData.nodes.map((node) => node.name);
			const startIndex = nodeNames.indexOf(options.fromNodeName);
			for (let i = startIndex; i < nodeNames.length; i++) {
				delete runData[nodeNames[i]];
			}
			data.executionData.resultData.lastNodeExecuted = options.fromNodeName;
		}
		if (options.modifiedParameters && Object.keys(options.modifiedParameters).length > 0) {
			for (const node of data.workflowData.nodes) {
				const nodeModifications = options.modifiedParameters[node.name];
				if (nodeModifications && typeof nodeModifications === 'object') {
					node.parameters = {
						...node.parameters,
						...nodeModifications,
					};
				}
			}
		}
		if (options.retryFromStart) {
			delete data.executionData.resultData.error;
			data.executionData.resultData.runData = {};
			data.executionData.resultData.lastNodeExecuted = undefined;
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
	async getFullContext(executionId, sharedWorkflowIds, options) {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);
		if (!execution) {
			throw new not_found_error_1.NotFoundError(
				`The execution with the ID "${executionId}" does not exist.`,
			);
		}
		const result = {
			executionId,
			execution: execution,
		};
		if (options.includePerformanceMetrics === 'true') {
			const performanceMetrics = this.calculatePerformanceMetrics(execution);
			result.performanceMetrics = performanceMetrics;
		}
		if (options.includeExecutionData === 'true' && execution.data?.executionData) {
			result.executionData = execution.data.executionData;
		}
		if (options.includeWorkflowContext === 'true') {
			result.workflowContext = {
				variables: execution.workflowData.settings?.variables ?? {},
				expressions: this.extractExpressionsFromWorkflow(execution.workflowData),
				connections: execution.workflowData.connections,
			};
		}
		return result;
	}
	async getExecutionProgress(executionId, sharedWorkflowIds) {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);
		if (!execution) {
			throw new not_found_error_1.NotFoundError(
				`The execution with the ID "${executionId}" does not exist.`,
			);
		}
		const totalNodes = execution.workflowData.nodes.length;
		let completedNodes = 0;
		let currentNodeName;
		const runningNodes = [];
		const failedNodes = [];
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
			} catch {}
		}
		const percent = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;
		let estimatedTimeRemaining;
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
	async bulkCancel(executionIds, sharedWorkflowIds, options) {
		const results = [];
		let successCount = 0;
		let errorCount = 0;
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
	async pause(executionId, sharedWorkflowIds) {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);
		if (!execution) {
			throw new not_found_error_1.NotFoundError(
				`The execution with the ID "${executionId}" does not exist.`,
			);
		}
		if (execution.finished) {
			throw new n8n_workflow_1.WorkflowOperationError(
				`Execution ${executionId} is already finished and cannot be paused`,
			);
		}
		const pausedAt = new Date();
		let paused = false;
		let currentNodeName;
		try {
			if (this.activeExecutions.has(executionId)) {
				paused = true;
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
			throw new internal_server_error_1.InternalServerError(`Failed to pause execution: ${error}`);
		}
		return {
			executionId,
			status: 'waiting',
			paused,
			pausedAt,
			currentNodeName,
		};
	}
	async resume(executionId, sharedWorkflowIds) {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);
		if (!execution) {
			throw new not_found_error_1.NotFoundError(
				`The execution with the ID "${executionId}" does not exist.`,
			);
		}
		if (execution.finished) {
			throw new n8n_workflow_1.WorkflowOperationError(
				`Execution ${executionId} is already finished and cannot be resumed`,
			);
		}
		const resumedAt = new Date();
		let resumed = false;
		let fromNodeName;
		try {
			if (this.activeExecutions.has(executionId)) {
				resumed = true;
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
			throw new internal_server_error_1.InternalServerError(`Failed to resume execution: ${error}`);
		}
		return {
			executionId,
			status: 'running',
			resumed,
			resumedAt,
			fromNodeName,
		};
	}
	async step(executionId, sharedWorkflowIds, options) {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);
		if (!execution) {
			throw new not_found_error_1.NotFoundError(
				`The execution with the ID "${executionId}" does not exist.`,
			);
		}
		if (execution.finished) {
			throw new n8n_workflow_1.WorkflowOperationError(
				`Execution ${executionId} is already finished and cannot be stepped`,
			);
		}
		const steps = options.steps ?? 1;
		let stepsExecuted = 0;
		let currentNodeName;
		let nextNodeNames = [];
		try {
			if (this.activeExecutions.has(executionId)) {
				stepsExecuted = steps;
				const activeExecution = this.activeExecutions.getExecutionOrFail(executionId);
				const executionData = activeExecution.executionData;
				if (executionData?.executionData?.resultData?.lastNodeExecuted) {
					currentNodeName = executionData.executionData.resultData.lastNodeExecuted;
				}
				if (options.nodeNames) {
					nextNodeNames = options.nodeNames;
				} else {
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
			throw new internal_server_error_1.InternalServerError(`Failed to step execution: ${error}`);
		}
		return {
			executionId,
			status: 'running',
			stepsExecuted,
			currentNodeName,
			nextNodeNames,
		};
	}
	async getNodeStatus(executionId, nodeName, sharedWorkflowIds) {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);
		if (!execution) {
			throw new not_found_error_1.NotFoundError(
				`The execution with the ID "${executionId}" does not exist.`,
			);
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
		let status = 'pending';
		if (lastRun.error) {
			status = 'failed';
		} else if (lastRun.executionTime !== undefined) {
			status = 'completed';
		} else if (this.activeExecutions.has(executionId)) {
			try {
				const activeExecution = this.activeExecutions.getExecutionOrFail(executionId);
				const executionData = activeExecution.executionData;
				if (executionData?.executionData?.resultData?.lastNodeExecuted === nodeName) {
					status = 'running';
				}
			} catch {}
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
	async retryNode(executionId, nodeName, sharedWorkflowIds, options) {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);
		if (!execution) {
			throw new not_found_error_1.NotFoundError(
				`The execution with the ID "${executionId}" does not exist.`,
			);
		}
		const retriedAt = new Date();
		const node = execution.workflowData.nodes.find((n) => n.name === nodeName);
		if (!node) {
			throw new n8n_workflow_1.WorkflowOperationError(`Node "${nodeName}" not found in workflow`);
		}
		try {
			if (options.modifiedParameters && Object.keys(options.modifiedParameters).length > 0) {
				node.parameters = {
					...node.parameters,
					...options.modifiedParameters,
				};
			}
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
			throw new internal_server_error_1.InternalServerError(`Failed to retry node: ${error}`);
		}
		return {
			executionId,
			nodeName,
			retried: true,
			retriedAt,
			status: 'running',
		};
	}
	async skipNode(executionId, nodeName, sharedWorkflowIds, options) {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);
		if (!execution) {
			throw new not_found_error_1.NotFoundError(
				`The execution with the ID "${executionId}" does not exist.`,
			);
		}
		const skippedAt = new Date();
		const node = execution.workflowData.nodes.find((n) => n.name === nodeName);
		if (!node) {
			throw new n8n_workflow_1.WorkflowOperationError(`Node "${nodeName}" not found in workflow`);
		}
		try {
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
			throw new internal_server_error_1.InternalServerError(`Failed to skip node: ${error}`);
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
	async getDebugInfo(executionId, sharedWorkflowIds, options) {
		const execution = await this.executionRepository.findWithUnflattenedData(
			executionId,
			sharedWorkflowIds,
		);
		if (!execution) {
			throw new not_found_error_1.NotFoundError(
				`The execution with the ID "${executionId}" does not exist.`,
			);
		}
		const debugInfo = {
			nodeExecutionOrder: [],
			totalExecutionTime: 0,
		};
		const runData = execution.data?.resultData?.runData || {};
		const nodeExecutionOrder = [];
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
		if (options.includeStackTrace === 'true' && execution.data?.resultData?.error) {
			debugInfo.stackTrace = execution.data.resultData.error.stack?.split('\n') || [];
		}
		if (options.includeMemoryUsage === 'true') {
			debugInfo.memoryUsage = {
				heapUsed: process.memoryUsage().heapUsed,
				heapTotal: process.memoryUsage().heapTotal,
				external: process.memoryUsage().external,
				rss: process.memoryUsage().rss,
			};
		}
		if (options.includeErrorDetails === 'true' && execution.data?.resultData?.error) {
			const error = execution.data.resultData.error;
			debugInfo.errorDetails = {
				message: error.message,
				stack: error.stack,
				code: error.code,
				context: error.context,
			};
		}
		return {
			executionId,
			execution: execution,
			debugInfo,
		};
	}
	getNextNodesInSequence(workflowData, currentNodeName) {
		if (!currentNodeName) {
			return workflowData.nodes
				.filter((node) => !workflowData.connections[node.name])
				.map((node) => node.name);
		}
		const connections = workflowData.connections[currentNodeName] || {};
		const nextNodes = [];
		for (const connectionType in connections) {
			const typeConnections = connections[connectionType] || [];
			for (const connection of typeConnections) {
				if (connection?.node) {
					nextNodes.push(connection.node);
				}
			}
		}
		return nextNodes;
	}
	calculatePerformanceMetrics(execution) {
		const runData = execution.data?.resultData?.runData || {};
		const nodeExecutionTimes = {};
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
		if (execution.startedAt && execution.stoppedAt) {
			totalExecutionTime = execution.stoppedAt.getTime() - execution.startedAt.getTime();
		}
		return {
			totalExecutionTime,
			nodeExecutionTimes,
			memoryUsage: undefined,
			cpuUsage: undefined,
		};
	}
	extractExpressionsFromWorkflow(workflowData) {
		const expressions = [];
		const expressionRegex = /\{\{.*?\}\}/g;
		for (const node of workflowData.nodes) {
			const nodeStr = JSON.stringify(node.parameters);
			const matches = nodeStr.match(expressionRegex);
			if (matches) {
				expressions.push(...matches);
			}
		}
		return [...new Set(expressions)];
	}
};
exports.ExecutionService = ExecutionService;
exports.ExecutionService = ExecutionService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			config_1.GlobalConfig,
			backend_common_1.Logger,
			active_executions_1.ActiveExecutions,
			db_1.ExecutionAnnotationRepository,
			db_1.AnnotationTagMappingRepository,
			db_1.ExecutionRepository,
			db_1.WorkflowRepository,
			node_types_1.NodeTypes,
			wait_tracker_1.WaitTracker,
			workflow_runner_1.WorkflowRunner,
			concurrency_control_service_1.ConcurrencyControlService,
			license_1.License,
			workflow_sharing_service_1.WorkflowSharingService,
		]),
	],
	ExecutionService,
);
//# sourceMappingURL=execution.service.js.map
