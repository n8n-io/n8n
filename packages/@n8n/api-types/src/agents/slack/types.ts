export interface CreateSlackAgentAppResponse {
	appId: string;
	installUrl: string;
}

export interface SlackAgentAppManifest {
	display_information: {
		name: string;
	};
	features: {
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
	};
}

export interface SlackAgentAppManifestResponse {
	manifest: SlackAgentAppManifest;
}
