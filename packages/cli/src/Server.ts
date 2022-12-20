/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable new-cap */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-invalid-void-type */
/* eslint-disable no-return-assign */
/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable id-denylist */
/* eslint-disable no-console */
/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-continue */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable no-await-in-loop */

import { exec as callbackExec } from 'child_process';
import { readFileSync } from 'fs';
import { access as fsAccess } from 'fs/promises';
import os from 'os';
import { join as pathJoin, resolve as pathResolve } from 'path';
import { createHmac } from 'crypto';
import { promisify } from 'util';
import cookieParser from 'cookie-parser';
import express from 'express';
import { FindManyOptions, getConnectionManager, In } from 'typeorm';
import axios, { AxiosRequestConfig } from 'axios';
import clientOAuth1, { RequestOptions } from 'oauth-1.0a';
// IMPORTANT! Do not switch to anther bcrypt library unless really necessary and
// tested with all possible systems like Windows, Alpine on ARM, FreeBSD, ...
import { compare } from 'bcryptjs';

import {
	BinaryDataManager,
	Credentials,
	LoadNodeParameterOptions,
	LoadNodeListSearch,
	UserSettings,
} from 'n8n-core';

import {
	INodeCredentials,
	INodeCredentialsDetails,
	INodeListSearchResult,
	INodeParameters,
	INodePropertyOptions,
	INodeTypeNameVersion,
	ITelemetrySettings,
	LoggerProxy,
	jsonParse,
	WebhookHttpMethod,
	WorkflowExecuteMode,
	ErrorReporterProxy as ErrorReporter,
	INodeTypes,
	ICredentialTypes,
} from 'n8n-workflow';

import basicAuth from 'basic-auth';
import compression from 'compression';
import jwt from 'jsonwebtoken';
import jwks from 'jwks-rsa';
// @ts-ignore
import timezones from 'google-timezones-json';
import parseUrl from 'parseurl';
import promClient, { Registry } from 'prom-client';
import history from 'connect-history-api-fallback';
import bodyParser from 'body-parser';

import config from '@/config';
import * as Queue from '@/Queue';
import { InternalHooksManager } from '@/InternalHooksManager';
import { getCredentialTranslationPath } from '@/TranslationHelpers';
import { WEBHOOK_METHODS } from '@/WebhookHelpers';
import { getSharedWorkflowIds } from '@/WorkflowHelpers';

import { nodesController } from '@/api/nodes.api';
import { workflowsController } from '@/workflows/workflows.controller';
import {
	AUTH_COOKIE_NAME,
	EDITOR_UI_DIST_DIR,
	GENERATED_STATIC_DIR,
	NODES_BASE_DIR,
	RESPONSE_ERROR_MESSAGES,
	TEMPLATES_DIR,
} from '@/constants';
import { credentialsController } from '@/credentials/credentials.controller';
import { oauth2CredentialController } from '@/credentials/oauth2Credential.api';
import type {
	CurlHelper,
	ExecutionRequest,
	NodeListSearchRequest,
	NodeParameterOptionsRequest,
	OAuthRequest,
	WorkflowRequest,
} from '@/requests';
import { userManagementRouter } from '@/UserManagement';
import { resolveJwt } from '@/UserManagement/auth/jwt';

import { executionsController } from '@/executions/executions.controller';
import { nodeTypesController } from '@/api/nodeTypes.api';
import { tagsController } from '@/api/tags.api';
import { workflowStatsController } from '@/api/workflowStats.api';
import { loadPublicApiVersions } from '@/PublicApi';
import {
	getInstanceBaseUrl,
	isEmailSetUp,
	isSharingEnabled,
	isUserManagementEnabled,
	whereClause,
} from '@/UserManagement/UserManagementHelper';
import * as Db from '@/Db';
import {
	DatabaseType,
	ICredentialsDb,
	ICredentialsOverwrite,
	ICustomRequest,
	IDiagnosticInfo,
	IExecutionFlattedDb,
	IExecutionsStopData,
	IExecutionsSummary,
	IExternalHooksClass,
	IN8nUISettings,
	IPackageVersions,
} from '@/Interfaces';
import * as ActiveExecutions from '@/ActiveExecutions';
import * as ActiveWorkflowRunner from '@/ActiveWorkflowRunner';
import {
	CredentialsHelper,
	getCredentialForUser,
	getCredentialWithoutUser,
} from '@/CredentialsHelper';
import { CredentialsOverwrites } from '@/CredentialsOverwrites';
import { CredentialTypes } from '@/CredentialTypes';
import { ExternalHooks } from '@/ExternalHooks';
import * as GenericHelpers from '@/GenericHelpers';
import { NodeTypes } from '@/NodeTypes';
import * as Push from '@/Push';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import * as ResponseHelper from '@/ResponseHelper';
import * as TestWebhooks from '@/TestWebhooks';
import { WaitTracker, WaitTrackerClass } from '@/WaitTracker';
import * as WebhookHelpers from '@/WebhookHelpers';
import * as WebhookServer from '@/WebhookServer';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import { toHttpNodeParameters } from '@/CurlConverterHelper';
import { setupErrorMiddleware } from '@/ErrorReporting';
import { getLicense } from '@/License';
import { licenseController } from './license/license.controller';
import { corsMiddleware } from './middlewares/cors';

