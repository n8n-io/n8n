/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import assert from 'assert';
import { exec as callbackExec } from 'child_process';
import { access as fsAccess } from 'fs/promises';
import os from 'os';
import { join as pathJoin, resolve as pathResolve, relative as pathRelative } from 'path';
import { createHmac } from 'crypto';
import { promisify } from 'util';
import cookieParser from 'cookie-parser';
import express from 'express';
import { engine as expressHandlebars } from 'express-handlebars';
import type { ServeStaticOptions } from 'serve-static';
import type { FindManyOptions, FindOptionsWhere } from 'typeorm';
import { Not, In } from 'typeorm';
import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import type { RequestOptions } from 'oauth-1.0a';
import clientOAuth1 from 'oauth-1.0a';

import {
	BinaryDataService,
	Credentials,
	LoadMappingOptions,
	LoadNodeParameterOptions,
	LoadNodeListSearch,
	UserSettings,
	FileNotFoundError,
} from 'n8n-core';

import type {
	INodeCredentials,
	INodeCredentialsDetails,
	INodeListSearchResult,
	INodeParameters,
	INodePropertyOptions,
	INodeTypeNameVersion,
	ITelemetrySettings,
	WorkflowExecuteMode,
	ICredentialTypes,
	ExecutionStatus,
	IExecutionsSummary,
	ResourceMapperFields,
	IN8nUISettings,
} from 'n8n-workflow';
import { LoggerProxy, jsonParse } from 'n8n-workflow';

// @ts-ignore
import timezones from 'google-timezones-json';
import history from 'connect-history-api-fallback';

import config from '@/config';
import { Queue } from '@/Queue';
import { getSharedWorkflowIds } from '@/WorkflowHelpers';

import { workflowsController } from '@/workflows/workflows.controller';
import {
	EDITOR_UI_DIST_DIR,
	GENERATED_STATIC_DIR,
	inDevelopment,
	inE2ETests,
	LICENSE_FEATURES,
	N8N_VERSION,
	RESPONSE_ERROR_MESSAGES,
	TEMPLATES_DIR,
} from '@/constants';
import { credentialsController } from '@/credentials/credentials.controller';
import { oauth2CredentialController } from '@/credentials/oauth2Credential.api';
import type {
	BinaryDataRequest,
	CurlHelper,
	ExecutionRequest,
	NodeListSearchRequest,
	NodeParameterOptionsRequest,
	OAuthRequest,
	ResourceMapperRequest,
	WorkflowRequest,
} from '@/requests';
import { registerController } from '@/decorators';
import {
	AuthController,
	LdapController,
	MeController,
	MFAController,
	NodesController,
	NodeTypesController,
	OwnerController,
	PasswordResetController,
	TagsController,
	TranslationController,
	UsersController,
	WorkflowStatisticsController,
} from '@/controllers';

import { ExternalSecretsController } from '@/ExternalSecrets/ExternalSecrets.controller.ee';
import { executionsController } from '@/executions/executions.controller';
import { isApiEnabled, loadPublicApiVersions } from '@/PublicApi';
import {
	getInstanceBaseUrl,
	isEmailSetUp,
	isSharingEnabled,
	whereClause,
} from '@/UserManagement/UserManagementHelper';
import { UserManagementMailer } from '@/UserManagement/email';
import * as Db from '@/Db';
import type {
	ICredentialsDb,
	ICredentialsOverwrite,
	IDiagnosticInfo,
	IExecutionsStopData,
} from '@/Interfaces';
import { ActiveExecutions } from '@/ActiveExecutions';
import {
	CredentialsHelper,
	getCredentialForUser,
	getCredentialWithoutUser,
} from '@/CredentialsHelper';
import { CredentialsOverwrites } from '@/CredentialsOverwrites';
import { CredentialTypes } from '@/CredentialTypes';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { NodeTypes } from '@/NodeTypes';
import * as ResponseHelper from '@/ResponseHelper';
import { WaitTracker } from '@/WaitTracker';
import * as WebhookHelpers from '@/WebhookHelpers';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import { toHttpNodeParameters } from '@/CurlConverterHelper';
import { EventBusController } from '@/eventbus/eventBus.controller';
import { EventBusControllerEE } from '@/eventbus/eventBus.controller.ee';
import { isLogStreamingEnabled } from '@/eventbus/MessageEventBus/MessageEventBusHelper';
import { licenseController } from './license/license.controller';
import { Push, setupPushServer, setupPushHandler } from '@/push';
import { setupAuthMiddlewares } from './middlewares';
import {
	getLdapLoginLabel,
	handleLdapInit,
	isLdapEnabled,
	isLdapLoginEnabled,
} from './Ldap/helpers';
import { AbstractServer } from './AbstractServer';
import { PostHogClient } from './posthog';
import { eventBus } from './eventbus';
import { Container } from 'typedi';
import { InternalHooks } from './InternalHooks';
import { License } from './License';
import {
	getStatusUsingPreviousExecutionStatusMethod,
	isAdvancedExecutionFiltersEnabled,
	isDebugInEditorLicensed,
} from './executions/executionHelpers';
import { getSamlLoginLabel, isSamlLoginEnabled, isSamlLicensed } from './sso/saml/samlHelpers';
import { SamlController } from './sso/saml/routes/saml.controller.ee';
import { SamlService } from './sso/saml/saml.service.ee';
import { variablesController } from './environments/variables/variables.controller';
import { LdapManager } from './Ldap/LdapManager.ee';
import { getVariablesLimit, isVariablesEnabled } from '@/environments/variables/enviromentHelpers';
import {
	getCurrentAuthenticationMethod,
	isLdapCurrentAuthenticationMethod,
	isSamlCurrentAuthenticationMethod,
} from './sso/ssoHelpers';
import { isExternalSecretsEnabled } from './ExternalSecrets/externalSecretsHelper.ee';
import { isSourceControlLicensed } from '@/environments/sourceControl/sourceControlHelper.ee';
import { SourceControlService } from '@/environments/sourceControl/sourceControl.service.ee';
import { SourceControlController } from '@/environments/sourceControl/sourceControl.controller.ee';
import { ExecutionRepository, SettingsRepository } from '@db/repositories';
import type { ExecutionEntity } from '@db/entities/ExecutionEntity';
import { TOTPService } from './Mfa/totp.service';
import { MfaService } from './Mfa/mfa.service';
import { handleMfaDisable, isMfaFeatureEnabled } from './Mfa/helpers';
import { JwtService } from './services/jwt.service';
import { RoleService } from './services/role.service';
import { UserService } from './services/user.service';
import { OrchestrationController } from './controllers/orchestration.controller';
import { isWorkflowHistoryEnabled } from './workflows/workflowHistory/workflowHistoryHelper.ee';
import { WorkflowHistoryController } from './workflows/workflowHistory/workflowHistory.controller.ee';

