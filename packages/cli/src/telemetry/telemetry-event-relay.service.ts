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

@Service()
export class TelemetryEventRelay {
	constructor(
		private readonly eventService: EventService,
		private readonly telemetry: Telemetry,
		private readonly license: License,
		private readonly globalConfig: GlobalConfig,
		private readonly workflowRepository: WorkflowRepository,
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
	}

	private teamProjectUpdated({ userId, role, members, projectId }: Event['team-project-updated']) {
		void this.telemetry.track('Project settings updated', {
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
		void this.telemetry.track('User deleted project', {
			user_id: userId,
			role,
			project_id: projectId,
			removal_type: removalType,
			target_project_id: targetProjectId,
		});
	}

	private teamProjectCreated({ userId, role }: Event['team-project-created']) {
		void this.telemetry.track('User created project', {
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
		void this.telemetry.track('User updated source control settings', {
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
		void this.telemetry.track('User started pull via UI', {
			workflow_updates: workflowUpdates,
			workflow_conflicts: workflowConflicts,
			cred_conflicts: credConflicts,
		});
	}

	private sourceControlUserFinishedPullUi({
		workflowUpdates,
	}: Event['source-control-user-finished-pull-ui']) {
		void this.telemetry.track('User finished pull via UI', {
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
		void this.telemetry.track('User pulled via API', {
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
		void this.telemetry.track('User started push via UI', {
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
		void this.telemetry.track('User finished push via UI', {
			workflows_eligible: workflowsEligible,
			workflows_pushed: workflowsPushed,
			creds_pushed: credsPushed,
			variables_pushed: variablesPushed,
		});
	}

	private licenseRenewalAttempted({ success }: Event['license-renewal-attempted']) {
		void this.telemetry.track('Instance attempted to refresh license', {
			success,
		});
	}

	private variableCreated() {
		void this.telemetry.track('User created variable');
	}

	private externalSecretsProviderSettingsSaved({
		userId,
		vaultType,
		isValid,
		isNew,
		errorMessage,
	}: Event['external-secrets-provider-settings-saved']) {
		void this.telemetry.track('User updated external secrets settings', {
			user_id: userId,
			vault_type: vaultType,
			is_valid: isValid,
			is_new: isNew,
			error_message: errorMessage,
		});
	}

	private publicApiInvoked({ userId, path, method, apiVersion }: Event['public-api-invoked']) {
		void this.telemetry.track('User invoked API', {
			user_id: userId,
			path,
			method,
			api_version: apiVersion,
		});
	}

	private publicApiKeyCreated(event: Event['public-api-key-created']) {
		const { user, publicApi } = event;

		void this.telemetry.track('API key created', {
			user_id: user.id,
			public_api: publicApi,
		});
	}

	private publicApiKeyDeleted(event: Event['public-api-key-deleted']) {
		const { user, publicApi } = event;

		void this.telemetry.track('API key deleted', {
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
		void this.telemetry.track('cnr package install finished', {
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
		void this.telemetry.track('cnr package updated', {
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
		void this.telemetry.track('cnr package deleted', {
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
		void this.telemetry.track('User created credentials', {
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
		void this.telemetry.track('User updated cred sharing', {
			user_id: user.id,
			credential_type: credentialType,
			credential_id: credentialId,
			user_id_sharer: userIdSharer,
			user_ids_sharees_added: userIdsShareesAdded,
			sharees_removed: shareesRemoved,
		});
	}

	private credentialsUpdated({ user, credentialId, credentialType }: Event['credentials-updated']) {
		void this.telemetry.track('User updated credentials', {
			user_id: user.id,
			credential_type: credentialType,
			credential_id: credentialId,
		});
	}

	private credentialsDeleted({ user, credentialId, credentialType }: Event['credentials-deleted']) {
		void this.telemetry.track('User deleted credentials', {
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
		void this.telemetry.track('Ldap general sync finished', {
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
		void this.telemetry.track('User updated Ldap settings', {
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
		void this.telemetry.track('Ldap login sync failed', { error });
	}

	private loginFailedDueToLdapDisabled({ userId }: Event['login-failed-due-to-ldap-disabled']) {
		void this.telemetry.track('User login failed since ldap disabled', { user_ud: userId });
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
			n8n_disable_production_main_process: config.getEnv(
				'endpoints.disableProductionWebhooksOnMainProcess',
			),
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

		void Promise.all([
			this.telemetry.identify(info),
			this.telemetry.track('Instance started', {
				...info,
				earliest_workflow_created: firstWorkflow?.createdAt,
			}),
		]);
	}
}
