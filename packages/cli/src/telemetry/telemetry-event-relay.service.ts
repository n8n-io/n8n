import { Service } from 'typedi';
import { EventService } from '@/eventbus/event.service';
import type { Event } from '@/eventbus/event.types';
import { Telemetry } from '.';
import config from '@/config';
import os from 'node:os';
import { License } from '@/License';
import { GlobalConfig } from '@n8n/config';
import { N8N_VERSION } from '@/constants';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import type { ExecutionStatus, INodesGraphResult, ITelemetryTrackProperties } from 'n8n-workflow';
import { get as pslGet } from 'psl';
import { TelemetryHelpers } from 'n8n-workflow';
import { NodeTypes } from '@/NodeTypes';
import { SharedWorkflowRepository } from '@/databases/repositories/sharedWorkflow.repository';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';
import type { IExecutionTrackProperties } from '@/Interfaces';
import { determineFinalExecutionStatus } from '@/executionLifecycleHooks/shared/sharedHookFunctions';

@Service()
export class TelemetryEventRelay {
	constructor(
		private readonly eventService: EventService,
		private readonly telemetry: Telemetry,
		private readonly license: License,
		private readonly globalConfig: GlobalConfig,
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
	) {}

	async init() {
		if (!config.getEnv('diagnostics.enabled')) return;

		await this.telemetry.init();

		this.setupHandlers();
	}

	private setupHandlers() {
		this.eventService.on('server-started', async () => await this.serverStarted());

		this.eventService.on('team-project-updated', (event) => this.teamProjectUpdated(event));
		this.eventService.on('team-project-deleted', (event) => this.teamProjectDeleted(event));
		this.eventService.on('team-project-created', (event) => this.teamProjectCreated(event));
		this.eventService.on('source-control-settings-updated', (event) =>
			this.sourceControlSettingsUpdated(event),
		);
		this.eventService.on('source-control-user-started-pull-ui', (event) =>
			this.sourceControlUserStartedPullUi(event),
		);
		this.eventService.on('source-control-user-finished-pull-ui', (event) =>
			this.sourceControlUserFinishedPullUi(event),
		);
		this.eventService.on('source-control-user-pulled-api', (event) =>
			this.sourceControlUserPulledApi(event),
		);
		this.eventService.on('source-control-user-started-push-ui', (event) =>
			this.sourceControlUserStartedPushUi(event),
		);
		this.eventService.on('source-control-user-finished-push-ui', (event) =>
			this.sourceControlUserFinishedPushUi(event),
		);
		this.eventService.on('license-renewal-attempted', (event) => {
			this.licenseRenewalAttempted(event);
		});
		this.eventService.on('variable-created', () => this.variableCreated());
		this.eventService.on('external-secrets-provider-settings-saved', (event) => {
			this.externalSecretsProviderSettingsSaved(event);
		});
		this.eventService.on('public-api-invoked', (event) => {
			this.publicApiInvoked(event);
		});
		this.eventService.on('public-api-key-created', (event) => {
			this.publicApiKeyCreated(event);
		});
		this.eventService.on('public-api-key-deleted', (event) => {
			this.publicApiKeyDeleted(event);
		});
		this.eventService.on('community-package-installed', (event) => {
			this.communityPackageInstalled(event);
		});
		this.eventService.on('community-package-updated', (event) => {
			this.communityPackageUpdated(event);
		});
		this.eventService.on('community-package-deleted', (event) => {
			this.communityPackageDeleted(event);
		});

		this.eventService.on('credentials-created', (event) => {
			this.credentialsCreated(event);
		});
		this.eventService.on('credentials-shared', (event) => {
			this.credentialsShared(event);
		});
		this.eventService.on('credentials-updated', (event) => {
			this.credentialsUpdated(event);
		});
		this.eventService.on('credentials-deleted', (event) => {
			this.credentialsDeleted(event);
		});
		this.eventService.on('ldap-general-sync-finished', (event) => {
			this.ldapGeneralSyncFinished(event);
		});
		this.eventService.on('ldap-settings-updated', (event) => {
			this.ldapSettingsUpdated(event);
		});
		this.eventService.on('ldap-login-sync-failed', (event) => {
			this.ldapLoginSyncFailed(event);
		});
		this.eventService.on('login-failed-due-to-ldap-disabled', (event) => {
			this.loginFailedDueToLdapDisabled(event);
		});

		this.eventService.on('workflow-created', (event) => {
			this.workflowCreated(event);
		});
		this.eventService.on('workflow-deleted', (event) => {
			this.workflowDeleted(event);
		});
		this.eventService.on('workflow-saved', async (event) => {
			await this.workflowSaved(event);
		});
		this.eventService.on('workflow-post-execute', async (event) => {
			await this.workflowPostExecute(event);
		});
	}

