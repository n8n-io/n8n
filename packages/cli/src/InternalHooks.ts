/* eslint-disable import/no-cycle */
import { BinaryDataManager } from 'n8n-core';
import { IDataObject, IRun, TelemetryHelpers } from 'n8n-workflow';
import {
	IDiagnosticInfo,
	IInternalHooksClass,
	IPersonalizationSurveyAnswers,
	IWorkflowBase,
} from '.';
import { Telemetry } from './telemetry';

export class InternalHooksClass implements IInternalHooksClass {
	private versionCli: string;

	constructor(private telemetry: Telemetry, versionCli: string) {
		this.versionCli = versionCli;
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
		const { nodeGraph } = TelemetryHelpers.generateNodesGraph(workflow);
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

	async onWorkflowSaved(workflow: IWorkflowBase): Promise<void> {
		const { nodeGraph } = TelemetryHelpers.generateNodesGraph(workflow);

		return this.telemetry.track('User saved workflow', {
			workflow_id: workflow.id,
			node_graph: nodeGraph,
			node_graph_string: JSON.stringify(nodeGraph),
			version_cli: this.versionCli,
		});
	}

	async onWorkflowPostExecute(
		executionId: string,
		workflow: IWorkflowBase,
		runData?: IRun,
	): Promise<void> {
		const properties: IDataObject = {
			workflow_id: workflow.id,
			is_manual: false,
			version_cli: this.versionCli,
		};

		if (runData !== undefined) {
			properties.execution_mode = runData.mode;
			if (runData.mode === 'manual') {
				properties.is_manual = true;
			}

			properties.success = !!runData.finished;

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
					const nodeGraphResult = TelemetryHelpers.generateNodesGraph(workflow);
					properties.node_graph = nodeGraphResult.nodeGraph;
					properties.node_graph_string = JSON.stringify(nodeGraphResult.nodeGraph);

					if (errorNodeName) {
						properties.error_node_id = nodeGraphResult.nameIndices[errorNodeName];
					}
				}
			}
		}

		return Promise.all([
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
