'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const frontend_service_1 = require('@/services/frontend.service');
const community_packages_config_1 = require('@/community-packages/community-packages.config');
const di_1 = require('@n8n/di');
describe('FrontendService', () => {
	let originalEnv;
	beforeEach(() => {
		originalEnv = process.env;
		jest.clearAllMocks();
	});
	afterEach(() => {
		process.env = originalEnv;
	});
	describe('envFeatureFlags functionality', () => {
		const createMockService = () => {
			const globalConfig = (0, jest_mock_extended_1.mock)({
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
				partialExecutions: { version: 1 },
				path: '',
				sso: {
					ldap: { loginEnabled: false },
					saml: { loginEnabled: false },
					oidc: { loginEnabled: false },
				},
			});
			di_1.Container.set(
				community_packages_config_1.CommunityPackagesConfig,
				(0, jest_mock_extended_1.mock)({
					enabled: false,
				}),
			);
			const logger = (0, jest_mock_extended_1.mock)();
			const instanceSettings = (0, jest_mock_extended_1.mock)({
				isDocker: false,
				instanceId: 'test-instance',
				isMultiMain: false,
				hostId: 'test-host',
				staticCacheDir: '/tmp/test-cache',
			});
			const loadNodesAndCredentials = (0, jest_mock_extended_1.mock)({
				addPostProcessor: jest.fn(),
				types: {
					credentials: [],
					nodes: [],
				},
			});
			const binaryDataConfig = (0, jest_mock_extended_1.mock)({
				mode: 'default',
				availableModes: ['default'],
			});
			const credentialTypes = (0, jest_mock_extended_1.mock)({
				getParentTypes: jest.fn().mockReturnValue([]),
			});
			const credentialsOverwrites = (0, jest_mock_extended_1.mock)({
				getAll: jest.fn().mockReturnValue({}),
			});
			const license = (0, jest_mock_extended_1.mock)({
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
			const mailer = (0, jest_mock_extended_1.mock)({
				isEmailSetUp: false,
			});
			const urlService = (0, jest_mock_extended_1.mock)({
				getInstanceBaseUrl: jest.fn().mockReturnValue('http://localhost:5678'),
				getWebhookBaseUrl: jest.fn().mockReturnValue('http://localhost:5678'),
			});
			const securityConfig = (0, jest_mock_extended_1.mock)({
				blockFileAccessToN8nFiles: false,
			});
			const pushConfig = (0, jest_mock_extended_1.mock)({
				backend: 'websocket',
			});
			const licenseState = (0, jest_mock_extended_1.mock)({
				isOidcLicensed: jest.fn().mockReturnValue(false),
				isMFAEnforcementLicensed: jest.fn().mockReturnValue(false),
				getMaxWorkflowsWithEvaluations: jest.fn().mockReturnValue(0),
			});
			const moduleRegistry = (0, jest_mock_extended_1.mock)({
				getActiveModules: jest.fn().mockReturnValue([]),
			});
			const mfaService = (0, jest_mock_extended_1.mock)({
				isMFAEnforced: jest.fn().mockReturnValue(false),
			});
			return new frontend_service_1.FrontendService(
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
			);
		};
		describe('collectEnvFeatureFlags', () => {
			it('should collect environment variables with N8N_ENV_FEAT_ prefix', () => {
				process.env = {
					N8N_ENV_FEAT_TEST_FLAG: 'true',
					N8N_ENV_FEAT_ANOTHER_FLAG: 'false',
					N8N_ENV_FEAT_NUMERIC_FLAG: '123',
					REGULAR_ENV_VAR: 'should-not-be-included',
					N8N_OTHER_PREFIX: 'should-not-be-included',
				};
				const service = createMockService();
				const collectEnvFeatureFlags = service.collectEnvFeatureFlags.bind(service);
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
				const service = createMockService();
				const collectEnvFeatureFlags = service.collectEnvFeatureFlags.bind(service);
				const result = collectEnvFeatureFlags();
				expect(result).toEqual({});
			});
			it('should filter out undefined environment variable values', () => {
				process.env = {
					N8N_ENV_FEAT_DEFINED_FLAG: 'true',
					N8N_ENV_FEAT_UNDEFINED_FLAG: undefined,
				};
				const service = createMockService();
				const collectEnvFeatureFlags = service.collectEnvFeatureFlags.bind(service);
				const result = collectEnvFeatureFlags();
				expect(result).toEqual({
					N8N_ENV_FEAT_DEFINED_FLAG: 'true',
				});
			});
		});
		describe('settings integration', () => {
			it('should include envFeatureFlags in initial settings', () => {
				process.env = {
					N8N_ENV_FEAT_INIT_FLAG: 'true',
					N8N_ENV_FEAT_ANOTHER_FLAG: 'false',
				};
				const service = createMockService();
				expect(service.settings.envFeatureFlags).toEqual({
					N8N_ENV_FEAT_INIT_FLAG: 'true',
					N8N_ENV_FEAT_ANOTHER_FLAG: 'false',
				});
			});
			it('should refresh envFeatureFlags when getSettings is called', () => {
				process.env = {
					N8N_ENV_FEAT_INITIAL_FLAG: 'true',
				};
				const service = createMockService();
				expect(service.settings.envFeatureFlags).toEqual({
					N8N_ENV_FEAT_INITIAL_FLAG: 'true',
				});
				process.env = {
					N8N_ENV_FEAT_INITIAL_FLAG: 'false',
					N8N_ENV_FEAT_NEW_FLAG: 'true',
				};
				const settings = service.getSettings();
				expect(settings.envFeatureFlags).toEqual({
					N8N_ENV_FEAT_INITIAL_FLAG: 'false',
					N8N_ENV_FEAT_NEW_FLAG: 'true',
				});
			});
		});
	});
});
//# sourceMappingURL=frontend.service.test.js.map