const exec = promisify(callbackExec);

export class Server extends AbstractServer {
	endpointPresetCredentials: string;

	waitTracker: WaitTracker;

	activeExecutionsInstance: ActiveExecutions;

	frontendSettings: IN8nUISettings;

	presetCredentialsLoaded: boolean;

	loadNodesAndCredentials: LoadNodesAndCredentials;

	nodeTypes: NodeTypes;

	credentialTypes: ICredentialTypes;

	postHog: PostHogClient;

	push: Push;

	binaryDataService: BinaryDataService;

	constructor() {
		super('main');

		this.app.engine('handlebars', expressHandlebars({ defaultLayout: false }));
		this.app.set('view engine', 'handlebars');
		this.app.set('views', TEMPLATES_DIR);

		this.testWebhooksEnabled = true;
		this.webhooksEnabled = !config.getEnv('endpoints.disableProductionWebhooksOnMainProcess');

		const urlBaseWebhook = WebhookHelpers.getWebhookBaseUrl();
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

		// Define it here to avoid calling the function multiple times
		const instanceBaseUrl = getInstanceBaseUrl();

		this.frontendSettings = {
			endpointWebhook: this.endpointWebhook,
			endpointWebhookTest: this.endpointWebhookTest,
			saveDataErrorExecution: config.getEnv('executions.saveDataOnError'),
			saveDataSuccessExecution: config.getEnv('executions.saveDataOnSuccess'),
			saveManualExecutions: config.getEnv('executions.saveDataManualExecutions'),
			executionTimeout: config.getEnv('executions.timeout'),
			maxExecutionTimeout: config.getEnv('executions.maxTimeout'),
			workflowCallerPolicyDefaultOption: config.getEnv('workflows.callerPolicyDefaultOption'),
			timezone: this.timezone,
			urlBaseWebhook,
			urlBaseEditor: instanceBaseUrl,
			versionCli: '',
			isBetaRelease: config.getEnv('generic.isBetaRelease'),
			oauthCallbackUrls: {
				oauth1: `${instanceBaseUrl}/${this.restEndpoint}/oauth1-credential/callback`,
				oauth2: `${instanceBaseUrl}/${this.restEndpoint}/oauth2-credential/callback`,
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
				quota: Container.get(License).getUsersLimit(),
				showSetupOnFirstLoad: config.getEnv('userManagement.isInstanceOwnerSetUp') === false,
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
				enabled: isApiEnabled(),
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
		};
	}

	async start() {
		this.loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
		this.credentialTypes = Container.get(CredentialTypes);
		this.nodeTypes = Container.get(NodeTypes);

		this.activeExecutionsInstance = Container.get(ActiveExecutions);
		this.waitTracker = Container.get(WaitTracker);
		this.postHog = Container.get(PostHogClient);

		this.presetCredentialsLoaded = false;
		this.endpointPresetCredentials = config.getEnv('credentials.overwrite.endpoint');

		this.push = Container.get(Push);
		this.binaryDataService = Container.get(BinaryDataService);

		await super.start();
		LoggerProxy.debug(`Server ID: ${this.uniqueInstanceId}`);

		const cpus = os.cpus();
		const binaryDataConfig = config.getEnv('binaryDataManager');
		const diagnosticInfo: IDiagnosticInfo = {
			databaseType: config.getEnv('database.type'),
			disableProductionWebhooksOnMainProcess: config.getEnv(
				'endpoints.disableProductionWebhooksOnMainProcess',
			),
			notificationsEnabled: config.getEnv('versionNotifications.enabled'),
			versionCli: N8N_VERSION,
			systemInfo: {
				os: {
					type: os.type(),
					version: os.version(),
				},
				memory: os.totalmem() / 1024,
				cpus: {
					count: cpus.length,
					model: cpus[0].model,
					speed: cpus[0].speed,
				},
			},
			executionVariables: {
				executions_process: config.getEnv('executions.process'),
				executions_mode: config.getEnv('executions.mode'),
				executions_timeout: config.getEnv('executions.timeout'),
				executions_timeout_max: config.getEnv('executions.maxTimeout'),
				executions_data_save_on_error: config.getEnv('executions.saveDataOnError'),
				executions_data_save_on_success: config.getEnv('executions.saveDataOnSuccess'),
				executions_data_save_on_progress: config.getEnv('executions.saveExecutionProgress'),
				executions_data_save_manual_executions: config.getEnv(
					'executions.saveDataManualExecutions',
				),
				executions_data_prune: config.getEnv('executions.pruneData'),
				executions_data_max_age: config.getEnv('executions.pruneDataMaxAge'),
			},
			deploymentType: config.getEnv('deployment.type'),
			binaryDataMode: binaryDataConfig.mode,
			smtp_set_up: config.getEnv('userManagement.emails.mode') === 'smtp',
			ldap_allowed: isLdapCurrentAuthenticationMethod(),
			saml_enabled: isSamlCurrentAuthenticationMethod(),
			licensePlanName: Container.get(License).getPlanName(),
			licenseTenantId: config.getEnv('license.tenantId'),
		};

		if (inDevelopment && process.env.N8N_DEV_RELOAD === 'true') {
			const { reloadNodesAndCredentials } = await import('@/ReloadNodesAndCredentials');
			await reloadNodesAndCredentials(this.loadNodesAndCredentials, this.nodeTypes, this.push);
		}

		void Db.collections.Workflow.findOne({
			select: ['createdAt'],
			order: { createdAt: 'ASC' },
			where: {},
		}).then(async (workflow) =>
			Container.get(InternalHooks).onServerStarted(diagnosticInfo, workflow?.createdAt),
		);
	}

	/**
	 * Returns the current settings for the frontend
	 */
	getSettingsForFrontend(): IN8nUISettings {
		// Update all urls, in case `WEBHOOK_URL` was updated by `--tunnel`
		const instanceBaseUrl = getInstanceBaseUrl();
		this.frontendSettings.urlBaseWebhook = WebhookHelpers.getWebhookBaseUrl();
		this.frontendSettings.urlBaseEditor = instanceBaseUrl;
		this.frontendSettings.oauthCallbackUrls = {
			oauth1: `${instanceBaseUrl}/${this.restEndpoint}/oauth1-credential/callback`,
			oauth2: `${instanceBaseUrl}/${this.restEndpoint}/oauth2-credential/callback`,
		};

		// refresh user management status
		Object.assign(this.frontendSettings.userManagement, {
			quota: Container.get(License).getUsersLimit(),
			authenticationMethod: getCurrentAuthenticationMethod(),
			showSetupOnFirstLoad:
				config.getEnv('userManagement.isInstanceOwnerSetUp') === false &&
				config.getEnv('deployment.type').startsWith('desktop_') === false,
		});

		let dismissedBanners: string[] = [];

		try {
			dismissedBanners = config.getEnv('ui.banners.dismissed') ?? [];
		} catch {
			// not yet in DB
		}

		this.frontendSettings.banners.dismissed = dismissedBanners;

		// refresh enterprise status
		Object.assign(this.frontendSettings.enterprise, {
			sharing: isSharingEnabled(),
			logStreaming: isLogStreamingEnabled(),
			ldap: isLdapEnabled(),
			saml: isSamlLicensed(),
			advancedExecutionFilters: isAdvancedExecutionFiltersEnabled(),
			variables: isVariablesEnabled(),
			sourceControl: isSourceControlLicensed(),
			externalSecrets: isExternalSecretsEnabled(),
			showNonProdBanner: Container.get(License).isFeatureEnabled(
				LICENSE_FEATURES.SHOW_NON_PROD_BANNER,
			),
			debugInEditor: isDebugInEditorLicensed(),
			workflowHistory: isWorkflowHistoryEnabled(),
		});

		if (isLdapEnabled()) {
			Object.assign(this.frontendSettings.sso.ldap, {
				loginLabel: getLdapLoginLabel(),
				loginEnabled: isLdapLoginEnabled(),
			});
		}

		if (isSamlLicensed()) {
			Object.assign(this.frontendSettings.sso.saml, {
				loginLabel: getSamlLoginLabel(),
				loginEnabled: isSamlLoginEnabled(),
			});
		}

		if (isVariablesEnabled()) {
			this.frontendSettings.variables.limit = getVariablesLimit();
		}

		if (config.get('nodes.packagesMissing').length > 0) {
			this.frontendSettings.missingPackages = true;
		}

		this.frontendSettings.mfa.enabled = isMfaFeatureEnabled();

		return this.frontendSettings;
	}

	private async registerControllers(ignoredEndpoints: Readonly<string[]>) {
		const { app, externalHooks, activeWorkflowRunner, nodeTypes } = this;
		const repositories = Db.collections;
		setupAuthMiddlewares(app, ignoredEndpoints, this.restEndpoint);

		const encryptionKey = await UserSettings.getEncryptionKey();

		const logger = LoggerProxy;
		const internalHooks = Container.get(InternalHooks);
		const mailer = Container.get(UserManagementMailer);
		const userService = Container.get(UserService);
		const jwtService = Container.get(JwtService);
		const postHog = this.postHog;
		const mfaService = new MfaService(repositories.User, new TOTPService(), encryptionKey);

		const controllers: object[] = [
			new EventBusController(),
			new EventBusControllerEE(),
			new AuthController(config, logger, internalHooks, mfaService, userService, postHog),
			new OwnerController(
				config,
				logger,
				internalHooks,
				Container.get(SettingsRepository),
				userService,
				postHog,
			),
			new MeController(logger, externalHooks, internalHooks, userService),
			new NodeTypesController(config, nodeTypes),
			new PasswordResetController(
				config,
				logger,
				externalHooks,
				internalHooks,
				mailer,
				userService,
				jwtService,
				mfaService,
			),
			Container.get(TagsController),
			new TranslationController(config, this.credentialTypes),
			new UsersController(
				config,
				logger,
				externalHooks,
				internalHooks,
				repositories.SharedCredentials,
				repositories.SharedWorkflow,
				activeWorkflowRunner,
				mailer,
				jwtService,
				Container.get(RoleService),
				userService,
				postHog,
			),
			Container.get(SamlController),
			Container.get(SourceControlController),
			Container.get(WorkflowStatisticsController),
			Container.get(ExternalSecretsController),
			Container.get(OrchestrationController),
			Container.get(WorkflowHistoryController),
		];

		if (isLdapEnabled()) {
			const { service, sync } = LdapManager.getInstance();
			controllers.push(new LdapController(service, sync, internalHooks));
		}

		if (config.getEnv('nodes.communityPackages.enabled')) {
			controllers.push(
				new NodesController(config, this.loadNodesAndCredentials, this.push, internalHooks),
			);
		}

		if (inE2ETests) {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			const { E2EController } = await import('./controllers/e2e.controller');
			controllers.push(Container.get(E2EController));
		}

		if (isMfaFeatureEnabled()) {
			controllers.push(new MFAController(mfaService));
		}

		controllers.forEach((controller) => registerController(app, config, controller));
	}

	async configure(): Promise<void> {
		if (config.getEnv('endpoints.metrics.enable')) {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			const { MetricsService } = await import('@/services/metrics.service');
			await Container.get(MetricsService).configureMetrics(this.app);
		}

		this.instanceId = await UserSettings.getInstanceId();

		this.frontendSettings.isNpmAvailable = await exec('npm --version')
			.then(() => true)
			.catch(() => false);

		this.frontendSettings.versionCli = N8N_VERSION;

		this.frontendSettings.instanceId = this.instanceId;

		await this.externalHooks.run('frontend.settings', [this.frontendSettings]);

		await this.postHog.init(this.frontendSettings.instanceId);

		const publicApiEndpoint = config.getEnv('publicApi.path');
		const excludeEndpoints = config.getEnv('security.excludeEndpoints');

		const ignoredEndpoints: Readonly<string[]> = [
			'assets',
			'healthz',
			'metrics',
			'e2e',
			this.endpointPresetCredentials,
			isApiEnabled() ? '' : publicApiEndpoint,
			...excludeEndpoints.split(':'),
		].filter((u) => !!u);

		assert(
			!ignoredEndpoints.includes(this.restEndpoint),
			`REST endpoint cannot be set to any of these values: ${ignoredEndpoints.join()} `,
		);

		// ----------------------------------------
		// Public API
		// ----------------------------------------

		if (isApiEnabled()) {
			const { apiRouters, apiLatestVersion } = await loadPublicApiVersions(publicApiEndpoint);
			this.app.use(...apiRouters);
			this.frontendSettings.publicApi.latestVersion = apiLatestVersion;
		}
		// Parse cookies for easier access
		this.app.use(cookieParser());

		const { restEndpoint, app } = this;
		setupPushHandler(restEndpoint, app);

		// Make sure that Vue history mode works properly
		this.app.use(
			history({
				rewrites: [
					{
						from: new RegExp(`^/(${[this.restEndpoint, ...ignoredEndpoints].join('|')})/?.*$`),
						to: (context) => {
							return context.parsedUrl.pathname!.toString();
						},
					},
				],
			}),
		);

		if (config.getEnv('executions.mode') === 'queue') {
			await Container.get(Queue).init();
		}

		await handleLdapInit();

		await handleMfaDisable();

		await this.registerControllers(ignoredEndpoints);

		this.app.use(`/${this.restEndpoint}/credentials`, credentialsController);

		// ----------------------------------------
		// Workflow
		// ----------------------------------------
		this.app.use(`/${this.restEndpoint}/workflows`, workflowsController);

		// ----------------------------------------
		// License
		// ----------------------------------------
		this.app.use(`/${this.restEndpoint}/license`, licenseController);

		// ----------------------------------------
		// SAML
		// ----------------------------------------

		// initialize SamlService if it is licensed, even if not enabled, to
		// set up the initial environment
		try {
			await Container.get(SamlService).init();
		} catch (error) {
			LoggerProxy.warn(`SAML initialization failed: ${error.message}`);
		}

		// ----------------------------------------
		// Variables
		// ----------------------------------------

		this.app.use(`/${this.restEndpoint}/variables`, variablesController);

		// ----------------------------------------
		// Source Control
		// ----------------------------------------
		try {
			await Container.get(SourceControlService).init();
		} catch (error) {
			LoggerProxy.warn(`Source Control initialization failed: ${error.message}`);
		}

		// ----------------------------------------

		// Returns parameter values which normally get loaded from an external API or
		// get generated dynamically
		this.app.get(
			`/${this.restEndpoint}/node-parameter-options`,
			ResponseHelper.send(
				async (req: NodeParameterOptionsRequest): Promise<INodePropertyOptions[]> => {
					const nodeTypeAndVersion = jsonParse(
						req.query.nodeTypeAndVersion,
					) as INodeTypeNameVersion;

					const { path, methodName } = req.query;

					const currentNodeParameters = jsonParse(
						req.query.currentNodeParameters,
					) as INodeParameters;

					let credentials: INodeCredentials | undefined;

					if (req.query.credentials) {
						credentials = jsonParse(req.query.credentials);
					}

					const loadDataInstance = new LoadNodeParameterOptions(
						nodeTypeAndVersion,
						this.nodeTypes,
						path,
						currentNodeParameters,
						credentials,
					);

					const additionalData = await WorkflowExecuteAdditionalData.getBase(
						req.user.id,
						currentNodeParameters,
					);

					if (methodName) {
						return loadDataInstance.getOptionsViaMethodName(methodName, additionalData);
					}
					// @ts-ignore
					if (req.query.loadOptions) {
						return loadDataInstance.getOptionsViaRequestProperty(
							// @ts-ignore
							jsonParse(req.query.loadOptions as string),
							additionalData,
						);
					}

					return [];
				},
			),
		);

		// Returns parameter values which normally get loaded from an external API or
		// get generated dynamically
		this.app.get(
			`/${this.restEndpoint}/nodes-list-search`,
			ResponseHelper.send(
				async (
					req: NodeListSearchRequest,
					res: express.Response,
				): Promise<INodeListSearchResult | undefined> => {
					const nodeTypeAndVersion = jsonParse(
						req.query.nodeTypeAndVersion,
					) as INodeTypeNameVersion;

					const { path, methodName } = req.query;

					if (!req.query.currentNodeParameters) {
						throw new ResponseHelper.BadRequestError(
							'Parameter currentNodeParameters is required.',
						);
					}

					const currentNodeParameters = jsonParse(
						req.query.currentNodeParameters,
					) as INodeParameters;

					let credentials: INodeCredentials | undefined;

					if (req.query.credentials) {
						credentials = jsonParse(req.query.credentials);
					}

					const listSearchInstance = new LoadNodeListSearch(
						nodeTypeAndVersion,
						this.nodeTypes,
						path,
						currentNodeParameters,
						credentials,
					);

					const additionalData = await WorkflowExecuteAdditionalData.getBase(
						req.user.id,
						currentNodeParameters,
					);

					if (methodName) {
						return listSearchInstance.getOptionsViaMethodName(
							methodName,
							additionalData,
							req.query.filter,
							req.query.paginationToken,
						);
					}

					throw new ResponseHelper.BadRequestError('Parameter methodName is required.');
				},
			),
		);

		this.app.get(
			`/${this.restEndpoint}/get-mapping-fields`,
			ResponseHelper.send(
				async (
					req: ResourceMapperRequest,
					res: express.Response,
				): Promise<ResourceMapperFields | undefined> => {
					const nodeTypeAndVersion = jsonParse(
						req.query.nodeTypeAndVersion,
					) as INodeTypeNameVersion;

					const { path, methodName } = req.query;

					if (!req.query.currentNodeParameters) {
						throw new ResponseHelper.BadRequestError(
							'Parameter currentNodeParameters is required.',
						);
					}

					const currentNodeParameters = jsonParse(
						req.query.currentNodeParameters,
					) as INodeParameters;

					let credentials: INodeCredentials | undefined;

					if (req.query.credentials) {
						credentials = jsonParse(req.query.credentials);
					}

					const loadMappingOptionsInstance = new LoadMappingOptions(
						nodeTypeAndVersion,
						this.nodeTypes,
						path,
						currentNodeParameters,
						credentials,
					);

					const additionalData = await WorkflowExecuteAdditionalData.getBase(
						req.user.id,
						currentNodeParameters,
					);

					const fields = await loadMappingOptionsInstance.getOptionsViaMethodName(
						methodName,
						additionalData,
					);

					return fields;
				},
			),
		);

		// ----------------------------------------
		// Active Workflows
		// ----------------------------------------

		// Returns the active workflow ids
		this.app.get(
			`/${this.restEndpoint}/active`,
			ResponseHelper.send(async (req: WorkflowRequest.GetAllActive) => {
				return this.activeWorkflowRunner.getActiveWorkflows(req.user);
			}),
		);

		// Returns if the workflow with the given id had any activation errors
		this.app.get(
			`/${this.restEndpoint}/active/error/:id`,
			ResponseHelper.send(async (req: WorkflowRequest.GetAllActivationErrors) => {
				const { id: workflowId } = req.params;

				const shared = await Db.collections.SharedWorkflow.findOne({
					relations: ['workflow'],
					where: whereClause({
						user: req.user,
						entityType: 'workflow',
						entityId: workflowId,
					}),
				});

				if (!shared) {
					LoggerProxy.verbose('User attempted to access workflow errors without permissions', {
						workflowId,
						userId: req.user.id,
					});

					throw new ResponseHelper.BadRequestError(
						`Workflow with ID "${workflowId}" could not be found.`,
					);
				}

				return this.activeWorkflowRunner.getActivationError(workflowId);
			}),
		);

		// ----------------------------------------
		// curl-converter
		// ----------------------------------------
		this.app.post(
			`/${this.restEndpoint}/curl-to-json`,
			ResponseHelper.send(
				async (
					req: CurlHelper.ToJson,
					res: express.Response,
				): Promise<{ [key: string]: string }> => {
					const curlCommand = req.body.curlCommand ?? '';

					try {
						const parameters = toHttpNodeParameters(curlCommand);
						return ResponseHelper.flattenObject(parameters, 'parameters');
					} catch (e) {
						throw new ResponseHelper.BadRequestError('Invalid cURL command');
					}
				},
			),
		);

		// ----------------------------------------
		// OAuth1-Credential/Auth
		// ----------------------------------------

		// Authorize OAuth Data
		this.app.get(
			`/${this.restEndpoint}/oauth1-credential/auth`,
			ResponseHelper.send(async (req: OAuthRequest.OAuth1Credential.Auth): Promise<string> => {
				const { id: credentialId } = req.query;

				if (!credentialId) {
					LoggerProxy.error('OAuth1 credential authorization failed due to missing credential ID');
					throw new ResponseHelper.BadRequestError('Required credential ID is missing');
				}

				const credential = await getCredentialForUser(credentialId, req.user);

				if (!credential) {
					LoggerProxy.error(
						'OAuth1 credential authorization failed because the current user does not have the correct permissions',
						{ userId: req.user.id },
					);
					throw new ResponseHelper.NotFoundError(RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL);
				}

				let encryptionKey: string;
				try {
					encryptionKey = await UserSettings.getEncryptionKey();
				} catch (error) {
					throw new ResponseHelper.InternalServerError(error.message);
				}

				const additionalData = await WorkflowExecuteAdditionalData.getBase(req.user.id);

				const mode: WorkflowExecuteMode = 'internal';
				const timezone = config.getEnv('generic.timezone');
				const credentialsHelper = new CredentialsHelper(encryptionKey);
				const decryptedDataOriginal = await credentialsHelper.getDecrypted(
					additionalData,
					credential as INodeCredentialsDetails,
					credential.type,
					mode,
					timezone,
					true,
				);

				const oauthCredentials = credentialsHelper.applyDefaultsAndOverwrites(
					additionalData,
					decryptedDataOriginal,
					credential.type,
					mode,
					timezone,
				);

				const signatureMethod = oauthCredentials.signatureMethod as string;

				const oAuthOptions: clientOAuth1.Options = {
					consumer: {
						key: oauthCredentials.consumerKey as string,
						secret: oauthCredentials.consumerSecret as string,
					},
					signature_method: signatureMethod,
					// eslint-disable-next-line @typescript-eslint/naming-convention
					hash_function(base, key) {
						let algorithm: string;
						switch (signatureMethod) {
							case 'HMAC-SHA256':
								algorithm = 'sha256';
								break;
							case 'HMAC-SHA512':
								algorithm = 'sha512';
								break;
							default:
								algorithm = 'sha1';
								break;
						}

						return createHmac(algorithm, key).update(base).digest('base64');
					},
				};

				const oauthRequestData = {
					oauth_callback: `${WebhookHelpers.getWebhookBaseUrl()}${
						this.restEndpoint
					}/oauth1-credential/callback?cid=${credentialId}`,
				};

				await this.externalHooks.run('oauth1.authenticate', [oAuthOptions, oauthRequestData]);

				const oauth = new clientOAuth1(oAuthOptions);

				const options: RequestOptions = {
					method: 'POST',
					url: oauthCredentials.requestTokenUrl as string,
					data: oauthRequestData,
				};

				const data = oauth.toHeader(oauth.authorize(options));

				// @ts-ignore
				options.headers = data;

				const response = await axios.request(options as Partial<AxiosRequestConfig>);

				// Response comes as x-www-form-urlencoded string so convert it to JSON

				const paramsParser = new URLSearchParams(response.data);

				const responseJson = Object.fromEntries(paramsParser.entries());

				const returnUri = `${oauthCredentials.authUrl as string}?oauth_token=${
					responseJson.oauth_token
				}`;

				// Encrypt the data
				const credentials = new Credentials(
					credential as INodeCredentialsDetails,
					credential.type,
					credential.nodesAccess,
				);

				credentials.setData(decryptedDataOriginal, encryptionKey);
				const newCredentialsData = credentials.getDataToSave() as unknown as ICredentialsDb;

				// Add special database related data
				newCredentialsData.updatedAt = new Date();

				// Update the credentials in DB
				await Db.collections.Credentials.update(credentialId, newCredentialsData);

				LoggerProxy.verbose('OAuth1 authorization successful for new credential', {
					userId: req.user.id,
					credentialId,
				});

				return returnUri;
			}),
		);

		// Verify and store app code. Generate access tokens and store for respective credential.
		this.app.get(
			`/${this.restEndpoint}/oauth1-credential/callback`,
			async (req: OAuthRequest.OAuth1Credential.Callback, res: express.Response) => {
				try {
					const { oauth_verifier, oauth_token, cid: credentialId } = req.query;

					if (!oauth_verifier || !oauth_token) {
						const errorResponse = new ResponseHelper.ServiceUnavailableError(
							`Insufficient parameters for OAuth1 callback. Received following query parameters: ${JSON.stringify(
								req.query,
							)}`,
						);
						LoggerProxy.error(
							'OAuth1 callback failed because of insufficient parameters received',
							{
								userId: req.user?.id,
								credentialId,
							},
						);
						return ResponseHelper.sendErrorResponse(res, errorResponse);
					}

					const credential = await getCredentialWithoutUser(credentialId);

					if (!credential) {
						LoggerProxy.error('OAuth1 callback failed because of insufficient user permissions', {
							userId: req.user?.id,
							credentialId,
						});
						const errorResponse = new ResponseHelper.NotFoundError(
							RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL,
						);
						return ResponseHelper.sendErrorResponse(res, errorResponse);
					}

					let encryptionKey: string;
					try {
						encryptionKey = await UserSettings.getEncryptionKey();
					} catch (error) {
						throw new ResponseHelper.InternalServerError(error.message);
					}

					const additionalData = await WorkflowExecuteAdditionalData.getBase(req.user.id);

					const mode: WorkflowExecuteMode = 'internal';
					const timezone = config.getEnv('generic.timezone');
					const credentialsHelper = new CredentialsHelper(encryptionKey);
					const decryptedDataOriginal = await credentialsHelper.getDecrypted(
						additionalData,
						credential as INodeCredentialsDetails,
						credential.type,
						mode,
						timezone,
						true,
					);
					const oauthCredentials = credentialsHelper.applyDefaultsAndOverwrites(
						additionalData,
						decryptedDataOriginal,
						credential.type,
						mode,
						timezone,
					);

					const options: AxiosRequestConfig = {
						method: 'POST',
						url: oauthCredentials.accessTokenUrl as string,
						params: {
							oauth_token,
							oauth_verifier,
						},
					};

					let oauthToken;

					try {
						oauthToken = await axios.request(options);
					} catch (error) {
						LoggerProxy.error('Unable to fetch tokens for OAuth1 callback', {
							userId: req.user?.id,
							credentialId,
						});
						const errorResponse = new ResponseHelper.NotFoundError('Unable to get access tokens!');
						return ResponseHelper.sendErrorResponse(res, errorResponse);
					}

					// Response comes as x-www-form-urlencoded string so convert it to JSON

					const paramParser = new URLSearchParams(oauthToken.data);

					const oauthTokenJson = Object.fromEntries(paramParser.entries());

					decryptedDataOriginal.oauthTokenData = oauthTokenJson;

					const credentials = new Credentials(
						credential as INodeCredentialsDetails,
						credential.type,
						credential.nodesAccess,
					);
					credentials.setData(decryptedDataOriginal, encryptionKey);
					const newCredentialsData = credentials.getDataToSave() as unknown as ICredentialsDb;
					// Add special database related data
					newCredentialsData.updatedAt = new Date();
					// Save the credentials in DB
					await Db.collections.Credentials.update(credentialId, newCredentialsData);

					LoggerProxy.verbose('OAuth1 callback successful for new credential', {
						userId: req.user?.id,
						credentialId,
					});
					res.sendFile(pathResolve(TEMPLATES_DIR, 'oauth-callback.html'));
				} catch (error) {
					LoggerProxy.error('OAuth1 callback failed because of insufficient user permissions', {
						userId: req.user?.id,
						credentialId: req.query.cid,
					});
					// Error response
					return ResponseHelper.sendErrorResponse(res, error);
				}
			},
		);

		// ----------------------------------------
		// OAuth2-Credential
		// ----------------------------------------

		this.app.use(`/${this.restEndpoint}/oauth2-credential`, oauth2CredentialController);

		// ----------------------------------------
		// Executions
		// ----------------------------------------

		this.app.use(`/${this.restEndpoint}/executions`, executionsController);

		// ----------------------------------------
		// Executing Workflows
		// ----------------------------------------

		// Returns all the currently working executions
		this.app.get(
			`/${this.restEndpoint}/executions-current`,
			ResponseHelper.send(
				async (req: ExecutionRequest.GetAllCurrent): Promise<IExecutionsSummary[]> => {
					if (config.getEnv('executions.mode') === 'queue') {
						const queue = Container.get(Queue);
						const currentJobs = await queue.getJobs(['active', 'waiting']);

						const currentlyRunningQueueIds = currentJobs.map((job) => job.data.executionId);

						const currentlyRunningManualExecutions =
							this.activeExecutionsInstance.getActiveExecutions();
						const manualExecutionIds = currentlyRunningManualExecutions.map(
							(execution) => execution.id,
						);

						const currentlyRunningExecutionIds =
							currentlyRunningQueueIds.concat(manualExecutionIds);

						if (!currentlyRunningExecutionIds.length) return [];

						const findOptions: FindManyOptions<ExecutionEntity> & {
							where: FindOptionsWhere<ExecutionEntity>;
						} = {
							select: ['id', 'workflowId', 'mode', 'retryOf', 'startedAt', 'stoppedAt', 'status'],
							order: { id: 'DESC' },
							where: {
								id: In(currentlyRunningExecutionIds),
								status: Not(In(['finished', 'stopped', 'failed', 'crashed'] as ExecutionStatus[])),
							},
						};

						const sharedWorkflowIds = await getSharedWorkflowIds(req.user);

						if (!sharedWorkflowIds.length) return [];

						if (req.query.filter) {
							const { workflowId, status, finished } = jsonParse<any>(req.query.filter);
							if (workflowId && sharedWorkflowIds.includes(workflowId)) {
								Object.assign(findOptions.where, { workflowId });
							} else {
								Object.assign(findOptions.where, { workflowId: In(sharedWorkflowIds) });
							}
							if (status) {
								Object.assign(findOptions.where, { status: In(status) });
							}
							if (finished) {
								Object.assign(findOptions.where, { finished });
							}
						} else {
							Object.assign(findOptions.where, { workflowId: In(sharedWorkflowIds) });
						}

						const executions =
							await Container.get(ExecutionRepository).findMultipleExecutions(findOptions);

						if (!executions.length) return [];

						return executions.map((execution) => {
							if (!execution.status) {
								execution.status = getStatusUsingPreviousExecutionStatusMethod(execution);
							}
							return {
								id: execution.id,
								workflowId: execution.workflowId,
								mode: execution.mode,
								retryOf: execution.retryOf !== null ? execution.retryOf : undefined,
								startedAt: new Date(execution.startedAt),
								status: execution.status ?? null,
								stoppedAt: execution.stoppedAt ?? null,
							} as IExecutionsSummary;
						});
					}

					const executingWorkflows = this.activeExecutionsInstance.getActiveExecutions();

					const returnData: IExecutionsSummary[] = [];

					const filter = req.query.filter ? jsonParse<any>(req.query.filter) : {};

					const sharedWorkflowIds = await getSharedWorkflowIds(req.user);

					for (const data of executingWorkflows) {
						if (
							(filter.workflowId !== undefined && filter.workflowId !== data.workflowId) ||
							(data.workflowId !== undefined && !sharedWorkflowIds.includes(data.workflowId))
						) {
							continue;
						}

						returnData.push({
							id: data.id,
							workflowId: data.workflowId === undefined ? '' : data.workflowId,
							mode: data.mode,
							retryOf: data.retryOf,
							startedAt: new Date(data.startedAt),
							status: data.status,
						});
					}

					returnData.sort((a, b) => Number(b.id) - Number(a.id));

					return returnData;
				},
			),
		);

		// Forces the execution to stop
		this.app.post(
			`/${this.restEndpoint}/executions-current/:id/stop`,
			ResponseHelper.send(async (req: ExecutionRequest.Stop): Promise<IExecutionsStopData> => {
				const { id: executionId } = req.params;

				const sharedWorkflowIds = await getSharedWorkflowIds(req.user);

				if (!sharedWorkflowIds.length) {
					throw new ResponseHelper.NotFoundError('Execution not found');
				}

				const fullExecutionData = await Container.get(ExecutionRepository).findSingleExecution(
					executionId,
					{
						where: {
							workflowId: In(sharedWorkflowIds),
						},
					},
				);

				if (!fullExecutionData) {
					throw new ResponseHelper.NotFoundError('Execution not found');
				}

				if (config.getEnv('executions.mode') === 'queue') {
					// Manual executions should still be stoppable, so
					// try notifying the `activeExecutions` to stop it.
					const result = await this.activeExecutionsInstance.stopExecution(req.params.id);

					if (result === undefined) {
						// If active execution could not be found check if it is a waiting one
						try {
							return await this.waitTracker.stopExecution(req.params.id);
						} catch (error) {
							// Ignore, if it errors as then it is probably a currently running
							// execution
						}
					} else {
						return {
							mode: result.mode,
							startedAt: new Date(result.startedAt),
							stoppedAt: result.stoppedAt ? new Date(result.stoppedAt) : undefined,
							finished: result.finished,
							status: result.status,
						} as IExecutionsStopData;
					}

					const queue = Container.get(Queue);
					const currentJobs = await queue.getJobs(['active', 'waiting']);

					const job = currentJobs.find((job) => job.data.executionId === req.params.id);

					if (!job) {
						throw new Error(`Could not stop "${req.params.id}" as it is no longer in queue.`);
					} else {
						await queue.stopJob(job);
					}

					const returnData: IExecutionsStopData = {
						mode: fullExecutionData.mode,
						startedAt: new Date(fullExecutionData.startedAt),
						stoppedAt: fullExecutionData.stoppedAt
							? new Date(fullExecutionData.stoppedAt)
							: undefined,
						finished: fullExecutionData.finished,
						status: fullExecutionData.status,
					};

					return returnData;
				}

				// Stop the execution and wait till it is done and we got the data
				const result = await this.activeExecutionsInstance.stopExecution(executionId);

				let returnData: IExecutionsStopData;
				if (result === undefined) {
					// If active execution could not be found check if it is a waiting one
					returnData = await this.waitTracker.stopExecution(executionId);
				} else {
					returnData = {
						mode: result.mode,
						startedAt: new Date(result.startedAt),
						stoppedAt: result.stoppedAt ? new Date(result.stoppedAt) : undefined,
						finished: result.finished,
						status: result.status,
					};
				}

				return returnData;
			}),
		);

		// ----------------------------------------
		// Options
		// ----------------------------------------

		// Returns all the available timezones
		this.app.get(
			`/${this.restEndpoint}/options/timezones`,
			ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<object> => {
				return timezones;
			}),
		);

		// ----------------------------------------
		// Binary data
		// ----------------------------------------

		// Download binary
		this.app.get(
			`/${this.restEndpoint}/data/:path`,
			async (req: BinaryDataRequest, res: express.Response): Promise<void> => {
				// TODO UM: check if this needs permission check for UM
				const identifier = req.params.path;
				try {
					const binaryPath = this.binaryDataService.getPath(identifier);
					let { mode, fileName, mimeType } = req.query;
					if (!fileName || !mimeType) {
						try {
							const metadata = await this.binaryDataService.getMetadata(identifier);
							fileName = metadata.fileName;
							mimeType = metadata.mimeType;
							res.setHeader('Content-Length', metadata.fileSize);
						} catch {}
					}
					if (mimeType) res.setHeader('Content-Type', mimeType);
					if (mode === 'download') {
						res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
					}
					res.sendFile(binaryPath);
				} catch (error) {
					if (error instanceof FileNotFoundError) res.writeHead(404).end();
					else throw error;
				}
			},
		);

		// ----------------------------------------
		// Settings
		// ----------------------------------------

		// Returns the current settings for the UI
		this.app.get(
			`/${this.restEndpoint}/settings`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<IN8nUISettings> => {
					void Container.get(InternalHooks).onFrontendSettingsAPI(req.headers.sessionid as string);

					return this.getSettingsForFrontend();
				},
			),
		);

