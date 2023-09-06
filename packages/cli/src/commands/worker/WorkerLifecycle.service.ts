import Container, { Service } from 'typedi';
import { Telemetry } from '../../telemetry';
import type {
	ExecutionStatus,
	IDataObject,
	INodesGraphResult,
	// IRun,
	ITelemetryTrackProperties,
	// IWorkflowBase,
} from 'n8n-workflow';
import {
	TelemetryHelpers,
	ErrorReporterProxy as ErrorReporter,
	LoggerProxy as Logger,
} from 'n8n-workflow';
import type { IExecutionDb, IExecutionResponse, IExecutionTrackProperties } from '../../Interfaces';
import { N8N_VERSION } from '../../constants';
import { eventBus } from '../../eventbus';
import { NodeTypes } from '../../NodeTypes';
// import { RoleService } from '../../services/role.service';
import { get as pslGet } from 'psl';
import { executeErrorWorkflow } from '../../WorkflowExecuteAdditionalData';
import { ExecutionRepository } from '../../databases/repositories';
import { ExecutionMetadataService } from '../../services/executionMetadata.service';
import { isWorkflowIdValid } from '../../utils';
import { WorkflowsService } from '../../workflows/workflows.services';
import { EventsService } from '../../services/events.service';

@Service()
export class WorkerLifecycleService {
	constructor(
		private telemetry: Telemetry,
		private nodeTypes: NodeTypes, // private roleService: RoleService,
		private eventsService: EventsService,
	) {}

	async onWorkflowExecuteAfter(parameters: {
		executionData: IExecutionResponse;
		staticData?: IDataObject;
	}): Promise<void> {
		const { executionData, staticData } = parameters;
		try {
			if (isWorkflowIdValid(executionData.workflowData.id) && staticData) {
				// Workflow is saved so update in database
				try {
					await WorkflowsService.saveStaticDataById(
						executionData.workflowData.id as string,
						staticData,
					);
				} catch (e) {
					ErrorReporter.error(e);
					Logger.error(
						`There was a problem saving the workflow with id "${
							executionData.workflowData.id
						}" to save changed staticData: "${(e as Error).message}" (workflowExecuteAfter)`,
						{ workflowId: executionData.workflowData.id },
					);
				}
			}

			const workflowHasCrashed = executionData.status === 'crashed';
			const workflowWasCanceled = executionData.status === 'canceled';
			const workflowDidSucceed =
				!executionData.data.resultData.error && !workflowHasCrashed && !workflowWasCanceled;
			let workflowStatusFinal: ExecutionStatus = workflowDidSucceed ? 'success' : 'failed';
			if (workflowHasCrashed) workflowStatusFinal = 'crashed';
			if (workflowWasCanceled) workflowStatusFinal = 'canceled';
			if (executionData.waitTill) workflowStatusFinal = 'waiting';

			if (!workflowDidSucceed) {
				executeErrorWorkflow(
					executionData.workflowData,
					executionData,
					executionData.mode,
					executionData.id,
					executionData.retryOf,
				);
			}

			const fullExecutionData: IExecutionDb = {
				data: executionData.data,
				mode: executionData.mode,
				finished: executionData.finished ? executionData.finished : false,
				startedAt: executionData.startedAt,
				stoppedAt: executionData.stoppedAt,
				workflowData: executionData.workflowData,
				waitTill: executionData.data.waitTill,
				status: workflowStatusFinal,
			};

			if (executionData.retryOf !== undefined) {
				fullExecutionData.retryOf = executionData.retryOf.toString();
			}

			const workflowId = executionData.workflowData.id;
			if (isWorkflowIdValid(workflowId)) {
				fullExecutionData.workflowId = workflowId;
			}

			await Container.get(ExecutionRepository).updateExistingExecution(
				executionData.id,
				fullExecutionData,
			);

			// For reasons(tm) the execution status is not updated correctly in the first update, so has to be written again (tbd)

			await Container.get(ExecutionRepository).updateExistingExecution(executionData.id, {
				status: fullExecutionData.status,
			});

			try {
				if (executionData.data.resultData.metadata) {
					await Container.get(ExecutionMetadataService).save(
						executionData.id,
						executionData.data.resultData.metadata,
					);
				}
			} catch (e) {
				Logger.error(`Failed to save metadata for execution ID ${executionData.id}`, e as Error);
			}

			if (executionData.finished && executionData.retryOf !== undefined) {
				// If the retry was successful save the reference it on the original execution
				await Container.get(ExecutionRepository).updateExistingExecution(executionData.retryOf, {
					retrySuccessId: executionData.id,
				});
			}
		} catch (error) {
			executeErrorWorkflow(
				executionData.workflowData,
				executionData,
				executionData.mode,
				executionData.id,
				executionData.retryOf,
			);
		} finally {
			this.eventsService.emit(
				'workflowExecutionCompleted',
				executionData.workflowData,
				executionData,
			);
		}
	}

