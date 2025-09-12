import type { FrontendSettings, ITelemetrySettings, N8nEnvFeatFlags } from '@n8n/api-types';
import { LicenseState, Logger, ModuleRegistry } from '@n8n/backend-common';
import { GlobalConfig, SecurityConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import { Container, Service } from '@n8n/di';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import uniq from 'lodash/uniq';
import { BinaryDataConfig, InstanceSettings } from 'n8n-core';
import type { ICredentialType, INodeTypeBaseDescription } from 'n8n-workflow';
import path from 'path';

import config from '@/config';
import { inE2ETests, N8N_VERSION } from '@/constants';
import { CredentialTypes } from '@/credential-types';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { getLdapLoginLabel } from '@/ldap.ee/helpers.ee';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { MfaService } from '@/mfa/mfa.service';
import { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';
import type { CommunityPackagesService } from '@/modules/community-packages/community-packages.service';
import { isApiEnabled } from '@/public-api';
import { PushConfig } from '@/push/push.config';
import { getSamlLoginLabel } from '@/sso.ee/saml/saml-helpers';
import { getCurrentAuthenticationMethod } from '@/sso.ee/sso-helpers';
import { UserManagementMailer } from '@/user-management/email';
import {
	getWorkflowHistoryLicensePruneTime,
	getWorkflowHistoryPruneTime,
} from '@/workflows/workflow-history.ee/workflow-history-helper.ee';

import { UrlService } from './url.service';

@Service()
export class FrontendService {
	settings: FrontendSettings;

	private communityPackagesService?: CommunityPackagesService;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly credentialTypes: CredentialTypes,
		private readonly credentialsOverwrites: CredentialsOverwrites,
		private readonly license: License,
		private readonly mailer: UserManagementMailer,
		private readonly instanceSettings: InstanceSettings,
		private readonly urlService: UrlService,
		private readonly securityConfig: SecurityConfig,
		private readonly pushConfig: PushConfig,
		private readonly binaryDataConfig: BinaryDataConfig,
		private readonly licenseState: LicenseState,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly mfaService: MfaService,
	) {
		loadNodesAndCredentials.addPostProcessor(async () => await this.generateTypes());
		void this.generateTypes();

		this.initSettings();

		// @TODO: Move to community-packages module
		if (Container.get(CommunityPackagesConfig).enabled) {
			void import('@/modules/community-packages/community-packages.service').then(
				({ CommunityPackagesService }) => {
					this.communityPackagesService = Container.get(CommunityPackagesService);
				},
			);
		}
	}

	private collectEnvFeatureFlags(): N8nEnvFeatFlags {
		const envFeatureFlags: N8nEnvFeatFlags = {};

		for (const [key, value] of Object.entries(process.env)) {
			if (key.startsWith('N8N_ENV_FEAT_') && value !== undefined) {
				envFeatureFlags[key as keyof N8nEnvFeatFlags] = value;
			}
		}

		return envFeatureFlags;
	}

	private initSettings() {
		const instanceBaseUrl = this.urlService.getInstanceBaseUrl();
		const restEndpoint = this.globalConfig.endpoints.rest;

		const telemetrySettings: ITelemetrySettings = {
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
			inE2ETests,
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
			saveDataErrorExecution: this.globalConfig.executions.saveDataOnError,
			saveDataSuccessExecution: this.globalConfig.executions.saveDataOnSuccess,
			saveManualExecutions: this.globalConfig.executions.saveDataManualExecutions,
			saveExecutionProgress: this.globalConfig.executions.saveExecutionProgress,
			executionTimeout: this.globalConfig.executions.timeout,
			maxExecutionTimeout: this.globalConfig.executions.maxTimeout,
			workflowCallerPolicyDefaultOption: this.globalConfig.workflows.callerPolicyDefaultOption,
			timezone: this.globalConfig.generic.timezone,
			urlBaseWebhook: this.urlService.getWebhookBaseUrl(),
			urlBaseEditor: instanceBaseUrl,
			binaryDataMode: this.binaryDataConfig.mode,
			nodeJsVersion: process.version.replace(/^v/, ''),
			versionCli: N8N_VERSION,
			concurrency: this.globalConfig.executions.concurrency.productionLimit,
			isNativePythonRunnerEnabled:
				this.globalConfig.taskRunners.enabled &&
				this.globalConfig.taskRunners.isNativePythonRunnerEnabled,
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
				showSetupOnFirstLoad: !config.getEnv('userManagement.isInstanceOwnerSetUp'),
				smtpSetup: this.mailer.isEmailSetUp,
				authenticationMethod: getCurrentAuthenticationMethod(),
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
			dataTables: {
				maxSize: this.globalConfig.dataTable.maxSize,
			},
			publicApi: {
				enabled: isApiEnabled(),
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
			executionMode: config.getEnv('executions.mode'),
			isMultiMain: this.instanceSettings.isMultiMain,
			pushBackend: this.pushConfig.backend,

			// @TODO: Move to community-packages module
			communityNodesEnabled: Container.get(CommunityPackagesConfig).enabled,
			unverifiedCommunityNodesEnabled: Container.get(CommunityPackagesConfig).unverifiedEnabled,

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
				workflowDiffs: false,
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
		// pre-render all the node and credential types as static json files
		await mkdir(path.join(staticCacheDir, 'types'), { recursive: true });
		const { credentials, nodes } = this.loadNodesAndCredentials.types;
		this.writeStaticJSON('nodes', nodes);
		this.writeStaticJSON('credentials', credentials);
	}

	getSettings(): FrontendSettings {
		const restEndpoint = this.globalConfig.endpoints.rest;

		// Update all urls, in case `WEBHOOK_URL` was updated by `--tunnel`
		const instanceBaseUrl = this.urlService.getInstanceBaseUrl();
		this.settings.urlBaseWebhook = this.urlService.getWebhookBaseUrl();
		this.settings.urlBaseEditor = instanceBaseUrl;
		this.settings.oauthCallbackUrls = {
			oauth1: `${instanceBaseUrl}/${restEndpoint}/oauth1-credential/callback`,
			oauth2: `${instanceBaseUrl}/${restEndpoint}/oauth2-credential/callback`,
		};

		// refresh user management status
		Object.assign(this.settings.userManagement, {
			quota: this.license.getUsersLimit(),
			authenticationMethod: getCurrentAuthenticationMethod(),
			showSetupOnFirstLoad: !config.getEnv('userManagement.isInstanceOwnerSetUp'),
		});

		let dismissedBanners: string[] = [];

		try {
			dismissedBanners = config.getEnv('ui.banners.dismissed') ?? [];
		} catch {
			// not yet in DB
		}

		this.settings.banners.dismissed = dismissedBanners;
		try {
			this.settings.easyAIWorkflowOnboarded = config.getEnv('easyAIWorkflowOnboarded') ?? false;
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

		// refresh enterprise status
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
			showNonProdBanner: this.license.isLicensed(LICENSE_FEATURES.SHOW_NON_PROD_BANNER),
			debugInEditor: this.license.isDebugInEditorLicensed(),
			binaryDataS3: isS3Available && isS3Selected && isS3Licensed,
			workflowHistory:
				this.license.isWorkflowHistoryLicensed() && this.globalConfig.workflowHistory.enabled,
			workerView: this.license.isWorkerViewLicensed(),
			advancedPermissions: this.license.isAdvancedPermissionsLicensed(),
			apiKeyScopes: this.license.isApiKeyScopesEnabled(),
			workflowDiffs: this.licenseState.isWorkflowDiffsLicensed(),
		});

		if (this.license.isLdapEnabled()) {
			Object.assign(this.settings.sso.ldap, {
				loginLabel: getLdapLoginLabel(),
				loginEnabled: this.globalConfig.sso.ldap.loginEnabled,
			});
		}

		if (this.license.isSamlEnabled()) {
			Object.assign(this.settings.sso.saml, {
				loginLabel: getSamlLoginLabel(),
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
				pruneTime: getWorkflowHistoryPruneTime(),
				licensePruneTime: getWorkflowHistoryLicensePruneTime(),
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

		// TODO: read from settings
		this.settings.mfa.enforced = this.mfaService.isMFAEnforced();

		this.settings.executionMode = config.getEnv('executions.mode');

		this.settings.binaryDataMode = this.binaryDataConfig.mode;

		this.settings.enterprise.projects.team.limit = this.license.getTeamProjectLimit();

		this.settings.folders.enabled = this.license.isFoldersEnabled();

		// Refresh evaluation settings
		this.settings.evaluation.quota = this.licenseState.getMaxWorkflowsWithEvaluations();

		// Refresh environment feature flags
		this.settings.envFeatureFlags = this.collectEnvFeatureFlags();

		return this.settings;
	}

	getModuleSettings() {
		return Object.fromEntries(this.moduleRegistry.settings);
	}

	private writeStaticJSON(name: string, data: INodeTypeBaseDescription[] | ICredentialType[]) {
		const { staticCacheDir } = this.instanceSettings;
		const filePath = path.join(staticCacheDir, `types/${name}.json`);
		const stream = createWriteStream(filePath, 'utf-8');
		stream.write('[\n');
		data.forEach((entry, index) => {
			stream.write(JSON.stringify(entry));
			if (index !== data.length - 1) stream.write(',');
			stream.write('\n');
		});
		stream.write(']\n');
		stream.end();
	}

	private overwriteCredentialsProperties() {
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
				credential.__overwrittenProperties = uniq(overwrittenProperties);
			}
		}
	}
}
