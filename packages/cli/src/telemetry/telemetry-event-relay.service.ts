import { Service } from 'typedi';
import { EventService } from '@/eventbus/event.service';
import type { Event } from '@/eventbus/event.types';
import { Telemetry } from '.';
import config from '@/config';

@Service()
export class TelemetryEventRelay {
	constructor(
		private readonly eventService: EventService,
		private readonly telemetry: Telemetry,
	) {}

	async init() {
		if (!config.getEnv('diagnostics.enabled')) return;

		await this.telemetry.init();

		this.setupHandlers();
	}

	private setupHandlers() {
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
}
