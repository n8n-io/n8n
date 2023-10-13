import { Container, Service } from 'typedi';
import uniq from 'lodash/uniq';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';

import type {
	ICredentialType,
	IN8nUISettings,
	INodeTypeBaseDescription,
	ITelemetrySettings,
} from 'n8n-workflow';

import { GENERATED_STATIC_DIR, LICENSE_FEATURES } from '@/constants';
import { CredentialsOverwrites } from '@/CredentialsOverwrites';
import { CredentialTypes } from '@/CredentialTypes';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { License } from '@/License';
import { getInstanceBaseUrl, isEmailSetUp } from '@/UserManagement/UserManagementHelper';
import * as WebhookHelpers from '@/WebhookHelpers';
import { LoggerProxy } from 'n8n-workflow';
import config from '@/config';
import { getCurrentAuthenticationMethod } from '@/sso/ssoHelpers';
import { getLdapLoginLabel } from '@/Ldap/helpers';
import { getSamlLoginLabel } from '@/sso/saml/samlHelpers';
import { getVariablesLimit } from '@/environments/variables/enviromentHelpers';
import {
	getWorkflowHistoryLicensePruneTime,
	getWorkflowHistoryPruneTime,
} from '@/workflows/workflowHistory/workflowHistoryHelper.ee';

@Service()
export class FrontendService {
	settings: IN8nUISettings;

	constructor(
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly credentialTypes: CredentialTypes,
		private readonly credentialsOverwrites: CredentialsOverwrites,
		private readonly license: License,
	) {
		this.initSettings();
	}

	private initSettings() {
		const instanceBaseUrl = getInstanceBaseUrl();
		const restEndpoint = config.getEnv('endpoints.rest');

		const telemetrySettings: ITelemetrySettings = {
			enabled: config.getEnv('diagnostics.enabled'),
		};

		if (telemetrySettings.enabled) {
			const conf = config.getEnv('diagnostics.config.frontend');
			const [key, url] = conf.split(';');

			if (!key || !url) {
				LoggerProxy.warn('Diagnostics frontend config is invalid');
				telemetrySettings.enabled = false;
			}

			telemetrySettings.config = { key, url };
		}

		this.settings = {
			endpointWebhook: config.getEnv('endpoints.webhook'),
			endpointWebhookTest: config.getEnv('endpoints.webhookTest'),
			saveDataErrorExecution: config.getEnv('executions.saveDataOnError'),
			saveDataSuccessExecution: config.getEnv('executions.saveDataOnSuccess'),
			saveManualExecutions: config.getEnv('executions.saveDataManualExecutions'),
			executionTimeout: config.getEnv('executions.timeout'),
			maxExecutionTimeout: config.getEnv('executions.maxTimeout'),
			workflowCallerPolicyDefaultOption: config.getEnv('workflows.callerPolicyDefaultOption'),
			timezone: config.getEnv('generic.timezone'),
			urlBaseWebhook: WebhookHelpers.getWebhookBaseUrl(),
			urlBaseEditor: instanceBaseUrl,
			versionCli: '',
			releaseChannel: config.getEnv('generic.releaseChannel'),
			oauthCallbackUrls: {
				oauth1: `${instanceBaseUrl}/${restEndpoint}/oauth1-credential/callback`,
				oauth2: `${instanceBaseUrl}/${restEndpoint}/oauth2-credential/callback`,
			},
			versionNotifications: {
				enabled: config.getEnv('versionNotifications.enabled'),
				endpoint: config.getEnv('versionNotifications.endpoint'),
				infoUrl: config.getEnv('versionNotifications.infoUrl'),
			},
			instanceId: '',
			telemetry: telemetrySettings,
			posthog: {
				enabled: config.getEnv('diagnostics.enabled'),
				apiHost: config.getEnv('diagnostics.config.posthog.apiHost'),
				apiKey: config.getEnv('diagnostics.config.posthog.apiKey'),
				autocapture: false,
				disableSessionRecording: config.getEnv(
					'diagnostics.config.posthog.disableSessionRecording',
				),
				debug: config.getEnv('logs.level') === 'debug',
			},
			personalizationSurveyEnabled:
				config.getEnv('personalization.enabled') && config.getEnv('diagnostics.enabled'),
			defaultLocale: config.getEnv('defaultLocale'),
			userManagement: {
				quota: this.license.getUsersLimit(),
				showSetupOnFirstLoad: !config.getEnv('userManagement.isInstanceOwnerSetUp'),
				smtpSetup: isEmailSetUp(),
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
				enabled: !config.get('publicApi.disabled') && !this.license.isAPIDisabled(),
				latestVersion: 1,
				path: config.getEnv('publicApi.path'),
				swaggerUi: {
					enabled: !config.getEnv('publicApi.swaggerUi.disabled'),
				},
			},
			workflowTagsDisabled: config.getEnv('workflowTagsDisabled'),
			logLevel: config.getEnv('logs.level'),
			hiringBannerEnabled: config.getEnv('hiringBanner.enabled'),
			templates: {
				enabled: config.getEnv('templates.enabled'),
				host: config.getEnv('templates.host'),
			},
			onboardingCallPromptEnabled: config.getEnv('onboardingCallPrompt.enabled'),
			executionMode: config.getEnv('executions.mode'),
			pushBackend: config.getEnv('push.backend'),
			communityNodesEnabled: config.getEnv('nodes.communityPackages.enabled'),
			deployment: {
				type: config.getEnv('deployment.type'),
			},
			isNpmAvailable: false,
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
			},
			mfa: {
				enabled: false,
			},
			hideUsagePage: config.getEnv('hideUsagePage'),
			license: {
				environment: config.getEnv('license.tenantId') === 1 ? 'production' : 'staging',
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
			ai: {
				enabled: config.getEnv('ai.enabled'),
			},
			workflowHistory: {
				pruneTime: -1,
				licensePruneTime: -1,
			},
		};
	}