		// ----------------------------------------
		// EventBus Setup
		// ----------------------------------------

		if (!eventBus.isInitialized) {
			await eventBus.initialize();
		}

		if (this.endpointPresetCredentials !== '') {
			// POST endpoint to set preset credentials
			this.app.post(
				`/${this.endpointPresetCredentials}`,
				async (req: express.Request, res: express.Response) => {
					if (!this.presetCredentialsLoaded) {
						const body = req.body as ICredentialsOverwrite;

						if (req.contentType !== 'application/json') {
							ResponseHelper.sendErrorResponse(
								res,
								new Error(
									'Body must be a valid JSON, make sure the content-type is application/json',
								),
							);
							return;
						}

						CredentialsOverwrites().setData(body);

						await this.loadNodesAndCredentials.generateTypesForFrontend();

						this.presetCredentialsLoaded = true;

						ResponseHelper.sendSuccessResponse(res, { success: true }, true, 200);
					} else {
						ResponseHelper.sendErrorResponse(res, new Error('Preset credentials can be set once'));
					}
				},
			);
		}

		if (!config.getEnv('endpoints.disableUi')) {
			const staticOptions: ServeStaticOptions = {
				cacheControl: false,
				setHeaders: (res: express.Response, path: string) => {
					const isIndex = path === pathJoin(GENERATED_STATIC_DIR, 'index.html');
					const cacheControl = isIndex
						? 'no-cache, no-store, must-revalidate'
						: 'max-age=86400, immutable';
					res.header('Cache-Control', cacheControl);
				},
			};

			const serveIcons: express.RequestHandler = async (req, res) => {
				let { scope, packageName } = req.params;
				if (scope) packageName = `@${scope}/${packageName}`;
				const loader = this.loadNodesAndCredentials.loaders[packageName];
				if (loader) {
					const pathPrefix = `/icons/${packageName}/`;
					const filePath = pathResolve(
						loader.directory,
						req.originalUrl.substring(pathPrefix.length),
					);
					if (pathRelative(loader.directory, filePath).includes('..')) {
						return res.status(404).end();
					}
					try {
						await fsAccess(filePath);
						return res.sendFile(filePath);
					} catch {}
				}

				res.sendStatus(404);
			};

			this.app.use('/icons/@:scope/:packageName/*/*.(svg|png)', serveIcons);
			this.app.use('/icons/:packageName/*/*.(svg|png)', serveIcons);

			this.app.use(
				'/',
				express.static(GENERATED_STATIC_DIR),
				express.static(EDITOR_UI_DIST_DIR, staticOptions),
			);

			const startTime = new Date().toUTCString();
			this.app.use('/index.html', (req, res, next) => {
				res.setHeader('Last-Modified', startTime);
				next();
			});
		} else {
			this.app.use('/', express.static(GENERATED_STATIC_DIR));
		}
	}

	protected setupPushServer(): void {
		const { restEndpoint, server, app } = this;
		setupPushServer(restEndpoint, server, app);
	}
}
