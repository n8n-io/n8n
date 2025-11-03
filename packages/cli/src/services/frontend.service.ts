import type {
	FrontendSettings,
	IEnterpriseSettings,
	ITelemetrySettings,
	N8nEnvFeatFlags,
} from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { GlobalConfig, SecurityConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import uniq from 'lodash/uniq';
import { BinaryDataConfig, InstanceSettings } from 'n8n-core';
import type { ICredentialType, INodeTypeBaseDescription } from 'n8n-workflow';
import path from 'path';

import { UrlService } from './url.service';

import config from '@/config';
import { inE2ETests, N8N_VERSION } from '@/constants';
import { CredentialTypes } from '@/credential-types';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { getLdapLoginLabel } from '@/ldap.ee/helpers.ee';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { MfaService } from '@/mfa/mfa.service';
import { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';
import type { CommunityPackagesService } from '@/modules/community-packages/community-packages.service';
import { isApiEnabled } from '@/public-api';
import { PushConfig } from '@/push/push.config';
import { getSamlLoginLabel } from '@/sso.ee/saml/saml-helpers';
import { getCurrentAuthenticationMethod } from '@/sso.ee/sso-helpers';
import { UserManagementMailer } from '@/user-management/email';
import { getWorkflowHistoryPruneTime } from '@/workflows/workflow-history.ee/workflow-history-helper.ee';

export type PublicEnterpriseSettings = Pick<IEnterpriseSettings, 'saml' | 'ldap' | 'oidc'>;

export type PublicFrontendSettings = Pick<
	FrontendSettings,
	| 'settingsMode'
	| 'instanceId'
	| 'defaultLocale'
	| 'versionCli'
	| 'releaseChannel'
	| 'userManagement'
	| 'sso'
	| 'mfa'
	| 'authCookie'
	| 'oauthCallbackUrls'
	| 'previewMode'
	| 'telemetry'
> & {
	enterprise: PublicEnterpriseSettings;
};

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
		private readonly mailer: UserManagementMailer,
		private readonly instanceSettings: InstanceSettings,
		private readonly urlService: UrlService,
		private readonly securityConfig: SecurityConfig,
		private readonly pushConfig: PushConfig,
		private readonly binaryDataConfig: BinaryDataConfig,
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
			settingsMode: 'authenticated',
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
			nodeEnv: process.env.NODE_ENV,
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
			instanceId: this.instanceSettings.instanceId,
			telemetry: telemetrySettings,
			posthog: {
				enabled: this.globalConfig.diagnostics.enabled,
				apiHost: this.globalConfig.diagnostics.posthogConfig.apiHost,
				apiKey: this.globalConfig.diagnostics.posthogConfig.apiKey,
				autocapture: false,
				disableSessionRecording: this.globalConfig.deployment.type !== 'cloud',
				proxy: `${instanceBaseUrl}/${restEndpoint}/posthog`,
				debug: this.globalConfig.logging.level === 'debug',
			},
			personalizationSurveyEnabled:
				this.globalConfig.personalization.enabled && this.globalConfig.diagnostics.enabled,
			defaultLocale: this.globalConfig.defaultLocale,
			userManagement: {
				quota: -1,
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
					loginEnabled: this.globalConfig.sso.ldap.loginEnabled,
					loginLabel: this.globalConfig.sso.ldap.loginLabel,
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
				setup: false,
			},
			templates: {
				enabled: this.globalConfig.templates.enabled,
				host: this.globalConfig.templates.host,
			},
			executionMode: this.globalConfig.executions.mode,
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
				// All enterprise features enabled - license system removed
				sharing: true,
				ldap: true,
				saml: true,
				oidc: true,
				mfaEnforcement: true,
				logStreaming: true,
				advancedExecutionFilters: true,
				variables: true,
				sourceControl: true,
				auditLogs: true,
				externalSecrets: true,
				debugInEditor: true,
				binaryDataS3: true,
				workflowHistory: true,
				workerView: true,
				advancedPermissions: true,
				apiKeyScopes: true,
				workflowDiffs: true,
				provisioning: true,
				projects: {
					team: {
						limit: -1, // Unlimited
					},
				},
				customRoles: true,
			},
			mfa: {
				enabled: false,
				enforced: false,
			},
			hideUsagePage: this.globalConfig.hideUsagePage,
			variables: {
				limit: 0,
			},
			askAi: {
				enabled: false,
			},
			aiBuilder: {
				enabled: false,
				setup: false,
			},
			aiCredits: {
				enabled: false,
				credits: 0,
			},
			workflowHistory: {
				pruneTime: -1,
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
			folders: {
				enabled: false,
			},
			evaluation: {
				quota: -1,
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
			quota: -1,
			authenticationMethod: getCurrentAuthenticationMethod(),
			showSetupOnFirstLoad: !config.getEnv('userManagement.isInstanceOwnerSetUp'),
		});

		try {
			this.settings.easyAIWorkflowOnboarded = config.getEnv('easyAIWorkflowOnboarded') ?? false;
		} catch {
			this.settings.easyAIWorkflowOnboarded = false;
		}

		const isS3Selected = this.binaryDataConfig.mode === 's3';
		const isS3Available = this.binaryDataConfig.availableModes.includes('s3');
		const isS3Licensed = true;
		const isAiAssistantEnabled = true;
		const isAskAiEnabled = true;
		const isAiCreditsEnabled = true;
		const isAiBuilderEnabled = true;

		// License system removed - no plan/consumerId needed

		// refresh enterprise status
		Object.assign(this.settings.enterprise, {
			sharing: true,
			logStreaming: true,
			ldap: true,
			saml: true,
			oidc: true,
			mfaEnforcement: true,
			provisioning: true, // temporarily disabled until this feature is ready for release
			advancedExecutionFilters: true,
			variables: true,
			sourceControl: true,
			externalSecrets: true,
			debugInEditor: true,
			binaryDataS3: isS3Available && isS3Selected && isS3Licensed,
			workflowHistory: this.globalConfig.workflowHistory.enabled,
			workerView: true,
			advancedPermissions: true,
			apiKeyScopes: true,
			workflowDiffs: true,
			customRoles: true,
		});

		Object.assign(this.settings.sso.ldap, {
			loginLabel: getLdapLoginLabel(),
			loginEnabled: this.globalConfig.sso.ldap.loginEnabled,
		});

		Object.assign(this.settings.sso.saml, {
			loginLabel: getSamlLoginLabel(),
			loginEnabled: this.globalConfig.sso.saml.loginEnabled,
		});

		Object.assign(this.settings.sso.oidc, {
			loginEnabled: this.globalConfig.sso.oidc.loginEnabled,
		});

		this.settings.variables.limit = -1;

		if (this.globalConfig.workflowHistory.enabled) {
			Object.assign(this.settings.workflowHistory, {
				pruneTime: getWorkflowHistoryPruneTime(),
				licensePruneTime: getWorkflowHistoryPruneTime(),
			});
		}

		if (this.communityPackagesService) {
			this.settings.missingPackages = this.communityPackagesService.hasMissingPackages;
		}

		if (isAiAssistantEnabled) {
			this.settings.aiAssistant.enabled = isAiAssistantEnabled;
			this.settings.aiAssistant.setup =
				!!this.globalConfig.aiAssistant.baseUrl || !!process.env.N8N_AI_ANTHROPIC_KEY;
		}

		if (isAskAiEnabled) {
			this.settings.askAi.enabled = isAskAiEnabled;
		}

		if (isAiCreditsEnabled) {
			this.settings.aiCredits.enabled = isAiCreditsEnabled;
			this.settings.aiCredits.credits = 999999;
		}

		if (isAiBuilderEnabled) {
			this.settings.aiBuilder.enabled = isAiBuilderEnabled;
			this.settings.aiBuilder.setup =
				!!this.globalConfig.aiAssistant.baseUrl || !!this.globalConfig.aiBuilder.apiKey;
		}

		this.settings.mfa.enabled = this.globalConfig.mfa.enabled;

		// TODO: read from settings
		this.settings.mfa.enforced = this.mfaService.isMFAEnforced();

		this.settings.executionMode = this.globalConfig.executions.mode;

		this.settings.binaryDataMode = this.binaryDataConfig.mode;

		this.settings.enterprise.projects.team.limit = -1;

		this.settings.folders.enabled = true;

		// Refresh evaluation settings
		this.settings.evaluation.quota = -1;

		// Refresh environment feature flags
		this.settings.envFeatureFlags = this.collectEnvFeatureFlags();

		return this.settings;
	}

	/**
	 * Only add settings that are absolutely necessary for non-authenticated pages
	 * @returns Public settings for unauthenticated users
	 */
	getPublicSettings(): PublicFrontendSettings {
		// Get full settings to ensure all required properties are initialized
		const {
			instanceId,
			defaultLocale,
			versionCli,
			releaseChannel,
			userManagement,
			sso,
			mfa,
			authCookie,
			oauthCallbackUrls,
			previewMode,
			telemetry,
			enterprise,
		} = this.getSettings();

		const { saml, ldap, oidc } = enterprise;

		return {
			settingsMode: 'public',
			instanceId,
			defaultLocale,
			versionCli,
			releaseChannel,
			userManagement,
			sso,
			mfa,
			authCookie,
			oauthCallbackUrls,
			previewMode,
			telemetry,
			enterprise: { saml, ldap, oidc },
		};
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