	async generateTypes() {
		this.overwriteCredentialsProperties();

		// pre-render all the node and credential types as static json files
		await mkdir(path.join(GENERATED_STATIC_DIR, 'types'), { recursive: true });
		const { credentials, nodes } = this.loadNodesAndCredentials.types;
		this.writeStaticJSON('nodes', nodes);
		this.writeStaticJSON('credentials', credentials);
	}

	async getSettings(): Promise<IN8nUISettings> {
		const restEndpoint = config.getEnv('endpoints.rest');

		// Update all urls, in case `WEBHOOK_URL` was updated by `--tunnel`
		const instanceBaseUrl = getInstanceBaseUrl();
		this.settings.urlBaseWebhook = WebhookHelpers.getWebhookBaseUrl();
		this.settings.urlBaseEditor = instanceBaseUrl;
		this.settings.oauthCallbackUrls = {
			oauth1: `${instanceBaseUrl}/${restEndpoint}/oauth1-credential/callback`,
			oauth2: `${instanceBaseUrl}/${restEndpoint}/oauth2-credential/callback`,
		};

		// refresh user management status
		Object.assign(this.settings.userManagement, {
			quota: this.license.getUsersLimit(),
			authenticationMethod: getCurrentAuthenticationMethod(),
			showSetupOnFirstLoad:
				!config.getEnv('userManagement.isInstanceOwnerSetUp') &&
				!config.getEnv('deployment.type').startsWith('desktop_'),
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

		if (config.getEnv('nodes.communityPackages.enabled')) {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			const { CommunityPackagesService } = await import('@/services/communityPackages.service');
			this.settings.missingPackages = Container.get(CommunityPackagesService).hasMissingPackages;
		}

		this.settings.mfa.enabled = config.get('mfa.enabled');

		return this.settings;
	}

	addToSettings(newSettings: Record<string, unknown>) {
		this.settings = { ...this.settings, ...newSettings };
	}

	private writeStaticJSON(name: string, data: INodeTypeBaseDescription[] | ICredentialType[]) {
		const filePath = path.join(GENERATED_STATIC_DIR, `types/${name}.json`);
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
