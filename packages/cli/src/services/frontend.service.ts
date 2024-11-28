import type { FrontendSettings, ITelemetrySettings } from '@n8n/api-types';
import { GlobalConfig, FrontendConfig, SecurityConfig } from '@n8n/config';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import uniq from 'lodash/uniq';
import { InstanceSettings } from 'n8n-core';
import type { ICredentialType, INodeTypeBaseDescription } from 'n8n-workflow';
import fs from 'node:fs';
import path from 'path';
import { Container, Service } from 'typedi';

import config from '@/config';
import { inE2ETests, LICENSE_FEATURES, N8N_VERSION } from '@/constants';
import { CredentialTypes } from '@/credential-types';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { getVariablesLimit } from '@/environments/variables/environment-helpers';
import { getLdapLoginLabel } from '@/ldap/helpers.ee';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Logger } from '@/logging/logger.service';
import { isApiEnabled } from '@/public-api';
import type { CommunityPackagesService } from '@/services/community-packages.service';
import { getSamlLoginLabel } from '@/sso/saml/saml-helpers';
import { getCurrentAuthenticationMethod } from '@/sso/sso-helpers';
import { UserManagementMailer } from '@/user-management/email';
import {
	getWorkflowHistoryLicensePruneTime,
	getWorkflowHistoryPruneTime,
} from '@/workflows/workflow-history/workflow-history-helper.ee';

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
		private readonly frontendConfig: FrontendConfig,
	) {
		loadNodesAndCredentials.addPostProcessor(async () => await this.generateTypes());
		void this.generateTypes();

		this.initSettings();

		if (this.globalConfig.nodes.communityPackages.enabled) {
			void import('@/services/community-packages.service').then(({ CommunityPackagesService }) => {
				this.communityPackagesService = Container.get(CommunityPackagesService);
			});
		}
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

			if (!key || !url) {
				this.logger.warn('Diagnostics frontend config is invalid');
				telemetrySettings.enabled = false;
			}

			telemetrySettings.config = { key, url };
		}

		this.settings = {
			inE2ETests,
			isDocker: this.isDocker(),
			databaseType: this.globalConfig.database.type,
			previewMode: process.env.N8N_PREVIEW_MODE === 'true',
			endpointForm: this.globalConfig.endpoints.form,
			endpointFormTest: this.globalConfig.endpoints.formTest,
			endpointFormWaiting: this.globalConfig.endpoints.formWaiting,
			endpointWebhook: this.globalConfig.endpoints.webhook,
			endpointWebhookTest: this.globalConfig.endpoints.webhookTest,
			endpointWebhookWaiting: this.globalConfig.endpoints.webhookWaiting,
			saveDataErrorExecution: config.getEnv('executions.saveDataOnError'),
			saveDataSuccessExecution: config.getEnv('executions.saveDataOnSuccess'),
			saveManualExecutions: config.getEnv('executions.saveDataManualExecutions'),
			saveExecutionProgress: config.getEnv('executions.saveExecutionProgress'),
			executionTimeout: config.getEnv('executions.timeout'),
			maxExecutionTimeout: config.getEnv('executions.maxTimeout'),
			workflowCallerPolicyDefaultOption: this.globalConfig.workflows.callerPolicyDefaultOption,
			timezone: this.globalConfig.generic.timezone,
			urlBaseWebhook: this.urlService.getWebhookBaseUrl(),
			urlBaseEditor: instanceBaseUrl,
			binaryDataMode: config.getEnv('binaryDataManager.mode'),
			nodeJsVersion: process.version.replace(/^v/, ''),
			versionCli: N8N_VERSION,
			concurrency: config.getEnv('executions.concurrency.productionLimit'),
			authCookie: {
				secure: config.getEnv('secure_cookie'),
			},
			releaseChannel: this.globalConfig.generic.releaseChannel,
			oauthCallbackUrls: {
				oauth1: `${instanceBaseUrl}/${restEndpoint}/oauth1-credential/callback`,
				oauth2: `${instanceBaseUrl}/${restEndpoint}/oauth2-credential/callback`,
			},
			versionNotifications: {
				enabled: this.globalConfig.versionNotifications.enabled,
				endpoint: this.globalConfig.versionNotifications.endpoint,
				infoUrl: this.globalConfig.versionNotifications.infoUrl,
			},
			instanceId: this.instanceSettings.instanceId,
			telemetry: telemetrySettings,
			posthog: {
				enabled: this.globalConfig.diagnostics.enabled,
				apiHost: this.globalConfig.diagnostics.posthogConfig.apiHost,
				apiKey: this.globalConfig.diagnostics.posthogConfig.apiKey,
				autocapture: false,
				disableSessionRecording: config.getEnv('deployment.type') !== 'cloud',
				debug: this.globalConfig.logging.level === 'debug',
			},
			personalizationSurveyEnabled:
				config.getEnv('personalization.enabled') && this.globalConfig.diagnostics.enabled,
			defaultLocale: config.getEnv('defaultLocale'),
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
			},
			publicApi: {
				enabled: isApiEnabled(),
				latestVersion: 1,
				path: this.globalConfig.publicApi.path,
				swaggerUi: {
					enabled: !this.globalConfig.publicApi.swaggerUiDisabled,
				},
			},
			workflowTagsDisabled: config.getEnv('workflowTagsDisabled'),
			logLevel: this.globalConfig.logging.level,
			hiringBannerEnabled: config.getEnv('hiringBanner.enabled'),
			aiAssistant: {
				enabled: false,
			},
			templates: {
				enabled: this.globalConfig.templates.enabled,
				host: this.globalConfig.templates.host,
			},
			executionMode: config.getEnv('executions.mode'),
			pushBackend: config.getEnv('push.backend'),
			communityNodesEnabled: this.globalConfig.nodes.communityPackages.enabled,
			deployment: {
				type: config.getEnv('deployment.type'),
			},
			allowedModules: {
				builtIn: process.env.NODE_FUNCTION_ALLOW_BUILTIN?.split(',') ?? undefined,
				external: process.env.NODE_FUNCTION_ALLOW_EXTERNAL?.split(',') ?? undefined,
			},
			enterprise: {
				sharing: false,
				ldap: false,
				saml: false,
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
				projects: {
					team: {
						limit: 0,
					},
				},
			},
			mfa: {
				enabled: false,
			},
			hideUsagePage: config.getEnv('hideUsagePage'),
			license: {
				consumerId: 'unknown',
				environment: this.globalConfig.license.tenantId === 1 ? 'production' : 'staging',
			},
			variables: {
				limit: 0,
			},
			expressions: {
				evaluator: config.getEnv('expression.evaluator'),
			},
			banners: {
				dismissed: [],
			},
			askAi: {
				enabled: false,
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
			betaFeatures: this.frontendConfig.betaFeatures,
			virtualSchemaView: config.getEnv('virtualSchemaView'),
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

		const isS3Selected = config.getEnv('binaryDataManager.mode') === 's3';
		const isS3Available = config.getEnv('binaryDataManager.availableModes').includes('s3');
		const isS3Licensed = this.license.isBinaryDataS3Licensed();
		const isAiAssistantEnabled = this.license.isAiAssistantEnabled();
		const isAskAiEnabled = this.license.isAskAiEnabled();

		this.settings.license.planName = this.license.getPlanName();
		this.settings.license.consumerId = this.license.getConsumerId();

		// refresh enterprise status
		Object.assign(this.settings.enterprise, {
			sharing: this.license.isSharingEnabled(),
			logStreaming: this.license.isLogStreamingEnabled(),
			ldap: this.license.isLdapEnabled(),
			saml: this.license.isSamlEnabled(),
			advancedExecutionFilters: this.license.isAdvancedExecutionFiltersEnabled(),
			variables: this.license.isVariablesEnabled(),
			sourceControl: this.license.isSourceControlLicensed(),
			externalSecrets: this.license.isExternalSecretsEnabled(),
			showNonProdBanner: this.license.isFeatureEnabled(LICENSE_FEATURES.SHOW_NON_PROD_BANNER),
			debugInEditor: this.license.isDebugInEditorLicensed(),
			binaryDataS3: isS3Available && isS3Selected && isS3Licensed,
			workflowHistory:
				this.license.isWorkflowHistoryLicensed() && config.getEnv('workflowHistory.enabled'),
			workerView: this.license.isWorkerViewLicensed(),
			advancedPermissions: this.license.isAdvancedPermissionsLicensed(),
		});

		if (this.license.isLdapEnabled()) {
			Object.assign(this.settings.sso.ldap, {
				loginLabel: getLdapLoginLabel(),
				loginEnabled: config.getEnv('sso.ldap.loginEnabled'),
			});
		}

		if (this.license.isSamlEnabled()) {
			Object.assign(this.settings.sso.saml, {
				loginLabel: getSamlLoginLabel(),
				loginEnabled: config.getEnv('sso.saml.loginEnabled'),
			});
		}

		if (this.license.isVariablesEnabled()) {
			this.settings.variables.limit = getVariablesLimit();
		}

		if (this.license.isWorkflowHistoryLicensed() && config.getEnv('workflowHistory.enabled')) {
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

		this.settings.mfa.enabled = config.get('mfa.enabled');

		this.settings.executionMode = config.getEnv('executions.mode');

		this.settings.binaryDataMode = config.getEnv('binaryDataManager.mode');

		this.settings.enterprise.projects.team.limit = this.license.getTeamProjectLimit();

		return this.settings;
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

	/**
	 * Whether this instance is running inside a Docker container.
	 *
	 * Based on: https://github.com/sindresorhus/is-docker
	 */
	private isDocker() {
		try {
			return (
				fs.existsSync('/.dockerenv') ||
				fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker')
			);
		} catch {
			return false;
		}
	}
}
