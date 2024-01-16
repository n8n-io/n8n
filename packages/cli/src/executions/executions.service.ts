import { validate as jsonSchemaValidate } from 'jsonschema';
import type {
	IWorkflowBase,
	JsonObject,
	ExecutionError,
	INode,
	IRunExecutionData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ApplicationError, jsonParse, Workflow, WorkflowOperationError } from 'n8n-workflow';
import { ActiveExecutions } from '@/ActiveExecutions';
import config from '@/config';
import type { User } from '@db/entities/User';
import type {
	ExecutionPayload,
	IExecutionFlattedResponse,
	IExecutionResponse,
	IExecutionsListResponse,
	IWorkflowDb,
	IWorkflowExecutionDataProcess,
} from '@/Interfaces';
import { NodeTypes } from '@/NodeTypes';
import { Queue } from '@/Queue';
import type { ExecutionRequest } from './execution.request';
import { getSharedWorkflowIds } from '@/WorkflowHelpers';
import { WorkflowRunner } from '@/WorkflowRunner';
import * as GenericHelpers from '@/GenericHelpers';
import { Container, Service } from 'typedi';
import { getStatusUsingPreviousExecutionStatusMethod } from './executionHelpers';
import type { IGetExecutionsQueryFilter } from '@db/repositories/execution.repository';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { Logger } from '@/Logger';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

const schemaGetExecutionsQueryFilter = {
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
			},
		},
	},
};

const allowedExecutionsQueryFilterFields = Object.keys(schemaGetExecutionsQueryFilter.properties);

@Service()
export class ExecutionsService {
	/**
	 * Function to get the workflow Ids for a User
	 * Overridden in EE version to ignore roles
	 */
	static async getWorkflowIdsForUser(user: User): Promise<string[]> {
		// Get all workflows using owner role
		return getSharedWorkflowIds(user, ['owner']);
	}

	static async getExecutionsList(req: ExecutionRequest.GetAll): Promise<IExecutionsListResponse> {
		const sharedWorkflowIds = await this.getWorkflowIdsForUser(req.user);
		if (sharedWorkflowIds.length === 0) {
			// return early since without shared workflows there can be no hits
			// (note: getSharedWorkflowIds() returns _all_ workflow ids for global owners)
			return {
				count: 0,
				estimated: false,
				results: [],
			};
		}

		// parse incoming filter object and remove non-valid fields
		let filter: IGetExecutionsQueryFilter | undefined = undefined;
		if (req.query.filter) {
			try {
				const filterJson: JsonObject = jsonParse(req.query.filter);
				if (filterJson) {
					Object.keys(filterJson).map((key) => {
						if (!allowedExecutionsQueryFilterFields.includes(key)) delete filterJson[key];
					});
					if (jsonSchemaValidate(filterJson, schemaGetExecutionsQueryFilter).valid) {
						filter = filterJson as IGetExecutionsQueryFilter;
					}
				}
			} catch (error) {
				Container.get(Logger).error('Failed to parse filter', {
					userId: req.user.id,
					filter: req.query.filter,
				});
				throw new InternalServerError('Parameter "filter" contained invalid JSON string.');
			}
		}

		// safeguard against querying workflowIds not shared with the user
		const workflowId = filter?.workflowId?.toString();
		if (workflowId !== undefined && !sharedWorkflowIds.includes(workflowId)) {
			Container.get(Logger).verbose(
				`User ${req.user.id} attempted to query non-shared workflow ${workflowId}`,
			);
			return {
				count: 0,
				estimated: false,
				results: [],
			};
		}

		const limit = req.query.limit
			? parseInt(req.query.limit, 10)
			: GenericHelpers.DEFAULT_EXECUTIONS_GET_ALL_LIMIT;

		const executingWorkflowIds: string[] = [];

		if (config.getEnv('executions.mode') === 'queue') {
			const queue = Container.get(Queue);
			const currentJobs = await queue.getJobs(['active', 'waiting']);
			executingWorkflowIds.push(...currentJobs.map(({ data }) => data.executionId));
		}

		// We may have manual executions even with queue so we must account for these.
		executingWorkflowIds.push(
			...Container.get(ActiveExecutions)
				.getActiveExecutions()
				.map(({ id }) => id),
		);

		const { count, estimated } = await Container.get(ExecutionRepository).countExecutions(
			filter,
			sharedWorkflowIds,
			executingWorkflowIds,
			req.user.hasGlobalScope('workflow:list'),
		);

		const formattedExecutions = await Container.get(ExecutionRepository).searchExecutions(
			filter,
			limit,
			executingWorkflowIds,
			sharedWorkflowIds,
			{
				lastId: req.query.lastId,
				firstId: req.query.firstId,
			},
		);
		return {
			count,
			results: formattedExecutions,
			estimated,
		};
	}