	private teamProjectUpdated({ userId, role, members, projectId }: Event['team-project-updated']) {
		this.telemetry.track('Project settings updated', {
			user_id: userId,
			role,
			// eslint-disable-next-line @typescript-eslint/no-shadow
			members: members.map(({ userId: user_id, role }) => ({ user_id, role })),
			project_id: projectId,
		});
	}

	private teamProjectDeleted({
		userId,
		role,
		projectId,
		removalType,
		targetProjectId,
	}: Event['team-project-deleted']) {
		this.telemetry.track('User deleted project', {
			user_id: userId,
			role,
			project_id: projectId,
			removal_type: removalType,
			target_project_id: targetProjectId,
		});
	}

	private teamProjectCreated({ userId, role }: Event['team-project-created']) {
		this.telemetry.track('User created project', {
			user_id: userId,
			role,
		});
	}

	private sourceControlSettingsUpdated({
		branchName,
		readOnlyInstance,
		repoType,
		connected,
	}: Event['source-control-settings-updated']) {
		this.telemetry.track('User updated source control settings', {
			branch_name: branchName,
			read_only_instance: readOnlyInstance,
			repo_type: repoType,
			connected,
		});
	}

	private sourceControlUserStartedPullUi({
		workflowUpdates,
		workflowConflicts,
		credConflicts,
	}: Event['source-control-user-started-pull-ui']) {
		this.telemetry.track('User started pull via UI', {
			workflow_updates: workflowUpdates,
			workflow_conflicts: workflowConflicts,
			cred_conflicts: credConflicts,
		});
	}

	private sourceControlUserFinishedPullUi({
		workflowUpdates,
	}: Event['source-control-user-finished-pull-ui']) {
		this.telemetry.track('User finished pull via UI', {
			workflow_updates: workflowUpdates,
		});
	}

	private sourceControlUserPulledApi({
		workflowUpdates,
		forced,
	}: Event['source-control-user-pulled-api']) {
		console.log('source-control-user-pulled-api', {
			workflow_updates: workflowUpdates,
			forced,
		});
		this.telemetry.track('User pulled via API', {
			workflow_updates: workflowUpdates,
			forced,
		});
	}

	private sourceControlUserStartedPushUi({
		workflowsEligible,
		workflowsEligibleWithConflicts,
		credsEligible,
		credsEligibleWithConflicts,
		variablesEligible,
	}: Event['source-control-user-started-push-ui']) {
		this.telemetry.track('User started push via UI', {
			workflows_eligible: workflowsEligible,
			workflows_eligible_with_conflicts: workflowsEligibleWithConflicts,
			creds_eligible: credsEligible,
			creds_eligible_with_conflicts: credsEligibleWithConflicts,
			variables_eligible: variablesEligible,
		});
	}

	private sourceControlUserFinishedPushUi({
		workflowsEligible,
		workflowsPushed,
		credsPushed,
		variablesPushed,
	}: Event['source-control-user-finished-push-ui']) {
		this.telemetry.track('User finished push via UI', {
			workflows_eligible: workflowsEligible,
			workflows_pushed: workflowsPushed,
			creds_pushed: credsPushed,
			variables_pushed: variablesPushed,
		});
	}

	private licenseRenewalAttempted({ success }: Event['license-renewal-attempted']) {
		this.telemetry.track('Instance attempted to refresh license', {
			success,
		});
	}

	private variableCreated() {
		this.telemetry.track('User created variable');
	}

	private externalSecretsProviderSettingsSaved({
		userId,
		vaultType,
		isValid,
		isNew,
		errorMessage,
	}: Event['external-secrets-provider-settings-saved']) {
		this.telemetry.track('User updated external secrets settings', {
			user_id: userId,
			vault_type: vaultType,
			is_valid: isValid,
			is_new: isNew,
			error_message: errorMessage,
		});
	}

