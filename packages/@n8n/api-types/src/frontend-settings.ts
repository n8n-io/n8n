import type { LogLevel, WorkflowSettings } from 'n8n-workflow';

import { type InsightsDateRange } from './schemas/insights.schema';

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
}

export interface ITelemetrySettings {
	enabled: boolean;
	config?: ITelemetryClientConfig;
}

export type AuthenticationMethod = 'email' | 'ldap' | 'saml' | 'oidc';

export interface IUserManagementSettings {
	quota: number;
	showSetupOnFirstLoad?: boolean;
	smtpSetup: boolean;
	authenticationMethod: AuthenticationMethod;
}

export interface FrontendSettings {
	inE2ETests: boolean;
	isDocker: boolean;
	databaseType: 'sqlite' | 'mariadb' | 'mysqldb' | 'postgresdb';
	endpointForm: string;
	endpointFormTest: string;
	endpointFormWaiting: string;
	endpointMcp: string;
	endpointMcpTest: string;
	endpointWebhook: string;
	endpointWebhookTest: string;
	endpointWebhookWaiting: string;
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
	concurrency: number;
	authCookie: {
		secure: boolean;
	};
	binaryDataMode: 'default' | 'filesystem' | 's3';
	releaseChannel: 'stable' | 'beta' | 'nightly' | 'dev';
	n8nMetadata?: {
		userId?: string;
		[key: string]: string | number | undefined;
	};
	versionNotifications: IVersionNotificationSettings;
	instanceId: string;
	telemetry: ITelemetrySettings;
	posthog: {
		enabled: boolean;
		apiHost: string;
		apiKey: string;
		autocapture: boolean;
		disableSessionRecording: boolean;
		debug: boolean;
	};
	personalizationSurveyEnabled: boolean;
	defaultLocale: string;
	userManagement: IUserManagementSettings;
	sso: {
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
	};
	askAi: {
		enabled: boolean;
	};
	deployment: {
		type: string;
	};
	allowedModules: {
		builtIn?: string[];
		external?: string[];
	};
	enterprise: {
		sharing: boolean;
		ldap: boolean;
		saml: boolean;
		oidc: boolean;
		logStreaming: boolean;
		advancedExecutionFilters: boolean;
		variables: boolean;
		sourceControl: boolean;
		auditLogs: boolean;
		externalSecrets: boolean;
		showNonProdBanner: boolean;
		debugInEditor: boolean;
		binaryDataS3: boolean;
		workflowHistory: boolean;
		workerView: boolean;
		advancedPermissions: boolean;
		apiKeyScopes: boolean;
		projects: {
			team: {
				limit: number;
			};
		};
	};
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
	partialExecution: {
		version: 1 | 2;
	};
	evaluation: {
		quota: number;
	};

	/** Backend modules that were initialized during startup. */
	activeModules: string[];
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
};
