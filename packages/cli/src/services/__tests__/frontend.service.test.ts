import { N8N_VERSION } from '@/constants';
import type { LicenseState, Logger, ModuleRegistry } from '@n8n/backend-common';
import type { GlobalConfig, SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { BinaryDataConfig, InstanceSettings } from 'n8n-core';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsOverwrites } from '@/credentials-overwrites';
import type { License } from '@/license';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { MfaService } from '@/mfa/mfa.service';
import { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';
import type { PushConfig } from '@/push/push.config';
import { FrontendService, type PublicFrontendSettings } from '@/services/frontend.service';
import type { UrlService } from '@/services/url.service';
import type { UserManagementMailer } from '@/user-management/email';

describe('FrontendService', () => {
	let originalEnv: NodeJS.ProcessEnv;
	const globalConfig = mock<GlobalConfig>({
		database: { type: 'sqlite' },
		endpoints: { rest: 'rest' },
		diagnostics: { enabled: false },
		templates: { enabled: false, host: '' },
		nodes: {},
		tags: { disabled: false },
		logging: { level: 'info' },
		hiringBanner: { enabled: false },
		versionNotifications: {
			enabled: false,
			endpoint: '',
			whatsNewEnabled: false,
			whatsNewEndpoint: '',
			infoUrl: '',
		},
		personalization: { enabled: false },
		defaultLocale: 'en',
		auth: { cookie: { secure: false } },
		generic: { releaseChannel: 'stable', timezone: 'UTC' },
		publicApi: { path: 'api', swaggerUiDisabled: false },
		workflows: { callerPolicyDefaultOption: 'workflowsFromSameOwner' },
		executions: { pruneData: false, pruneDataMaxAge: 336, pruneDataMaxCount: 10000 },
		hideUsagePage: false,
		license: { tenantId: 1 },
		mfa: { enabled: false },
		deployment: { type: 'default' },
		workflowHistory: { enabled: false },
		path: '',
		sso: {
			ldap: { loginEnabled: false },
			saml: { loginEnabled: false },
			oidc: { loginEnabled: false },
		},
	});

	const instanceSettings = mock<InstanceSettings>({
		isDocker: false,
		instanceId: 'test-instance',
		isMultiMain: false,
		hostId: 'test-host',
		staticCacheDir: '/tmp/test-cache',
	});

	const logger = mock<Logger>();

	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>({
		addPostProcessor: jest.fn(),
		types: {
			credentials: [],
			nodes: [],
		},
	});

	const binaryDataConfig = mock<BinaryDataConfig>({
		mode: 'default',
		availableModes: ['default'],
	});

	const credentialTypes = mock<CredentialTypes>({
		getParentTypes: jest.fn().mockReturnValue([]),
	});

	const credentialsOverwrites = mock<CredentialsOverwrites>({
		getAll: jest.fn().mockReturnValue({}),
	});

	const license = mock<License>({
		getUsersLimit: jest.fn().mockReturnValue(100),
		getPlanName: jest.fn().mockReturnValue('Community'),
		getConsumerId: jest.fn().mockReturnValue('test-consumer'),
		isSharingEnabled: jest.fn().mockReturnValue(false),
		isLogStreamingEnabled: jest.fn().mockReturnValue(false),
		isLdapEnabled: jest.fn().mockReturnValue(false),
		isSamlEnabled: jest.fn().mockReturnValue(false),
		isAdvancedExecutionFiltersEnabled: jest.fn().mockReturnValue(false),
		isVariablesEnabled: jest.fn().mockReturnValue(false),
		isSourceControlLicensed: jest.fn().mockReturnValue(false),
		isExternalSecretsEnabled: jest.fn().mockReturnValue(false),
		isLicensed: jest.fn().mockReturnValue(false),
		isDebugInEditorLicensed: jest.fn().mockReturnValue(false),
		isWorkflowHistoryLicensed: jest.fn().mockReturnValue(false),
		isWorkerViewLicensed: jest.fn().mockReturnValue(false),
		isAdvancedPermissionsLicensed: jest.fn().mockReturnValue(false),
		isApiKeyScopesEnabled: jest.fn().mockReturnValue(false),
		getVariablesLimit: jest.fn().mockReturnValue(0),
		getTeamProjectLimit: jest.fn().mockReturnValue(0),
		isBinaryDataS3Licensed: jest.fn().mockReturnValue(false),
		isAiAssistantEnabled: jest.fn().mockReturnValue(false),
		isAskAiEnabled: jest.fn().mockReturnValue(false),
		isAiCreditsEnabled: jest.fn().mockReturnValue(false),
		getAiCredits: jest.fn().mockReturnValue(0),
		isFoldersEnabled: jest.fn().mockReturnValue(false),
	});

	const mailer = mock<UserManagementMailer>({
		isEmailSetUp: false,
	});

	const urlService = mock<UrlService>({
		getInstanceBaseUrl: jest.fn().mockReturnValue('http://localhost:5678'),
		getWebhookBaseUrl: jest.fn().mockReturnValue('http://localhost:5678'),
	});

	const securityConfig = mock<SecurityConfig>({
		blockFileAccessToN8nFiles: false,
	});

	const pushConfig = mock<PushConfig>({
		backend: 'websocket',
	});

	const licenseState = mock<LicenseState>({
		isOidcLicensed: jest.fn().mockReturnValue(false),
		isMFAEnforcementLicensed: jest.fn().mockReturnValue(false),
		getMaxWorkflowsWithEvaluations: jest.fn().mockReturnValue(0),
	});

	const moduleRegistry = mock<ModuleRegistry>({
		getActiveModules: jest.fn().mockReturnValue([]),
	});

	const mfaService = mock<MfaService>({
		isMFAEnforced: jest.fn().mockReturnValue(false),
	});

	const createMockService = () => {
		Container.set(
			CommunityPackagesConfig,
			mock<CommunityPackagesConfig>({
				enabled: false,
			}),
		);

		return {
			service: new FrontendService(
				globalConfig,
				logger,
				loadNodesAndCredentials,
				credentialTypes,
				credentialsOverwrites,
				license,
				mailer,
				instanceSettings,
				urlService,
				securityConfig,
				pushConfig,
				binaryDataConfig,
				licenseState,
				moduleRegistry,
				mfaService,
			),
			license,
		};
	};

	beforeEach(() => {
		originalEnv = process.env;
		jest.clearAllMocks();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('getSettings', () => {
		it('should return frontend settings', () => {
			const { service } = createMockService();
			const settings = service.getSettings();

			expect(settings).toEqual(
				expect.objectContaining({
					settingsMode: 'authenticated',
				}),
			);
		});
	});

	describe('getPublicSettings', () => {
		it('should return public settings', () => {
			const expectedPublicSettings: PublicFrontendSettings = {
				settingsMode: 'public',
				instanceId: instanceSettings.instanceId,
				defaultLocale: globalConfig.defaultLocale,
				versionCli: N8N_VERSION,
				releaseChannel: globalConfig.generic.releaseChannel,
				versionNotifications: {
					enabled: globalConfig.versionNotifications.enabled,
					endpoint: globalConfig.versionNotifications.endpoint,
					whatsNewEnabled: globalConfig.versionNotifications.whatsNewEnabled,
					whatsNewEndpoint: globalConfig.versionNotifications.whatsNewEndpoint,
					infoUrl: globalConfig.versionNotifications.infoUrl,
				},
				userManagement: {
					quota: 100,
					smtpSetup: false,
					showSetupOnFirstLoad: true,
					authenticationMethod: 'email',
				},
				sso: {
					saml: { loginEnabled: false, loginLabel: '' },
					ldap: { loginEnabled: false, loginLabel: '' },
					oidc: {
						loginEnabled: false,
						loginUrl: 'http://localhost:5678/rest/sso/oidc/login',
						callbackUrl: 'http://localhost:5678/rest/sso/oidc/callback',
					},
				},
				mfa: { enabled: false, enforced: false },
				authCookie: { secure: false },
				oauthCallbackUrls: {
					oauth1: 'http://localhost:5678/rest/oauth1-credential/callback',
					oauth2: 'http://localhost:5678/rest/oauth2-credential/callback',
				},
				banners: { dismissed: [] },
				previewMode: false,
				telemetry: { enabled: false },
				enterprise: { saml: false, ldap: false, oidc: false, showNonProdBanner: false },
			};

			const { service } = createMockService();
			const settings = service.getPublicSettings();

			expect(settings).toEqual(expectedPublicSettings);
		});
	});

	describe('envFeatureFlags functionality', () => {
		describe('collectEnvFeatureFlags', () => {
			it('should collect environment variables with N8N_ENV_FEAT_ prefix', () => {
				process.env = {
					N8N_ENV_FEAT_TEST_FLAG: 'true',
					N8N_ENV_FEAT_ANOTHER_FLAG: 'false',
					N8N_ENV_FEAT_NUMERIC_FLAG: '123',
					REGULAR_ENV_VAR: 'should-not-be-included',
					N8N_OTHER_PREFIX: 'should-not-be-included',
				};

				const { service } = createMockService();
				const collectEnvFeatureFlags = (service as any).collectEnvFeatureFlags.bind(service);
				const result = collectEnvFeatureFlags();

				expect(result).toEqual({
					N8N_ENV_FEAT_TEST_FLAG: 'true',
					N8N_ENV_FEAT_ANOTHER_FLAG: 'false',
					N8N_ENV_FEAT_NUMERIC_FLAG: '123',
				});
			});

			it('should return empty object when no N8N_ENV_FEAT_ variables are set', () => {
				process.env = {
					REGULAR_ENV_VAR: 'value',
					N8N_OTHER_PREFIX: 'value',
				};

				const { service } = createMockService();
				const collectEnvFeatureFlags = (service as any).collectEnvFeatureFlags.bind(service);
				const result = collectEnvFeatureFlags();

				expect(result).toEqual({});
			});

			it('should filter out undefined environment variable values', () => {
				process.env = {
					N8N_ENV_FEAT_DEFINED_FLAG: 'true',
					N8N_ENV_FEAT_UNDEFINED_FLAG: undefined,
				};

				const { service } = createMockService();
				const collectEnvFeatureFlags = (service as any).collectEnvFeatureFlags.bind(service);
				const result = collectEnvFeatureFlags();

				expect(result).toEqual({
					N8N_ENV_FEAT_DEFINED_FLAG: 'true',
					// N8N_ENV_FEAT_UNDEFINED_FLAG should be filtered out
				});
			});
		});

		describe('settings integration', () => {
			it('should include envFeatureFlags in initial settings', () => {
				process.env = {
					N8N_ENV_FEAT_INIT_FLAG: 'true',
					N8N_ENV_FEAT_ANOTHER_FLAG: 'false',
				};

				const { service } = createMockService();

				expect(service.settings.envFeatureFlags).toEqual({
					N8N_ENV_FEAT_INIT_FLAG: 'true',
					N8N_ENV_FEAT_ANOTHER_FLAG: 'false',
				});
			});

			it('should refresh envFeatureFlags when getSettings is called', () => {
				process.env = {
					N8N_ENV_FEAT_INITIAL_FLAG: 'true',
				};

				const { service } = createMockService();

				// Verify initial state
				expect(service.settings.envFeatureFlags).toEqual({
					N8N_ENV_FEAT_INITIAL_FLAG: 'true',
				});

				// Change environment
				process.env = {
					N8N_ENV_FEAT_INITIAL_FLAG: 'false',
					N8N_ENV_FEAT_NEW_FLAG: 'true',
				};

				// getSettings should refresh the flags
				const settings = service.getSettings();

				expect(settings.envFeatureFlags).toEqual({
					N8N_ENV_FEAT_INITIAL_FLAG: 'false',
					N8N_ENV_FEAT_NEW_FLAG: 'true',
				});
			});
		});
	});

	describe('aiBuilder setting', () => {
		it('should initialize aiBuilder setting as disabled by default', () => {
			const { service } = createMockService();

			expect(service.settings.aiBuilder).toEqual({
				enabled: false,
				setup: false,
			});
		});

		it('should set aiBuilder.enabled to true when license has feat:aiBuilder', () => {
			const { service, license } = createMockService();

			license.isLicensed.mockImplementation((feature) => {
				return feature === 'feat:aiBuilder';
			});

			const settings = service.getSettings();

			expect(settings.aiBuilder.enabled).toBe(true);
		});

		it('should keep aiBuilder.enabled as false when license does not have feat:aiBuilder', () => {
			const { service, license } = createMockService();

			license.isLicensed.mockReturnValue(false);

			const settings = service.getSettings();

			expect(settings.aiBuilder.enabled).toBe(false);
		});
	});
});
