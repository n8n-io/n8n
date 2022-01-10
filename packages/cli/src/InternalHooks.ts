/* eslint-disable import/no-cycle */
import { BinaryDataManager } from 'n8n-core';
import { IDataObject, INodeTypes, IRun, TelemetryHelpers } from 'n8n-workflow';
import {
	IDiagnosticInfo,
	IInternalHooksClass,
	IPersonalizationSurveyAnswers,
	IWorkflowBase,
	IWorkflowDb,
} from '.';
import { Telemetry } from './telemetry';

export class InternalHooksClass implements IInternalHooksClass {
	private versionCli: string;

	private nodeTypes: INodeTypes;

	constructor(private telemetry: Telemetry, versionCli: string, nodeTypes: INodeTypes) {
		this.versionCli = versionCli;
		this.nodeTypes = nodeTypes;
	}

	async onServerStarted(
		diagnosticInfo: IDiagnosticInfo,
		earliestWorkflowCreatedAt?: Date,
	): Promise<unknown[]> {
		const info = {
			version_cli: diagnosticInfo.versionCli,
			db_type: diagnosticInfo.databaseType,
			n8n_version_notifications_enabled: diagnosticInfo.notificationsEnabled,
			n8n_disable_production_main_process: diagnosticInfo.disableProductionWebhooksOnMainProcess,
			n8n_basic_auth_active: diagnosticInfo.basicAuthActive,
			system_info: diagnosticInfo.systemInfo,
			execution_variables: diagnosticInfo.executionVariables,
			n8n_deployment_type: diagnosticInfo.deploymentType,
			n8n_binary_data_mode: diagnosticInfo.binaryDataMode,
		};

		return Promise.all([
			this.telemetry.identify(info),
			this.telemetry.track('Instance started', {
				...info,
				earliest_workflow_created: earliestWorkflowCreatedAt,
			}),
		]);
	}

	async onPersonalizationSurveySubmitted(answers: IPersonalizationSurveyAnswers): Promise<void> {
		return this.telemetry.track('User responded to personalization questions', {
			company_size: answers.companySize,
			coding_skill: answers.codingSkill,
			work_area: answers.workArea,
			other_work_area: answers.otherWorkArea,
			company_industry: answers.companyIndustry,
			other_company_industry: answers.otherCompanyIndustry,
		});
	}

	async onWorkflowCreated(workflow: IWorkflowBase): Promise<void> {
		const { nodeGraph } = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);
		return this.telemetry.track('User created workflow', {
			workflow_id: workflow.id,
			node_graph: nodeGraph,
			node_graph_string: JSON.stringify(nodeGraph),
		});
	}

	async onWorkflowDeleted(workflowId: string): Promise<void> {
		return this.telemetry.track('User deleted workflow', {
			workflow_id: workflowId,
		});
	}

	async onWorkflowSaved(workflow: IWorkflowDb): Promise<void> {
		const { nodeGraph } = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);

		return this.telemetry.track('User saved workflow', {
			workflow_id: workflow.id,
			node_graph: nodeGraph,
			node_graph_string: JSON.stringify(nodeGraph),
			version_cli: this.versionCli,
			num_tags: workflow.tags.length,
		});
	}

	async onWorkflowPostExecute(
		executionId: string,
		workflow: IWorkflowBase,
		runData?: IRun,
	): Promise<void> {
		const promises = [Promise.resolve()];
		const properties: IDataObject = {
			workflow_id: workflow.id,
			is_manual: false,
			version_cli: this.versionCli,
		};

		if (runData !== undefined) {
			properties.execution_mode = runData.mode;
			properties.success = !!runData.finished;
			properties.is_manual = runData.mode === 'manual';

			let nodeGraphResult;

			if (!properties.success && runData?.data.resultData.error) {
				properties.error_message = runData?.data.resultData.error.message;
				let errorNodeName = runData?.data.resultData.error.node?.name;
				properties.error_node_type = runData?.data.resultData.error.node?.type;

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

				const manualExecEventProperties = {
					workflow_id: workflow.id,
					status: properties.success ? 'success' : 'failed',
					error_message: properties.error_message,
					error_node_type: properties.error_node_type,
					node_graph: properties.node_graph,
					node_graph_string: properties.node_graph_string,
					error_node_id: properties.error_node_id,
				};

				if (!manualExecEventProperties.node_graph) {
					nodeGraphResult = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);
					manualExecEventProperties.node_graph = nodeGraphResult.nodeGraph;
					manualExecEventProperties.node_graph_string = JSON.stringify(
						manualExecEventProperties.node_graph,
					);
				}

				if (runData.data.startData?.destinationNode) {
					promises.push(
						this.telemetry.track('Manual node exec finished', {
							...manualExecEventProperties,
							node_type: TelemetryHelpers.getNodeTypeForName(
								workflow,
								runData.data.startData?.destinationNode,
							)?.type,
							node_id: nodeGraphResult.nameIndices[runData.data.startData?.destinationNode],
						}),
					);
				} else {
					promises.push(
						this.telemetry.track('Manual workflow exec finished', manualExecEventProperties),
					);
				}
			}
		}

		return Promise.all([
			...promises,
			BinaryDataManager.getInstance().persistBinaryDataForExecutionId(executionId),
			this.telemetry.trackWorkflowExecution(properties),
		]).then(() => {});
	}

	async onN8nStop(): Promise<void> {
		const timeoutPromise = new Promise<void>((resolve) => {
			setTimeout(() => {
				resolve();
			}, 3000);
		});

		return Promise.race([timeoutPromise, this.telemetry.trackN8nStop()]);
	}
}