require('body-parser-xml')(bodyParser);

const exec = promisify(callbackExec);

export const externalHooks: IExternalHooksClass = ExternalHooks();

class App {
	app: express.Application;

	activeWorkflowRunner: ActiveWorkflowRunner.ActiveWorkflowRunner;

	testWebhooks: TestWebhooks.TestWebhooks;

	endpointWebhook: string;

	endpointWebhookWaiting: string;

	endpointWebhookTest: string;

	endpointPresetCredentials: string;

	externalHooks: IExternalHooksClass;

	waitTracker: WaitTrackerClass;

	defaultWorkflowName: string;

	defaultCredentialsName: string;

	saveDataErrorExecution: 'all' | 'none';

	saveDataSuccessExecution: 'all' | 'none';

	saveManualExecutions: boolean;

	executionTimeout: number;

	maxExecutionTimeout: number;

	timezone: string;

	activeExecutionsInstance: ActiveExecutions.ActiveExecutions;

	push: Push.Push;

	versions: IPackageVersions | undefined;

	restEndpoint: string;

	publicApiEndpoint: string;

	frontendSettings: IN8nUISettings;

	protocol: string;

	sslKey: string;

	sslCert: string;

	payloadSizeMax: number;

	presetCredentialsLoaded: boolean;

	webhookMethods: WebhookHttpMethod[];

	nodeTypes: INodeTypes;

	credentialTypes: ICredentialTypes;

	constructor() {
		this.app = express();
		this.app.disable('x-powered-by');

		this.endpointWebhook = config.getEnv('endpoints.webhook');
		this.endpointWebhookWaiting = config.getEnv('endpoints.webhookWaiting');
		this.endpointWebhookTest = config.getEnv('endpoints.webhookTest');

		this.defaultWorkflowName = config.getEnv('workflows.defaultName');
		this.defaultCredentialsName = config.getEnv('credentials.defaultName');

		this.saveDataErrorExecution = config.get('executions.saveDataOnError');
		this.saveDataSuccessExecution = config.get('executions.saveDataOnSuccess');
		this.saveManualExecutions = config.get('executions.saveDataManualExecutions');
		this.executionTimeout = config.get('executions.timeout');
		this.maxExecutionTimeout = config.get('executions.maxTimeout');
		this.payloadSizeMax = config.get('endpoints.payloadSizeMax');
		this.timezone = config.get('generic.timezone');
		this.restEndpoint = config.get('endpoints.rest');
		this.publicApiEndpoint = config.get('publicApi.path');

		this.activeWorkflowRunner = ActiveWorkflowRunner.getInstance();
		this.testWebhooks = TestWebhooks.getInstance();
		this.push = Push.getInstance();

		this.nodeTypes = NodeTypes();
		this.credentialTypes = CredentialTypes();

		this.activeExecutionsInstance = ActiveExecutions.getInstance();
		this.waitTracker = WaitTracker();

		this.protocol = config.getEnv('protocol');
		this.sslKey = config.getEnv('ssl_key');
		this.sslCert = config.getEnv('ssl_cert');

		this.externalHooks = externalHooks;

		this.presetCredentialsLoaded = false;
		this.endpointPresetCredentials = config.getEnv('credentials.overwrite.endpoint');

		setupErrorMiddleware(this.app);

		if (process.env.E2E_TESTS === 'true') {
			this.app.use('/e2e', require('./api/e2e.api').e2eController);
		}

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
			saveDataErrorExecution: this.saveDataErrorExecution,
			saveDataSuccessExecution: this.saveDataSuccessExecution,
			saveManualExecutions: this.saveManualExecutions,
			executionTimeout: this.executionTimeout,
			maxExecutionTimeout: this.maxExecutionTimeout,
			workflowCallerPolicyDefaultOption: config.getEnv('workflows.callerPolicyDefaultOption'),
			timezone: this.timezone,
			urlBaseWebhook,
			urlBaseEditor: instanceBaseUrl,
			versionCli: '',
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
			personalizationSurveyEnabled:
				config.getEnv('personalization.enabled') && config.getEnv('diagnostics.enabled'),
			defaultLocale: config.getEnv('defaultLocale'),
			userManagement: {
				enabled: isUserManagementEnabled(),
				showSetupOnFirstLoad:
					config.getEnv('userManagement.disabled') === false &&
					config.getEnv('userManagement.isInstanceOwnerSetUp') === false &&
					config.getEnv('userManagement.skipInstanceOwnerSetup') === false,
				smtpSetup: isEmailSetUp(),
			},
			publicApi: {
				enabled: config.getEnv('publicApi.disabled') === false,
				latestVersion: 1,
				path: config.getEnv('publicApi.path'),
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
			communityNodesEnabled: config.getEnv('nodes.communityPackages.enabled'),
			deployment: {
				type: config.getEnv('deployment.type'),
			},
			isNpmAvailable: false,
			allowedModules: {
				builtIn: process.env.NODE_FUNCTION_ALLOW_BUILTIN,
				external: process.env.NODE_FUNCTION_ALLOW_EXTERNAL,
			},
			enterprise: {
				sharing: false,
				workflowSharing: false,
			},
			hideUsagePage: config.getEnv('hideUsagePage'),
			license: {
				environment: config.getEnv('license.tenantId') === 1 ? 'production' : 'staging',
			},
		};
	}

