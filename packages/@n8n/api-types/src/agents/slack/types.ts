export interface CreateSlackAgentAppResponse {
	appId: string;
	installUrl: string;
}

export interface SlackManagerCredentialSummary {
	id: string;
	name: string;
	connected: boolean;
	reconnectRequired: boolean;
	workspaces: SlackManagedWorkspaceSummary[];
}

export interface SlackManagedWorkspaceSummary {
	id: string;
	name: string;
	enterpriseId?: string;
	managedAppId?: string;
	botCredentialId?: string;
	connected: boolean;
}

export interface SlackManagedSetupState {
	managedSetupAvailable: boolean;
	managerCredentials: SlackManagerCredentialSummary[];
}

export interface SlackManagedAppSettings {
	credentialId: string;
	appId: string;
	name: string;
	description: string;
	alwaysOnline: boolean;
	appHomeUrl: string;
}

export type SlackManagedAppSettingsErrorCode = 'service_limits_exceeded';

export type SlackApiErrorMeta = {
	integrationType: 'slack';
	code: string;
};

export interface CreateSlackManagerCredentialResponse {
	id: string;
	name: string;
	type: 'slackManagerOAuth2Api';
	isResolvable: false;
}

export type InstallSlackManagedAppResponse =
	| {
			status: 'connected';
			appId: string;
			credentialId: string;
	  }
	| {
			status: 'manual_install_required';
			appId: string;
			installUrl: string;
	  };

export interface SlackAgentAppManifest {
	display_information: {
		name: string;
		description?: string;
	};
	features: {
		agent_view: {
			agent_description: string;
		};
		app_home: {
			home_tab_enabled: boolean;
			messages_tab_enabled: boolean;
			messages_tab_read_only_enabled: boolean;
		};
		bot_user: {
			display_name: string;
			always_online: boolean;
		};
	};
	oauth_config: {
		redirect_urls?: string[];
		scopes: {
			bot: string[];
		};
	};
	settings: {
		event_subscriptions: {
			request_url: string;
			bot_events: string[];
		};
		interactivity: {
			is_enabled: boolean;
			request_url: string;
		};
		org_deploy_enabled: boolean;
		socket_mode_enabled: boolean;
		token_rotation_enabled: boolean;
		managed_app_settings?: {
			is_install_from_slack_disabled: boolean;
			external_app_management_url: string;
		};
	};
}

export interface SlackAgentAppManifestResponse {
	manifest: SlackAgentAppManifest;
}