	private publicApiInvoked({ userId, path, method, apiVersion }: Event['public-api-invoked']) {
		this.telemetry.track('User invoked API', {
			user_id: userId,
			path,
			method,
			api_version: apiVersion,
		});
	}

	private publicApiKeyCreated(event: Event['public-api-key-created']) {
		const { user, publicApi } = event;

		this.telemetry.track('API key created', {
			user_id: user.id,
			public_api: publicApi,
		});
	}

	private publicApiKeyDeleted(event: Event['public-api-key-deleted']) {
		const { user, publicApi } = event;

		this.telemetry.track('API key deleted', {
			user_id: user.id,
			public_api: publicApi,
		});
	}

	private communityPackageInstalled({
		user,
		inputString,
		packageName,
		success,
		packageVersion,
		packageNodeNames,
		packageAuthor,
		packageAuthorEmail,
		failureReason,
	}: Event['community-package-installed']) {
		this.telemetry.track('cnr package install finished', {
			user_id: user.id,
			input_string: inputString,
			package_name: packageName,
			success,
			package_version: packageVersion,
			package_node_names: packageNodeNames,
			package_author: packageAuthor,
			package_author_email: packageAuthorEmail,
			failure_reason: failureReason,
		});
	}

	private communityPackageUpdated({
		user,
		packageName,
		packageVersionCurrent,
		packageVersionNew,
		packageNodeNames,
		packageAuthor,
		packageAuthorEmail,
	}: Event['community-package-updated']) {
		this.telemetry.track('cnr package updated', {
			user_id: user.id,
			package_name: packageName,
			package_version_current: packageVersionCurrent,
			package_version_new: packageVersionNew,
			package_node_names: packageNodeNames,
			package_author: packageAuthor,
			package_author_email: packageAuthorEmail,
		});
	}

	private communityPackageDeleted({
		user,
		packageName,
		packageVersion,
		packageNodeNames,
		packageAuthor,
		packageAuthorEmail,
	}: Event['community-package-deleted']) {
		this.telemetry.track('cnr package deleted', {
			user_id: user.id,
			package_name: packageName,
			package_version: packageVersion,
			package_node_names: packageNodeNames,
			package_author: packageAuthor,
			package_author_email: packageAuthorEmail,
		});
	}

	private credentialsCreated({
		user,
		credentialType,
		credentialId,
		projectId,
		projectType,
	}: Event['credentials-created']) {
		this.telemetry.track('User created credentials', {
			user_id: user.id,
			credential_type: credentialType,
			credential_id: credentialId,
			project_id: projectId,
			project_type: projectType,
		});
	}

	private credentialsShared({
		user,
		credentialType,
		credentialId,
		userIdSharer,
		userIdsShareesAdded,
		shareesRemoved,
	}: Event['credentials-shared']) {
		this.telemetry.track('User updated cred sharing', {
			user_id: user.id,
			credential_type: credentialType,
			credential_id: credentialId,
			user_id_sharer: userIdSharer,
			user_ids_sharees_added: userIdsShareesAdded,
			sharees_removed: shareesRemoved,
		});
	}

	private credentialsUpdated({ user, credentialId, credentialType }: Event['credentials-updated']) {
		this.telemetry.track('User updated credentials', {
			user_id: user.id,
			credential_type: credentialType,
			credential_id: credentialId,
		});
	}

	private credentialsDeleted({ user, credentialId, credentialType }: Event['credentials-deleted']) {
		this.telemetry.track('User deleted credentials', {
			user_id: user.id,
			credential_type: credentialType,
			credential_id: credentialId,
		});
	}

	private ldapGeneralSyncFinished({
		type,
		succeeded,
		usersSynced,
		error,
	}: Event['ldap-general-sync-finished']) {
		this.telemetry.track('Ldap general sync finished', {
			type,
			succeeded,
			users_synced: usersSynced,
			error,
		});
	}