	/**
	 * Returns the current epoch time
	 *
	 */
	getCurrentDate(): Date {
		return new Date();
	}

	/**
	 * Returns the current settings for the frontend
	 */
	getSettingsForFrontend(): IN8nUISettings {
		// refresh user management status
		Object.assign(this.frontendSettings.userManagement, {
			enabled: isUserManagementEnabled(),
			showSetupOnFirstLoad:
				config.getEnv('userManagement.disabled') === false &&
				config.getEnv('userManagement.isInstanceOwnerSetUp') === false &&
				config.getEnv('userManagement.skipInstanceOwnerSetup') === false,
		});

		// refresh enterprise status
		Object.assign(this.frontendSettings.enterprise, {
			sharing: isSharingEnabled(),
			workflowSharing: config.getEnv('enterprise.workflowSharingEnabled'),
		});

		if (config.get('nodes.packagesMissing').length > 0) {
			this.frontendSettings.missingPackages = true;
		}

		return this.frontendSettings;
	}

	async initLicense(): Promise<void> {
		const license = getLicense();
		await license.init(this.frontendSettings.instanceId, this.frontendSettings.versionCli);

		const activationKey = config.getEnv('license.activationKey');
		if (activationKey) {
			try {
				await license.activate(activationKey);
			} catch (e) {
				LoggerProxy.error('Could not activate license', e);
			}
		}
	}