	async onWorkflowPostExecute(
		// executionId: string,
		// workflow: IWorkflowBase,
		// runData?: IRun,
		// userId?: string,
		executionData: IExecutionResponse,
	): Promise<void> {
		const workflow = executionData.workflowData;
		if (!workflow.id) {
			return;
		}
		const executionId = executionData.id;
		const runData = executionData;

		const promises = [];

		const properties: IExecutionTrackProperties = {
			workflow_id: workflow.id,
			is_manual: false,
			version_cli: N8N_VERSION,
			success: false,
		};

		// TODO: send user id to worker
		// if (userId) {
		// 	properties.user_id = userId;
		// }

		if (runData?.data.resultData.error?.message?.includes('canceled')) {
			runData.status = 'canceled';
		}

		properties.success = !!runData?.finished;

		let executionStatus: ExecutionStatus;
		if (runData?.status === 'crashed') {
			executionStatus = 'crashed';
		} else if (runData?.status === 'waiting' || runData?.data?.waitTill) {
			executionStatus = 'waiting';
		} else if (runData?.status === 'canceled') {
			executionStatus = 'canceled';
		} else {
			executionStatus = properties.success ? 'success' : 'failed';
		}

		if (runData !== undefined) {
			properties.execution_mode = runData.mode;
			properties.is_manual = runData.mode === 'manual';

			let nodeGraphResult: INodesGraphResult | null = null;

			if (!properties.success && runData?.data.resultData.error) {
				properties.error_message = runData?.data.resultData.error.message;
				let errorNodeName =
					'node' in runData?.data.resultData.error
						? runData?.data.resultData.error.node?.name
						: undefined;
				properties.error_node_type =
					'node' in runData?.data.resultData.error
						? runData?.data.resultData.error.node?.type
						: undefined;

				if (runData.data.resultData.lastNodeExecuted) {
					const lastNode = TelemetryHelpers.getNodeTypeForName(
						workflow,
						runData.data.resultData.lastNodeExecuted,
					);

					if (lastNode !== undefined) {
						properties.error_node_type = lastNode.type;
						errorNodeName = lastNode.name;
					}
				}

				if (properties.is_manual) {
					nodeGraphResult = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);
					properties.node_graph = nodeGraphResult.nodeGraph;
					properties.node_graph_string = JSON.stringify(nodeGraphResult.nodeGraph);

					if (errorNodeName) {
						properties.error_node_id = nodeGraphResult.nameIndices[errorNodeName];
					}
				}
			}

			if (properties.is_manual) {
				if (!nodeGraphResult) {
					nodeGraphResult = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);
				}

				// let userRole: 'owner' | 'sharee' | undefined = undefined;
				// if (userId) {
				// 	const role = await this.roleService.findRoleByUserAndWorkflow(userId, workflow.id);
				// 	if (role) {
				// 		userRole = role.name === 'owner' ? 'owner' : 'sharee';
				// 	}
				// }

				const manualExecEventProperties: ITelemetryTrackProperties = {
					// user_id: userId,
					workflow_id: workflow.id,
					status: executionStatus,
					executionStatus: runData?.status ?? 'unknown',
					error_message: properties.error_message as string,
					error_node_type: properties.error_node_type,
					node_graph_string: properties.node_graph_string as string,
					error_node_id: properties.error_node_id as string,
					webhook_domain: null,
					// sharing_role: userRole,
				};

				if (!manualExecEventProperties.node_graph_string) {
					nodeGraphResult = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);
					manualExecEventProperties.node_graph_string = JSON.stringify(nodeGraphResult.nodeGraph);
				}

				if (runData.data.startData?.destinationNode) {
					const telemetryPayload = {
						...manualExecEventProperties,
						node_type: TelemetryHelpers.getNodeTypeForName(
							workflow,
							runData.data.startData?.destinationNode,
						)?.type,
						node_id: nodeGraphResult.nameIndices[runData.data.startData?.destinationNode],
					};

					promises.push(this.telemetry.track('Manual node exec finished', telemetryPayload));
				} else {
					nodeGraphResult.webhookNodeNames.forEach((name: string) => {
						const execJson = runData.data.resultData.runData[name]?.[0]?.data?.main?.[0]?.[0]
							?.json as { headers?: { origin?: string } };
						if (execJson?.headers?.origin && execJson.headers.origin !== '') {
							manualExecEventProperties.webhook_domain = pslGet(
								execJson.headers.origin.replace(/^https?:\/\//, ''),
							);
						}
					});

					promises.push(
						this.telemetry.track('Manual workflow exec finished', manualExecEventProperties),
					);
				}
			}
		}

		promises.push(
			properties.success
				? eventBus.sendWorkflowEvent({
						eventName: 'n8n.workflow.success',
						payload: {
							executionId,
							success: properties.success,
							userId: properties.user_id,
							workflowId: properties.workflow_id,
							isManual: properties.is_manual,
							workflowName: workflow.name,
							metaData: runData?.data?.resultData?.metadata,
						},
				  })
				: eventBus.sendWorkflowEvent({
						eventName: 'n8n.workflow.failed',
						payload: {
							executionId,
							success: properties.success,
							userId: properties.user_id,
							workflowId: properties.workflow_id,
							lastNodeExecuted: runData?.data.resultData.lastNodeExecuted,
							errorNodeType: properties.error_node_type,
							errorNodeId: properties.error_node_id?.toString(),
							errorMessage: properties.error_message?.toString(),
							isManual: properties.is_manual,
							workflowName: workflow.name,
							metaData: runData?.data?.resultData?.metadata,
						},
				  }),
		);

		void Promise.all([...promises, this.telemetry.trackWorkflowExecution(properties)]);
	}
}
