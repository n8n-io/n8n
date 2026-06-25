import type { LicenseState, Logger, ModuleRegistry } from '@n8n/backend-common';
import type { GlobalConfig, SecurityConfig } from '@n8n/config';
import type { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { BinaryDataConfig, InstanceSettings } from 'n8n-core';
import type { ICredentialType, INodeTypeDescription } from 'n8n-workflow';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsOverwrites } from '@/credentials-overwrites';
import type { License } from '@/license';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { MfaService } from '@/mfa/mfa.service';
import { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';
import type { PushConfig } from '@/push/push.config';
import type { AiUsageService } from '@/services/ai-usage.service';
import { FrontendService, type PublicFrontendSettings } from '@/services/frontend.service';
import type { UrlService } from '@/services/url.service';
import type { UserManagementMailer } from '@/user-management/email';
import type { OwnershipService } from '../ownership.service';

// Mock the workflow history helper functions to avoid DI container issues in tests
jest.mock('@/workflows/workflow-history/workflow-history-helper', () => ({
	getWorkflowHistoryLicensePruneTime: jest.fn(() => 24),
	getWorkflowHistoryPruneTime: jest.fn(() => 24),
}));

describe('FrontendService', () => {
	let originalEnv: NodeJS.ProcessEnv;
	const globalConfig = mock<GlobalConfig>({
		database: { type: 'sqlite' },
		endpoints: { rest: 'rest', health: '/healthz' },
		diagnostics: { enabled: false },
		templates: { enabled: false, host: '' },
		nodes: {},
		tags: { disabled: false },
		collaboration: { crdt: 'off' },
		logging: { level: 'info' },
		hiringBanner: { enabled: false },
		versionNotifications: {
			enabled: false,
			endpoint: '',
			whatsNewEnabled: false,
			whatsNewEndpoint: '',
			infoUrl: '',
		},
		dynamicBanners: {
			endpoint: 'https://api.n8n.io/api/banners',
			enabled: true,
		},
		personalization: { enabled: false },
		defaultLocale: 'en',
		auth: { cookie: { secure: false } },
		generic: { releaseChannel: 'stable', timezone: 'UTC' },
		publicApi: { path: 'api', swaggerUiDisabled: false },
		workflows: { callerPolicyDefaultOption: 'workflowsFromSameOwner' },
		executions: {
			pruneData: false,
			pruneDataMaxAge: 336,
			pruneDataMaxCount: 10000,
			concurrency: { productionLimit: -1, evaluationLimit: -1 },
		},
		hideUsagePage: false,
		license: { tenantId: 1 },
		mfa: { enabled: false },
		deployment: { type: 'default' },
		workflowHistory: { pruneTime: 24 },
		path: '/',
		sso: {
			ldap: { loginEnabled: false },
			saml: { loginEnabled: false },
			oidc: { loginEnabled: false },
		},
		credentials: {
			overwrite: { skipTypes: [] },
		},
		userManagement: {
			password: { minLength: 8 },
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
		collectTypes: jest.fn().mockResolvedValue({
			credentials: [],
			nodes: [],
		}),
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
		isWorkerViewLicensed: jest.fn().mockReturnValue(false),
		isAdvancedPermissionsLicensed: jest.fn().mockReturnValue(false),

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
		getInstanceJwksUri: jest
			.fn()
			.mockReturnValue('http://localhost:5678/rest/.well-known/jwks.json'),
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
		isOtelCustomSpanAttributesLicensed: jest.fn().mockReturnValue(false),
		getMaxWorkflowsWithEvaluations: jest.fn().mockReturnValue(0),
	});

	const moduleRegistry = mock<ModuleRegistry>({
		getActiveModules: jest.fn().mockReturnValue([]),
	});

	const mfaService = mock<MfaService>({
		isMFAEnforced: jest.fn().mockReturnValue(false),
	});

	const ownershipService = mock<OwnershipService>({
		hasInstanceOwner: jest.fn().mockReturnValue(false),
	});

	const aiUsageService = mock<AiUsageService>({
		getAiUsageSettings: jest.fn().mockResolvedValue(true),
	});

	const workflowRepository = mock<WorkflowRepository>({
		getPublishedCount: jest.fn().mockResolvedValue(7),
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
				ownershipService,
				aiUsageService,
				workflowRepository,
			),
			license,
		};
	};

	beforeEach(() => {
		originalEnv = process.env;
		jest.clearAllMocks();
		globalConfig.diagnostics.enabled = false;
	});

	afterEach(() => {
		jest.useRealTimers();
		process.env = originalEnv;
	});

	describe('getSettings', () => {
		it('should return frontend settings', async () => {
			const { service } = createMockService();
			const settings = await service.getSettings();

			expect(settings).toEqual(
				expect.objectContaining({
					settingsMode: 'authenticated',
				}),
			);
		});

		it('should cache dynamic banner filters for 30 seconds', async () => {
			jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00.000Z') });
			globalConfig.diagnostics.enabled = true;
			globalConfig.diagnostics.frontendConfig = 'key;http://localhost';
			workflowRepository.getPublishedCount.mockResolvedValueOnce(7).mockResolvedValueOnce(8);

			const { service } = createMockService();
			const settings = await service.getSettings();

			expect(settings.dynamicBanners.filters).toEqual({
				publishedWorkflowCount: 7,
			});
			expect(workflowRepository.getPublishedCount).toHaveBeenCalledTimes(1);

			jest.advanceTimersByTime(29_999);
			const cachedSettings = await service.getSettings();

			expect(cachedSettings.dynamicBanners.filters).toEqual({
				publishedWorkflowCount: 7,
			});
			expect(workflowRepository.getPublishedCount).toHaveBeenCalledTimes(1);

			jest.advanceTimersByTime(1);
			const refreshedSettings = await service.getSettings();

			expect(refreshedSettings.dynamicBanners.filters).toEqual({
				publishedWorkflowCount: 8,
			});
			expect(workflowRepository.getPublishedCount).toHaveBeenCalledTimes(2);
		});

		it('should fall back when dynamic banner filters cannot be loaded', async () => {
			globalConfig.diagnostics.enabled = true;
			globalConfig.diagnostics.frontendConfig = 'key;http://localhost';
			workflowRepository.getPublishedCount.mockRejectedValueOnce(new Error('database unavailable'));

			const { service } = createMockService();
			const settings = await service.getSettings();

			expect(settings.dynamicBanners.filters).toEqual({
				publishedWorkflowCount: 0,
			});
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to fetch published workflow count for dynamic banners',
				expect.objectContaining({ error: expect.any(Error) }),
			);
		});

		it('should fall back to the last published workflow count when refresh fails', async () => {
			jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00.000Z') });
			globalConfig.diagnostics.enabled = true;
			globalConfig.diagnostics.frontendConfig = 'key;http://localhost';
			workflowRepository.getPublishedCount
				.mockResolvedValueOnce(7)
				.mockRejectedValueOnce(new Error('database unavailable'));

			const { service } = createMockService();
			await service.getSettings();
			jest.advanceTimersByTime(30_000);

			const settings = await service.getSettings();

			expect(settings.dynamicBanners.filters).toEqual({
				publishedWorkflowCount: 7,
			});
			expect(workflowRepository.getPublishedCount).toHaveBeenCalledTimes(2);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to fetch published workflow count for dynamic banners',
				expect.objectContaining({ error: expect.any(Error) }),
			);
		});

		it('should surface logStreaming.managedByEnv from instanceSettingsLoader config', async () => {
			globalConfig.instanceSettingsLoader = {
				logStreamingManagedByEnv: true,
			} as GlobalConfig['instanceSettingsLoader'];

			const { service } = createMockService();
			const settings = await service.getSettings();

			expect(settings.logStreaming).toEqual({ managedByEnv: true });
		});

		it('should default logStreaming.managedByEnv to false when flag is off', async () => {
			globalConfig.instanceSettingsLoader = {
				logStreamingManagedByEnv: false,
			} as GlobalConfig['instanceSettingsLoader'];

			const { service } = createMockService();
			const settings = await service.getSettings();

			expect(settings.logStreaming).toEqual({ managedByEnv: false });
		});

		it('should surface communityNodesManagedByEnv from instanceSettingsLoader config', async () => {
			globalConfig.instanceSettingsLoader = {
				communityPackagesManagedByEnv: true,
			} as GlobalConfig['instanceSettingsLoader'];

			const { service } = createMockService();
			const settings = await service.getSettings();

			expect(settings.communityNodesManagedByEnv).toBe(true);
		});

		it('should default communityNodesManagedByEnv to false when flag is off', async () => {
			globalConfig.instanceSettingsLoader = {
				communityPackagesManagedByEnv: false,
			} as GlobalConfig['instanceSettingsLoader'];

			const { service } = createMockService();
			const settings = await service.getSettings();

			expect(settings.communityNodesManagedByEnv).toBe(false);
		});

		it('refreshes evaluationConcurrencyLimit when license tier changes between getSettings calls', async () => {
			// Env override unset for this test so the resolver follows the
			// license-tier branch. The override is restored by the suite's
			// afterEach via `process.env = originalEnv`.
			delete process.env.N8N_CONCURRENCY_EVALUATION_LIMIT;
			license.getPlanName.mockReturnValue('Community');

			const { service } = createMockService();
			const initial = await service.getSettings();
			expect(initial.evaluationConcurrencyLimit).toBe(1);

			// Simulate a license upgrade landing after settings have been
			// initialised. The next getSettings() call must surface the new
			// tier default without requiring an instance restart.
			license.getPlanName.mockReturnValue('Enterprise');
			const refreshed = await service.getSettings();
			expect(refreshed.evaluationConcurrencyLimit).toBe(5);
		});

		it('keeps env override winning over license tier on refresh', async () => {
			// Operator-set env always wins, even after a license change.
			process.env.N8N_CONCURRENCY_EVALUATION_LIMIT = '7';
			globalConfig.executions = {
				...globalConfig.executions,
				concurrency: { productionLimit: -1, evaluationLimit: 7 },
			} as GlobalConfig['executions'];
			license.getPlanName.mockReturnValue('Community');

			const { service } = createMockService();
			const initial = await service.getSettings();
			expect(initial.evaluationConcurrencyLimit).toBe(7);

			license.getPlanName.mockReturnValue('Enterprise');
			const refreshed = await service.getSettings();
			expect(refreshed.evaluationConcurrencyLimit).toBe(7);
		});

		it('surfaces the license-issued evaluation concurrency quota when env is unset', async () => {
			// `quota:evaluations:concurrencyLimit` lets the license-management
			// service raise (or lower) a customer's cap without a code change.
			// With env unset, the FE settings must reflect the license value
			// rather than the tier default.
			delete process.env.N8N_CONCURRENCY_EVALUATION_LIMIT;
			license.getPlanName.mockReturnValue('Community');
			(license.getValue as jest.Mock).mockImplementation((feature: string) =>
				feature === 'quota:evaluations:concurrencyLimit' ? 4 : undefined,
			);

			const { service } = createMockService();
			const settings = await service.getSettings();
			// Community tier would otherwise be 1; the license override lifts
			// it to 4.
			expect(settings.evaluationConcurrencyLimit).toBe(4);
		});

		it('should surface whether custom OpenTelemetry span attributes are licensed', async () => {
			licenseState.isOtelCustomSpanAttributesLicensed.mockReturnValue(true);

			const { service } = createMockService();
			const settings = await service.getSettings();

			expect(settings.enterprise.otelCustomSpanAttributes).toBe(true);
		});
	});

	describe('getPublicSettings', () => {
		it('should return public settings', async () => {
			const expectedPublicSettings: PublicFrontendSettings = {
				settingsMode: 'public',
				defaultLocale: 'en',
				userManagement: {
					smtpSetup: false,
					showSetupOnFirstLoad: true,
					authenticationMethod: 'email',
					passwordMinLength: 8,
				},
				sso: {
					saml: { loginEnabled: false },
					ldap: { loginEnabled: false, loginLabel: '' },
					oidc: {
						loginEnabled: false,
						loginUrl: 'http://localhost:5678/rest/sso/oidc/login',
					},
				},
				authCookie: { secure: false },
				communityNodesEnabled: false,
				previewMode: false,
				enterprise: { saml: false, ldap: false, oidc: false },
			};

			const { service } = createMockService();
			const settings = await service.getPublicSettings(false);

			expect(settings).toEqual(expectedPublicSettings);
		});

		it('should return public settings with mfa', async () => {
			const expectedPublicSettings = {
				settingsMode: 'public',
				defaultLocale: 'en',
				userManagement: {
					smtpSetup: false,
					showSetupOnFirstLoad: true,
					authenticationMethod: 'email',
					passwordMinLength: 8,
				},
				sso: {
					saml: { loginEnabled: false },
					ldap: { loginEnabled: false, loginLabel: '' },
					oidc: {
						loginEnabled: false,
						loginUrl: 'http://localhost:5678/rest/sso/oidc/login',
					},
				},
				authCookie: { secure: false },
				communityNodesEnabled: false,
				previewMode: false,
				enterprise: { saml: false, ldap: false, oidc: false },
				mfa: {
					enabled: false,
					enforced: false,
				},
			};

			const { service } = createMockService();
			const settings = await service.getPublicSettings(true);

			expect(settings).toEqual(expectedPublicSettings);
		});

		it('should expose configured passwordMinLength in settings', async () => {
			(globalConfig as any).userManagement = { password: { minLength: 12 } };

			const { service } = createMockService();
			const settings = await service.getSettings();

			expect(settings.userManagement.passwordMinLength).toBe(12);

			const publicSettings = await service.getPublicSettings(false);
			expect(publicSettings.userManagement.passwordMinLength).toBe(12);

			// Restore default
			(globalConfig as any).userManagement = { password: { minLength: 8 } };
		});

		it('should set showSetupOnFirstLoad to false in preview mode', async () => {
			process.env.N8N_PREVIEW_MODE = 'true';

			const { service } = createMockService();
			const publicSettings = await service.getPublicSettings(false);

			expect(publicSettings.previewMode).toBe(true);
			expect(publicSettings.userManagement.showSetupOnFirstLoad).toBe(false);

			const settings = await service.getSettings();
			expect(settings.previewMode).toBe(true);
			expect(settings.userManagement.showSetupOnFirstLoad).toBe(false);
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
			it('should include envFeatureFlags in initial settings', async () => {
				process.env = {
					N8N_ENV_FEAT_INIT_FLAG: 'true',
					N8N_ENV_FEAT_ANOTHER_FLAG: 'false',
				};

				const { service } = createMockService();
				const settings = await service.getSettings();

				expect(settings.envFeatureFlags).toEqual({
					N8N_ENV_FEAT_INIT_FLAG: 'true',
					N8N_ENV_FEAT_ANOTHER_FLAG: 'false',
				});
			});

			it('should refresh envFeatureFlags when getSettings is called', async () => {
				process.env = {
					N8N_ENV_FEAT_INITIAL_FLAG: 'true',
				};

				const { service } = createMockService();
				const initialSettings = await service.getSettings();

				// Verify initial state
				expect(initialSettings.envFeatureFlags).toEqual({
					N8N_ENV_FEAT_INITIAL_FLAG: 'true',
				});

				// Change environment
				process.env = {
					N8N_ENV_FEAT_INITIAL_FLAG: 'false',
					N8N_ENV_FEAT_NEW_FLAG: 'true',
				};

				// getSettings should refresh the flags
				const settings = await service.getSettings();

				expect(settings.envFeatureFlags).toEqual({
					N8N_ENV_FEAT_INITIAL_FLAG: 'false',
					N8N_ENV_FEAT_NEW_FLAG: 'true',
				});
			});
		});
	});

	describe('aiBuilder setting', () => {
		it('should initialize aiBuilder setting as disabled by default', async () => {
			const { service } = createMockService();
			const initialSettings = await service.getSettings();
			expect(initialSettings.aiBuilder).toEqual({
				enabled: false,
				setup: false,
			});
		});

		it('should set aiBuilder.enabled to true when license has feat:aiBuilder', async () => {
			const { service, license } = createMockService();

			license.isLicensed.mockImplementation((feature) => {
				return feature === 'feat:aiBuilder';
			});

			const settings = await service.getSettings();

			expect(settings.aiBuilder.enabled).toBe(true);
		});

		it('should keep aiBuilder.enabled as false when license does not have feat:aiBuilder', async () => {
			const { service, license } = createMockService();

			license.isLicensed.mockReturnValue(false);

			const settings = await service.getSettings();

			expect(settings.aiBuilder.enabled).toBe(false);
		});
	});

	describe('collaboration setting', () => {
		afterEach(() => {
			globalConfig.collaboration.crdt = 'off';
		});

		it('should default collaboration.crdt to off', async () => {
			const { service } = createMockService();
			const settings = await service.getSettings();
			expect(settings.collaboration.crdt).toBe('off');
		});

		it('should reflect the collaboration.crdt mode from config', async () => {
			globalConfig.collaboration.crdt = 'local';
			const { service } = createMockService();
			const settings = await service.getSettings();
			expect(settings.collaboration.crdt).toBe('local');
		});
	});

	describe('node version identifiers', () => {
		it('should create type@version identifiers for single and multi-version nodes', () => {
			const { service } = createMockService();
			const getNodeVersionIdentifiers = service.getNodeVersionIdentifiers.bind(service);

			const nodes = [
				{
					name: 'n8n-nodes-base.single',
					version: 1,
				},
				{
					name: 'n8n-nodes-base.multi',
					version: [1, 2],
				},
			] as unknown as INodeTypeDescription[];

			const identifiers = getNodeVersionIdentifiers(nodes);

			expect(identifiers).toEqual(
				expect.arrayContaining([
					'n8n-nodes-base.single@1',
					'n8n-nodes-base.multi@1',
					'n8n-nodes-base.multi@2',
				]),
			);
			expect(identifiers).toHaveLength(3);
		});

		it('should ignore invalid entries and deduplicate identifiers', () => {
			const { service } = createMockService();
			const getNodeVersionIdentifiers = service.getNodeVersionIdentifiers.bind(service);

			const nodes = [
				{
					name: 'n8n-nodes-base.duplicate',
					version: [1, 1, 2],
				},
				{
					name: 'n8n-nodes-base.duplicate',
					version: 2,
				},
				{
					name: undefined as unknown as string,
					version: 3,
				},
				{
					name: 'n8n-nodes-base.invalidVersion',
				},
			] as unknown as INodeTypeDescription[];

			const identifiers = getNodeVersionIdentifiers(nodes);

			expect(identifiers).toEqual(
				expect.arrayContaining(['n8n-nodes-base.duplicate@1', 'n8n-nodes-base.duplicate@2']),
			);
			expect(identifiers).toHaveLength(2);
		});
	});

	describe('overwriteCredentialsProperties', () => {
		afterEach(() => {
			// Restore globalConfig.credentials to the default so other tests are unaffected
			(globalConfig as any).credentials = { overwrite: { skipTypes: [] } };
			loadNodesAndCredentials.types = { credentials: [], nodes: [] };
		});

		it('should set __skipManagedCreation for types in the skip list', () => {
			const skipCredential = {
				name: 'googleSheetsOAuth2Api',
				displayName: 'Google Sheets OAuth2 API',
				properties: [],
			} as ICredentialType;
			const normalCredential = {
				name: 'slackOAuth2Api',
				displayName: 'Slack OAuth2 API',
				properties: [],
			} as ICredentialType;

			loadNodesAndCredentials.types = {
				credentials: [skipCredential, normalCredential],
				nodes: [],
			};
			(globalConfig as any).credentials = {
				overwrite: { skipTypes: ['googleSheetsOAuth2Api'] },
			};

			const { service } = createMockService();
			(service as any).overwriteCredentialsProperties();

			expect(skipCredential.__skipManagedCreation).toBe(true);
			expect(normalCredential.__skipManagedCreation).toBeUndefined();
		});

		it('should not set __skipManagedCreation when skip list is empty', () => {
			const credential = {
				name: 'googleSheetsOAuth2Api',
				displayName: 'Google Sheets OAuth2 API',
				properties: [],
			} as ICredentialType;

			loadNodesAndCredentials.types = { credentials: [credential], nodes: [] };
			(globalConfig as any).credentials = { overwrite: { skipTypes: [] } };

			const { service } = createMockService();
			(service as any).overwriteCredentialsProperties();

			expect(credential.__skipManagedCreation).toBeUndefined();
		});

		it('should clear stale __skipManagedCreation when type is removed from skip list', () => {
			const credential = {
				name: 'googleSheetsOAuth2Api',
				displayName: 'Google Sheets OAuth2 API',
				properties: [],
				__skipManagedCreation: true, // Previously set
			} as ICredentialType;

			loadNodesAndCredentials.types = { credentials: [credential], nodes: [] };
			(globalConfig as any).credentials = { overwrite: { skipTypes: [] } };

			const { service } = createMockService();
			(service as any).overwriteCredentialsProperties();

			expect(credential.__skipManagedCreation).toBeUndefined();
		});

		describe('JWKS URI injection', () => {
			const expectedJwksUri = 'http://localhost:5678/rest/.well-known/jwks.json';

			const makeJwksUriProperty = () => ({
				displayName: 'JWKS URI',
				name: 'jwksUri',
				type: 'string' as const,
				default: '',
			});

			it('should inject the instance JWKS URI on oAuth2Api', () => {
				const credential = {
					name: 'oAuth2Api',
					displayName: 'OAuth2 API',
					properties: [makeJwksUriProperty()],
				} as unknown as ICredentialType;

				loadNodesAndCredentials.types = { credentials: [credential], nodes: [] };

				const { service } = createMockService();
				(service as any).overwriteCredentialsProperties();

				const jwksProperty = credential.properties?.find((p) => p.name === 'jwksUri');
				expect(jwksProperty?.default).toBe(expectedJwksUri);
			});

			it('should not touch standard OAuth2-extending credentials (jwksUri not inherited)', () => {
				// Both `jweEnabled` and `jwksUri` carry `doNotInherit: true` so
				// provider-specific OAuth2 credentials (Google, Slack, GitHub, ...)
				// don't inherit them. Without a `jwksUri` property in scope, the
				// injection has nothing to mutate.
				const credential = {
					name: 'slackOAuth2Api',
					displayName: 'Slack OAuth2 API',
					properties: [],
				} as unknown as ICredentialType;

				loadNodesAndCredentials.types = { credentials: [credential], nodes: [] };

				const { service } = createMockService();
				(service as any).overwriteCredentialsProperties();

				expect(credential.properties).toEqual([]);
			});

			it('should inject the JWKS URI on JWE-aware OAuth2 extensions that re-declare jwksUri', () => {
				// Custom credentials extending oAuth2Api can opt into the JWE flow
				// by re-declaring both `jweEnabled` and `jwksUri`. The runtime URL
				// injection must reach those credentials so the user sees the
				// instance JWKS endpoint without the credential class hardcoding
				// it (which would be impossible per-instance).
				const credential = {
					name: 'metaOAuth2Api',
					displayName: 'Meta OAuth2 API',
					properties: [makeJwksUriProperty()],
				} as unknown as ICredentialType;

				loadNodesAndCredentials.types = { credentials: [credential], nodes: [] };
				(credentialTypes.getParentTypes as jest.Mock).mockReturnValue(['oAuth2Api']);

				const { service } = createMockService();
				(service as any).overwriteCredentialsProperties();

				const jwksProperty = credential.properties?.find((p) => p.name === 'jwksUri');
				expect(jwksProperty?.default).toBe(expectedJwksUri);
			});

			it('should leave non-OAuth2 credentials untouched', () => {
				const credential = {
					name: 'httpBasicAuth',
					displayName: 'Basic Auth',
					properties: [
						{
							displayName: 'User',
							name: 'user',
							type: 'string' as const,
							default: '',
						},
					],
				} as unknown as ICredentialType;

				loadNodesAndCredentials.types = { credentials: [credential], nodes: [] };

				const { service } = createMockService();
				(service as any).overwriteCredentialsProperties();

				expect(credential.properties).toEqual([
					{ displayName: 'User', name: 'user', type: 'string', default: '' },
				]);
			});
		});
	});

	describe('generateTypes', () => {
		it('should write node versions file with generated identifiers', async () => {
			const testNodes = [
				{ name: 'n8n-nodes-base.single', version: 1 },
				{ name: 'n8n-nodes-base.multi', version: [1, 2] },
			];

			(loadNodesAndCredentials.collectTypes as jest.Mock).mockResolvedValue({
				nodes: testNodes,
				credentials: [],
			});

			const { service } = createMockService();

			const writeStaticJSONSpy = jest
				.spyOn(service as any, 'writeStaticJSON')
				.mockImplementation(() => {});

			try {
				await (service as any).generateTypes();

				const nodeVersionCall = writeStaticJSONSpy.mock.calls.find(
					([name]) => name === 'node-versions',
				);

				expect(nodeVersionCall).toBeDefined();

				const [, identifiers] = nodeVersionCall as [string, string[]];

				expect(identifiers).toEqual(
					expect.arrayContaining([
						'n8n-nodes-base.single@1',
						'n8n-nodes-base.multi@1',
						'n8n-nodes-base.multi@2',
					]),
				);
				expect(identifiers).toHaveLength(3);
			} finally {
				writeStaticJSONSpy.mockRestore();
			}
		});
	});
});
