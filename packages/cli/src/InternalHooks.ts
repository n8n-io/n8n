/* eslint-disable import/no-cycle */
import { BinaryDataManager } from 'n8n-core';
import { IDataObject, INodeTypes, IRun, TelemetryHelpers } from 'n8n-workflow';
import { snakeCase } from 'change-case';
import {
	IDiagnosticInfo,
	IInternalHooksClass,
	ITelemetryUserDeletionData,
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
			n8n_multi_user_allowed: diagnosticInfo.n8n_multi_user_allowed,
			smtp_set_up: diagnosticInfo.smtp_set_up,
		};

		return Promise.all([
			this.telemetry.identify(info),
			this.telemetry.track('Instance started', {
				...info,
				earliest_workflow_created: earliestWorkflowCreatedAt,
			}),
		]);
	}

	async onPersonalizationSurveySubmitted(
		userId: string,
		answers: Record<string, string>,
	): Promise<void> {
		const camelCaseKeys = Object.keys(answers);
		const personalizationSurveyData = { user_id: userId } as Record<string, string | string[]>;
		camelCaseKeys.forEach((camelCaseKey) => {
			personalizationSurveyData[snakeCase(camelCaseKey)] = answers[camelCaseKey];
		});

		return this.telemetry.track(
			'User responded to personalization questions',
			personalizationSurveyData,
		);
	}

	async onWorkflowCreated(userId: string, workflow: IWorkflowBase): Promise<void> {
		const { nodeGraph } = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);
		return this.telemetry.track('User created workflow', {
			user_id: userId,
			workflow_id: workflow.id,
			node_graph: nodeGraph,
			node_graph_string: JSON.stringify(nodeGraph),
		});
	}

	async onWorkflowDeleted(userId: string, workflowId: string): Promise<void> {
		return this.telemetry.track('User deleted workflow', {
			user_id: userId,
			workflow_id: workflowId,
		});
	}

	async onWorkflowSaved(userId: string, workflow: IWorkflowDb): Promise<void> {
		const { nodeGraph } = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);

		return this.telemetry.track('User saved workflow', {
			user_id: userId,
			workflow_id: workflow.id,
			node_graph: nodeGraph,
			node_graph_string: JSON.stringify(nodeGraph),
			version_cli: this.versionCli,
			num_tags: workflow.tags?.length ?? 0,
		});
	}

	async onWorkflowPostExecute(
		executionId: string,
		workflow: IWorkflowBase,
		runData?: IRun,
		userId?: string,
	): Promise<void> {
		const promises = [Promise.resolve()];
		const properties: IDataObject = {
			workflow_id: workflow.id,
			is_manual: false,
			version_cli: this.versionCli,
		};

		if (userId) {
			properties.user_id = userId;
		}

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

	async onUserDeletion(
		userId: string,
		userDeletionData: ITelemetryUserDeletionData,
	): Promise<void> {
		return this.telemetry.track('User deleted user', { ...userDeletionData, user_id: userId });
	}

	async onUserInvite(userInviteData: { user_id: string; target_user_id: string[] }): Promise<void> {
		return this.telemetry.track('User invited new user', userInviteData);
	}

	async onUserReinvite(userReinviteData: {
		user_id: string;
		target_user_id: string;
	}): Promise<void> {
		return this.telemetry.track('User resent new user invite email', userReinviteData);
	}

	async onUserUpdate(userUpdateData: { user_id: string; fields_changed: string[] }): Promise<void> {
		return this.telemetry.track('User changed personal settings', userUpdateData);
	}

	async onUserInviteEmailClick(userInviteClickData: { user_id: string }): Promise<void> {
		return this.telemetry.track('User clicked invite link from email', userInviteClickData);
	}

	async onUserPasswordResetEmailClick(userPasswordResetData: { user_id: string }): Promise<void> {
		return this.telemetry.track(
			'User clicked password reset link from email',
			userPasswordResetData,
		);
	}

	async onUserTransactionalEmail(userTransactionalEmailData: {
		user_id: string;
		message_type: 'Reset password' | 'New user invite' | 'Resend invite';
	}): Promise<void> {
		return this.telemetry.track(
			'Instance sent transactional email to user',
			userTransactionalEmailData,
		);
	}

	async onUserPasswordResetRequestClick(userPasswordResetData: { user_id: string }): Promise<void> {
		return this.telemetry.track(
			'User requested password reset while logged out',
			userPasswordResetData,
		);
	}

	async onInstanceOwnerSetup(instanceOwnerSetupData: { user_id: string }): Promise<void> {
		return this.telemetry.track('Owner finished instance setup', instanceOwnerSetupData);
	}

	async onUserSignup(userSignupData: { user_id: string }): Promise<void> {
		return this.telemetry.track('User signed up', userSignupData);
	}

	async onEmailFailed(failedEmailData: {
		user_id: string;
		message_type: 'Reset password' | 'New user invite' | 'Resend invite';
	}): Promise<void> {
		return this.telemetry.track(
			'Instance failed to send transactional email to user',
			failedEmailData,
		);
	}
}
