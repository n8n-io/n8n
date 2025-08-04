'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.TelemetryEventRelay = void 0;
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const change_case_1 = require('change-case');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const node_os_1 = __importDefault(require('node:os'));
const psl_1 = require('psl');
const config_2 = __importDefault(require('@/config'));
const constants_1 = require('@/constants');
const event_service_1 = require('@/events/event.service');
const shared_hook_functions_1 = require('@/execution-lifecycle/shared/shared-hook-functions');
const license_1 = require('@/license');
const node_types_1 = require('@/node-types');
const event_relay_1 = require('./event-relay');
const telemetry_1 = require('../../telemetry');
let TelemetryEventRelay = class TelemetryEventRelay extends event_relay_1.EventRelay {
	constructor(
		eventService,
		telemetry,
		license,
		globalConfig,
		instanceSettings,
		binaryDataConfig,
		workflowRepository,
		nodeTypes,
		sharedWorkflowRepository,
		projectRelationRepository,
		credentialsRepository,
	) {
		super(eventService);
		this.eventService = eventService;
		this.telemetry = telemetry;
		this.license = license;
		this.globalConfig = globalConfig;
		this.instanceSettings = instanceSettings;
		this.binaryDataConfig = binaryDataConfig;
		this.workflowRepository = workflowRepository;
		this.nodeTypes = nodeTypes;
		this.sharedWorkflowRepository = sharedWorkflowRepository;
		this.projectRelationRepository = projectRelationRepository;
		this.credentialsRepository = credentialsRepository;
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
	teamProjectUpdated({ userId, role, members, projectId }) {
		this.telemetry.track('Project settings updated', {
			user_id: userId,
			role,
			members: members.map(({ userId: user_id, role }) => ({ user_id, role })),
			project_id: projectId,
		});
	}
	teamProjectDeleted({ userId, role, projectId, removalType, targetProjectId }) {
		this.telemetry.track('User deleted project', {
			user_id: userId,
			role,
			project_id: projectId,
			removal_type: removalType,
			target_project_id: targetProjectId,
		});
	}
	teamProjectCreated({ userId, role }) {
		this.telemetry.track('User created project', {
			user_id: userId,
			role,
		});
	}
	sourceControlSettingsUpdated({ branchName, readOnlyInstance, repoType, connected }) {
		this.telemetry.track('User updated source control settings', {
			branch_name: branchName,
			read_only_instance: readOnlyInstance,
			repo_type: repoType,
			connected,
		});
	}
	sourceControlUserStartedPullUi({ userId, workflowUpdates, workflowConflicts, credConflicts }) {
		this.telemetry.track('User started pull via UI', {
			user_id: userId,
			workflow_updates: workflowUpdates,
			workflow_conflicts: workflowConflicts,
			cred_conflicts: credConflicts,
		});
	}
	sourceControlUserFinishedPullUi({ userId, workflowUpdates }) {
		this.telemetry.track('User finished pull via UI', {
			user_id: userId,
			workflow_updates: workflowUpdates,
		});
	}
	sourceControlUserPulledApi({ workflowUpdates, forced }) {
		this.telemetry.track('User pulled via API', {
			workflow_updates: workflowUpdates,
			forced,
		});
	}
	sourceControlUserStartedPushUi({
		userId,
		workflowsEligible,
		workflowsEligibleWithConflicts,
		credsEligible,
		credsEligibleWithConflicts,
		variablesEligible,
	}) {
		this.telemetry.track('User started push via UI', {
			user_id: userId,
			workflows_eligible: workflowsEligible,
			workflows_eligible_with_conflicts: workflowsEligibleWithConflicts,
			creds_eligible: credsEligible,
			creds_eligible_with_conflicts: credsEligibleWithConflicts,
			variables_eligible: variablesEligible,
		});
	}
	sourceControlUserFinishedPushUi({
		userId,
		workflowsEligible,
		workflowsPushed,
		credsPushed,
		variablesPushed,
	}) {
		this.telemetry.track('User finished push via UI', {
			user_id: userId,
			workflows_eligible: workflowsEligible,
			workflows_pushed: workflowsPushed,
			creds_pushed: credsPushed,
			variables_pushed: variablesPushed,
		});
	}
	licenseRenewalAttempted({ success }) {
		this.telemetry.track('Instance attempted to refresh license', {
			success,
		});
	}
	licenseCommunityPlusRegistered({ userId, email, licenseKey }) {
		this.telemetry.track('User registered for license community plus', {
			user_id: userId,
			email,
			licenseKey,
		});
	}
	variableCreated() {
		this.telemetry.track('User created variable');
	}
	externalSecretsProviderSettingsSaved({ userId, vaultType, isValid, isNew, errorMessage }) {
		this.telemetry.track('User updated external secrets settings', {
			user_id: userId,
			vault_type: vaultType,
			is_valid: isValid,
			is_new: isNew,
			error_message: errorMessage,
		});
	}
	publicApiInvoked({ userId, path, method, apiVersion }) {
		this.telemetry.track('User invoked API', {
			user_id: userId,
			path,
			method,
			api_version: apiVersion,
		});
	}
	publicApiKeyCreated(event) {
		const { user, publicApi } = event;
		this.telemetry.track('API key created', {
			user_id: user.id,
			public_api: publicApi,
		});
	}
	publicApiKeyDeleted(event) {
		const { user, publicApi } = event;
		this.telemetry.track('API key deleted', {
			user_id: user.id,
			public_api: publicApi,
		});
	}
	communityPackageInstalled({
		user,
		inputString,
		packageName,
		success,
		packageVersion,
		packageNodeNames,
		packageAuthor,
		packageAuthorEmail,
		failureReason,
	}) {
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
	communityPackageUpdated({
		user,
		packageName,
		packageVersionCurrent,
		packageVersionNew,
		packageNodeNames,
		packageAuthor,
		packageAuthorEmail,
	}) {
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
	communityPackageDeleted({
		user,
		packageName,
		packageVersion,
		packageNodeNames,
		packageAuthor,
		packageAuthorEmail,
	}) {
		this.telemetry.track('cnr package deleted', {
			user_id: user.id,
			package_name: packageName,
			package_version: packageVersion,
			package_node_names: packageNodeNames,
			package_author: packageAuthor,
			package_author_email: packageAuthorEmail,
		});
	}
	credentialsCreated({ user, credentialType, credentialId, projectId, projectType }) {
		this.telemetry.track('User created credentials', {
			user_id: user.id,
			credential_type: credentialType,
			credential_id: credentialId,
			project_id: projectId,
			project_type: projectType,
		});
	}
	credentialsShared({
		user,
		credentialType,
		credentialId,
		userIdSharer,
		userIdsShareesAdded,
		shareesRemoved,
	}) {
		this.telemetry.track('User updated cred sharing', {
			user_id: user.id,
			credential_type: credentialType,
			credential_id: credentialId,
			user_id_sharer: userIdSharer,
			user_ids_sharees_added: userIdsShareesAdded,
			sharees_removed: shareesRemoved,
		});
	}
	credentialsUpdated({ user, credentialId, credentialType }) {
		this.telemetry.track('User updated credentials', {
			user_id: user.id,
			credential_type: credentialType,
			credential_id: credentialId,
		});
	}
	credentialsDeleted({ user, credentialId, credentialType }) {
		this.telemetry.track('User deleted credentials', {
			user_id: user.id,
			credential_type: credentialType,
			credential_id: credentialId,
		});
	}
	ldapGeneralSyncFinished({ type, succeeded, usersSynced, error }) {
		this.telemetry.track('Ldap general sync finished', {
			type,
			succeeded,
			users_synced: usersSynced,
			error,
		});
	}
	ldapSettingsUpdated({
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
	}) {
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
	ldapLoginSyncFailed({ error }) {
		this.telemetry.track('Ldap login sync failed', { error });
	}
	loginFailedDueToLdapDisabled({ userId }) {
		this.telemetry.track('User login failed since ldap disabled', { user_ud: userId });
	}
	workflowCreated({ user, workflow, publicApi, projectId, projectType }) {
		const { nodeGraph } = n8n_workflow_1.TelemetryHelpers.generateNodesGraph(
			workflow,
			this.nodeTypes,
		);
		this.telemetry.track('User created workflow', {
			user_id: user.id,
			workflow_id: workflow.id,
			node_graph_string: JSON.stringify(nodeGraph),
			public_api: publicApi,
			project_id: projectId,
			project_type: projectType,
		});
	}
	workflowArchived({ user, workflowId, publicApi }) {
		this.telemetry.track('User archived workflow', {
			user_id: user.id,
			workflow_id: workflowId,
			public_api: publicApi,
		});
	}
	workflowUnarchived({ user, workflowId, publicApi }) {
		this.telemetry.track('User unarchived workflow', {
			user_id: user.id,
			workflow_id: workflowId,
			public_api: publicApi,
		});
	}
	workflowDeleted({ user, workflowId, publicApi }) {
		this.telemetry.track('User deleted workflow', {
			user_id: user.id,
			workflow_id: workflowId,
			public_api: publicApi,
		});
	}
	workflowSharingUpdated({ workflowId, userIdSharer, userIdList }) {
		this.telemetry.track('User updated workflow sharing', {
			workflow_id: workflowId,
			user_id_sharer: userIdSharer,
			user_id_list: userIdList,
		});
	}
	async workflowSaved({ user, workflow, publicApi }) {
		const isCloudDeployment = this.globalConfig.deployment.type === 'cloud';
		const { nodeGraph } = n8n_workflow_1.TelemetryHelpers.generateNodesGraph(
			workflow,
			this.nodeTypes,
			{
				isCloudDeployment,
			},
		);
		let userRole = undefined;
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
			version_cli: constants_1.N8N_VERSION,
			num_tags: workflow.tags?.length ?? 0,
			public_api: publicApi,
			sharing_role: userRole,
		});
	}
	async workflowPostExecute({ workflow, runData, userId }) {
		if (!workflow.id) {
			return;
		}
		const telemetryProperties = {
			workflow_id: workflow.id,
			is_manual: false,
			version_cli: constants_1.N8N_VERSION,
			success: false,
		};
		if (userId) {
			telemetryProperties.user_id = userId;
		}
		if (runData?.data.resultData.error?.message?.includes('canceled')) {
			runData.status = 'canceled';
		}
		telemetryProperties.success = !!runData?.finished;
		const executionStatus = runData
			? (0, shared_hook_functions_1.determineFinalExecutionStatus)(runData)
			: 'unknown';
		if (runData !== undefined) {
			telemetryProperties.execution_mode = runData.mode;
			telemetryProperties.is_manual = runData.mode === 'manual';
			let nodeGraphResult = null;
			if (!telemetryProperties.success && runData?.data.resultData.error) {
				if (n8n_workflow_1.TelemetryHelpers.userInInstanceRanOutOfFreeAiCredits(runData)) {
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
					const lastNode = n8n_workflow_1.TelemetryHelpers.getNodeTypeForName(
						workflow,
						runData.data.resultData.lastNodeExecuted,
					);
					if (lastNode !== undefined) {
						telemetryProperties.error_node_type = lastNode.type;
						errorNodeName = lastNode.name;
					}
				}
				if (telemetryProperties.is_manual) {
					nodeGraphResult = n8n_workflow_1.TelemetryHelpers.generateNodesGraph(
						workflow,
						this.nodeTypes,
						{
							runData: runData.data.resultData?.runData,
						},
					);
					telemetryProperties.node_graph = nodeGraphResult.nodeGraph;
					telemetryProperties.node_graph_string = JSON.stringify(nodeGraphResult.nodeGraph);
					if (errorNodeName) {
						telemetryProperties.error_node_id = nodeGraphResult.nameIndices[errorNodeName];
					}
				}
			}
			if (telemetryProperties.is_manual) {
				if (!nodeGraphResult) {
					nodeGraphResult = n8n_workflow_1.TelemetryHelpers.generateNodesGraph(
						workflow,
						this.nodeTypes,
						{
							runData: runData.data.resultData?.runData,
						},
					);
				}
				let userRole = undefined;
				if (userId) {
					const role = await this.sharedWorkflowRepository.findSharingRole(userId, workflow.id);
					if (role) {
						userRole = role === 'workflow:owner' ? 'owner' : 'sharee';
					}
				}
				const manualExecEventProperties = {
					user_id: userId,
					workflow_id: workflow.id,
					status: executionStatus,
					executionStatus: runData?.status ?? 'unknown',
					error_message: telemetryProperties.error_message,
					error_node_type: telemetryProperties.error_node_type,
					node_graph_string: telemetryProperties.node_graph_string,
					error_node_id: telemetryProperties.error_node_id,
					webhook_domain: null,
					sharing_role: userRole,
					credential_type: null,
					is_managed: false,
					eval_rows_left: null,
					...n8n_workflow_1.TelemetryHelpers.resolveAIMetrics(workflow.nodes, this.nodeTypes),
					...n8n_workflow_1.TelemetryHelpers.resolveVectorStoreMetrics(
						workflow.nodes,
						this.nodeTypes,
						runData,
					),
					...n8n_workflow_1.TelemetryHelpers.extractLastExecutedNodeStructuredOutputErrorInfo(
						workflow,
						this.nodeTypes,
						runData,
					),
				};
				if (!manualExecEventProperties.node_graph_string) {
					nodeGraphResult = n8n_workflow_1.TelemetryHelpers.generateNodesGraph(
						workflow,
						this.nodeTypes,
						{
							runData: runData.data.resultData?.runData,
						},
					);
					manualExecEventProperties.node_graph_string = JSON.stringify(nodeGraphResult.nodeGraph);
				}
				nodeGraphResult?.evaluationTriggerNodeNames?.forEach((name) => {
					const rowsLeft =
						runData.data.resultData.runData[name]?.[0]?.data?.main?.[0]?.[0]?.json?._rowsLeft;
					if (typeof rowsLeft === 'number') {
						manualExecEventProperties.eval_rows_left = rowsLeft;
					}
				});
				if (runData.data.startData?.destinationNode) {
					const credentialsData =
						n8n_workflow_1.TelemetryHelpers.extractLastExecutedNodeCredentialData(runData);
					if (credentialsData) {
						manualExecEventProperties.credential_type = credentialsData.credentialType;
						const credential = await this.credentialsRepository.findOneBy({
							id: credentialsData.credentialId,
						});
						if (credential) {
							manualExecEventProperties.is_managed = credential.isManaged;
						}
					}
					const telemetryPayload = {
						...manualExecEventProperties,
						node_type: n8n_workflow_1.TelemetryHelpers.getNodeTypeForName(
							workflow,
							runData.data.startData?.destinationNode,
						)?.type,
						node_id: nodeGraphResult.nameIndices[runData.data.startData?.destinationNode],
					};
					this.telemetry.track('Manual node exec finished', telemetryPayload);
				} else {
					nodeGraphResult.webhookNodeNames.forEach((name) => {
						const execJson = runData.data.resultData.runData[name]?.[0]?.data?.main?.[0]?.[0]?.json;
						if (execJson?.headers?.origin && execJson.headers.origin !== '') {
							manualExecEventProperties.webhook_domain = (0, psl_1.get)(
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
	async serverStarted() {
		const cpus = node_os_1.default.cpus();
		const isS3Selected = this.binaryDataConfig.mode === 's3';
		const isS3Available = this.binaryDataConfig.availableModes.includes('s3');
		const isS3Licensed = this.license.isBinaryDataS3Licensed();
		const authenticationMethod = config_2.default.getEnv('userManagement.authenticationMethod');
		const info = {
			version_cli: constants_1.N8N_VERSION,
			db_type: this.globalConfig.database.type,
			n8n_version_notifications_enabled: this.globalConfig.versionNotifications.enabled,
			n8n_disable_production_main_process:
				this.globalConfig.endpoints.disableProductionWebhooksOnMainProcess,
			system_info: {
				os: {
					type: node_os_1.default.type(),
					version: node_os_1.default.version(),
				},
				memory: node_os_1.default.totalmem() / 1024,
				cpus: {
					count: cpus.length,
					model: cpus[0].model,
					speed: cpus[0].speed,
				},
				is_docker: this.instanceSettings.isDocker,
			},
			execution_variables: {
				executions_mode: config_2.default.getEnv('executions.mode'),
				executions_timeout: config_2.default.getEnv('executions.timeout'),
				executions_timeout_max: config_2.default.getEnv('executions.maxTimeout'),
				executions_data_save_on_error: config_2.default.getEnv('executions.saveDataOnError'),
				executions_data_save_on_success: config_2.default.getEnv('executions.saveDataOnSuccess'),
				executions_data_save_on_progress: config_2.default.getEnv(
					'executions.saveExecutionProgress',
				),
				executions_data_save_manual_executions: config_2.default.getEnv(
					'executions.saveDataManualExecutions',
				),
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
	sessionStarted({ pushRef }) {
		this.telemetry.track('Session started', { session_id: pushRef });
	}
	instanceStopped() {
		this.telemetry.track('User instance stopped');
	}
	async instanceOwnerSetup({ userId }) {
		this.telemetry.track('Owner finished instance setup', { user_id: userId });
	}
	firstProductionWorkflowSucceeded({ projectId, workflowId, userId }) {
		this.telemetry.track('Workflow first prod success', {
			project_id: projectId,
			workflow_id: workflowId,
			user_id: userId,
		});
	}
	firstWorkflowDataLoaded({ userId, workflowId, nodeType, nodeId, credentialType, credentialId }) {
		this.telemetry.track('Workflow first data fetched', {
			user_id: userId,
			workflow_id: workflowId,
			node_type: nodeType,
			node_id: nodeId,
			credential_type: credentialType,
			credential_id: credentialId,
		});
	}
	userChangedRole({ userId, targetUserId, targetUserNewRole, publicApi }) {
		this.telemetry.track('User changed role', {
			user_id: userId,
			target_user_id: targetUserId,
			target_user_new_role: targetUserNewRole,
			public_api: publicApi,
		});
	}
	userRetrievedUser({ userId, publicApi }) {
		this.telemetry.track('User retrieved user', {
			user_id: userId,
			public_api: publicApi,
		});
	}
	userRetrievedAllUsers({ userId, publicApi }) {
		this.telemetry.track('User retrieved all users', {
			user_id: userId,
			public_api: publicApi,
		});
	}
	userRetrievedExecution({ userId, publicApi }) {
		this.telemetry.track('User retrieved execution', {
			user_id: userId,
			public_api: publicApi,
		});
	}
	userRetrievedAllExecutions({ userId, publicApi }) {
		this.telemetry.track('User retrieved all executions', {
			user_id: userId,
			public_api: publicApi,
		});
	}
	userRetrievedWorkflow({ userId, publicApi }) {
		this.telemetry.track('User retrieved workflow', {
			user_id: userId,
			public_api: publicApi,
		});
	}
	userRetrievedAllWorkflows({ userId, publicApi }) {
		this.telemetry.track('User retrieved all workflows', {
			user_id: userId,
			public_api: publicApi,
		});
	}
	userUpdated({ user, fieldsChanged }) {
		this.telemetry.track('User changed personal settings', {
			user_id: user.id,
			fields_changed: fieldsChanged,
		});
	}
	userDeleted({
		user,
		publicApi,
		targetUserOldStatus,
		migrationStrategy,
		targetUserId,
		migrationUserId,
	}) {
		this.telemetry.track('User deleted user', {
			user_id: user.id,
			public_api: publicApi,
			target_user_old_status: targetUserOldStatus,
			migration_strategy: migrationStrategy,
			target_user_id: targetUserId,
			migration_user_id: migrationUserId,
		});
	}
	userInvited({ user, targetUserId, publicApi, emailSent, inviteeRole }) {
		this.telemetry.track('User invited new user', {
			user_id: user.id,
			target_user_id: targetUserId,
			public_api: publicApi,
			email_sent: emailSent,
			invitee_role: inviteeRole,
		});
	}
	userSignedUp({ user, userType, wasDisabledLdapUser }) {
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
	userSubmittedPersonalizationSurvey({ userId, answers }) {
		const personalizationSurveyData = { user_id: userId };
		for (const [camelCaseKey, value] of Object.entries(answers)) {
			if (value) {
				personalizationSurveyData[(0, change_case_1.snakeCase)(camelCaseKey)] = value;
			}
		}
		this.telemetry.track('User responded to personalization questions', personalizationSurveyData);
	}
	emailFailed({ user, messageType, publicApi }) {
		this.telemetry.track('Instance failed to send transactional email to user', {
			user_id: user.id,
			message_type: messageType,
			public_api: publicApi,
		});
	}
	userTransactionalEmailSent({ userId, messageType, publicApi }) {
		this.telemetry.track('User sent transactional email', {
			user_id: userId,
			message_type: messageType,
			public_api: publicApi,
		});
	}
	userInviteEmailClick({ invitee }) {
		this.telemetry.track('User clicked invite link from email', {
			user_id: invitee.id,
		});
	}
	userPasswordResetEmailClick({ user }) {
		this.telemetry.track('User clicked password reset link from email', {
			user_id: user.id,
		});
	}
	userPasswordResetRequestClick({ user }) {
		this.telemetry.track('User requested password reset while logged out', {
			user_id: user.id,
		});
	}
};
exports.TelemetryEventRelay = TelemetryEventRelay;
exports.TelemetryEventRelay = TelemetryEventRelay = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			event_service_1.EventService,
			telemetry_1.Telemetry,
			license_1.License,
			config_1.GlobalConfig,
			n8n_core_1.InstanceSettings,
			n8n_core_1.BinaryDataConfig,
			db_1.WorkflowRepository,
			node_types_1.NodeTypes,
			db_1.SharedWorkflowRepository,
			db_1.ProjectRelationRepository,
			db_1.CredentialsRepository,
		]),
	],
	TelemetryEventRelay,
);
//# sourceMappingURL=telemetry.event-relay.js.map
