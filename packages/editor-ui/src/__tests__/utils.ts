import type { ISettingsState } from '@/Interface';
import { UserManagementAuthenticationMethod } from '@/Interface';
import { render } from '@testing-library/vue';
import { PiniaVuePlugin } from 'pinia';

export const retry = (assertion: () => any, { interval = 20, timeout = 200 } = {}) => {
	return new Promise((resolve, reject) => {
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

type RenderParams = Parameters<typeof render>;
export const renderComponent = (Component: RenderParams[0], renderOptions: RenderParams[1] = {}) =>
	render(Component, renderOptions, (vue) => {
		vue.use(PiniaVuePlugin);
	});

export const waitAllPromises = () => new Promise((resolve) => setTimeout(resolve));

export const SETTINGS_STORE_DEFAULT_STATE: ISettingsState = {
	settings: {
		userActivationSurveyEnabled: false,
		allowedModules: {},
		communityNodesEnabled: false,
		defaultLocale: '',
		endpointWebhook: '',
		endpointWebhookTest: '',
		enterprise: {
			advancedExecutionFilters: false,
			sharing: false,
			ldap: false,
			saml: false,
			logStreaming: false,
		},
		executionMode: '',
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
		saveDataErrorExecution: '',
		saveDataSuccessExecution: '',
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
};
