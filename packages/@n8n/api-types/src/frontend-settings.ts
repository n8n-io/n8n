import type { LogLevel, WorkflowSettings } from 'n8n-workflow';

import type {
	ChatHubLLMProvider,
	ChatHubSemanticSearchSettings,
	ChatProviderSettingsDto,
} from './chat-hub';
import type { QuickConnectOption } from './quick-connect';
import type { InsightsDateRange } from './schemas/insights.schema';

export interface IVersionNotificationSettings {
	enabled: boolean;
	endpoint: string;
	whatsNewEnabled: boolean;
	whatsNewEndpoint: string;
	infoUrl: string;
}

export interface ITelemetryClientConfig {
	url: string;
	key: string;
	proxy: string;
	sourceConfig: string;
}

export interface ITelemetrySettings {
	enabled: boolean;
	config?: ITelemetryClientConfig;
}

export type AuthenticationMethod = 'email' | 'ldap' | 'saml' | 'oidc' | 'token-exchange';

export interface IUserManagementSettings {
	quota: number;
	showSetupOnFirstLoad?: boolean;
	smtpSetup: boolean;
	authenticationMethod: AuthenticationMethod;
}

export interface IEnterpriseSettings {
	sharing: boolean;
	ldap: boolean;
	saml: boolean;
	oidc: boolean;
	mfaEnforcement: boolean;
	logStreaming: boolean;
	advancedExecutionFilters: boolean;
	variables: boolean;
	sourceControl: boolean;
	auditLogs: boolean;
	externalSecrets: boolean;
	showNonProdBanner: boolean;
	debugInEditor: boolean;
	binaryDataS3: boolean;
	workerView: boolean;
	advancedPermissions: boolean;
	workflowDiffs: boolean;
	namedVersions: boolean;
	provisioning: boolean;
	projects: {
		team: {
			limit: number;
		};
	};
	customRoles: boolean;
	personalSpacePolicy: boolean;
	dataRedaction: boolean;
}

export interface FrontendSettings {
	settingsMode?: 'public' | 'authenticated';
	inE2ETests: boolean;
	isDocker: boolean;
	databaseType: 'sqlite' | 'postgresdb';
	endpointForm: string;
	endpointFormTest: string;
	endpointFormWaiting: string;
	endpointMcp: string;
	endpointMcpTest: string;
	endpointWebhook: string;
	endpointWebhookTest: string;
	endpointWebhookWaiting: string;
	endpointHealth: string;
	saveDataErrorExecution: WorkflowSettings.SaveDataExecution;
	saveDataSuccessExecution: WorkflowSettings.SaveDataExecution;
	saveManualExecutions: boolean;
	saveExecutionProgress: boolean;
	executionTimeout: number;
	maxExecutionTimeout: number;
	workflowCallerPolicyDefaultOption: WorkflowSettings.CallerPolicy;
	oauthCallbackUrls: {
		oauth1: string;
		oauth2: string;
	};
	timezone: string;
	urlBaseWebhook: string;
	urlBaseEditor: string;
	versionCli: string;
	nodeJsVersion: string;
	nodeEnv: string | undefined;
	concurrency: number;
	authCookie: {
		secure: boolean;
	};
	binaryDataMode: 'default' | 'filesystem' | 's3' | 'database';
	releaseChannel: 'stable' | 'beta' | 'nightly' | 'dev' | 'rc';
	n8nMetadata?: {
		userId?: string;
		[key: string]: string | number | undefined;
	};
	versionNotifications: IVersionNotificationSettings;
	dynamicBanners: {
		endpoint: string;
		enabled: boolean;
	};
	instanceId: string;
	telemetry: ITelemetrySettings;
	posthog: {
		enabled: boolean;
		apiHost: string;
		apiKey: string;
		autocapture: boolean;
		disableSessionRecording: boolean;
		debug: boolean;
		proxy: string;
	};
	dataTables: {
		maxSize: number;
	};
	personalizationSurveyEnabled: boolean;
	defaultLocale: string;
	userManagement: IUserManagementSettings;
	sso: {
		managedByEnv: boolean;
		saml: {
			loginLabel: string;
			loginEnabled: boolean;
		};
		oidc: {
			loginEnabled: boolean;
			loginUrl: string;
			callbackUrl: string;
		};
		ldap: {
			loginLabel: string;
			loginEnabled: boolean;
		};
	};
	publicApi: {
		enabled: boolean;
		latestVersion: number;
		path: string;
		swaggerUi: {
			enabled: boolean;
		};
	};
	workflowTagsDisabled: boolean;
	logLevel: LogLevel;
	hiringBannerEnabled: boolean;
	previewMode: boolean;
	templates: {
		enabled: boolean;
		host: string;
	};
	missingPackages?: boolean;
	executionMode: 'regular' | 'queue';
	/** Whether multi-main mode is enabled and licensed for this main instance. */
	isMultiMain: boolean;
	pushBackend: 'sse' | 'websocket';
	communityNodesEnabled: boolean;
	unverifiedCommunityNodesEnabled: boolean;
	aiAssistant: {
		enabled: boolean;
		setup: boolean;
	};
	askAi: {
		enabled: boolean;
	};
	aiBuilder: {
		enabled: boolean;
		setup: boolean;
	};
	deployment: {
		type: string;
	};
	allowedModules: {
		builtIn?: string[];
		external?: string[];
	};
	enterprise: IEnterpriseSettings;
	hideUsagePage: boolean;
	license: {
		planName?: string;
		consumerId: string;
		environment: 'development' | 'production' | 'staging';
	};
	variables: {
		limit: number;
	};
	mfa: {
		enabled: boolean;
		enforced: boolean;
	};
	folders: {
		enabled: boolean;
	};
	banners: {
		dismissed: string[];
	};
	workflowHistory: {
		pruneTime: number;
		licensePruneTime: number;
	};
	aiCredits: {
		enabled: boolean;
		credits: number;
		setup: boolean;
	};
	aiGateway?: {
		enabled: boolean;
		budget: number;
	};
	ai: {
		allowSendingParameterValues: boolean;
	};
	pruning?: {
		isEnabled: boolean;
		maxAge: number;
		maxCount: number;
	};
	security: {
		blockFileAccessToN8nFiles: boolean;
	};
	easyAIWorkflowOnboarded: boolean;
	evaluation: {
		quota: number;
	};