	async config(): Promise<void> {
		const enableMetrics = config.getEnv('endpoints.metrics.enable');
		let register: Registry;

		if (enableMetrics) {
			const prefix = config.getEnv('endpoints.metrics.prefix');
			register = new promClient.Registry();
			register.setDefaultLabels({ prefix });
			promClient.collectDefaultMetrics({ register });
		}

		this.frontendSettings.isNpmAvailable = await exec('npm --version')
			.then(() => true)
			.catch(() => false);

		this.versions = await GenericHelpers.getVersions();
		this.frontendSettings.versionCli = this.versions.cli;

		this.frontendSettings.instanceId = await UserSettings.getInstanceId();

		await this.externalHooks.run('frontend.settings', [this.frontendSettings]);

		await this.initLicense();

		const excludeEndpoints = config.getEnv('security.excludeEndpoints');

		const ignoredEndpoints = [
			'assets',
			'healthz',
			'metrics',
			'icons',
			'types',
			'e2e',
			this.endpointWebhook,
			this.endpointWebhookTest,
			this.endpointPresetCredentials,
			config.getEnv('publicApi.disabled') ? this.publicApiEndpoint : '',
			...excludeEndpoints.split(':'),
		].filter((u) => !!u);

		// eslint-disable-next-line no-useless-escape
		const authIgnoreRegex = new RegExp(`^\/(${ignoredEndpoints.join('|')})\/?.*$`);

		// Check for basic auth credentials if activated
		const basicAuthActive = config.getEnv('security.basicAuth.active');
		if (basicAuthActive) {
			const basicAuthUser = (await GenericHelpers.getConfigValue(
				'security.basicAuth.user',
			)) as string;
			if (basicAuthUser === '') {
				throw new Error('Basic auth is activated but no user got defined. Please set one!');
			}

			const basicAuthPassword = (await GenericHelpers.getConfigValue(
				'security.basicAuth.password',
			)) as string;
			if (basicAuthPassword === '') {
				throw new Error('Basic auth is activated but no password got defined. Please set one!');
			}

			const basicAuthHashEnabled = (await GenericHelpers.getConfigValue(
				'security.basicAuth.hash',
			)) as boolean;

			let validPassword: null | string = null;

			this.app.use(
				async (req: express.Request, res: express.Response, next: express.NextFunction) => {
					// Skip basic auth for a few listed endpoints or when instance owner has been setup
					if (
						authIgnoreRegex.exec(req.url) ||
						config.getEnv('userManagement.isInstanceOwnerSetUp')
					) {
						return next();
					}
					const realm = 'n8n - Editor UI';
					const basicAuthData = basicAuth(req);

					if (basicAuthData === undefined) {
						// Authorization data is missing
						return ResponseHelper.basicAuthAuthorizationError(
							res,
							realm,
							'Authorization is required!',
						);
					}

					if (basicAuthData.name === basicAuthUser) {
						if (basicAuthHashEnabled) {
							if (
								validPassword === null &&
								(await compare(basicAuthData.pass, basicAuthPassword))
							) {
								// Password is valid so save for future requests
								validPassword = basicAuthData.pass;
							}

							if (validPassword === basicAuthData.pass && validPassword !== null) {
								// Provided hash is correct
								return next();
							}
						} else if (basicAuthData.pass === basicAuthPassword) {
							// Provided password is correct
							return next();
						}
					}

					// Provided authentication data is wrong
					return ResponseHelper.basicAuthAuthorizationError(
						res,
						realm,
						'Authorization data is wrong!',
					);
				},
			);
		}

		// Check for and validate JWT if configured
		const jwtAuthActive = config.getEnv('security.jwtAuth.active');
		if (jwtAuthActive) {
			const jwtAuthHeader = (await GenericHelpers.getConfigValue(
				'security.jwtAuth.jwtHeader',
			)) as string;
			if (jwtAuthHeader === '') {
				throw new Error('JWT auth is activated but no request header was defined. Please set one!');
			}
			const jwksUri = (await GenericHelpers.getConfigValue('security.jwtAuth.jwksUri')) as string;
			if (jwksUri === '') {
				throw new Error('JWT auth is activated but no JWK Set URI was defined. Please set one!');
			}
			const jwtHeaderValuePrefix = (await GenericHelpers.getConfigValue(
				'security.jwtAuth.jwtHeaderValuePrefix',
			)) as string;
			const jwtIssuer = (await GenericHelpers.getConfigValue(
				'security.jwtAuth.jwtIssuer',
			)) as string;
			const jwtNamespace = (await GenericHelpers.getConfigValue(
				'security.jwtAuth.jwtNamespace',
			)) as string;
			const jwtAllowedTenantKey = (await GenericHelpers.getConfigValue(
				'security.jwtAuth.jwtAllowedTenantKey',
			)) as string;
			const jwtAllowedTenant = (await GenericHelpers.getConfigValue(
				'security.jwtAuth.jwtAllowedTenant',
			)) as string;

			// eslint-disable-next-line no-inner-declarations
			function isTenantAllowed(decodedToken: object): boolean {
				if (jwtNamespace === '' || jwtAllowedTenantKey === '' || jwtAllowedTenant === '') {
					return true;
				}

				for (const [k, v] of Object.entries(decodedToken)) {
					if (k === jwtNamespace) {
						for (const [kn, kv] of Object.entries(v)) {
							if (kn === jwtAllowedTenantKey && kv === jwtAllowedTenant) {
								return true;
							}
						}
					}
				}

				return false;
			}

			// eslint-disable-next-line consistent-return
			this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
				if (authIgnoreRegex.exec(req.url)) {
					return next();
				}

				let token = req.header(jwtAuthHeader) as string;
				if (token === undefined || token === '') {
					return ResponseHelper.jwtAuthAuthorizationError(res, 'Missing token');
				}
				if (jwtHeaderValuePrefix !== '' && token.startsWith(jwtHeaderValuePrefix)) {
					token = token.replace(`${jwtHeaderValuePrefix} `, '').trimLeft();
				}

				const jwkClient = jwks({ cache: true, jwksUri });
				// eslint-disable-next-line @typescript-eslint/ban-types
				function getKey(header: any, callback: Function) {
					jwkClient.getSigningKey(header.kid, (err: Error, key: any) => {
						// eslint-disable-next-line @typescript-eslint/no-throw-literal
						if (err) throw ResponseHelper.jwtAuthAuthorizationError(res, err.message);

						const signingKey = key.publicKey || key.rsaPublicKey;
						callback(null, signingKey);
					});
				}

				const jwtVerifyOptions: jwt.VerifyOptions = {
					issuer: jwtIssuer !== '' ? jwtIssuer : undefined,
					ignoreExpiration: false,
				};

				jwt.verify(token, getKey, jwtVerifyOptions, (err: jwt.VerifyErrors, decoded: object) => {
					if (err) {
						ResponseHelper.jwtAuthAuthorizationError(res, 'Invalid token');
					} else if (!isTenantAllowed(decoded)) {
						ResponseHelper.jwtAuthAuthorizationError(res, 'Tenant not allowed');
					} else {
						next();
					}
				});
			});
		}

		// ----------------------------------------
		// Public API
		// ----------------------------------------

		if (!config.getEnv('publicApi.disabled')) {
			const { apiRouters, apiLatestVersion } = await loadPublicApiVersions(this.publicApiEndpoint);
			this.app.use(...apiRouters);
			this.frontendSettings.publicApi.latestVersion = apiLatestVersion;
		}
		// Parse cookies for easier access
		this.app.use(cookieParser());

		// Get push connections
		this.app.use(`/${this.restEndpoint}/push`, corsMiddleware, async (req, res, next) => {
			const { sessionId } = req.query;
			if (sessionId === undefined) {
				next(new Error('The query parameter "sessionId" is missing!'));
				return;
			}

			if (isUserManagementEnabled()) {
				try {
					const authCookie = req.cookies?.[AUTH_COOKIE_NAME] ?? '';
					await resolveJwt(authCookie);
				} catch (error) {
					res.status(401).send('Unauthorized');
					return;
				}
			}

			this.push.add(sessionId as string, req, res);
		});

		// Compress the response data
		this.app.use(compression());

		// Make sure that each request has the "parsedUrl" parameter
		this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
			(req as ICustomRequest).parsedUrl = parseUrl(req);
			req.rawBody = Buffer.from('', 'base64');
			next();
		});

		// Support application/json type post data
		this.app.use(
			bodyParser.json({
				limit: `${this.payloadSizeMax}mb`,
				verify: (req, res, buf) => {
					req.rawBody = buf;
				},
			}),
		);

		// Support application/xml type post data
		this.app.use(
			// @ts-ignore
			bodyParser.xml({
				limit: `${this.payloadSizeMax}mb`,
				xmlParseOptions: {
					normalize: true, // Trim whitespace inside text nodes
					normalizeTags: true, // Transform tags to lowercase
					explicitArray: false, // Only put properties in array if length > 1
				},
				verify: (req: express.Request, res: any, buf: any) => {
					req.rawBody = buf;
				},
			}),
		);

		this.app.use(
			bodyParser.text({
				limit: `${this.payloadSizeMax}mb`,
				verify: (req, res, buf) => {
					req.rawBody = buf;
				},
			}),
		);

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

		// support application/x-www-form-urlencoded post data
		this.app.use(
			bodyParser.urlencoded({
				limit: `${this.payloadSizeMax}mb`,
				extended: false,
				verify: (req, res, buf) => {
					req.rawBody = buf;
				},
			}),
		);

		this.app.use(corsMiddleware);

		// eslint-disable-next-line consistent-return
		this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
			if (!Db.isInitialized) {
				const error = new ResponseHelper.ServiceUnavailableError('Database is not ready!');
				return ResponseHelper.sendErrorResponse(res, error);
			}

			next();
		});

		// ----------------------------------------
		// User Management
		// ----------------------------------------
		await userManagementRouter.addRoutes.apply(this, [ignoredEndpoints, this.restEndpoint]);

		this.app.use(`/${this.restEndpoint}/credentials`, credentialsController);

		// ----------------------------------------
		// Packages and nodes management
		// ----------------------------------------
		if (config.getEnv('nodes.communityPackages.enabled')) {
			this.app.use(`/${this.restEndpoint}/nodes`, nodesController);
		}

		// ----------------------------------------
		// Healthcheck
		// ----------------------------------------

		// Does very basic health check
		this.app.get('/healthz', async (req: express.Request, res: express.Response) => {
			LoggerProxy.debug('Health check started!');

			const connection = getConnectionManager().get();

			try {
				if (!connection.isConnected) {
					// Connection is not active
					throw new Error('No active database connection!');
				}
				// DB ping
				await connection.query('SELECT 1');
			} catch (err) {
				ErrorReporter.error(err);
				LoggerProxy.error('No Database connection!', err);
				const error = new ResponseHelper.ServiceUnavailableError('No Database connection!');
				return ResponseHelper.sendErrorResponse(res, error);
			}

			// Everything fine
			const responseData = {
				status: 'ok',
			};

			LoggerProxy.debug('Health check completed successfully!');

			ResponseHelper.sendSuccessResponse(res, responseData, true, 200);
		});

		// ----------------------------------------
		// Metrics
		// ----------------------------------------
		if (enableMetrics) {
			this.app.get('/metrics', async (req: express.Request, res: express.Response) => {
				const response = await register.metrics();
				res.setHeader('Content-Type', register.contentType);
				ResponseHelper.sendSuccessResponse(res, response, true, 200);
			});
		}

		// ----------------------------------------
		// Workflow
		// ----------------------------------------
		this.app.use(`/${this.restEndpoint}/workflows`, workflowsController);

		// ----------------------------------------
		// License
		// ----------------------------------------
		this.app.use(`/${this.restEndpoint}/license`, licenseController);

		// ----------------------------------------
		// Workflow Statistics
		// ----------------------------------------
		this.app.use(`/${this.restEndpoint}/workflow-stats`, workflowStatsController);

		// ----------------------------------------
		// Tags
		// ----------------------------------------
		this.app.use(`/${this.restEndpoint}/tags`, tagsController);

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
			`/${this.restEndpoint}/credential-translation`,
			ResponseHelper.send(
				async (
					req: express.Request & { query: { credentialType: string } },
					res: express.Response,
				): Promise<object | null> => {
					const translationPath = getCredentialTranslationPath({
						locale: this.frontendSettings.defaultLocale,
						credentialType: req.query.credentialType,
					});

					try {
						return require(translationPath);
					} catch (error) {
						return null;
					}
				},
			),
		);

		// Returns node information based on node names and versions
		const headersPath = pathJoin(NODES_BASE_DIR, 'dist', 'nodes', 'headers');
		this.app.get(
			`/${this.restEndpoint}/node-translation-headers`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<object | void> => {
					try {
						await fsAccess(`${headersPath}.js`);
					} catch (_) {
						return; // no headers available
					}

					try {
						return require(headersPath);
					} catch (error) {
						res.status(500).send('Failed to load headers file');
					}
				},
			),
		);

		// ----------------------------------------
		// Node-Types
		// ----------------------------------------

		this.app.use(`/${this.restEndpoint}/node-types`, nodeTypesController);

		// ----------------------------------------
		// Active Workflows
		// ----------------------------------------

		// Returns the active workflow ids
		this.app.get(
			`/${this.restEndpoint}/active`,
			ResponseHelper.send(async (req: WorkflowRequest.GetAllActive) => {
				const activeWorkflows = await this.activeWorkflowRunner.getActiveWorkflows(req.user);

				return activeWorkflows.map(({ id }) => id.toString());
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
					LoggerProxy.info('User attempted to access workflow errors without permissions', {
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
						throw new ResponseHelper.BadRequestError(`Invalid cURL command`);
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

				const mode: WorkflowExecuteMode = 'internal';
				const timezone = config.getEnv('generic.timezone');
				const credentialsHelper = new CredentialsHelper(encryptionKey);
				const decryptedDataOriginal = await credentialsHelper.getDecrypted(
					credential as INodeCredentialsDetails,
					credential.type,
					mode,
					timezone,
					true,
				);

				const oauthCredentials = credentialsHelper.applyDefaultsAndOverwrites(
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
						const algorithm = signatureMethod === 'HMAC-SHA1' ? 'sha1' : 'sha256';
						return createHmac(algorithm, key).update(base).digest('base64');
					},
				};

				const oauthRequestData = {
					oauth_callback: `${WebhookHelpers.getWebhookBaseUrl()}${
						this.restEndpoint
					}/oauth1-credential/callback?cid=${credentialId}`,
				};

				await this.externalHooks.run('oauth1.authenticate', [oAuthOptions, oauthRequestData]);

				// eslint-disable-next-line new-cap
				const oauth = new clientOAuth1(oAuthOptions);

				const options: RequestOptions = {
					method: 'POST',
					url: oauthCredentials.requestTokenUrl as string,
					data: oauthRequestData,
				};

				const data = oauth.toHeader(oauth.authorize(options));

				// @ts-ignore
				options.headers = data;

				const { data: response } = await axios.request(options as Partial<AxiosRequestConfig>);

				// Response comes as x-www-form-urlencoded string so convert it to JSON

				const paramsParser = new URLSearchParams(response);

				const responseJson = Object.fromEntries(paramsParser.entries());

				const returnUri = `${oauthCredentials.authUrl}?oauth_token=${responseJson.oauth_token}`;

				// Encrypt the data
				const credentials = new Credentials(
					credential as INodeCredentialsDetails,
					credential.type,
					credential.nodesAccess,
				);

				credentials.setData(decryptedDataOriginal, encryptionKey);
				const newCredentialsData = credentials.getDataToSave() as unknown as ICredentialsDb;

				// Add special database related data
				newCredentialsData.updatedAt = this.getCurrentDate();

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

					const mode: WorkflowExecuteMode = 'internal';
					const timezone = config.getEnv('generic.timezone');
					const credentialsHelper = new CredentialsHelper(encryptionKey);
					const decryptedDataOriginal = await credentialsHelper.getDecrypted(
						credential as INodeCredentialsDetails,
						credential.type,
						mode,
						timezone,
						true,
					);
					const oauthCredentials = credentialsHelper.applyDefaultsAndOverwrites(
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
					newCredentialsData.updatedAt = this.getCurrentDate();
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
						const currentJobs = await Queue.getInstance().getJobs(['active', 'waiting']);

						const currentlyRunningQueueIds = currentJobs.map((job) => job.data.executionId);

						const currentlyRunningManualExecutions =
							this.activeExecutionsInstance.getActiveExecutions();
						const manualExecutionIds = currentlyRunningManualExecutions.map(
							(execution) => execution.id,
						);

						const currentlyRunningExecutionIds =
							currentlyRunningQueueIds.concat(manualExecutionIds);

						if (!currentlyRunningExecutionIds.length) return [];

						const findOptions: FindManyOptions<IExecutionFlattedDb> = {
							select: ['id', 'workflowId', 'mode', 'retryOf', 'startedAt'],
							order: { id: 'DESC' },
							where: {
								id: In(currentlyRunningExecutionIds),
							},
						};

						const sharedWorkflowIds = await getSharedWorkflowIds(req.user);

						if (!sharedWorkflowIds.length) return [];

						if (req.query.filter) {
							const { workflowId } = jsonParse<any>(req.query.filter);
							if (workflowId && sharedWorkflowIds.includes(workflowId)) {
								Object.assign(findOptions.where!, { workflowId });
							}
						} else {
							Object.assign(findOptions.where!, { workflowId: In(sharedWorkflowIds) });
						}

						const executions = await Db.collections.Execution.find(findOptions);

						if (!executions.length) return [];

						return executions.map((execution) => {
							return {
								id: execution.id,
								workflowId: execution.workflowId,
								mode: execution.mode,
								retryOf: execution.retryOf !== null ? execution.retryOf : undefined,
								startedAt: new Date(execution.startedAt),
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
							(data.workflowId !== undefined &&
								!sharedWorkflowIds.includes(data.workflowId.toString()))
						) {
							continue;
						}

						returnData.push({
							id: data.id.toString(),
							workflowId: data.workflowId === undefined ? '' : data.workflowId.toString(),
							mode: data.mode,
							retryOf: data.retryOf,
							startedAt: new Date(data.startedAt),
						});
					}

					returnData.sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));

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

				const execution = await Db.collections.Execution.findOne({
					where: {
						id: executionId,
						workflowId: In(sharedWorkflowIds),
					},
				});

				if (!execution) {
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
						} as IExecutionsStopData;
					}

					const currentJobs = await Queue.getInstance().getJobs(['active', 'waiting']);

					const job = currentJobs.find((job) => job.data.executionId.toString() === req.params.id);

					if (!job) {
						throw new Error(`Could not stop "${req.params.id}" as it is no longer in queue.`);
					} else {
						await Queue.getInstance().stopJob(job);
					}

					const executionDb = (await Db.collections.Execution.findOne(
						req.params.id,
					)) as IExecutionFlattedDb;
					const fullExecutionData = ResponseHelper.unflattenExecutionData(executionDb);

					const returnData: IExecutionsStopData = {
						mode: fullExecutionData.mode,
						startedAt: new Date(fullExecutionData.startedAt),
						stoppedAt: fullExecutionData.stoppedAt
							? new Date(fullExecutionData.stoppedAt)
							: undefined,
						finished: fullExecutionData.finished,
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
					};
				}

				return returnData;
			}),
		);

		// Removes a test webhook
		this.app.delete(
			`/${this.restEndpoint}/test-webhook/:id`,
			ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<boolean> => {
				// TODO UM: check if this needs validation with user management.
				const workflowId = req.params.id;
				return this.testWebhooks.cancelTestWebhook(workflowId);
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
			async (req: express.Request, res: express.Response): Promise<void> => {
				// TODO UM: check if this needs permission check for UM
				const identifier = req.params.path;
				const binaryDataManager = BinaryDataManager.getInstance();
				const binaryPath = binaryDataManager.getBinaryPath(identifier);
				const { mimeType, fileName, fileSize } = await binaryDataManager.getBinaryMetadata(
					identifier,
				);
				if (mimeType) res.setHeader('Content-Type', mimeType);
				if (fileName) res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
				res.setHeader('Content-Length', fileSize);
				res.sendFile(binaryPath);
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
					void InternalHooksManager.getInstance().onFrontendSettingsAPI(
						req.headers.sessionid as string,
					);

					return this.getSettingsForFrontend();
				},
			),
		);

		// ----------------------------------------
		// Webhooks
		// ----------------------------------------

		if (!config.getEnv('endpoints.disableProductionWebhooksOnMainProcess')) {
			WebhookServer.registerProductionWebhooks.apply(this);
		}

		// Register all webhook requests (test for UI)
		this.app.all(
			`/${this.endpointWebhookTest}/*`,
			async (req: express.Request, res: express.Response) => {
				// Cut away the "/webhook-test/" to get the registered part of the url
				const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(
					this.endpointWebhookTest.length + 2,
				);

				const method = req.method.toUpperCase() as WebhookHttpMethod;

				if (method === 'OPTIONS') {
					let allowedMethods: string[];
					try {
						allowedMethods = await this.testWebhooks.getWebhookMethods(requestUrl);
						allowedMethods.push('OPTIONS');

						// Add custom "Allow" header to satisfy OPTIONS response.
						res.append('Allow', allowedMethods);
					} catch (error) {
						ResponseHelper.sendErrorResponse(res, error);
						return;
					}

					res.header('Access-Control-Allow-Origin', '*');

					ResponseHelper.sendSuccessResponse(res, {}, true, 204);
					return;
				}

				if (!WEBHOOK_METHODS.includes(method)) {
					ResponseHelper.sendErrorResponse(
						res,
						new Error(`The method ${method} is not supported.`),
					);
					return;
				}

				let response;
				try {
					response = await this.testWebhooks.callTestWebhook(method, requestUrl, req, res);
				} catch (error) {
					ResponseHelper.sendErrorResponse(res, error);
					return;
				}

				if (response.noWebhookResponse === true) {
					// Nothing else to do as the response got already sent
					return;
				}

				ResponseHelper.sendSuccessResponse(
					res,
					response.data,
					true,
					response.responseCode,
					response.headers,
				);
			},
		);

		if (this.endpointPresetCredentials !== '') {
			// POST endpoint to set preset credentials
			this.app.post(
				`/${this.endpointPresetCredentials}`,
				async (req: express.Request, res: express.Response) => {
					if (!this.presetCredentialsLoaded) {
						const body = req.body as ICredentialsOverwrite;

						if (req.headers['content-type'] !== 'application/json') {
							ResponseHelper.sendErrorResponse(
								res,
								new Error(
									'Body must be a valid JSON, make sure the content-type is application/json',
								),
							);
							return;
						}

						CredentialsOverwrites().setData(body);

						await LoadNodesAndCredentials().generateTypesForFrontend();

						this.presetCredentialsLoaded = true;

						ResponseHelper.sendSuccessResponse(res, { success: true }, true, 200);
					} else {
						ResponseHelper.sendErrorResponse(res, new Error('Preset credentials can be set once'));
					}
				},
			);
		}

		if (!config.getEnv('endpoints.disableUi')) {
			this.app.use('/', express.static(GENERATED_STATIC_DIR), express.static(EDITOR_UI_DIST_DIR));

			const startTime = new Date().toUTCString();
			this.app.use('/index.html', (req, res, next) => {
				res.setHeader('Last-Modified', startTime);
				next();
			});
		} else {
			this.app.use('/', express.static(GENERATED_STATIC_DIR));
		}
	}
}