	private ldapSettingsUpdated({
		userId,
		loginIdAttribute,
		firstNameAttribute,
		lastNameAttribute,
		emailAttribute,
		ldapIdAttribute,
		searchPageSize,
		searchTimeout,
		synchronizationEnabled,
		synchronizationInterval,
		loginLabel,
		loginEnabled,
	}: Event['ldap-settings-updated']) {
		this.telemetry.track('User updated Ldap settings', {
			user_id: userId,
			loginIdAttribute,
			firstNameAttribute,
			lastNameAttribute,
			emailAttribute,
			ldapIdAttribute,
			searchPageSize,
			searchTimeout,
			synchronizationEnabled,
			synchronizationInterval,
			loginLabel,
			loginEnabled,
		});
	}

	private ldapLoginSyncFailed({ error }: Event['ldap-login-sync-failed']) {
		this.telemetry.track('Ldap login sync failed', { error });
	}

	private loginFailedDueToLdapDisabled({ userId }: Event['login-failed-due-to-ldap-disabled']) {
		this.telemetry.track('User login failed since ldap disabled', { user_ud: userId });
	}

	private workflowCreated({
		user,
		workflow,
		publicApi,
		projectId,
		projectType,
	}: Event['workflow-created']) {
		const { nodeGraph } = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);