	/** Backend modules that were initialized during startup. */
	activeModules: string[];
	canvasOnly: boolean;
	envFeatureFlags: N8nEnvFeatFlags;
}

export type FrontendModuleSettings = {
	/**
	 * Client settings for [insights](https://docs.n8n.io/insights/) module.
	 *
	 * - `summary`: Whether the summary banner should be shown.
	 * - `dashboard`: Whether the full dashboard should be shown.
	 * - `dateRanges`: Date range filters available to select.
	 */
	insights?: {
		summary: boolean;
		dashboard: boolean;
		dateRanges: InsightsDateRange[];
	};

	/**
	 * Client settings for MCP module.
	 */
	mcp?: {
		/** Whether MCP access is enabled in the instance. */
		mcpAccessEnabled: boolean;
	};

	/**
	 * Client settings for Chat module.
	 */
	'chat-hub'?: {
		enabled: boolean;
		providers: Record<ChatHubLLMProvider, ChatProviderSettingsDto>;
		semanticSearch: ChatHubSemanticSearchSettings;
		agentUploadMaxSizeMb: number;
	};

	/**
	 * Client settings for instance AI module.
	 */
	'instance-ai'?: {
		enabled: boolean;
		localGatewayDisabled: boolean;
		proxyEnabled: boolean;
		optinModalDismissed: boolean;
	};

	/**
	 * Quick connect settings
	 */
	'quick-connect'?: {
		options: QuickConnectOption[];
	};

	/**
	 * Client settings for external secrets module.
	 */
	'external-secrets'?: {
		/** Whether multiple connections per vault type are enabled. */
		multipleConnections: boolean;
		/** Whether project-scoped external secrets are enabled. */
		forProjects: boolean;
		/** Whether role-based access control for external secrets is enabled. */
		roleBasedAccess: boolean;
		/** Whether system roles (admin, editor) have external secrets scopes. */
		systemRolesEnabled: boolean;
	};
};

export type N8nEnvFeatFlagValue = boolean | string | number | undefined;
export type N8nEnvFeatFlags = Record<`N8N_ENV_FEAT_${Uppercase<string>}`, N8nEnvFeatFlagValue>;
