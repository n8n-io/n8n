'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.FrontendService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const constants_1 = require('@n8n/constants');
const di_1 = require('@n8n/di');
const fs_1 = require('fs');
const promises_1 = require('fs/promises');
const uniq_1 = __importDefault(require('lodash/uniq'));
const n8n_core_1 = require('n8n-core');
const path_1 = __importDefault(require('path'));
const community_packages_config_1 = require('@/community-packages/community-packages.config');
const config_2 = __importDefault(require('@/config'));
const constants_2 = require('@/constants');
const credential_types_1 = require('@/credential-types');
const credentials_overwrites_1 = require('@/credentials-overwrites');
const helpers_ee_1 = require('@/ldap.ee/helpers.ee');
const license_1 = require('@/license');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const mfa_service_1 = require('@/mfa/mfa.service');
const public_api_1 = require('@/public-api');
const push_config_1 = require('@/push/push.config');
const saml_helpers_1 = require('@/sso.ee/saml/saml-helpers');
const sso_helpers_1 = require('@/sso.ee/sso-helpers');
const email_1 = require('@/user-management/email');
const workflow_history_helper_ee_1 = require('@/workflows/workflow-history.ee/workflow-history-helper.ee');
const url_service_1 = require('./url.service');
let FrontendService = class FrontendService {
	constructor(
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
	) {
		this.globalConfig = globalConfig;
		this.logger = logger;
		this.loadNodesAndCredentials = loadNodesAndCredentials;
		this.credentialTypes = credentialTypes;
		this.credentialsOverwrites = credentialsOverwrites;
		this.license = license;
		this.mailer = mailer;
		this.instanceSettings = instanceSettings;
		this.urlService = urlService;
		this.securityConfig = securityConfig;
		this.pushConfig = pushConfig;
		this.binaryDataConfig = binaryDataConfig;
		this.licenseState = licenseState;
		this.moduleRegistry = moduleRegistry;
		this.mfaService = mfaService;
		loadNodesAndCredentials.addPostProcessor(async () => await this.generateTypes());
		void this.generateTypes();
		this.initSettings();
		if (di_1.Container.get(community_packages_config_1.CommunityPackagesConfig).enabled) {
			void Promise.resolve()
				.then(() => __importStar(require('@/community-packages/community-packages.service')))
				.then(({ CommunityPackagesService }) => {
					this.communityPackagesService = di_1.Container.get(CommunityPackagesService);
				});
		}
	}
	collectEnvFeatureFlags() {
		const envFeatureFlags = {};
		for (const [key, value] of Object.entries(process.env)) {
			if (key.startsWith('N8N_ENV_FEAT_') && value !== undefined) {
				envFeatureFlags[key] = value;
			}
		}
		return envFeatureFlags;
	}
	initSettings() {
		const instanceBaseUrl = this.urlService.getInstanceBaseUrl();
		const restEndpoint = this.globalConfig.endpoints.rest;
		const telemetrySettings = {
			enabled: this.globalConfig.diagnostics.enabled,
		};
		if (telemetrySettings.enabled) {
			const conf = this.globalConfig.diagnostics.frontendConfig;
			const [key, url] = conf.split(';');
			const proxy = `${instanceBaseUrl}/${restEndpoint}/telemetry/proxy`;
			const sourceConfig = `${instanceBaseUrl}/${restEndpoint}/telemetry/rudderstack`;
			if (!key || !url) {
				this.logger.warn('Diagnostics frontend config is invalid');
				telemetrySettings.enabled = false;
			}
			telemetrySettings.config = { key, url, proxy, sourceConfig };
		}
		this.settings = {
			inE2ETests: constants_2.inE2ETests,
			isDocker: this.instanceSettings.isDocker,
			databaseType: this.globalConfig.database.type,
			previewMode: process.env.N8N_PREVIEW_MODE === 'true',
			endpointForm: this.globalConfig.endpoints.form,
			endpointFormTest: this.globalConfig.endpoints.formTest,
			endpointFormWaiting: this.globalConfig.endpoints.formWaiting,
			endpointMcp: this.globalConfig.endpoints.mcp,
			endpointMcpTest: this.globalConfig.endpoints.mcpTest,
			endpointWebhook: this.globalConfig.endpoints.webhook,
			endpointWebhookTest: this.globalConfig.endpoints.webhookTest,
			endpointWebhookWaiting: this.globalConfig.endpoints.webhookWaiting,
			saveDataErrorExecution: config_2.default.getEnv('executions.saveDataOnError'),
			saveDataSuccessExecution: config_2.default.getEnv('executions.saveDataOnSuccess'),
			saveManualExecutions: config_2.default.getEnv('executions.saveDataManualExecutions'),
			saveExecutionProgress: config_2.default.getEnv('executions.saveExecutionProgress'),
			executionTimeout: config_2.default.getEnv('executions.timeout'),
			maxExecutionTimeout: config_2.default.getEnv('executions.maxTimeout'),
			workflowCallerPolicyDefaultOption: this.globalConfig.workflows.callerPolicyDefaultOption,
			timezone: this.globalConfig.generic.timezone,
			urlBaseWebhook: this.urlService.getWebhookBaseUrl(),
			urlBaseEditor: instanceBaseUrl,
			binaryDataMode: this.binaryDataConfig.mode,
			nodeJsVersion: process.version.replace(/^v/, ''),
			versionCli: constants_2.N8N_VERSION,
			concurrency: config_2.default.getEnv('executions.concurrency.productionLimit'),
			authCookie: {
				secure: this.globalConfig.auth.cookie.secure,
			},
			releaseChannel: this.globalConfig.generic.releaseChannel,
			oauthCallbackUrls: {
				oauth1: `${instanceBaseUrl}/${restEndpoint}/oauth1-credential/callback`,
				oauth2: `${instanceBaseUrl}/${restEndpoint}/oauth2-credential/callback`,
			},
			versionNotifications: {
				enabled: this.globalConfig.versionNotifications.enabled,
				endpoint: this.globalConfig.versionNotifications.endpoint,
				whatsNewEnabled: this.globalConfig.versionNotifications.whatsNewEnabled,
				whatsNewEndpoint: this.globalConfig.versionNotifications.whatsNewEndpoint,
				infoUrl: this.globalConfig.versionNotifications.infoUrl,
			},
			instanceId: this.instanceSettings.instanceId,
			telemetry: telemetrySettings,
			posthog: {
				enabled: this.globalConfig.diagnostics.enabled,
				apiHost: this.globalConfig.diagnostics.posthogConfig.apiHost,
				apiKey: this.globalConfig.diagnostics.posthogConfig.apiKey,
				autocapture: false,
				disableSessionRecording: this.globalConfig.deployment.type !== 'cloud',
				debug: this.globalConfig.logging.level === 'debug',
			},
			personalizationSurveyEnabled:
				this.globalConfig.personalization.enabled && this.globalConfig.diagnostics.enabled,
			defaultLocale: this.globalConfig.defaultLocale,
			userManagement: {
				quota: this.license.getUsersLimit(),
				showSetupOnFirstLoad: !config_2.default.getEnv('userManagement.isInstanceOwnerSetUp'),
				smtpSetup: this.mailer.isEmailSetUp,
				authenticationMethod: (0, sso_helpers_1.getCurrentAuthenticationMethod)(),
			},
			sso: {
				saml: {
					loginEnabled: false,
					loginLabel: '',
				},
				ldap: {
					loginEnabled: false,
					loginLabel: '',
				},
				oidc: {
					loginEnabled: false,
					loginUrl: `${instanceBaseUrl}/${restEndpoint}/sso/oidc/login`,
					callbackUrl: `${instanceBaseUrl}/${restEndpoint}/sso/oidc/callback`,
				},
			},
			publicApi: {
				enabled: (0, public_api_1.isApiEnabled)(),
				latestVersion: 1,
				path: this.globalConfig.publicApi.path,
				swaggerUi: {
					enabled: !this.globalConfig.publicApi.swaggerUiDisabled,
				},
			},
			workflowTagsDisabled: this.globalConfig.tags.disabled,
			logLevel: this.globalConfig.logging.level,
			hiringBannerEnabled: this.globalConfig.hiringBanner.enabled,
			aiAssistant: {
				enabled: false,
			},
			templates: {
				enabled: this.globalConfig.templates.enabled,
				host: this.globalConfig.templates.host,
			},
			executionMode: config_2.default.getEnv('executions.mode'),
			isMultiMain: this.instanceSettings.isMultiMain,
			pushBackend: this.pushConfig.backend,
			communityNodesEnabled: di_1.Container.get(community_packages_config_1.CommunityPackagesConfig)
				.enabled,
			unverifiedCommunityNodesEnabled: di_1.Container.get(
				community_packages_config_1.CommunityPackagesConfig,
			).unverifiedEnabled,
			deployment: {
				type: this.globalConfig.deployment.type,
			},
			allowedModules: {
				builtIn: process.env.NODE_FUNCTION_ALLOW_BUILTIN?.split(',') ?? undefined,
				external: process.env.NODE_FUNCTION_ALLOW_EXTERNAL?.split(',') ?? undefined,
			},
			enterprise: {
				sharing: false,
				ldap: false,
				saml: false,
				oidc: false,
				mfaEnforcement: false,
				logStreaming: false,
				advancedExecutionFilters: false,
				variables: false,
				sourceControl: false,
				auditLogs: false,
				externalSecrets: false,
				showNonProdBanner: false,
				debugInEditor: false,
				binaryDataS3: false,
				workflowHistory: false,
				workerView: false,
				advancedPermissions: false,
				apiKeyScopes: false,
				projects: {
					team: {
						limit: 0,
					},
				},
			},
			mfa: {
				enabled: false,
				enforced: false,
			},
			hideUsagePage: this.globalConfig.hideUsagePage,
			license: {
				consumerId: 'unknown',
				environment: this.globalConfig.license.tenantId === 1 ? 'production' : 'staging',
			},
			variables: {
				limit: 0,
			},
			banners: {
				dismissed: [],
			},
			askAi: {
				enabled: false,
			},
			aiCredits: {
				enabled: false,
				credits: 0,
			},
			workflowHistory: {
				pruneTime: -1,
				licensePruneTime: -1,
			},
			pruning: {
				isEnabled: this.globalConfig.executions.pruneData,
				maxAge: this.globalConfig.executions.pruneDataMaxAge,
				maxCount: this.globalConfig.executions.pruneDataMaxCount,
			},
			security: {
				blockFileAccessToN8nFiles: this.securityConfig.blockFileAccessToN8nFiles,
			},
			easyAIWorkflowOnboarded: false,
			partialExecution: this.globalConfig.partialExecutions,
			folders: {
				enabled: false,
			},
			evaluation: {
				quota: this.licenseState.getMaxWorkflowsWithEvaluations(),
			},
			activeModules: this.moduleRegistry.getActiveModules(),
			envFeatureFlags: this.collectEnvFeatureFlags(),
		};
	}
	async generateTypes() {
		this.overwriteCredentialsProperties();
		const { staticCacheDir } = this.instanceSettings;
		await (0, promises_1.mkdir)(path_1.default.join(staticCacheDir, 'types'), { recursive: true });
		const { credentials, nodes } = this.loadNodesAndCredentials.types;
		this.writeStaticJSON('nodes', nodes);
		this.writeStaticJSON('credentials', credentials);
	}
	getSettings() {
		const restEndpoint = this.globalConfig.endpoints.rest;
		const instanceBaseUrl = this.urlService.getInstanceBaseUrl();
		this.settings.urlBaseWebhook = this.urlService.getWebhookBaseUrl();
		this.settings.urlBaseEditor = instanceBaseUrl;
		this.settings.oauthCallbackUrls = {
			oauth1: `${instanceBaseUrl}/${restEndpoint}/oauth1-credential/callback`,
			oauth2: `${instanceBaseUrl}/${restEndpoint}/oauth2-credential/callback`,
		};
		Object.assign(this.settings.userManagement, {
			quota: this.license.getUsersLimit(),
			authenticationMethod: (0, sso_helpers_1.getCurrentAuthenticationMethod)(),
			showSetupOnFirstLoad: !config_2.default.getEnv('userManagement.isInstanceOwnerSetUp'),
		});
		let dismissedBanners = [];
		try {
			dismissedBanners = config_2.default.getEnv('ui.banners.dismissed') ?? [];
		} catch {}
		this.settings.banners.dismissed = dismissedBanners;
		try {
			this.settings.easyAIWorkflowOnboarded =
				config_2.default.getEnv('easyAIWorkflowOnboarded') ?? false;
		} catch {
			this.settings.easyAIWorkflowOnboarded = false;
		}
		const isS3Selected = this.binaryDataConfig.mode === 's3';
		const isS3Available = this.binaryDataConfig.availableModes.includes('s3');
		const isS3Licensed = this.license.isBinaryDataS3Licensed();
		const isAiAssistantEnabled = this.license.isAiAssistantEnabled();
		const isAskAiEnabled = this.license.isAskAiEnabled();
		const isAiCreditsEnabled = this.license.isAiCreditsEnabled();
		this.settings.license.planName = this.license.getPlanName();
		this.settings.license.consumerId = this.license.getConsumerId();
		Object.assign(this.settings.enterprise, {
			sharing: this.license.isSharingEnabled(),
			logStreaming: this.license.isLogStreamingEnabled(),
			ldap: this.license.isLdapEnabled(),
			saml: this.license.isSamlEnabled(),
			oidc: this.licenseState.isOidcLicensed(),
			mfaEnforcement: this.licenseState.isMFAEnforcementLicensed(),
			advancedExecutionFilters: this.license.isAdvancedExecutionFiltersEnabled(),
			variables: this.license.isVariablesEnabled(),
			sourceControl: this.license.isSourceControlLicensed(),
			externalSecrets: this.license.isExternalSecretsEnabled(),
			showNonProdBanner: this.license.isLicensed(constants_1.LICENSE_FEATURES.SHOW_NON_PROD_BANNER),
			debugInEditor: this.license.isDebugInEditorLicensed(),
			binaryDataS3: isS3Available && isS3Selected && isS3Licensed,
			workflowHistory:
				this.license.isWorkflowHistoryLicensed() && this.globalConfig.workflowHistory.enabled,
			workerView: this.license.isWorkerViewLicensed(),
			advancedPermissions: this.license.isAdvancedPermissionsLicensed(),
			apiKeyScopes: this.license.isApiKeyScopesEnabled(),
		});
		if (this.license.isLdapEnabled()) {
			Object.assign(this.settings.sso.ldap, {
				loginLabel: (0, helpers_ee_1.getLdapLoginLabel)(),
				loginEnabled: this.globalConfig.sso.ldap.loginEnabled,
			});
		}
		if (this.license.isSamlEnabled()) {
			Object.assign(this.settings.sso.saml, {
				loginLabel: (0, saml_helpers_1.getSamlLoginLabel)(),
				loginEnabled: this.globalConfig.sso.saml.loginEnabled,
			});
		}
		if (this.licenseState.isOidcLicensed()) {
			Object.assign(this.settings.sso.oidc, {
				loginEnabled: this.globalConfig.sso.oidc.loginEnabled,
			});
		}
		if (this.license.isVariablesEnabled()) {
			this.settings.variables.limit = this.license.getVariablesLimit();
		}
		if (this.globalConfig.workflowHistory.enabled && this.license.isWorkflowHistoryLicensed()) {
			Object.assign(this.settings.workflowHistory, {
				pruneTime: (0, workflow_history_helper_ee_1.getWorkflowHistoryPruneTime)(),
				licensePruneTime: (0, workflow_history_helper_ee_1.getWorkflowHistoryLicensePruneTime)(),
			});
		}
		if (this.communityPackagesService) {
			this.settings.missingPackages = this.communityPackagesService.hasMissingPackages;
		}
		if (isAiAssistantEnabled) {
			this.settings.aiAssistant.enabled = isAiAssistantEnabled;
		}
		if (isAskAiEnabled) {
			this.settings.askAi.enabled = isAskAiEnabled;
		}
		if (isAiCreditsEnabled) {
			this.settings.aiCredits.enabled = isAiCreditsEnabled;
			this.settings.aiCredits.credits = this.license.getAiCredits();
		}
		this.settings.mfa.enabled = this.globalConfig.mfa.enabled;
		this.settings.mfa.enforced = this.mfaService.isMFAEnforced();
		this.settings.executionMode = config_2.default.getEnv('executions.mode');
		this.settings.binaryDataMode = this.binaryDataConfig.mode;
		this.settings.enterprise.projects.team.limit = this.license.getTeamProjectLimit();
		this.settings.folders.enabled = this.license.isFoldersEnabled();
		this.settings.evaluation.quota = this.licenseState.getMaxWorkflowsWithEvaluations();
		this.settings.envFeatureFlags = this.collectEnvFeatureFlags();
		return this.settings;
	}
	getModuleSettings() {
		return Object.fromEntries(this.moduleRegistry.settings);
	}
	writeStaticJSON(name, data) {
		const { staticCacheDir } = this.instanceSettings;
		const filePath = path_1.default.join(staticCacheDir, `types/${name}.json`);
		const stream = (0, fs_1.createWriteStream)(filePath, 'utf-8');
		stream.write('[\n');
		data.forEach((entry, index) => {
			stream.write(JSON.stringify(entry));
			if (index !== data.length - 1) stream.write(',');
			stream.write('\n');
		});
		stream.write(']\n');
		stream.end();
	}
	overwriteCredentialsProperties() {
		const { credentials } = this.loadNodesAndCredentials.types;
		const credentialsOverwrites = this.credentialsOverwrites.getAll();
		for (const credential of credentials) {
			const overwrittenProperties = [];
			this.credentialTypes
				.getParentTypes(credential.name)
				.reverse()
				.map((name) => credentialsOverwrites[name])
				.forEach((overwrite) => {
					if (overwrite) overwrittenProperties.push(...Object.keys(overwrite));
				});
			if (credential.name in credentialsOverwrites) {
				overwrittenProperties.push(...Object.keys(credentialsOverwrites[credential.name]));
			}
			if (overwrittenProperties.length) {
				credential.__overwrittenProperties = (0, uniq_1.default)(overwrittenProperties);
			}
		}
	}
};
exports.FrontendService = FrontendService;
exports.FrontendService = FrontendService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			config_1.GlobalConfig,
			backend_common_1.Logger,
			load_nodes_and_credentials_1.LoadNodesAndCredentials,
			credential_types_1.CredentialTypes,
			credentials_overwrites_1.CredentialsOverwrites,
			license_1.License,
			email_1.UserManagementMailer,
			n8n_core_1.InstanceSettings,
			url_service_1.UrlService,
			config_1.SecurityConfig,
			push_config_1.PushConfig,
			n8n_core_1.BinaryDataConfig,
			backend_common_1.LicenseState,
			backend_common_1.ModuleRegistry,
			mfa_service_1.MfaService,
		]),
	],
	FrontendService,
);
//# sourceMappingURL=frontend.service.js.map
