import { snakeCase } from 'change-case';
import { BinaryDataManager } from 'n8n-core';
import {
	INodesGraphResult,
	INodeTypes,
	IRun,
	ITelemetryTrackProperties,
	TelemetryHelpers,
} from 'n8n-workflow';
import { get as pslGet } from 'psl';
import {
	IDiagnosticInfo,
	IInternalHooksClass,
	ITelemetryUserDeletionData,
	IWorkflowBase,
	IWorkflowDb,
	IExecutionTrackProperties,
} from '@/Interfaces';
import { Telemetry } from '@/telemetry';
import { RoleService } from './role/role.service';

export class InternalHooksClass implements IInternalHooksClass {
	private versionCli: string;

	private nodeTypes: INodeTypes;

	constructor(
		private telemetry: Telemetry,
		private instanceId: string,
		versionCli: string,
		nodeTypes: INodeTypes,
	) {
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

	async onFrontendSettingsAPI(sessionId?: string): Promise<void> {
		return this.telemetry.track('Session started', { session_id: sessionId });
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
			{ withPostHog: true },
		);
	}

	async onWorkflowCreated(
		userId: string,
		workflow: IWorkflowBase,
		publicApi: boolean,
	): Promise<void> {
		const { nodeGraph } = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);
		return this.telemetry.track('User created workflow', {
			user_id: userId,
			workflow_id: workflow.id,
			node_graph_string: JSON.stringify(nodeGraph),
			public_api: publicApi,
		});
	}

	async onWorkflowDeleted(userId: string, workflowId: string, publicApi: boolean): Promise<void> {
		return this.telemetry.track('User deleted workflow', {
			user_id: userId,
			workflow_id: workflowId,
			public_api: publicApi,
		});
	}

	async onWorkflowSaved(userId: string, workflow: IWorkflowDb, publicApi: boolean): Promise<void> {
		const { nodeGraph } = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);

		const notesCount = Object.keys(nodeGraph.notes).length;
		const overlappingCount = Object.values(nodeGraph.notes).filter(
			(note) => note.overlapping,
		).length;

		let userRole: 'owner' | 'sharee' | undefined = undefined;
		if (userId && workflow.id) {
			const role = await RoleService.getUserRoleForWorkflow(userId, workflow.id.toString());
			if (role) {
				userRole = role.name === 'owner' ? 'owner' : 'sharee';
			}
		}

		return this.telemetry.track(
			'User saved workflow',
			{
				user_id: userId,
				workflow_id: workflow.id,
				node_graph_string: JSON.stringify(nodeGraph),
				notes_count_overlapping: overlappingCount,
				notes_count_non_overlapping: notesCount - overlappingCount,
				version_cli: this.versionCli,
				num_tags: workflow.tags?.length ?? 0,
				public_api: publicApi,
				sharing_role: userRole,
			},
			{ withPostHog: true },
		);
	}

	async onWorkflowPostExecute(
		executionId: string,
		workflow: IWorkflowBase,
		runData?: IRun,
		userId?: string,
	): Promise<void> {
		const promises = [Promise.resolve()];

		if (!workflow.id) {
			return Promise.resolve();
		}

		const properties: IExecutionTrackProperties = {
			workflow_id: workflow.id.toString(),
			is_manual: false,
			version_cli: this.versionCli,
			success: false,
		};

		if (userId) {
			properties.user_id = userId;
		}

		if (runData !== undefined) {
			properties.execution_mode = runData.mode;
			properties.success = !!runData.finished;
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

				let userRole: 'owner' | 'sharee' | undefined = undefined;
				if (userId) {
					const role = await RoleService.getUserRoleForWorkflow(userId, workflow.id.toString());
					if (role) {
						userRole = role.name === 'owner' ? 'owner' : 'sharee';
					}
				}

				const manualExecEventProperties: ITelemetryTrackProperties = {
					user_id: userId,
					workflow_id: workflow.id.toString(),
					status: properties.success ? 'success' : 'failed',
					error_message: properties.error_message as string,
					error_node_type: properties.error_node_type,
					node_graph_string: properties.node_graph_string as string,
					error_node_id: properties.error_node_id as string,
					webhook_domain: null,
					sharing_role: userRole,
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

					promises.push(
						this.telemetry.track('Manual node exec finished', telemetryPayload, {
							withPostHog: true,
						}),
					);
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
						this.telemetry.track('Manual workflow exec finished', manualExecEventProperties, {
							withPostHog: true,
						}),
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

	async onWorkflowSharingUpdate(workflowId: string, userId: string, userList: string[]) {
		const properties: ITelemetryTrackProperties = {
			workflow_id: workflowId,
			user_id_sharer: userId,
			user_id_list: userList,
		};

		return this.telemetry.track('User updated workflow sharing', properties, { withPostHog: true });
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
		publicApi: boolean,
	): Promise<void> {
		return this.telemetry.track('User deleted user', {
			...userDeletionData,
			user_id: userId,
			public_api: publicApi,
		});
	}

	async onUserInvite(userInviteData: {
		user_id: string;
		target_user_id: string[];
		public_api: boolean;
	}): Promise<void> {
		return this.telemetry.track('User invited new user', userInviteData);
	}

	async onUserReinvite(userReinviteData: {
		user_id: string;
		target_user_id: string;
		public_api: boolean;
	}): Promise<void> {
		return this.telemetry.track('User resent new user invite email', userReinviteData);
	}

	async onUserRetrievedUser(userRetrievedData: {
		user_id: string;
		public_api: boolean;
	}): Promise<void> {
		return this.telemetry.track('User retrieved user', userRetrievedData);
	}

	async onUserRetrievedAllUsers(userRetrievedData: {
		user_id: string;
		public_api: boolean;
	}): Promise<void> {
		return this.telemetry.track('User retrieved all users', userRetrievedData);
	}

	async onUserRetrievedExecution(userRetrievedData: {
		user_id: string;
		public_api: boolean;
	}): Promise<void> {
		return this.telemetry.track('User retrieved execution', userRetrievedData);
	}

	async onUserRetrievedAllExecutions(userRetrievedData: {
		user_id: string;
		public_api: boolean;
	}): Promise<void> {
		return this.telemetry.track('User retrieved all executions', userRetrievedData);
	}

	async onUserRetrievedWorkflow(userRetrievedData: {
		user_id: string;
		public_api: boolean;
	}): Promise<void> {
		return this.telemetry.track('User retrieved workflow', userRetrievedData);
	}

	async onUserRetrievedAllWorkflows(userRetrievedData: {
		user_id: string;
		public_api: boolean;
	}): Promise<void> {
		return this.telemetry.track('User retrieved all workflows', userRetrievedData);
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
		public_api: boolean;
	}): Promise<void> {
		return this.telemetry.track(
			'Instance sent transactional email to user',
			userTransactionalEmailData,
		);
	}

	async onUserInvokedApi(userInvokedApiData: {
		user_id: string;
		path: string;
		method: string;
		api_version: string;
	}): Promise<void> {
		return this.telemetry.track('User invoked API', userInvokedApiData);
	}

	async onApiKeyDeleted(apiKeyDeletedData: {
		user_id: string;
		public_api: boolean;
	}): Promise<void> {
		return this.telemetry.track('API key deleted', apiKeyDeletedData);
	}

	async onApiKeyCreated(apiKeyCreatedData: {
		user_id: string;
		public_api: boolean;
	}): Promise<void> {
		return this.telemetry.track('API key created', apiKeyCreatedData);
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
		public_api: boolean;
	}): Promise<void> {
		return this.telemetry.track(
			'Instance failed to send transactional email to user',
			failedEmailData,
		);
	}

	/**
	 * Credentials
	 */

	async onUserCreatedCredentials(userCreatedCredentialsData: {
		credential_type: string;
		credential_id: string;
		public_api: boolean;
	}): Promise<void> {
		return this.telemetry.track('User created credentials', {
			...userCreatedCredentialsData,
			instance_id: this.instanceId,
		});
	}

	async onUserSharedCredentials(userSharedCredentialsData: {
		credential_type: string;
		credential_id: string;
		user_id_sharer: string;
		user_ids_sharees_added: string[];
		sharees_removed: number | null;
	}): Promise<void> {
		return this.telemetry.track('User updated cred sharing', {
			...userSharedCredentialsData,
			instance_id: this.instanceId,
		});
	}

	/**
	 * Community nodes backend telemetry events
	 */

	async onCommunityPackageInstallFinished(installationData: {
		user_id: string;
		input_string: string;
		package_name: string;
		success: boolean;
		package_version?: string;
		package_node_names?: string[];
		package_author?: string;
		package_author_email?: string;
		failure_reason?: string;
	}): Promise<void> {
		return this.telemetry.track('cnr package install finished', installationData);
	}

	async onCommunityPackageUpdateFinished(updateData: {
		user_id: string;
		package_name: string;
		package_version_current: string;
		package_version_new: string;
		package_node_names: string[];
		package_author?: string;
		package_author_email?: string;
	}): Promise<void> {
		return this.telemetry.track('cnr package updated', updateData);
	}

	async onCommunityPackageDeleteFinished(updateData: {
		user_id: string;
		package_name: string;
		package_version: string;
		package_node_names: string[];
		package_author?: string;
		package_author_email?: string;
	}): Promise<void> {
		return this.telemetry.track('cnr package deleted', updateData);
	}

	/**
	 * Execution Statistics
	 */
	async onFirstProductionWorkflowSuccess(data: {
		user_id: string;
		workflow_id: string | number;
	}): Promise<void> {
		return this.telemetry.track('Workflow first prod success', data, { withPostHog: true });
	}

	async onFirstWorkflowDataLoad(data: {
		user_id: string;
		workflow_id: string | number;
		node_type: string;
		node_id: string;
		credential_type?: string;
		credential_id?: string;
	}): Promise<void> {
		return this.telemetry.track('Workflow first data fetched', data, { withPostHog: true });
	}

	/**
	 * License
	 */
	async onLicenseRenewAttempt(data: { success: boolean }): Promise<void> {
		await this.telemetry.track('Instance attempted to refresh license', data);
	}
}