		this.telemetry.track('User created workflow', {
			user_id: user.id,
			workflow_id: workflow.id,
			node_graph_string: JSON.stringify(nodeGraph),
			public_api: publicApi,
			project_id: projectId,
			project_type: projectType,
		});
	}

	private workflowDeleted({ user, workflowId, publicApi }: Event['workflow-deleted']) {
		this.telemetry.track('User deleted workflow', {
			user_id: user.id,
			workflow_id: workflowId,
			public_api: publicApi,
		});
	}

	private async workflowSaved({ user, workflow, publicApi }: Event['workflow-saved']) {
		const isCloudDeployment = config.getEnv('deployment.type') === 'cloud';

		const { nodeGraph } = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes, {
			isCloudDeployment,
		});

		let userRole: 'owner' | 'sharee' | 'member' | undefined = undefined;
		const role = await this.sharedWorkflowRepository.findSharingRole(user.id, workflow.id);
		if (role) {
			userRole = role === 'workflow:owner' ? 'owner' : 'sharee';
		} else {
			const workflowOwner = await this.sharedWorkflowRepository.getWorkflowOwningProject(
				workflow.id,
			);

			if (workflowOwner) {
				const projectRole = await this.projectRelationRepository.findProjectRole({
					userId: user.id,
					projectId: workflowOwner.id,
				});

				if (projectRole && projectRole !== 'project:personalOwner') {
					userRole = 'member';
				}
			}
		}

		const notesCount = Object.keys(nodeGraph.notes).length;
		const overlappingCount = Object.values(nodeGraph.notes).filter(
			(note) => note.overlapping,
		).length;

		this.telemetry.track('User saved workflow', {
			user_id: user.id,
			workflow_id: workflow.id,
			node_graph_string: JSON.stringify(nodeGraph),
			notes_count_overlapping: overlappingCount,
			notes_count_non_overlapping: notesCount - overlappingCount,
			version_cli: N8N_VERSION,
			num_tags: workflow.tags?.length ?? 0,
			public_api: publicApi,
			sharing_role: userRole,
		});
	}

	private async serverStarted() {
		const cpus = os.cpus();
		const binaryDataConfig = config.getEnv('binaryDataManager');

		const isS3Selected = config.getEnv('binaryDataManager.mode') === 's3';
		const isS3Available = config.getEnv('binaryDataManager.availableModes').includes('s3');
		const isS3Licensed = this.license.isBinaryDataS3Licensed();
		const authenticationMethod = config.getEnv('userManagement.authenticationMethod');

		const info = {
			version_cli: N8N_VERSION,
			db_type: this.globalConfig.database.type,
			n8n_version_notifications_enabled: this.globalConfig.versionNotifications.enabled,
			n8n_disable_production_main_process:
				this.globalConfig.endpoints.disableProductionWebhooksOnMainProcess,
			system_info: {
				os: {
					type: os.type(),
					version: os.version(),
				},
				memory: os.totalmem() / 1024,
				cpus: {
					count: cpus.length,
					model: cpus[0].model,
					speed: cpus[0].speed,
				},
			},
			execution_variables: {
				executions_mode: config.getEnv('executions.mode'),
				executions_timeout: config.getEnv('executions.timeout'),
				executions_timeout_max: config.getEnv('executions.maxTimeout'),
				executions_data_save_on_error: config.getEnv('executions.saveDataOnError'),
				executions_data_save_on_success: config.getEnv('executions.saveDataOnSuccess'),
				executions_data_save_on_progress: config.getEnv('executions.saveExecutionProgress'),
				executions_data_save_manual_executions: config.getEnv(
					'executions.saveDataManualExecutions',
				),
				executions_data_prune: config.getEnv('executions.pruneData'),
				executions_data_max_age: config.getEnv('executions.pruneDataMaxAge'),
			},
			n8n_deployment_type: config.getEnv('deployment.type'),
			n8n_binary_data_mode: binaryDataConfig.mode,
			smtp_set_up: this.globalConfig.userManagement.emails.mode === 'smtp',
			ldap_allowed: authenticationMethod === 'ldap',
			saml_enabled: authenticationMethod === 'saml',
			license_plan_name: this.license.getPlanName(),
			license_tenant_id: config.getEnv('license.tenantId'),
			binary_data_s3: isS3Available && isS3Selected && isS3Licensed,
			multi_main_setup_enabled: config.getEnv('multiMainSetup.enabled'),
		};

		const firstWorkflow = await this.workflowRepository.findOne({
			select: ['createdAt'],
			order: { createdAt: 'ASC' },
			where: {},
		});

		this.telemetry.identify(info);
		this.telemetry.track('Instance started', {
			...info,
			earliest_workflow_created: firstWorkflow?.createdAt,
		});
	}

	// eslint-disable-next-line complexity
	private async workflowPostExecute({ workflow, runData, userId }: Event['workflow-post-execute']) {
		if (!workflow.id) {
			return;
		}

		if (runData?.status === 'waiting') {
			// No need to send telemetry or logs when the workflow hasn't finished yet.
			return;
		}

		const telemetryProperties: IExecutionTrackProperties = {
			workflow_id: workflow.id,
			is_manual: false,
			version_cli: N8N_VERSION,
			success: false,
		};

		if (userId) {
			telemetryProperties.user_id = userId;
		}

		if (runData?.data.resultData.error?.message?.includes('canceled')) {
			runData.status = 'canceled';
		}

		telemetryProperties.success = !!runData?.finished;

		// const executionStatus: ExecutionStatus = runData?.status ?? 'unknown';
		const executionStatus: ExecutionStatus = runData
			? determineFinalExecutionStatus(runData)
			: 'unknown';

		if (runData !== undefined) {
			telemetryProperties.execution_mode = runData.mode;
			telemetryProperties.is_manual = runData.mode === 'manual';

			let nodeGraphResult: INodesGraphResult | null = null;

			if (!telemetryProperties.success && runData?.data.resultData.error) {
				telemetryProperties.error_message = runData?.data.resultData.error.message;
				let errorNodeName =
					'node' in runData?.data.resultData.error
						? runData?.data.resultData.error.node?.name
						: undefined;
				telemetryProperties.error_node_type =
					'node' in runData?.data.resultData.error
						? runData?.data.resultData.error.node?.type
						: undefined;

				if (runData.data.resultData.lastNodeExecuted) {
					const lastNode = TelemetryHelpers.getNodeTypeForName(
						workflow,
						runData.data.resultData.lastNodeExecuted,
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
			}

			if (telemetryProperties.is_manual) {
				if (!nodeGraphResult) {
					nodeGraphResult = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);
				}

				let userRole: 'owner' | 'sharee' | undefined = undefined;
				if (userId) {
					const role = await this.sharedWorkflowRepository.findSharingRole(userId, workflow.id);
					if (role) {
						userRole = role === 'workflow:owner' ? 'owner' : 'sharee';
					}
				}

				const manualExecEventProperties: ITelemetryTrackProperties = {
					user_id: userId,
					workflow_id: workflow.id,
					status: executionStatus,
					executionStatus: runData?.status ?? 'unknown',
					error_message: telemetryProperties.error_message as string,
					error_node_type: telemetryProperties.error_node_type,
					node_graph_string: telemetryProperties.node_graph_string as string,
					error_node_id: telemetryProperties.error_node_id as string,
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

					this.telemetry.track('Manual node exec finished', telemetryPayload);
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

					this.telemetry.track('Manual workflow exec finished', manualExecEventProperties);
				}
			}
		}

		this.telemetry.trackWorkflowExecution(telemetryProperties);
	}
}