	static async getExecution(
		req: ExecutionRequest.Get,
	): Promise<IExecutionResponse | IExecutionFlattedResponse | undefined> {
		const sharedWorkflowIds = await this.getWorkflowIdsForUser(req.user);
		if (!sharedWorkflowIds.length) return undefined;

		const { id: executionId } = req.params;
		const execution = await Container.get(ExecutionRepository).findIfShared(
			executionId,
			sharedWorkflowIds,
		);

		if (!execution) {
			Container.get(Logger).info(
				'Attempt to read execution was blocked due to insufficient permissions',
				{
					userId: req.user.id,
					executionId,
				},
			);
			return undefined;
		}

		if (!execution.status) {
			execution.status = getStatusUsingPreviousExecutionStatusMethod(execution);
		}

		return execution;
	}

	static async retryExecution(req: ExecutionRequest.Retry): Promise<boolean> {
		const sharedWorkflowIds = await this.getWorkflowIdsForUser(req.user);
		if (!sharedWorkflowIds.length) return false;

		const { id: executionId } = req.params;
		const execution = (await Container.get(ExecutionRepository).findIfShared(
			executionId,
			sharedWorkflowIds,
		)) as unknown as IExecutionResponse;

		if (!execution) {
			Container.get(Logger).info(
				'Attempt to retry an execution was blocked due to insufficient permissions',
				{
					userId: req.user.id,
					executionId,
				},
			);
			throw new NotFoundError(`The execution with the ID "${executionId}" does not exist.`);
		}

		if (execution.finished) {
			throw new ApplicationError('The execution succeeded, so it cannot be retried.');
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
			const workflowData = (await Container.get(WorkflowRepository).findOneBy({
				id: workflowId,
			})) as IWorkflowBase;

			if (workflowData === undefined) {
				throw new ApplicationError(
					'Workflow could not be found and so the data not be loaded for the retry.',
					{ extra: { workflowId } },
				);
			}

			data.workflowData = workflowData;
			const nodeTypes = Container.get(NodeTypes);
			const workflowInstance = new Workflow({
				id: workflowData.id,
				name: workflowData.name,
				nodes: workflowData.nodes,
				connections: workflowData.connections,
				active: false,
				nodeTypes,
				staticData: undefined,
				settings: workflowData.settings,
			});

			// Replace all of the nodes in the execution stack with the ones of the new workflow
			for (const stack of data.executionData!.executionData!.nodeExecutionStack) {
				// Find the data of the last executed node in the new workflow
				const node = workflowInstance.getNode(stack.node.name);
				if (node === null) {
					Container.get(Logger).error(
						'Failed to retry an execution because a node could not be found',
						{
							userId: req.user.id,
							executionId,
							nodeName: stack.node.name,
						},
					);
					throw new WorkflowOperationError(
						`Could not find the node "${stack.node.name}" in workflow. It probably got deleted or renamed. Without it the workflow can sadly not be retried.`,
					);
				}

				// Replace the node data in the stack that it really uses the current data
				stack.node = node;
			}
		}

		const workflowRunner = new WorkflowRunner();
		const retriedExecutionId = await workflowRunner.run(data);

		const executionData =
			await Container.get(ActiveExecutions).getPostExecutePromise(retriedExecutionId);

		if (!executionData) {
			throw new ApplicationError('The retry did not start for an unknown reason.');
		}

		return !!executionData.finished;
	}

	static async deleteExecutions(req: ExecutionRequest.Delete): Promise<void> {
		const sharedWorkflowIds = await this.getWorkflowIdsForUser(req.user);
		if (sharedWorkflowIds.length === 0) {
			// return early since without shared workflows there can be no hits
			// (note: getSharedWorkflowIds() returns _all_ workflow ids for global owners)
			return;
		}
		const { deleteBefore, ids, filters: requestFiltersRaw } = req.body;
		let requestFilters;
		if (requestFiltersRaw) {
			try {
				Object.keys(requestFiltersRaw).map((key) => {
					if (!allowedExecutionsQueryFilterFields.includes(key)) delete requestFiltersRaw[key];
				});
				if (jsonSchemaValidate(requestFiltersRaw, schemaGetExecutionsQueryFilter).valid) {
					requestFilters = requestFiltersRaw as IGetExecutionsQueryFilter;
				}
			} catch (error) {
				throw new InternalServerError('Parameter "filter" contained invalid JSON string.');
			}
		}

		return Container.get(ExecutionRepository).deleteExecutionsByFilter(
			requestFilters,
			sharedWorkflowIds,
			{
				deleteBefore,
				ids,
			},
		);
	}

	async createErrorExecution(
		error: ExecutionError,
		node: INode,
		workflowData: IWorkflowDb,
		workflow: Workflow,
		mode: WorkflowExecuteMode,
	): Promise<void> {
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

		const fullExecutionData: ExecutionPayload = {
			data: executionData,
			mode,
			finished: false,
			startedAt: new Date(),
			workflowData,
			workflowId: workflow.id,
			stoppedAt: new Date(),
			status: 'error',
		};

		await Container.get(ExecutionRepository).createNewExecution(fullExecutionData);
	}
}
