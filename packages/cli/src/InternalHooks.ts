/* eslint-disable import/no-cycle */
import { IDataObject, IRun, TelemetryHelpers } from 'n8n-workflow';
import {
	IDiagnosticInfo,
	IInternalHooksClass,
	IPersonalizationSurveyAnswers,
	IWorkflowBase,
} from '.';
import { Telemetry } from './telemetry';

export class InternalHooksClass implements IInternalHooksClass {
	constructor(private telemetry: Telemetry) {}

	async onServerStarted(diagnosticInfo: IDiagnosticInfo): Promise<unknown[]> {
		const info = {
			version_cli: diagnosticInfo.versionCli,
			db_type: diagnosticInfo.databaseType,
			n8n_version_notifications_enabled: diagnosticInfo.notificationsEnabled,
			n8n_disable_production_main_process: diagnosticInfo.disableProductionWebhooksOnMainProcess,
			n8n_basic_auth_active: diagnosticInfo.basicAuthActive,
			system_info: diagnosticInfo.systemInfo,
			execution_variables: diagnosticInfo.executionVariables,
			n8n_deployment_type: diagnosticInfo.deploymentType,
		};

		return Promise.all([
			this.telemetry.identify(info),
			this.telemetry.track('Instance started', info),
		]);
	}

	async onPersonalizationSurveySubmitted(answers: IPersonalizationSurveyAnswers): Promise<void> {
		return this.telemetry.track('User responded to personalization questions', {
			company_size: answers.companySize,
			coding_skill: answers.codingSkill,
			work_area: answers.workArea,
			other_work_area: answers.otherWorkArea,
		});
	}

	async onWorkflowCreated(workflow: IWorkflowBase): Promise<void> {
		return this.telemetry.track('User created workflow', {
			workflow_id: workflow.id,
			node_graph: TelemetryHelpers.generateNodesGraph(workflow).nodeGraph,
		});
	}

	async onWorkflowDeleted(workflowId: string): Promise<void> {
		return this.telemetry.track('User deleted workflow', {
			workflow_id: workflowId,
		});
	}

	async onWorkflowSaved(workflow: IWorkflowBase): Promise<void> {
		return this.telemetry.track('User saved workflow', {
			workflow_id: workflow.id,
			node_graph: TelemetryHelpers.generateNodesGraph(workflow).nodeGraph,
		});
	}

	async onWorkflowPostExecute(workflow: IWorkflowBase, runData?: IRun): Promise<void> {
		const properties: IDataObject = {
			workflow_id: workflow.id,
			is_manual: false,
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
					if (errorNodeName) {
						properties.error_node_id = nodeGraphResult.nameIndices[errorNodeName];
					}
				}
			}
		}

		return this.telemetry.trackWorkflowExecution(properties);
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