export async function start(): Promise<void> {
	const PORT = config.getEnv('port');
	const ADDRESS = config.getEnv('listen_address');

	const app = new App();

	await app.config();

	let server;

	if (app.protocol === 'https' && app.sslKey && app.sslCert) {
		const https = require('https');
		const privateKey = readFileSync(app.sslKey, 'utf8');
		const cert = readFileSync(app.sslCert, 'utf8');
		const credentials = { key: privateKey, cert };
		server = https.createServer(credentials, app.app);
	} else {
		const http = require('http');
		server = http.createServer(app.app);
	}

	server.listen(PORT, ADDRESS, async () => {
		const versions = await GenericHelpers.getVersions();
		console.log(`n8n ready on ${ADDRESS}, port ${PORT}`);
		console.log(`Version: ${versions.cli}`);

		const defaultLocale = config.getEnv('defaultLocale');

		if (defaultLocale !== 'en') {
			console.log(`Locale: ${defaultLocale}`);
		}

		await app.externalHooks.run('n8n.ready', [app, config]);
		const cpus = os.cpus();
		const binaryDataConfig = config.getEnv('binaryDataManager');
		const diagnosticInfo: IDiagnosticInfo = {
			basicAuthActive: config.getEnv('security.basicAuth.active'),
			databaseType: (await GenericHelpers.getConfigValue('database.type')) as DatabaseType,
			disableProductionWebhooksOnMainProcess: config.getEnv(
				'endpoints.disableProductionWebhooksOnMainProcess',
			),
			notificationsEnabled: config.getEnv('versionNotifications.enabled'),
			versionCli: versions.cli,
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
				executions_data_prune_timeout: config.getEnv('executions.pruneDataTimeout'),
			},
			deploymentType: config.getEnv('deployment.type'),
			binaryDataMode: binaryDataConfig.mode,
			n8n_multi_user_allowed: isUserManagementEnabled(),
			smtp_set_up: config.getEnv('userManagement.emails.mode') === 'smtp',
		};

		void Db.collections
			.Workflow!.findOne({
				select: ['createdAt'],
				order: { createdAt: 'ASC' },
			})
			.then(async (workflow) =>
				InternalHooksManager.getInstance().onServerStarted(diagnosticInfo, workflow?.createdAt),
			);
	});

	server.on('error', (error: Error & { code: string }) => {
		if (error.code === 'EADDRINUSE') {
			console.log(
				`n8n's port ${PORT} is already in use. Do you have another instance of n8n running already?`,
			);
			process.exit(1);
		}
	});
}
