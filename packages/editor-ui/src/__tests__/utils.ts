import type { ISettingsState } from '@/Interface';
import { UserManagementAuthenticationMethod } from '@/Interface';

export const retry = async (
	assertion: () => ReturnType<typeof expect>,
	{ interval = 20, timeout = 1000 } = {},
) => {
	return await new Promise((resolve, reject) => {
		const startTime = Date.now();

		const tryAgain = () => {
			setTimeout(() => {
				try {
					resolve(assertion());
				} catch (err) {
					Date.now() - startTime > timeout ? reject(err) : tryAgain();
				}
			}, interval);
		};

		tryAgain();
	});
};

export const waitAllPromises = async () => await new Promise((resolve) => setTimeout(resolve));

export const SETTINGS_STORE_DEFAULT_STATE: ISettingsState = {
	settings: {
		allowedModules: {},
		communityNodesEnabled: false,
		defaultLocale: '',
		endpointForm: '',
		endpointFormTest: '',
		endpointFormWaiting: '',
		endpointWebhook: '',
		endpointWebhookTest: '',
		enterprise: {
			advancedExecutionFilters: false,
			sharing: false,
			ldap: false,
			saml: false,
			logStreaming: false,
			variables: false,
			sourceControl: false,
			auditLogs: false,
		},
		executionMode: 'regular',
		executionTimeout: 0,
		hideUsagePage: false,
		hiringBannerEnabled: false,
		instanceId: '',
		isNpmAvailable: false,
		license: { environment: 'production' },
		logLevel: 'info',
		maxExecutionTimeout: 0,
		oauthCallbackUrls: { oauth1: '', oauth2: '' },
		onboardingCallPromptEnabled: false,
		personalizationSurveyEnabled: false,
		posthog: {
			apiHost: '',
			apiKey: '',
			autocapture: false,
			debug: false,
			disableSessionRecording: false,
			enabled: false,
		},
		publicApi: { enabled: false, latestVersion: 0, path: '', swaggerUi: { enabled: false } },
		pushBackend: 'sse',
		saveDataErrorExecution: 'all',
		saveDataSuccessExecution: 'all',
		saveManualExecutions: false,
		sso: {
			ldap: { loginEnabled: false, loginLabel: '' },
			saml: { loginEnabled: false, loginLabel: '' },
		},
		telemetry: { enabled: false },
		templates: { enabled: false, host: '' },
		timezone: '',
		urlBaseEditor: '',
		urlBaseWebhook: '',
		userManagement: {
			enabled: false,
			smtpSetup: false,
			authenticationMethod: UserManagementAuthenticationMethod.Email,
		},
		versionCli: '',
		versionNotifications: {
			enabled: false,
			endpoint: '',
			infoUrl: '',
		},
		workflowCallerPolicyDefaultOption: 'any',
		workflowTagsDisabled: false,
		deployment: {
			type: 'default',
		},
		variables: {
			limit: 100,
		},
		expressions: {
			evaluator: 'tournament',
		},
		banners: {
			dismissed: [],
		},
		ai: {
			enabled: false,
		},
		workflowHistory: {
			pruneTime: -1,
			licensePruneTime: -1,
		},
	},
	promptsData: {
		message: '',
		title: '',
		showContactPrompt: false,
		showValueSurvey: false,
	},
	userManagement: {
		enabled: false,
		showSetupOnFirstLoad: false,
		smtpSetup: false,
		authenticationMethod: UserManagementAuthenticationMethod.Email,
	},
	templatesEndpointHealthy: false,
	api: {
		enabled: false,
		latestVersion: 0,
		path: '/',
		swaggerUi: {
			enabled: false,
		},
	},
	ldap: {
		loginLabel: '',
		loginEnabled: false,
	},
	saml: {
		loginLabel: '',
		loginEnabled: false,
	},
	onboardingCallPromptEnabled: false,
	saveDataErrorExecution: 'all',
	saveDataSuccessExecution: 'all',
	saveManualExecutions: false,
	binaryDataMode: 'default',
};
