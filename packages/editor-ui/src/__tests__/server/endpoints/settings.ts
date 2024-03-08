import type { Server } from 'miragejs';
import { Response } from 'miragejs';
import type { AppSchema } from '../types';
import type { IN8nUISettings } from 'n8n-workflow';

const defaultSettings: IN8nUISettings = {
	allowedModules: {},
	communityNodesEnabled: false,
	defaultLocale: '',
	endpointForm: '',
	endpointFormTest: '',
	endpointFormWaiting: '',
	endpointWebhook: '',
	endpointWebhookTest: '',
	enterprise: {
		sharing: false,
		ldap: false,
		saml: false,
		logStreaming: false,
		debugInEditor: false,
		advancedExecutionFilters: false,
		variables: true,
		sourceControl: false,
		auditLogs: false,
		showNonProdBanner: false,
		workflowHistory: false,
		debugInEditor: false,
		binaryDataS3: false,
		externalSecrets: false,
		workerView: false,
	},
	expressions: {
		evaluator: 'tournament',
	},
	executionMode: 'regular',
	executionTimeout: 0,
	hideUsagePage: false,
	hiringBannerEnabled: false,
	instanceId: '',
	isNpmAvailable: false,
	license: { environment: 'development' },
	logLevel: 'info',
	maxExecutionTimeout: 0,
	oauthCallbackUrls: { oauth1: '', oauth2: '' },
	onboardingCallPromptEnabled: false,
	personalizationSurveyEnabled: false,
	releaseChannel: 'stable',
	posthog: {
		apiHost: '',
		apiKey: '',
		autocapture: false,
		debug: false,
		disableSessionRecording: false,
		enabled: false,
	},
	publicApi: { enabled: false, latestVersion: 0, path: '', swaggerUi: { enabled: false } },
	pushBackend: 'websocket',
	releaseChannel: 'stable',
	saveDataErrorExecution: 'DEFAULT',
	saveDataSuccessExecution: 'DEFAULT',
	saveManualExecutions: false,
	sso: {
		ldap: { loginEnabled: false, loginLabel: '' },
		saml: { loginEnabled: false, loginLabel: '' },
	},
	telemetry: {
		enabled: false,
	},
	templates: { enabled: false, host: '' },
	timezone: '',
	urlBaseEditor: '',
	urlBaseWebhook: '',
	userManagement: {
		showSetupOnFirstLoad: false,
		smtpSetup: true,
		authenticationMethod: 'email',
	},
	versionCli: '',
	versionNotifications: {
		enabled: true,
		endpoint: '',
		infoUrl: '',
	},
	workflowCallerPolicyDefaultOption: 'any',
	workflowTagsDisabled: false,
	variables: {
		limit: -1,
	},
	deployment: {
		type: 'default',
	},
	banners: {
		dismissed: [],
	},
	binaryDataMode: 'default',
};

export function routesForSettings(server: Server) {
	server.get('/rest/settings', (schema: AppSchema) => {
		return new Response(
			200,
			{},
			{
				data: defaultSettings,
			},
		);
	});
}
