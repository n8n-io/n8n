import type { FrontendSettings } from '@n8n/api-types';
import { useSettingsStore } from './settings.store';
import { createPinia, setActivePinia } from 'pinia';

const { getSettings } = vi.hoisted(() => ({
	getSettings: vi.fn(),
}));

const { sessionStarted } = vi.hoisted(() => ({
	sessionStarted: vi.fn(),
}));

vi.mock('@/api/settings', () => ({
	getSettings,
}));

vi.mock('@/api/events', () => ({
	sessionStarted,
}));

vi.mock('@/stores/root.store', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: {},
		setVersionCli: vi.fn(),
	})),
}));

vi.mock('@/stores/root.store', () => ({
	useRootStore: vi.fn(() => ({
		setUrlBaseWebhook: vi.fn(),
		setUrlBaseEditor: vi.fn(),
		setEndpointForm: vi.fn(),
		setEndpointFormTest: vi.fn(),
		setEndpointFormWaiting: vi.fn(),
		setEndpointWebhook: vi.fn(),
		setEndpointWebhookTest: vi.fn(),
		setEndpointWebhookWaiting: vi.fn(),
		setTimezone: vi.fn(),
		setExecutionTimeout: vi.fn(),
		setMaxExecutionTimeout: vi.fn(),
		setInstanceId: vi.fn(),
		setOauthCallbackUrls: vi.fn(),
		setN8nMetadata: vi.fn(),
		setDefaultLocale: vi.fn(),
		setBinaryDataMode: vi.fn(),
		setVersionCli: vi.fn(),
	})),
}));

vi.mock('@/stores/versions.store', () => ({
	useVersionsStore: vi.fn(() => ({
		setVersionNotificationSettings: vi.fn(),
	})),
}));

const mockSettings: FrontendSettings = {
	isDocker: true,
	databaseType: 'postgresdb',
	endpointForm: '/form',
	endpointFormTest: '/form-test',
	endpointFormWaiting: '/form-waiting',
	endpointWebhook: '/webhook',
	endpointWebhookTest: '/webhook-test',
	endpointWebhookWaiting: '/webhook-waiting',
	saveDataErrorExecution: 'all',
	saveDataSuccessExecution: 'none',
	saveManualExecutions: true,
	saveExecutionProgress: true,
	executionTimeout: 3600,
	maxExecutionTimeout: 7200,
	workflowCallerPolicyDefaultOption: 'any',
	oauthCallbackUrls: {
		oauth1: '/oauth1-callback',
		oauth2: '/oauth2-callback',
	},
	timezone: 'UTC',
	urlBaseWebhook: 'https://example.com/webhook',
	urlBaseEditor: 'https://example.com/editor',
	versionCli: '1.0.0',
	nodeJsVersion: '14.17.0',
	concurrency: 10,
	authCookie: {
		secure: true,
	},
	binaryDataMode: 'filesystem',
	releaseChannel: 'stable',
	n8nMetadata: {
		userId: '123',
	},
	versionNotifications: {
		enabled: true,
		endpoint: '/version',
		infoUrl: 'https://example.com/info',
	},
	instanceId: 'test-instance-id',
	telemetry: {
		enabled: true,
		config: {
			url: 'https://telemetry.example.com',
			key: 'telemetry-key',
		},
	},
	posthog: {
		enabled: true,
		apiHost: 'https://api.posthog.com',
		apiKey: 'posthog-key',
		autocapture: true,
		disableSessionRecording: false,
		debug: false,
	},
	personalizationSurveyEnabled: true,
	defaultLocale: 'en',
	userManagement: {
		quota: 100,
		showSetupOnFirstLoad: false,
		smtpSetup: true,
		authenticationMethod: 'email',
	},
	sso: {
		saml: {
			loginLabel: 'SAML Login',
			loginEnabled: false,
		},
		ldap: {
			loginLabel: 'LDAP Login',
			loginEnabled: true,
		},
	},
	publicApi: {
		enabled: true,
		latestVersion: 1,
		path: '/api',
		swaggerUi: {
			enabled: true,
		},
	},
	workflowTagsDisabled: false,
	logLevel: 'debug',
	hiringBannerEnabled: true,
	previewMode: false,
	templates: {
		enabled: true,
		host: 'https://templates.example.com',
	},
	missingPackages: false,
	executionMode: 'queue',
	pushBackend: 'sse',
	communityNodesEnabled: true,
	aiAssistant: {
		enabled: false,
	},
	askAi: {
		enabled: false,
	},
	deployment: {
		type: 'cloud',
	},
	allowedModules: {
		builtIn: ['n8n-nodes-base'],
		external: ['n8n-nodes-custom'],
	},
	enterprise: {
		sharing: true,
		ldap: true,
		saml: true,
		logStreaming: true,
		advancedExecutionFilters: true,
		variables: true,
		sourceControl: false,
		auditLogs: true,
		externalSecrets: true,
		showNonProdBanner: false,
		debugInEditor: true,
		binaryDataS3: false,
		workflowHistory: true,
		workerView: true,
		advancedPermissions: true,
		projects: {
			team: {
				limit: 10,
			},
		},
	},
	hideUsagePage: false,
	license: {
		planName: 'Community',
		consumerId: 'consumer-123',
		environment: 'production',
	},
	variables: {
		limit: 100,
	},
	expressions: {
		evaluator: 'tournament',
	},
	mfa: {
		enabled: true,
	},
	banners: {
		dismissed: ['V1', 'V2'],
	},
	workflowHistory: {
		pruneTime: 30,
		licensePruneTime: 60,
	},
	pruning: {
		isEnabled: true,
		maxAge: 30,
		maxCount: 1000,
	},
	security: {
		blockFileAccessToN8nFiles: true,
	},
};

describe('settings.store', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		setActivePinia(createPinia());
	});

	describe('getSettings', () => {
		it('should fetch settings and call sessionStarted if telemetry is enabled', async () => {
			const settingsStore = useSettingsStore();

			getSettings.mockResolvedValueOnce({
				...mockSettings,
				telemetry: {
					enabled: true,
					config: {
						url: 'https://telemetry.example.com',
						key: 'telemetry-key',
					},
				},
			});

			await settingsStore.getSettings();
			expect(getSettings).toHaveBeenCalled();
			expect(sessionStarted).toHaveBeenCalled();
		});
	});

	it('should fetch settings and skip calling sessionStarted if telemetry is disabled', async () => {
		const settingsStore = useSettingsStore();

		getSettings.mockResolvedValueOnce({
			...mockSettings,
			telemetry: {
				enabled: false,
			},
		});

		await settingsStore.getSettings();
		expect(getSettings).toHaveBeenCalled();
		expect(sessionStarted).not.toHaveBeenCalled();
	});
});
