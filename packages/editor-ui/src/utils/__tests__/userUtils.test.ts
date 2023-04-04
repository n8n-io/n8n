import { beforeAll } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { isAuthorized } from '@/utils';
import { useSettingsStore } from '@/stores/settings';
import { useSSOStore } from '@/stores/sso';
import { IN8nUISettings, IUser, UserManagementAuthenticationMethod } from '@/Interface';
import { routes } from '@/router';
import { VIEWS } from '@/constants';

const DEFAULT_SETTINGS: IN8nUISettings = {
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
};

const DEFAULT_USER: IUser = {
	id: '1',
	isPending: false,
	isDefaultUser: true,
	isOwner: false,
	isPendingUser: false,
	globalRole: {
		name: 'default',
		id: '1',
		createdAt: new Date(),
	},
};

describe('userUtils', () => {
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let ssoStore: ReturnType<typeof useSSOStore>;

	describe('isAuthorized', () => {
		beforeAll(() => {
			setActivePinia(createPinia());
			settingsStore = useSettingsStore();
			ssoStore = useSSOStore();
		});

		it('should check SSO settings route permissions', () => {
			const ssoSettingsPermissions = routes
				.find((route) => route.path.startsWith('/settings'))
				?.children?.find((route) => route.name === VIEWS.SSO_SETTINGS)?.meta?.permissions;

			const user: IUser = {
				...DEFAULT_USER,
				isDefaultUser: false,
				isOwner: true,
				globalRole: {
					...DEFAULT_USER.globalRole,
					id: '1',
					name: 'owner',
					createdAt: new Date(),
				},
			};

			settingsStore.setSettings({
				...DEFAULT_SETTINGS,
				enterprise: { ...DEFAULT_SETTINGS.enterprise, saml: true },
			});

			expect(isAuthorized(ssoSettingsPermissions, user)).toBe(true);
		});
	});
});
