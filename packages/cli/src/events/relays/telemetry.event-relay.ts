import { GlobalConfig } from '@n8n/config';
import {
	CredentialsRepository,
	ProjectRelationRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { snakeCase } from 'change-case';
import { BinaryDataConfig, InstanceSettings } from 'n8n-core';
import type { ExecutionStatus, INodesGraphResult, ITelemetryTrackProperties } from 'n8n-workflow';
import { TelemetryHelpers } from 'n8n-workflow';
import os from 'node:os';
import { get as pslGet } from 'psl';

import config from '@/config';
import { N8N_VERSION } from '@/constants';
import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { determineFinalExecutionStatus } from '@/execution-lifecycle/shared/shared-hook-functions';
import type { IExecutionTrackProperties } from '@/interfaces';
import { License } from '@/license';
import { NodeTypes } from '@/node-types';

import { EventRelay } from './event-relay';
import { Telemetry } from '../../telemetry';

@Service()
export class TelemetryEventRelay extends EventRelay {
	constructor(
		readonly eventService: EventService,
		private readonly telemetry: Telemetry,
		private readonly license: License,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly binaryDataConfig: BinaryDataConfig,
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly credentialsRepository: CredentialsRepository,
	) {
		super(eventService);
	}

	async init() {
		if (!this.globalConfig.diagnostics.enabled) return;

		await this.telemetry.init();

		this.setupListeners({
			'team-project-updated': (event) => this.teamProjectUpdated(event),
			'team-project-deleted': (event) => this.teamProjectDeleted(event),
			'team-project-created': (event) => this.teamProjectCreated(event),
			'source-control-settings-updated': (event) => this.sourceControlSettingsUpdated(event),
			'source-control-user-started-pull-ui': (event) => this.sourceControlUserStartedPullUi(event),
			'source-control-user-finished-pull-ui': (event) =>
				this.sourceControlUserFinishedPullUi(event),
			'source-control-user-pulled-api': (event) => this.sourceControlUserPulledApi(event),
			'source-control-user-started-push-ui': (event) => this.sourceControlUserStartedPushUi(event),
			'source-control-user-finished-push-ui': (event) =>
				this.sourceControlUserFinishedPushUi(event),
			'license-renewal-attempted': (event) => this.licenseRenewalAttempted(event),
			'license-community-plus-registered': (event) => this.licenseCommunityPlusRegistered(event),
			'variable-created': () => this.variableCreated(),
			'external-secrets-provider-settings-saved': (event) =>
				this.externalSecretsProviderSettingsSaved(event),
			'public-api-invoked': (event) => this.publicApiInvoked(event),
			'public-api-key-created': (event) => this.publicApiKeyCreated(event),
			'public-api-key-deleted': (event) => this.publicApiKeyDeleted(event),
			'community-package-installed': (event) => this.communityPackageInstalled(event),
			'community-package-updated': (event) => this.communityPackageUpdated(event),
			'community-package-deleted': (event) => this.communityPackageDeleted(event),
			'credentials-created': (event) => this.credentialsCreated(event),
			'credentials-shared': (event) => this.credentialsShared(event),
			'credentials-updated': (event) => this.credentialsUpdated(event),
			'credentials-deleted': (event) => this.credentialsDeleted(event),
			'ldap-general-sync-finished': (event) => this.ldapGeneralSyncFinished(event),
			'ldap-settings-updated': (event) => this.ldapSettingsUpdated(event),
			'ldap-login-sync-failed': (event) => this.ldapLoginSyncFailed(event),
			'login-failed-due-to-ldap-disabled': (event) => this.loginFailedDueToLdapDisabled(event),
			'workflow-created': (event) => this.workflowCreated(event),
			'workflow-archived': (event) => this.workflowArchived(event),
			'workflow-unarchived': (event) => this.workflowUnarchived(event),
			'workflow-deleted': (event) => this.workflowDeleted(event),
			'workflow-sharing-updated': (event) => this.workflowSharingUpdated(event),
			'workflow-saved': async (event) => await this.workflowSaved(event),
			'server-started': async () => await this.serverStarted(),
			'session-started': (event) => this.sessionStarted(event),
			'instance-stopped': () => this.instanceStopped(),
			'instance-owner-setup': async (event) => await this.instanceOwnerSetup(event),
			'first-production-workflow-succeeded': (event) =>
				this.firstProductionWorkflowSucceeded(event),
			'first-workflow-data-loaded': (event) => this.firstWorkflowDataLoaded(event),
			'workflow-post-execute': async (event) => await this.workflowPostExecute(event),
			'user-changed-role': (event) => this.userChangedRole(event),
			'user-retrieved-user': (event) => this.userRetrievedUser(event),
			'user-retrieved-all-users': (event) => this.userRetrievedAllUsers(event),
			'user-retrieved-execution': (event) => this.userRetrievedExecution(event),
			'user-retrieved-all-executions': (event) => this.userRetrievedAllExecutions(event),
			'user-retrieved-workflow': (event) => this.userRetrievedWorkflow(event),
			'user-retrieved-all-workflows': (event) => this.userRetrievedAllWorkflows(event),
			'user-updated': (event) => this.userUpdated(event),
			'user-deleted': (event) => this.userDeleted(event),
			'user-invited': (event) => this.userInvited(event),
			'user-signed-up': (event) => this.userSignedUp(event),
			'user-submitted-personalization-survey': (event) =>
				this.userSubmittedPersonalizationSurvey(event),
			'email-failed': (event) => this.emailFailed(event),
			'user-transactional-email-sent': (event) => this.userTransactionalEmailSent(event),
			'user-invite-email-click': (event) => this.userInviteEmailClick(event),
			'user-password-reset-email-click': (event) => this.userPasswordResetEmailClick(event),
			'user-password-reset-request-click': (event) => this.userPasswordResetRequestClick(event),
		});
	}

	// #endregion

	// #region Team

	private teamProjectUpdated({
		userId,
		role,
		members,
		projectId,
	}: RelayEventMap['team-project-updated']) {
		this.telemetry.track('Project settings updated', {
			user_id: userId,
			role,

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
	}: RelayEventMap['team-project-deleted']) {
		this.telemetry.track('User deleted project', {
			user_id: userId,
			role,
			project_id: projectId,
			removal_type: removalType,
			target_project_id: targetProjectId,
		});
	}

	private teamProjectCreated({ userId, role }: RelayEventMap['team-project-created']) {
		this.telemetry.track('User created project', {
			user_id: userId,
			role,
		});
	}

	// #endregion

	// #region Source control

	private sourceControlSettingsUpdated({
		branchName,
		readOnlyInstance,
		repoType,
		connected,
	}: RelayEventMap['source-control-settings-updated']) {
		this.telemetry.track('User updated source control settings', {
			branch_name: branchName,
			read_only_instance: readOnlyInstance,
			repo_type: repoType,
			connected,
		});
	}

	private sourceControlUserStartedPullUi({
		userId,
		workflowUpdates,
		workflowConflicts,
		credConflicts,
	}: RelayEventMap['source-control-user-started-pull-ui']) {
		this.telemetry.track('User started pull via UI', {
			user_id: userId,
			workflow_updates: workflowUpdates,
			workflow_conflicts: workflowConflicts,
			cred_conflicts: credConflicts,
		});
	}

	private sourceControlUserFinishedPullUi({
		userId,
		workflowUpdates,
	}: RelayEventMap['source-control-user-finished-pull-ui']) {
		this.telemetry.track('User finished pull via UI', {
			user_id: userId,
			workflow_updates: workflowUpdates,
		});
	}

	private sourceControlUserPulledApi({
		workflowUpdates,
		forced,
	}: RelayEventMap['source-control-user-pulled-api']) {
		this.telemetry.track('User pulled via API', {
			workflow_updates: workflowUpdates,
			forced,
		});
	}

	private sourceControlUserStartedPushUi({
		userId,
		workflowsEligible,
		workflowsEligibleWithConflicts,
		credsEligible,
		credsEligibleWithConflicts,
		variablesEligible,
	}: RelayEventMap['source-control-user-started-push-ui']) {
		this.telemetry.track('User started push via UI', {
			user_id: userId,
			workflows_eligible: workflowsEligible,
			workflows_eligible_with_conflicts: workflowsEligibleWithConflicts,
			creds_eligible: credsEligible,
			creds_eligible_with_conflicts: credsEligibleWithConflicts,
			variables_eligible: variablesEligible,
		});
	}

	private sourceControlUserFinishedPushUi({
		userId,
		workflowsEligible,
		workflowsPushed,
		credsPushed,
		variablesPushed,
	}: RelayEventMap['source-control-user-finished-push-ui']) {
		this.telemetry.track('User finished push via UI', {
			user_id: userId,
			workflows_eligible: workflowsEligible,
			workflows_pushed: workflowsPushed,
			creds_pushed: credsPushed,
			variables_pushed: variablesPushed,
		});
	}

	// #endregion

	// #region License

	private licenseRenewalAttempted({ success }: RelayEventMap['license-renewal-attempted']) {
		this.telemetry.track('Instance attempted to refresh license', {
			success,
		});
	}

	private licenseCommunityPlusRegistered({
		userId,
		email,
		licenseKey,
	}: RelayEventMap['license-community-plus-registered']) {
		this.telemetry.track('User registered for license community plus', {
			user_id: userId,
			email,
			licenseKey,
		});
	}

	// #endregion

	// #region Variable

	private variableCreated() {
		this.telemetry.track('User created variable');
	}

	// #endregion

	// #region External secrets

	private externalSecretsProviderSettingsSaved({
		userId,
		vaultType,
		isValid,
		isNew,
		errorMessage,
	}: RelayEventMap['external-secrets-provider-settings-saved']) {
		this.telemetry.track('User updated external secrets settings', {
			user_id: userId,
			vault_type: vaultType,
			is_valid: isValid,
			is_new: isNew,
			error_message: errorMessage,
		});
	}

	// #endregion

	// #region Public API

	private publicApiInvoked({
		userId,
		path,
		method,
		apiVersion,
	}: RelayEventMap['public-api-invoked']) {
		this.telemetry.track('User invoked API', {
			user_id: userId,
			path,
			method,
			api_version: apiVersion,
		});
	}

	private publicApiKeyCreated(event: RelayEventMap['public-api-key-created']) {
		const { user, publicApi } = event;

		this.telemetry.track('API key created', {
			user_id: user.id,
			public_api: publicApi,
		});
	}

	private publicApiKeyDeleted(event: RelayEventMap['public-api-key-deleted']) {
		const { user, publicApi } = event;

		this.telemetry.track('API key deleted', {
			user_id: user.id,
			public_api: publicApi,
		});
	}

	// #endregion

	// #region Community package

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
	}: RelayEventMap['community-package-installed']) {
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
	}: RelayEventMap['community-package-updated']) {
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
	}: RelayEventMap['community-package-deleted']) {
		this.telemetry.track('cnr package deleted', {
			user_id: user.id,
			package_name: packageName,
			package_version: packageVersion,
			package_node_names: packageNodeNames,
			package_author: packageAuthor,
			package_author_email: packageAuthorEmail,
		});
	}

	// #endregion

	// #region Credentials

	private credentialsCreated({
		user,
		credentialType,
		credentialId,
		projectId,
		projectType,
	}: RelayEventMap['credentials-created']) {
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
	}: RelayEventMap['credentials-shared']) {
		this.telemetry.track('User updated cred sharing', {
			user_id: user.id,
			credential_type: credentialType,
			credential_id: credentialId,
			user_id_sharer: userIdSharer,
			user_ids_sharees_added: userIdsShareesAdded,
			sharees_removed: shareesRemoved,
		});
	}

	private credentialsUpdated({
		user,
		credentialId,
		credentialType,
	}: RelayEventMap['credentials-updated']) {
		this.telemetry.track('User updated credentials', {
			user_id: user.id,
			credential_type: credentialType,
			credential_id: credentialId,
		});
	}

	private credentialsDeleted({
		user,
		credentialId,
		credentialType,
	}: RelayEventMap['credentials-deleted']) {
		this.telemetry.track('User deleted credentials', {
			user_id: user.id,
			credential_type: credentialType,
			credential_id: credentialId,
		});
	}

	// #endregion

	// #region LDAP

	private ldapGeneralSyncFinished({
		type,
		succeeded,
		usersSynced,
		error,
	}: RelayEventMap['ldap-general-sync-finished']) {
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
	}: RelayEventMap['ldap-settings-updated']) {
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

	private ldapLoginSyncFailed({ error }: RelayEventMap['ldap-login-sync-failed']) {
		this.telemetry.track('Ldap login sync failed', { error });
	}

	private loginFailedDueToLdapDisabled({
		userId,
	}: RelayEventMap['login-failed-due-to-ldap-disabled']) {
		this.telemetry.track('User login failed since ldap disabled', { user_ud: userId });
	}

	// #endregion

	// #region Workflow

	private workflowCreated({
		user,
		workflow,
		publicApi,
		projectId,
		projectType,
	}: RelayEventMap['workflow-created']) {
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

	private workflowArchived({ user, workflowId, publicApi }: RelayEventMap['workflow-archived']) {
		this.telemetry.track('User archived workflow', {
			user_id: user.id,
			workflow_id: workflowId,
			public_api: publicApi,
		});
	}

	private workflowUnarchived({
		user,
		workflowId,
		publicApi,
	}: RelayEventMap['workflow-unarchived']) {
		this.telemetry.track('User unarchived workflow', {
			user_id: user.id,
			workflow_id: workflowId,
			public_api: publicApi,
		});
	}

	private workflowDeleted({ user, workflowId, publicApi }: RelayEventMap['workflow-deleted']) {
		this.telemetry.track('User deleted workflow', {
			user_id: user.id,
			workflow_id: workflowId,
			public_api: publicApi,
		});
	}

	private workflowSharingUpdated({
		workflowId,
		userIdSharer,
		userIdList,
	}: RelayEventMap['workflow-sharing-updated']) {
		this.telemetry.track('User updated workflow sharing', {
			workflow_id: workflowId,
			user_id_sharer: userIdSharer,
			user_id_list: userIdList,
		});
	}

	private async workflowSaved({ user, workflow, publicApi }: RelayEventMap['workflow-saved']) {
		const isCloudDeployment = this.globalConfig.deployment.type === 'cloud';

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

	// eslint-disable-next-line complexity
	private async workflowPostExecute({
		workflow,
		runData,
		userId,
	}: RelayEventMap['workflow-post-execute']) {
		if (!workflow.id) {
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
				if (TelemetryHelpers.userInInstanceRanOutOfFreeAiCredits(runData)) {
					this.telemetry.track('User ran out of free AI credits');
				}

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
					nodeGraphResult = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes, {
						runData: runData.data.resultData?.runData,
					});
					telemetryProperties.node_graph = nodeGraphResult.nodeGraph;
					telemetryProperties.node_graph_string = JSON.stringify(nodeGraphResult.nodeGraph);

					if (errorNodeName) {
						telemetryProperties.error_node_id = nodeGraphResult.nameIndices[errorNodeName];
					}
				}
			}

			if (telemetryProperties.is_manual) {
				if (!nodeGraphResult) {
					nodeGraphResult = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes, {
						runData: runData.data.resultData?.runData,
					});
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
					credential_type: null,
					is_managed: false,
					eval_rows_left: null,
					...TelemetryHelpers.resolveAIMetrics(workflow.nodes, this.nodeTypes),
					...TelemetryHelpers.resolveVectorStoreMetrics(workflow.nodes, this.nodeTypes, runData),
					...TelemetryHelpers.extractLastExecutedNodeStructuredOutputErrorInfo(
						workflow,
						this.nodeTypes,
						runData,
					),
				};

				if (!manualExecEventProperties.node_graph_string) {
					nodeGraphResult = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes, {
						runData: runData.data.resultData?.runData,
					});
					manualExecEventProperties.node_graph_string = JSON.stringify(nodeGraphResult.nodeGraph);
				}

				nodeGraphResult?.evaluationTriggerNodeNames?.forEach((name: string) => {
					const rowsLeft =
						runData.data.resultData.runData[name]?.[0]?.data?.main?.[0]?.[0]?.json?._rowsLeft;

					if (typeof rowsLeft === 'number') {
						manualExecEventProperties.eval_rows_left = rowsLeft;
					}
				});

				if (runData.data.startData?.destinationNode) {
					const credentialsData = TelemetryHelpers.extractLastExecutedNodeCredentialData(runData);
					if (credentialsData) {
						manualExecEventProperties.credential_type = credentialsData.credentialType;
						const credential = await this.credentialsRepository.findOneBy({
							id: credentialsData.credentialId,
						});
						if (credential) {
							manualExecEventProperties.is_managed = credential.isManaged;
						}
					}

					const telemetryPayload: ITelemetryTrackProperties = {
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

	// #endregion

	// #region Lifecycle

	private async serverStarted() {
		const cpus = os.cpus();

		const isS3Selected = this.binaryDataConfig.mode === 's3';
		const isS3Available = this.binaryDataConfig.availableModes.includes('s3');
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
				is_docker: this.instanceSettings.isDocker,
			},
			execution_variables: {
				executions_mode: config.getEnv('executions.mode'),
				executions_timeout: config.getEnv('executions.timeout'),
				executions_timeout_max: config.getEnv('executions.maxTimeout'),
				executions_data_save_on_error: this.globalConfig.executions.saveDataOnError,
				executions_data_save_on_success: this.globalConfig.executions.saveDataOnSuccess,
				executions_data_save_on_progress: this.globalConfig.executions.saveExecutionProgress,
				executions_data_save_manual_executions:
					this.globalConfig.executions.saveDataManualExecutions,
				executions_data_prune: this.globalConfig.executions.pruneData,
				executions_data_max_age: this.globalConfig.executions.pruneDataMaxAge,
			},
			n8n_deployment_type: this.globalConfig.deployment.type,
			n8n_binary_data_mode: this.binaryDataConfig.mode,
			smtp_set_up: this.globalConfig.userManagement.emails.mode === 'smtp',
			ldap_allowed: authenticationMethod === 'ldap',
			saml_enabled: authenticationMethod === 'saml',
			license_plan_name: this.license.getPlanName(),
			license_tenant_id: this.globalConfig.license.tenantId,
			binary_data_s3: isS3Available && isS3Selected && isS3Licensed,
			multi_main_setup_enabled: this.globalConfig.multiMainSetup.enabled,
			metrics: {
				metrics_enabled: this.globalConfig.endpoints.metrics.enable,
				metrics_category_default: this.globalConfig.endpoints.metrics.includeDefaultMetrics,
				metrics_category_routes: this.globalConfig.endpoints.metrics.includeApiEndpoints,
				metrics_category_cache: this.globalConfig.endpoints.metrics.includeCacheMetrics,
				metrics_category_logs: this.globalConfig.endpoints.metrics.includeMessageEventBusMetrics,
				metrics_category_queue: this.globalConfig.endpoints.metrics.includeQueueMetrics,
			},
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

	private sessionStarted({ pushRef }: RelayEventMap['session-started']) {
		this.telemetry.track('Session started', { session_id: pushRef });
	}

	private instanceStopped() {
		this.telemetry.track('User instance stopped');
	}

	private async instanceOwnerSetup({ userId }: RelayEventMap['instance-owner-setup']) {
		this.telemetry.track('Owner finished instance setup', { user_id: userId });
	}

	private firstProductionWorkflowSucceeded({
		projectId,
		workflowId,
		userId,
	}: RelayEventMap['first-production-workflow-succeeded']) {
		this.telemetry.track('Workflow first prod success', {
			project_id: projectId,
			workflow_id: workflowId,
			user_id: userId,
		});
	}

	private firstWorkflowDataLoaded({
		userId,
		workflowId,
		nodeType,
		nodeId,
		credentialType,
		credentialId,
	}: RelayEventMap['first-workflow-data-loaded']) {
		this.telemetry.track('Workflow first data fetched', {
			user_id: userId,
			workflow_id: workflowId,
			node_type: nodeType,
			node_id: nodeId,
			credential_type: credentialType,
			credential_id: credentialId,
		});
	}

	// #endregion

	// #region User

	private userChangedRole({
		userId,
		targetUserId,
		targetUserNewRole,
		publicApi,
	}: RelayEventMap['user-changed-role']) {
		this.telemetry.track('User changed role', {
			user_id: userId,
			target_user_id: targetUserId,
			target_user_new_role: targetUserNewRole,
			public_api: publicApi,
		});
	}

	private userRetrievedUser({ userId, publicApi }: RelayEventMap['user-retrieved-user']) {
		this.telemetry.track('User retrieved user', {
			user_id: userId,
			public_api: publicApi,
		});
	}

	private userRetrievedAllUsers({ userId, publicApi }: RelayEventMap['user-retrieved-all-users']) {
		this.telemetry.track('User retrieved all users', {
			user_id: userId,
			public_api: publicApi,
		});
	}

	private userRetrievedExecution({ userId, publicApi }: RelayEventMap['user-retrieved-execution']) {
		this.telemetry.track('User retrieved execution', {
			user_id: userId,
			public_api: publicApi,
		});
	}

	private userRetrievedAllExecutions({
		userId,
		publicApi,
	}: RelayEventMap['user-retrieved-all-executions']) {
		this.telemetry.track('User retrieved all executions', {
			user_id: userId,
			public_api: publicApi,
		});
	}

	private userRetrievedWorkflow({ userId, publicApi }: RelayEventMap['user-retrieved-workflow']) {
		this.telemetry.track('User retrieved workflow', {
			user_id: userId,
			public_api: publicApi,
		});
	}

	private userRetrievedAllWorkflows({
		userId,
		publicApi,
	}: RelayEventMap['user-retrieved-all-workflows']) {
		this.telemetry.track('User retrieved all workflows', {
			user_id: userId,
			public_api: publicApi,
		});
	}

	private userUpdated({ user, fieldsChanged }: RelayEventMap['user-updated']) {
		this.telemetry.track('User changed personal settings', {
			user_id: user.id,
			fields_changed: fieldsChanged,
		});
	}

	private userDeleted({
		user,
		publicApi,
		targetUserOldStatus,
		migrationStrategy,
		targetUserId,
		migrationUserId,
	}: RelayEventMap['user-deleted']) {
		this.telemetry.track('User deleted user', {
			user_id: user.id,
			public_api: publicApi,
			target_user_old_status: targetUserOldStatus,
			migration_strategy: migrationStrategy,
			target_user_id: targetUserId,
			migration_user_id: migrationUserId,
		});
	}

	private userInvited({
		user,
		targetUserId,
		publicApi,
		emailSent,
		inviteeRole,
	}: RelayEventMap['user-invited']) {
		this.telemetry.track('User invited new user', {
			user_id: user.id,
			target_user_id: targetUserId,
			public_api: publicApi,
			email_sent: emailSent,
			invitee_role: inviteeRole,
		});
	}

	private userSignedUp({ user, userType, wasDisabledLdapUser }: RelayEventMap['user-signed-up']) {
		const payload = {
			user_id: user.id,
			user_type: userType,
			was_disabled_ldap_user: wasDisabledLdapUser,
			...(this.globalConfig.deployment.type === 'cloud' && {
				user_email: user.email,
				user_role: user.role,
			}),
		};

		this.telemetry.track('User signed up', payload);
	}

	private userSubmittedPersonalizationSurvey({
		userId,
		answers,
	}: RelayEventMap['user-submitted-personalization-survey']) {
		const personalizationSurveyData = { user_id: userId } as Record<string, string | string[]>;

		for (const [camelCaseKey, value] of Object.entries(answers)) {
			if (value) {
				personalizationSurveyData[snakeCase(camelCaseKey)] = value;
			}
		}

		this.telemetry.track('User responded to personalization questions', personalizationSurveyData);
	}

	// #endregion

	// #region Email

	private emailFailed({ user, messageType, publicApi }: RelayEventMap['email-failed']) {
		this.telemetry.track('Instance failed to send transactional email to user', {
			user_id: user.id,
			message_type: messageType,
			public_api: publicApi,
		});
	}

	private userTransactionalEmailSent({
		userId,
		messageType,
		publicApi,
	}: RelayEventMap['user-transactional-email-sent']) {
		this.telemetry.track('User sent transactional email', {
			user_id: userId,
			message_type: messageType,
			public_api: publicApi,
		});
	}

	// #endregion

	// #region Click

	private userInviteEmailClick({ invitee }: RelayEventMap['user-invite-email-click']) {
		this.telemetry.track('User clicked invite link from email', {
			user_id: invitee.id,
		});
	}

	private userPasswordResetEmailClick({ user }: RelayEventMap['user-password-reset-email-click']) {
		this.telemetry.track('User clicked password reset link from email', {
			user_id: user.id,
		});
	}

	private userPasswordResetRequestClick({
		user,
	}: RelayEventMap['user-password-reset-request-click']) {
		this.telemetry.track('User requested password reset while logged out', {
			user_id: user.id,
		});
	}

	// #endregion
}
