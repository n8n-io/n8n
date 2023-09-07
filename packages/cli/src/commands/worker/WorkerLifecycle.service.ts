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
import { EventPayloadWorkflow } from '../../eventbus/EventMessageClasses/EventMessageWorkflow';

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

			// await Container.get(ExecutionRepository).updateExistingExecution(executionData.id, {
			// 	status: fullExecutionData.status,
			// });

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

	async sendPostExecuteEvents(
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
		// TODO: send user id to worker
		// if (userId) {
		// 	properties.user_id = userId;
		// }

		const success = !!executionData.finished;
		let errorMessage: string | undefined = undefined;
		let errorNodeType: string | undefined = undefined;

		if (!success && executionData.data.resultData.error) {
			errorMessage = executionData.data.resultData.error.message;
			let errorNodeName =
				'node' in executionData.data.resultData.error
					? executionData.data.resultData.error.node?.name
					: undefined;
			errorNodeType =
				'node' in executionData.data.resultData.error
					? executionData.data.resultData.error.node?.type
					: undefined;

			if (executionData.data.resultData.lastNodeExecuted) {
				const lastNode = TelemetryHelpers.getNodeTypeForName(
					workflow,
					executionData.data.resultData.lastNodeExecuted,
				);

				if (lastNode !== undefined) {
					errorNodeType = lastNode.type;
					errorNodeName = lastNode.name;
				}
			}

			// let userRole: 'owner' | 'sharee' | undefined = undefined;
			// if (userId) {
			// 	const role = await this.roleService.findRoleByUserAndWorkflow(userId, workflow.id);
			// 	if (role) {
			// 		userRole = role.name === 'owner' ? 'owner' : 'sharee';
			// 	}
			// }
			const sharedPayload: EventPayloadWorkflow = {
				executionId: executionData.id,
				success,
				// userId: telemetryProperties.user_id,
				workflowId: workflow.id,
				isManual: executionData.mode === 'manual',
				workflowName: workflow.name,
				metaData: executionData.data?.resultData?.metadata,
			};
			success
				? void eventBus.sendWorkflowEvent({
						eventName: 'n8n.workflow.success',
						payload: sharedPayload,
				  })
				: void eventBus.sendWorkflowEvent({
						eventName: 'n8n.workflow.failed',
						payload: {
							...sharedPayload,
							lastNodeExecuted: executionData.data.resultData.lastNodeExecuted,
							errorNodeType,
							errorMessage,
						},
				  });
		}
	}

	async sendPostExecuteTelemetry(
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
		const promises = [];

		const telemetryProperties: IExecutionTrackProperties = {
			workflow_id: workflow.id,
			is_manual: false,
			version_cli: N8N_VERSION,
			success: false,
		};

		// TODO: send user id to worker
		// if (userId) {
		// 	properties.user_id = userId;
		// }

		telemetryProperties.success = !!executionData.finished;

		telemetryProperties.execution_mode = executionData.mode;
		telemetryProperties.is_manual = executionData.mode === 'manual';

		let nodeGraphResult: INodesGraphResult | null = null;

		if (!telemetryProperties.success && executionData.data.resultData.error) {
			telemetryProperties.error_message = executionData.data.resultData.error.message;
			let errorNodeName =
				'node' in executionData.data.resultData.error
					? executionData.data.resultData.error.node?.name
					: undefined;
			telemetryProperties.error_node_type =
				'node' in executionData.data.resultData.error
					? executionData.data.resultData.error.node?.type
					: undefined;

			if (executionData.data.resultData.lastNodeExecuted) {
				const lastNode = TelemetryHelpers.getNodeTypeForName(
					workflow,
					executionData.data.resultData.lastNodeExecuted,
				);

				if (lastNode !== undefined) {
					telemetryProperties.error_node_type = lastNode.type;
					errorNodeName = lastNode.name;
				}
			}

			if (telemetryProperties.is_manual) {
				nodeGraphResult = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);
				telemetryProperties.node_graph = nodeGraphResult.nodeGraph;
				telemetryProperties.node_graph_string = JSON.stringify(nodeGraphResult.nodeGraph);

				if (errorNodeName) {
					telemetryProperties.error_node_id = nodeGraphResult.nameIndices[errorNodeName];
				}
			}

			if (telemetryProperties.is_manual) {
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
					status: executionData.status,
					executionStatus: executionData.status,
					error_message: telemetryProperties.error_message,
					error_node_type: telemetryProperties.error_node_type,
					node_graph_string: telemetryProperties.node_graph_string as string,
					error_node_id: telemetryProperties.error_node_id as string,
					webhook_domain: null,
					// sharing_role: userRole,
				};

				if (!manualExecEventProperties.node_graph_string) {
					nodeGraphResult = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);
					manualExecEventProperties.node_graph_string = JSON.stringify(nodeGraphResult.nodeGraph);
				}

				if (executionData.data.startData?.destinationNode) {
					const telemetryPayload = {
						...manualExecEventProperties,
						node_type: TelemetryHelpers.getNodeTypeForName(
							workflow,
							executionData.data.startData?.destinationNode,
						)?.type,
						node_id: nodeGraphResult.nameIndices[executionData.data.startData?.destinationNode],
					};

					promises.push(this.telemetry.track('Manual node exec finished', telemetryPayload));
				} else {
					nodeGraphResult.webhookNodeNames.forEach((name: string) => {
						const execJson = executionData.data.resultData.runData[name]?.[0]?.data?.main?.[0]?.[0]
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

		void Promise.all([...promises, this.telemetry.trackWorkflowExecution(telemetryProperties)]);
	}
}
