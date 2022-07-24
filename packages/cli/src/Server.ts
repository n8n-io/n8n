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
/* eslint-disable import/no-cycle */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable id-denylist */
/* eslint-disable no-console */
/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/return-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-continue */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable no-await-in-loop */

import express from 'express';
import { readFileSync, promises } from 'fs';
import { readFile } from 'fs/promises';
import _, { cloneDeep } from 'lodash';
import { dirname as pathDirname, join as pathJoin, resolve as pathResolve } from 'path';
import {
	FindManyOptions,
	getConnection,
	getConnectionManager,
	In,
	IsNull,
	LessThanOrEqual,
	Not,
	Raw,
} from 'typeorm';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import history from 'connect-history-api-fallback';
import os from 'os';
// eslint-disable-next-line import/no-extraneous-dependencies
import clientOAuth2 from 'client-oauth2';
import clientOAuth1, { RequestOptions } from 'oauth-1.0a';
import csrf from 'csrf';
import requestPromise, { OptionsWithUrl } from 'request-promise-native';
import { createHmac, randomBytes } from 'crypto';
// IMPORTANT! Do not switch to anther bcrypt library unless really necessary and
// tested with all possible systems like Windows, Alpine on ARM, FreeBSD, ...
import { compare } from 'bcryptjs';

import { BinaryDataManager, Credentials, LoadNodeParameterOptions, UserSettings } from 'n8n-core';

import {
	ICredentialType,
	IDataObject,
	INodeCredentials,
	INodeCredentialsDetails,
	INodeParameters,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	INodeTypeNameVersion,
	IPinData,
	ITelemetrySettings,
	IWorkflowBase,
	LoggerProxy,
	NodeHelpers,
	WebhookHttpMethod,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import basicAuth from 'basic-auth';
import compression from 'compression';
import jwt from 'jsonwebtoken';
import jwks from 'jwks-rsa';
// @ts-ignore
import timezones from 'google-timezones-json';
import parseUrl from 'parseurl';
import querystring from 'querystring';
import promClient, { Registry } from 'prom-client';
import * as Queue from './Queue';
import {
	LoadNodesAndCredentials,
	ActiveExecutions,
	ActiveWorkflowRunner,
	CredentialsHelper,
	CredentialsOverwrites,
	CredentialTypes,
	DatabaseType,
	Db,
	ExternalHooks,
	GenericHelpers,
	ICredentialsDb,
	ICredentialsOverwrite,
	ICustomRequest,
	IDiagnosticInfo,
	IExecutionFlattedDb,
	IExecutionFlattedResponse,
	IExecutionPushResponse,
	IExecutionResponse,
	IExecutionsListResponse,
	IExecutionsStopData,
	IExecutionsSummary,
	IExternalHooksClass,
	IN8nUISettings,
	IPackageVersions,
	ITagWithCountDb,
	IWorkflowExecutionDataProcess,
	IWorkflowResponse,
	NodeTypes,
	Push,
	ResponseHelper,
	TestWebhooks,
	WaitTracker,
	WaitTrackerClass,
	WebhookHelpers,
	WebhookServer,
	WorkflowExecuteAdditionalData,
	WorkflowHelpers,
	WorkflowRunner,
	getCredentialForUser,
	getCredentialWithoutUser,
	IWorkflowDb,
} from '.';

import config from '../config';

import * as TagHelpers from './TagHelpers';

import { InternalHooksManager } from './InternalHooksManager';
import { TagEntity } from './databases/entities/TagEntity';
import { WorkflowEntity } from './databases/entities/WorkflowEntity';
import { getSharedWorkflowIds, isBelowOnboardingThreshold, whereClause } from './WorkflowHelpers';
import { getCredentialTranslationPath, getNodeTranslationPath } from './TranslationHelpers';
import { WEBHOOK_METHODS } from './WebhookHelpers';

import { userManagementRouter } from './UserManagement';
import { resolveJwt } from './UserManagement/auth/jwt';
import { User } from './databases/entities/User';
import type {
	AuthenticatedRequest,
	CredentialRequest,
	ExecutionRequest,
	NodeParameterOptionsRequest,
	OAuthRequest,
	TagsRequest,
	WorkflowRequest,
} from './requests';
import { DEFAULT_EXECUTIONS_GET_ALL_LIMIT, validateEntity } from './GenericHelpers';
import { ExecutionEntity } from './databases/entities/ExecutionEntity';
import { AUTH_COOKIE_NAME, RESPONSE_ERROR_MESSAGES } from './constants';
import { credentialsController } from './api/credentials.api';
import { workflowsController } from './api/workflows.api';
import { nodesController } from './api/nodes.api';
import { oauth2CredentialController } from './api/oauth2Credential.api';
import {
	getInstanceBaseUrl,
	isEmailSetUp,
	isUserManagementEnabled,
} from './UserManagement/UserManagementHelper';
import { loadPublicApiVersions } from './PublicApi';
import { SharedWorkflow } from './databases/entities/SharedWorkflow';

require('body-parser-xml')(bodyParser);

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

	constructor() {
		this.app = express();

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

		this.activeExecutionsInstance = ActiveExecutions.getInstance();
		this.waitTracker = WaitTracker();

		this.protocol = config.getEnv('protocol');
		this.sslKey = config.getEnv('ssl_key');
		this.sslCert = config.getEnv('ssl_cert');

		this.externalHooks = externalHooks;

		this.presetCredentialsLoaded = false;
		this.endpointPresetCredentials = config.getEnv('credentials.overwrite.endpoint');

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

		this.frontendSettings = {
			endpointWebhook: this.endpointWebhook,
			endpointWebhookTest: this.endpointWebhookTest,
			saveDataErrorExecution: this.saveDataErrorExecution,
			saveDataSuccessExecution: this.saveDataSuccessExecution,
			saveManualExecutions: this.saveManualExecutions,
			executionTimeout: this.executionTimeout,
			maxExecutionTimeout: this.maxExecutionTimeout,
			timezone: this.timezone,
			urlBaseWebhook,
			urlBaseEditor: getInstanceBaseUrl(),
			versionCli: '',
			oauthCallbackUrls: {
				oauth1: `${urlBaseWebhook}${this.restEndpoint}/oauth1-credential/callback`,
				oauth2: `${urlBaseWebhook}${this.restEndpoint}/oauth2-credential/callback`,
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
			executionMode: config.getEnv('executions.mode'),
			communityNodesEnabled: config.getEnv('nodes.communityPackages.enabled'),
		};
	}

	/**
	 * Returns the current epoch time
	 *
	 * @returns {number}
	 * @memberof App
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

		if (config.get('nodes.packagesMissing').length > 0) {
			this.frontendSettings.missingPackages = true;
		}

		return this.frontendSettings;
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

		this.versions = await GenericHelpers.getVersions();
		this.frontendSettings.versionCli = this.versions.cli;

		this.frontendSettings.instanceId = await UserSettings.getInstanceId();

		await this.externalHooks.run('frontend.settings', [this.frontendSettings]);

		const excludeEndpoints = config.getEnv('security.excludeEndpoints');

		const ignoredEndpoints = [
			'healthz',
			'metrics',
			this.endpointWebhook,
			this.endpointWebhookTest,
			this.endpointPresetCredentials,
		];
		if (!config.getEnv('publicApi.disabled')) {
			ignoredEndpoints.push(this.publicApiEndpoint);
		}
		// eslint-disable-next-line prefer-spread
		ignoredEndpoints.push.apply(ignoredEndpoints, excludeEndpoints.split(':'));

		// eslint-disable-next-line no-useless-escape
		const authIgnoreRegex = new RegExp(`^\/(${_(ignoredEndpoints).compact().join('|')})\/?.*$`);

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
		this.app.use(
			async (req: express.Request, res: express.Response, next: express.NextFunction) => {
				if (req.url.indexOf(`/${this.restEndpoint}/push`) === 0) {
					if (req.query.sessionId === undefined) {
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

					this.push.add(req.query.sessionId as string, req, res);
					return;
				}
				next();
			},
		);

		// Compress the response data
		this.app.use(compression());

		// Make sure that each request has the "parsedUrl" parameter
		this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
			(req as ICustomRequest).parsedUrl = parseUrl(req);
			// @ts-ignore
			req.rawBody = Buffer.from('', 'base64');
			next();
		});

		// Support application/json type post data
		this.app.use(
			bodyParser.json({
				limit: `${this.payloadSizeMax}mb`,
				verify: (req, res, buf) => {
					// @ts-ignore
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
					// @ts-ignore
					req.rawBody = buf;
				},
			}),
		);

		this.app.use(
			bodyParser.text({
				limit: `${this.payloadSizeMax}mb`,
				verify: (req, res, buf) => {
					// @ts-ignore
					req.rawBody = buf;
				},
			}),
		);

		// Make sure that Vue history mode works properly
		this.app.use(
			history({
				rewrites: [
					{
						from: new RegExp(
							// eslint-disable-next-line no-useless-escape
							`^\/(${this.restEndpoint}|healthz|metrics|css|js|${this.endpointWebhook}|${this.endpointWebhookTest})\/?.*$`,
						),
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
					// @ts-ignore
					req.rawBody = buf;
				},
			}),
		);

		if (process.env.NODE_ENV !== 'production') {
			this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
				// Allow access also from frontend when developing
				res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
				res.header('Access-Control-Allow-Credentials', 'true');
				res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
				res.header(
					'Access-Control-Allow-Headers',
					'Origin, X-Requested-With, Content-Type, Accept, sessionid',
				);
				next();
			});
		}

		// eslint-disable-next-line consistent-return
		this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
			if (!Db.isInitialized) {
				const error = new ResponseHelper.ResponseError('Database is not ready!', undefined, 503);
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
				LoggerProxy.error('No Database connection!', err);
				const error = new ResponseHelper.ResponseError('No Database connection!', undefined, 503);
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

		// Reads and returns workflow data from an URL
		this.app.get(
			`/${this.restEndpoint}/workflows/from-url`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<IWorkflowResponse> => {
					if (req.query.url === undefined) {
						throw new ResponseHelper.ResponseError(
							`The parameter "url" is missing!`,
							undefined,
							400,
						);
					}
					if (!/^http[s]?:\/\/.*\.json$/i.exec(req.query.url as string)) {
						throw new ResponseHelper.ResponseError(
							`The parameter "url" is not valid! It does not seem to be a URL pointing to a n8n workflow JSON file.`,
							undefined,
							400,
						);
					}
					const data = await requestPromise.get(req.query.url as string);

					let workflowData: IWorkflowResponse | undefined;
					try {
						workflowData = JSON.parse(data);
					} catch (error) {
						throw new ResponseHelper.ResponseError(
							`The URL does not point to valid JSON file!`,
							undefined,
							400,
						);
					}

					// Do a very basic check if it is really a n8n-workflow-json
					if (
						workflowData === undefined ||
						workflowData.nodes === undefined ||
						!Array.isArray(workflowData.nodes) ||
						workflowData.connections === undefined ||
						typeof workflowData.connections !== 'object' ||
						Array.isArray(workflowData.connections)
					) {
						throw new ResponseHelper.ResponseError(
							`The data in the file does not seem to be a n8n workflow JSON file!`,
							undefined,
							400,
						);
					}

					return workflowData;
				},
			),
		);

		// Returns workflows
		this.app.get(
			`/${this.restEndpoint}/workflows`,
			ResponseHelper.send(async (req: WorkflowRequest.GetAll) => {
				let workflows: WorkflowEntity[] = [];

				const filter: Record<string, string> = req.query.filter ? JSON.parse(req.query.filter) : {};

				const query: FindManyOptions<WorkflowEntity> = {
					select: ['id', 'name', 'active', 'createdAt', 'updatedAt'],
					relations: ['tags'],
				};

				if (config.getEnv('workflowTagsDisabled')) {
					delete query.relations;
				}

				if (req.user.globalRole.name === 'owner') {
					workflows = await Db.collections.Workflow.find(
						Object.assign(query, {
							where: filter,
						}),
					);
				} else {
					const shared = await Db.collections.SharedWorkflow.find({
						relations: ['workflow'],
						where: whereClause({
							user: req.user,
							entityType: 'workflow',
						}),
					});

					if (!shared.length) return [];

					workflows = await Db.collections.Workflow.find(
						Object.assign(query, {
							where: {
								id: In(shared.map(({ workflow }) => workflow.id)),
								...filter,
							},
						}),
					);
				}

				return workflows.map((workflow) => {
					const { id, ...rest } = workflow;

					return {
						id: id.toString(),
						...rest,
					};
				});
			}),
		);

		this.app.get(
			`/${this.restEndpoint}/workflows/new`,
			ResponseHelper.send(async (req: WorkflowRequest.NewName) => {
				const requestedName =
					req.query.name && req.query.name !== '' ? req.query.name : this.defaultWorkflowName;

				const name = await GenericHelpers.generateUniqueName(requestedName, 'workflow');

				const onboardingFlowEnabled =
					!config.getEnv('workflows.onboardingFlowDisabled') &&
					!req.user.settings?.isOnboarded &&
					(await isBelowOnboardingThreshold(req.user));

				return { name, onboardingFlowEnabled };
			}),
		);

		// Updates an existing workflow
		this.app.patch(
			`/${this.restEndpoint}/workflows/:id`,
			ResponseHelper.send(async (req: WorkflowRequest.Update) => {
				const { id: workflowId } = req.params;

				const updateData = new WorkflowEntity();
				const { tags, ...rest } = req.body;
				Object.assign(updateData, rest);

				const shared = await Db.collections.SharedWorkflow.findOne({
					relations: ['workflow'],
					where: whereClause({
						user: req.user,
						entityType: 'workflow',
						entityId: workflowId,
					}),
				});

				if (!shared) {
					LoggerProxy.info('User attempted to update a workflow without permissions', {
						workflowId,
						userId: req.user.id,
					});
					throw new ResponseHelper.ResponseError(
						`Workflow with ID "${workflowId}" could not be found to be updated.`,
						undefined,
						404,
					);
				}

				// check credentials for old format
				await WorkflowHelpers.replaceInvalidCredentials(updateData);

				await this.externalHooks.run('workflow.update', [updateData]);

				if (shared.workflow.active) {
					// When workflow gets saved always remove it as the triggers could have been
					// changed and so the changes would not take effect
					await this.activeWorkflowRunner.remove(workflowId);
				}

				if (updateData.settings) {
					if (updateData.settings.timezone === 'DEFAULT') {
						// Do not save the default timezone
						delete updateData.settings.timezone;
					}
					if (updateData.settings.saveDataErrorExecution === 'DEFAULT') {
						// Do not save when default got set
						delete updateData.settings.saveDataErrorExecution;
					}
					if (updateData.settings.saveDataSuccessExecution === 'DEFAULT') {
						// Do not save when default got set
						delete updateData.settings.saveDataSuccessExecution;
					}
					if (updateData.settings.saveManualExecutions === 'DEFAULT') {
						// Do not save when default got set
						delete updateData.settings.saveManualExecutions;
					}
					if (
						parseInt(updateData.settings.executionTimeout as string, 10) === this.executionTimeout
					) {
						// Do not save when default got set
						delete updateData.settings.executionTimeout;
					}
				}

				if (updateData.name) {
					updateData.updatedAt = this.getCurrentDate(); // required due to atomic update
					await validateEntity(updateData);
				}

				await Db.collections.Workflow.update(workflowId, updateData);

				if (tags && !config.getEnv('workflowTagsDisabled')) {
					const tablePrefix = config.getEnv('database.tablePrefix');
					await TagHelpers.removeRelations(workflowId, tablePrefix);

					if (tags.length) {
						await TagHelpers.createRelations(workflowId, tags, tablePrefix);
					}
				}

				const options: FindManyOptions<WorkflowEntity> = {
					relations: ['tags'],
				};

				if (config.getEnv('workflowTagsDisabled')) {
					delete options.relations;
				}

				// We sadly get nothing back from "update". Neither if it updated a record
				// nor the new value. So query now the hopefully updated entry.
				const updatedWorkflow = await Db.collections.Workflow.findOne(workflowId, options);

				if (updatedWorkflow === undefined) {
					throw new ResponseHelper.ResponseError(
						`Workflow with ID "${workflowId}" could not be found to be updated.`,
						undefined,
						400,
					);
				}

				if (updatedWorkflow.tags.length && tags?.length) {
					updatedWorkflow.tags = TagHelpers.sortByRequestOrder(updatedWorkflow.tags, {
						requestOrder: tags,
					});
				}

				await this.externalHooks.run('workflow.afterUpdate', [updatedWorkflow]);
				void InternalHooksManager.getInstance().onWorkflowSaved(
					req.user.id,
					updatedWorkflow,
					false,
				);

				if (updatedWorkflow.active) {
					// When the workflow is supposed to be active add it again
					try {
						await this.externalHooks.run('workflow.activate', [updatedWorkflow]);
						await this.activeWorkflowRunner.add(
							workflowId,
							shared.workflow.active ? 'update' : 'activate',
						);
					} catch (error) {
						// If workflow could not be activated set it again to inactive
						updateData.active = false;
						await Db.collections.Workflow.update(workflowId, updateData);

						// Also set it in the returned data
						updatedWorkflow.active = false;

						// Now return the original error for UI to display
						throw error;
					}
				}

				const { id, ...remainder } = updatedWorkflow;

				return {
					id: id.toString(),
					...remainder,
				};
			}),
		);

		// Deletes a specific workflow
		this.app.delete(
			`/${this.restEndpoint}/workflows/:id`,
			ResponseHelper.send(async (req: WorkflowRequest.Delete) => {
				const { id: workflowId } = req.params;

				await this.externalHooks.run('workflow.delete', [workflowId]);

				const shared = await Db.collections.SharedWorkflow.findOne({
					relations: ['workflow'],
					where: whereClause({
						user: req.user,
						entityType: 'workflow',
						entityId: workflowId,
					}),
				});

				if (!shared) {
					LoggerProxy.info('User attempted to delete a workflow without permissions', {
						workflowId,
						userId: req.user.id,
					});
					throw new ResponseHelper.ResponseError(
						`Workflow with ID "${workflowId}" could not be found to be deleted.`,
						undefined,
						400,
					);
				}

				if (shared.workflow.active) {
					// deactivate before deleting
					await this.activeWorkflowRunner.remove(workflowId);
				}

				await Db.collections.Workflow.delete(workflowId);

				void InternalHooksManager.getInstance().onWorkflowDeleted(req.user.id, workflowId, false);
				await this.externalHooks.run('workflow.afterDelete', [workflowId]);

				return true;
			}),
		);

		this.app.post(
			`/${this.restEndpoint}/workflows/run`,
			ResponseHelper.send(
				async (
					req: WorkflowRequest.ManualRun,
					res: express.Response,
				): Promise<IExecutionPushResponse> => {
					const { workflowData } = req.body;
					const { runData } = req.body;
					const { pinData } = req.body;
					const { startNodes } = req.body;
					const { destinationNode } = req.body;
					const executionMode = 'manual';
					const activationMode = 'manual';

					const sessionId = GenericHelpers.getSessionId(req);

					const pinnedTrigger = findFirstPinnedTrigger(workflowData, pinData);

					// If webhooks nodes exist and are active we have to wait for till we receive a call
					if (
						pinnedTrigger === undefined &&
						(runData === undefined ||
							startNodes === undefined ||
							startNodes.length === 0 ||
							destinationNode === undefined)
					) {
						const additionalData = await WorkflowExecuteAdditionalData.getBase(req.user.id);
						const nodeTypes = NodeTypes();
						const workflowInstance = new Workflow({
							id: workflowData.id?.toString(),
							name: workflowData.name,
							nodes: workflowData.nodes!,
							connections: workflowData.connections!,
							active: false,
							nodeTypes,
							staticData: undefined,
							settings: workflowData.settings,
						});
						const needsWebhook = await this.testWebhooks.needsWebhookData(
							workflowData,
							workflowInstance,
							additionalData,
							executionMode,
							activationMode,
							sessionId,
							destinationNode,
						);
						if (needsWebhook) {
							return {
								waitingForWebhook: true,
							};
						}
					}

					// For manual testing always set to not active
					workflowData.active = false;

					// Start the workflow
					const data: IWorkflowExecutionDataProcess = {
						destinationNode,
						executionMode,
						runData,
						pinData,
						sessionId,
						startNodes,
						workflowData,
						userId: req.user.id,
					};

					if (pinnedTrigger) {
						data.startNodes = [pinnedTrigger.name];
					}

					const workflowRunner = new WorkflowRunner();
					const executionId = await workflowRunner.run(data);

					return {
						executionId,
					};
				},
			),
		);

		this.app.use(`/${this.restEndpoint}/workflows`, workflowsController);

		// Retrieves all tags, with or without usage count
		this.app.get(
			`/${this.restEndpoint}/tags`,
			ResponseHelper.send(
				async (
					req: express.Request,
					res: express.Response,
				): Promise<TagEntity[] | ITagWithCountDb[]> => {
					if (config.getEnv('workflowTagsDisabled')) {
						throw new ResponseHelper.ResponseError('Workflow tags are disabled');
					}
					if (req.query.withUsageCount === 'true') {
						const tablePrefix = config.getEnv('database.tablePrefix');
						return TagHelpers.getTagsWithCountDb(tablePrefix);
					}

					return Db.collections.Tag.find({ select: ['id', 'name', 'createdAt', 'updatedAt'] });
				},
			),
		);

		// Creates a tag
		this.app.post(
			`/${this.restEndpoint}/tags`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<TagEntity | void> => {
					if (config.getEnv('workflowTagsDisabled')) {
						throw new ResponseHelper.ResponseError('Workflow tags are disabled');
					}
					const newTag = new TagEntity();
					newTag.name = req.body.name.trim();

					await this.externalHooks.run('tag.beforeCreate', [newTag]);

					await validateEntity(newTag);
					const tag = await Db.collections.Tag.save(newTag);

					await this.externalHooks.run('tag.afterCreate', [tag]);

					return tag;
				},
			),
		);

		// Updates a tag
		this.app.patch(
			`/${this.restEndpoint}/tags/:id`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<TagEntity | void> => {
					if (config.getEnv('workflowTagsDisabled')) {
						throw new ResponseHelper.ResponseError('Workflow tags are disabled');
					}

					const { name } = req.body;
					const { id } = req.params;

					const newTag = new TagEntity();
					// @ts-ignore
					newTag.id = id;
					newTag.name = name.trim();

					await this.externalHooks.run('tag.beforeUpdate', [newTag]);

					await validateEntity(newTag);
					const tag = await Db.collections.Tag.save(newTag);

					await this.externalHooks.run('tag.afterUpdate', [tag]);

					return tag;
				},
			),
		);

		// Deletes a tag
		this.app.delete(
			`/${this.restEndpoint}/tags/:id`,
			ResponseHelper.send(
				async (req: TagsRequest.Delete, res: express.Response): Promise<boolean> => {
					if (config.getEnv('workflowTagsDisabled')) {
						throw new ResponseHelper.ResponseError('Workflow tags are disabled');
					}
					if (
						config.getEnv('userManagement.isInstanceOwnerSetUp') === true &&
						req.user.globalRole.name !== 'owner'
					) {
						throw new ResponseHelper.ResponseError(
							'You are not allowed to perform this action',
							undefined,
							403,
							'Only owners can remove tags',
						);
					}
					const id = Number(req.params.id);

					await this.externalHooks.run('tag.beforeDelete', [id]);

					await Db.collections.Tag.delete({ id });

					await this.externalHooks.run('tag.afterDelete', [id]);

					return true;
				},
			),
		);

		// Returns parameter values which normally get loaded from an external API or
		// get generated dynamically
		this.app.get(
			`/${this.restEndpoint}/node-parameter-options`,
			ResponseHelper.send(
				async (req: NodeParameterOptionsRequest): Promise<INodePropertyOptions[]> => {
					const nodeTypeAndVersion = JSON.parse(
						req.query.nodeTypeAndVersion,
					) as INodeTypeNameVersion;

					const { path, methodName } = req.query;

					const currentNodeParameters = JSON.parse(
						req.query.currentNodeParameters,
					) as INodeParameters;

					let credentials: INodeCredentials | undefined;

					if (req.query.credentials) {
						credentials = JSON.parse(req.query.credentials);
					}

					const loadDataInstance = new LoadNodeParameterOptions(
						nodeTypeAndVersion,
						NodeTypes(),
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
							JSON.parse(req.query.loadOptions as string),
							additionalData,
						);
					}

					return [];
				},
			),
		);

		// Returns all the node-types
		this.app.get(
			`/${this.restEndpoint}/node-types`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<INodeTypeDescription[]> => {
					const returnData: INodeTypeDescription[] = [];
					const onlyLatest = req.query.onlyLatest === 'true';

					const nodeTypes = NodeTypes();
					const allNodes = nodeTypes.getAll();

					const getNodeDescription = (nodeType: INodeType): INodeTypeDescription => {
						const nodeInfo: INodeTypeDescription = { ...nodeType.description };
						if (req.query.includeProperties !== 'true') {
							// @ts-ignore
							delete nodeInfo.properties;
						}
						return nodeInfo;
					};

					if (onlyLatest) {
						allNodes.forEach((nodeData) => {
							const nodeType = NodeHelpers.getVersionedNodeType(nodeData);
							const nodeInfo: INodeTypeDescription = getNodeDescription(nodeType);
							returnData.push(nodeInfo);
						});
					} else {
						allNodes.forEach((nodeData) => {
							const allNodeTypes = NodeHelpers.getVersionedNodeTypeAll(nodeData);
							allNodeTypes.forEach((element) => {
								const nodeInfo: INodeTypeDescription = getNodeDescription(element);
								returnData.push(nodeInfo);
							});
						});
					}

					return returnData;
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
		this.app.post(
			`/${this.restEndpoint}/node-types`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<INodeTypeDescription[]> => {
					const nodeInfos = _.get(req, 'body.nodeInfos', []) as INodeTypeNameVersion[];

					const { defaultLocale } = this.frontendSettings;

					if (defaultLocale === 'en') {
						return nodeInfos.reduce<INodeTypeDescription[]>((acc, { name, version }) => {
							const { description } = NodeTypes().getByNameAndVersion(name, version);
							acc.push(injectCustomApiCallOption(description));
							return acc;
						}, []);
					}

					async function populateTranslation(
						name: string,
						version: number,
						nodeTypes: INodeTypeDescription[],
					) {
						const { description, sourcePath } = NodeTypes().getWithSourcePath(name, version);
						const translationPath = await getNodeTranslationPath({
							nodeSourcePath: sourcePath,
							longNodeType: description.name,
							locale: defaultLocale,
						});

						try {
							const translation = await readFile(translationPath, 'utf8');
							description.translation = JSON.parse(translation);
						} catch (error) {
							// ignore - no translation exists at path
						}

						nodeTypes.push(injectCustomApiCallOption(description));
					}

					const nodeTypes: INodeTypeDescription[] = [];

					const promises = nodeInfos.map(async ({ name, version }) =>
						populateTranslation(name, version, nodeTypes),
					);

					await Promise.all(promises);

					return nodeTypes;
				},
			),
		);

		// Returns node information based on node names and versions
		this.app.get(
			`/${this.restEndpoint}/node-translation-headers`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<object | void> => {
					const packagesPath = pathJoin(__dirname, '..', '..', '..');
					const headersPath = pathJoin(packagesPath, 'nodes-base', 'dist', 'nodes', 'headers');

					try {
						await promises.access(`${headersPath}.js`);
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

		// Returns the node icon
		this.app.get(
			[
				`/${this.restEndpoint}/node-icon/:nodeType`,
				`/${this.restEndpoint}/node-icon/:scope/:nodeType`,
			],
			async (req: express.Request, res: express.Response): Promise<void> => {
				try {
					const nodeTypeName = `${req.params.scope ? `${req.params.scope}/` : ''}${
						req.params.nodeType
					}`;

					const nodeTypes = NodeTypes();
					const nodeType = nodeTypes.getByNameAndVersion(nodeTypeName);

					if (nodeType === undefined) {
						res.status(404).send('The nodeType is not known.');
						return;
					}

					if (nodeType.description.icon === undefined) {
						res.status(404).send('No icon found for node.');
						return;
					}

					if (!nodeType.description.icon.startsWith('file:')) {
						res.status(404).send('Node does not have a file icon.');
						return;
					}

					const filepath = nodeType.description.icon.substr(5);

					const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
					res.setHeader('Cache-control', `private max-age=${maxAge}`);

					res.sendFile(filepath);
				} catch (error) {
					// Error response
					return ResponseHelper.sendErrorResponse(res, error);
				}
			},
		);

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

					throw new ResponseHelper.ResponseError(
						`Workflow with ID "${workflowId}" could not be found.`,
						undefined,
						400,
					);
				}

				return this.activeWorkflowRunner.getActivationError(workflowId);
			}),
		);

		// ----------------------------------------
		// Credential-Types
		// ----------------------------------------

		// Returns all the credential types which are defined in the loaded n8n-modules
		this.app.get(
			`/${this.restEndpoint}/credential-types`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<ICredentialType[]> => {
					const returnData: ICredentialType[] = [];

					const credentialTypes = CredentialTypes();

					credentialTypes.getAll().forEach((credentialData) => {
						returnData.push(credentialData);
					});

					return returnData;
				},
			),
		);

		this.app.get(
			`/${this.restEndpoint}/credential-icon/:credentialType`,
			async (req: express.Request, res: express.Response): Promise<void> => {
				try {
					const credentialName = req.params.credentialType;

					const credentialType = CredentialTypes().getByName(credentialName);

					if (credentialType === undefined) {
						res.status(404).send('The credentialType is not known.');
						return;
					}

					if (credentialType.icon === undefined) {
						res.status(404).send('No icon found for credential.');
						return;
					}

					if (!credentialType.icon.startsWith('file:')) {
						res.status(404).send('Credential does not have a file icon.');
						return;
					}

					const filepath = credentialType.icon.substr(5);

					const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
					res.setHeader('Cache-control', `private max-age=${maxAge}`);

					res.sendFile(filepath);
				} catch (error) {
					// Error response
					return ResponseHelper.sendErrorResponse(res, error);
				}
			},
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
					throw new ResponseHelper.ResponseError(
						'Required credential ID is missing',
						undefined,
						400,
					);
				}

				const credential = await getCredentialForUser(credentialId, req.user);

				if (!credential) {
					LoggerProxy.error(
						'OAuth1 credential authorization failed because the current user does not have the correct permissions',
						{ userId: req.user.id },
					);
					throw new ResponseHelper.ResponseError(
						RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL,
						undefined,
						404,
					);
				}

				let encryptionKey: string;
				try {
					encryptionKey = await UserSettings.getEncryptionKey();
				} catch (error) {
					throw new ResponseHelper.ResponseError(error.message, undefined, 500);
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

				const signatureMethod = _.get(oauthCredentials, 'signatureMethod') as string;

				const oAuthOptions: clientOAuth1.Options = {
					consumer: {
						key: _.get(oauthCredentials, 'consumerKey') as string,
						secret: _.get(oauthCredentials, 'consumerSecret') as string,
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
					url: _.get(oauthCredentials, 'requestTokenUrl') as string,
					data: oauthRequestData,
				};

				const data = oauth.toHeader(oauth.authorize(options));

				// @ts-ignore
				options.headers = data;

				const response = await requestPromise(options);

				// Response comes as x-www-form-urlencoded string so convert it to JSON

				const responseJson = querystring.parse(response);

				const returnUri = `${_.get(oauthCredentials, 'authUrl')}?oauth_token=${
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
						const errorResponse = new ResponseHelper.ResponseError(
							`Insufficient parameters for OAuth1 callback. Received following query parameters: ${JSON.stringify(
								req.query,
							)}`,
							undefined,
							503,
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
						const errorResponse = new ResponseHelper.ResponseError(
							RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL,
							undefined,
							404,
						);
						return ResponseHelper.sendErrorResponse(res, errorResponse);
					}

					let encryptionKey: string;
					try {
						encryptionKey = await UserSettings.getEncryptionKey();
					} catch (error) {
						throw new ResponseHelper.ResponseError(error.message, undefined, 500);
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

					const options: OptionsWithUrl = {
						method: 'POST',
						url: _.get(oauthCredentials, 'accessTokenUrl') as string,
						qs: {
							oauth_token,
							oauth_verifier,
						},
					};

					let oauthToken;

					try {
						oauthToken = await requestPromise(options);
					} catch (error) {
						LoggerProxy.error('Unable to fetch tokens for OAuth1 callback', {
							userId: req.user?.id,
							credentialId,
						});
						const errorResponse = new ResponseHelper.ResponseError(
							'Unable to get access tokens!',
							undefined,
							404,
						);
						return ResponseHelper.sendErrorResponse(res, errorResponse);
					}

					// Response comes as x-www-form-urlencoded string so convert it to JSON

					const oauthTokenJson = querystring.parse(oauthToken);

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
					res.sendFile(pathResolve(__dirname, '../../templates/oauth-callback.html'));
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

		// Returns all finished executions
		this.app.get(
			`/${this.restEndpoint}/executions`,
			ResponseHelper.send(
				async (req: ExecutionRequest.GetAll): Promise<IExecutionsListResponse> => {
					const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

					const limit = req.query.limit
						? parseInt(req.query.limit, 10)
						: DEFAULT_EXECUTIONS_GET_ALL_LIMIT;

					const executingWorkflowIds: string[] = [];

					if (config.getEnv('executions.mode') === 'queue') {
						const currentJobs = await Queue.getInstance().getJobs(['active', 'waiting']);
						executingWorkflowIds.push(...currentJobs.map(({ data }) => data.executionId));
					}

					// We may have manual executions even with queue so we must account for these.
					executingWorkflowIds.push(
						...this.activeExecutionsInstance.getActiveExecutions().map(({ id }) => id),
					);

					const countFilter = cloneDeep(filter);
					countFilter.waitTill &&= Not(IsNull());
					countFilter.id = Not(In(executingWorkflowIds));

					const sharedWorkflowIds = await getSharedWorkflowIds(req.user);

					const findOptions: FindManyOptions<ExecutionEntity> = {
						select: [
							'id',
							'finished',
							'mode',
							'retryOf',
							'retrySuccessId',
							'waitTill',
							'startedAt',
							'stoppedAt',
							'workflowData',
						],
						where: { workflowId: In(sharedWorkflowIds) },
						order: { id: 'DESC' },
						take: limit,
					};

					Object.entries(filter).forEach(([key, value]) => {
						let filterToAdd = {};

						if (key === 'waitTill') {
							filterToAdd = { waitTill: Not(IsNull()) };
						} else if (key === 'finished' && value === false) {
							filterToAdd = { finished: false, waitTill: IsNull() };
						} else {
							filterToAdd = { [key]: value };
						}

						Object.assign(findOptions.where, filterToAdd);
					});

					const rangeQuery: string[] = [];
					const rangeQueryParams: {
						lastId?: string;
						firstId?: string;
						executingWorkflowIds?: string[];
					} = {};

					if (req.query.lastId) {
						rangeQuery.push('id < :lastId');
						rangeQueryParams.lastId = req.query.lastId;
					}

					if (req.query.firstId) {
						rangeQuery.push('id > :firstId');
						rangeQueryParams.firstId = req.query.firstId;
					}

					if (executingWorkflowIds.length > 0) {
						rangeQuery.push(`id NOT IN (:...executingWorkflowIds)`);
						rangeQueryParams.executingWorkflowIds = executingWorkflowIds;
					}

					if (rangeQuery.length) {
						Object.assign(findOptions.where, {
							id: Raw(() => rangeQuery.join(' and '), rangeQueryParams),
						});
					}

					const executions = await Db.collections.Execution.find(findOptions);

					const { count, estimated } = await getExecutionsCount(countFilter, req.user);

					const formattedExecutions = executions.map((execution) => {
						return {
							id: execution.id.toString(),
							finished: execution.finished,
							mode: execution.mode,
							retryOf: execution.retryOf?.toString(),
							retrySuccessId: execution?.retrySuccessId?.toString(),
							waitTill: execution.waitTill as Date | undefined,
							startedAt: execution.startedAt,
							stoppedAt: execution.stoppedAt,
							workflowId: execution.workflowData?.id?.toString() ?? '',
							workflowName: execution.workflowData.name,
						};
					});

					return {
						count,
						results: formattedExecutions,
						estimated,
					};
				},
			),
		);

		// Returns a specific execution
		this.app.get(
			`/${this.restEndpoint}/executions/:id`,
			ResponseHelper.send(
				async (
					req: ExecutionRequest.Get,
				): Promise<IExecutionResponse | IExecutionFlattedResponse | undefined> => {
					const { id: executionId } = req.params;

					const sharedWorkflowIds = await getSharedWorkflowIds(req.user);

					if (!sharedWorkflowIds.length) return undefined;

					const execution = await Db.collections.Execution.findOne({
						where: {
							id: executionId,
							workflowId: In(sharedWorkflowIds),
						},
					});

					if (!execution) {
						LoggerProxy.info(
							'Attempt to read execution was blocked due to insufficient permissions',
							{
								userId: req.user.id,
								executionId,
							},
						);
						return undefined;
					}

					if (req.query.unflattedResponse === 'true') {
						return ResponseHelper.unflattenExecutionData(execution);
					}

					const { id, ...rest } = execution;

					// @ts-ignore
					return {
						id: id.toString(),
						...rest,
					};
				},
			),
		);

		// Retries a failed execution
		this.app.post(
			`/${this.restEndpoint}/executions/:id/retry`,
			ResponseHelper.send(async (req: ExecutionRequest.Retry): Promise<boolean> => {
				const { id: executionId } = req.params;

				const sharedWorkflowIds = await getSharedWorkflowIds(req.user);

				if (!sharedWorkflowIds.length) return false;

				const execution = await Db.collections.Execution.findOne({
					where: {
						id: executionId,
						workflowId: In(sharedWorkflowIds),
					},
				});

				if (!execution) {
					LoggerProxy.info(
						'Attempt to retry an execution was blocked due to insufficient permissions',
						{
							userId: req.user.id,
							executionId,
						},
					);
					throw new ResponseHelper.ResponseError(
						`The execution with the ID "${executionId}" does not exist.`,
						404,
						404,
					);
				}

				const fullExecutionData = ResponseHelper.unflattenExecutionData(execution);

				if (fullExecutionData.finished) {
					throw new Error('The execution succeeded, so it cannot be retried.');
				}

				const executionMode = 'retry';

				fullExecutionData.workflowData.active = false;

				// Start the workflow
				const data: IWorkflowExecutionDataProcess = {
					executionMode,
					executionData: fullExecutionData.data,
					retryOf: req.params.id,
					workflowData: fullExecutionData.workflowData,
					userId: req.user.id,
				};

				const { lastNodeExecuted } = data.executionData!.resultData;

				if (lastNodeExecuted) {
					// Remove the old error and the data of the last run of the node that it can be replaced
					delete data.executionData!.resultData.error;
					const { length } = data.executionData!.resultData.runData[lastNodeExecuted];
					if (
						length > 0 &&
						data.executionData!.resultData.runData[lastNodeExecuted][length - 1].error !== undefined
					) {
						// Remove results only if it is an error.
						// If we are retrying due to a crash, the information is simply success info from last node
						data.executionData!.resultData.runData[lastNodeExecuted].pop();
						// Stack will determine what to run next
					}
				}

				if (req.body.loadWorkflow) {
					// Loads the currently saved workflow to execute instead of the
					// one saved at the time of the execution.
					const workflowId = fullExecutionData.workflowData.id;
					const workflowData = (await Db.collections.Workflow.findOne(workflowId)) as IWorkflowBase;

					if (workflowData === undefined) {
						throw new Error(
							`The workflow with the ID "${workflowId}" could not be found and so the data not be loaded for the retry.`,
						);
					}

					data.workflowData = workflowData;
					const nodeTypes = NodeTypes();
					const workflowInstance = new Workflow({
						id: workflowData.id as string,
						name: workflowData.name,
						nodes: workflowData.nodes,
						connections: workflowData.connections,
						active: false,
						nodeTypes,
						staticData: undefined,
						settings: workflowData.settings,
					});

					// Replace all of the nodes in the execution stack with the ones of the new workflow
					for (const stack of data.executionData!.executionData!.nodeExecutionStack) {
						// Find the data of the last executed node in the new workflow
						const node = workflowInstance.getNode(stack.node.name);
						if (node === null) {
							LoggerProxy.error('Failed to retry an execution because a node could not be found', {
								userId: req.user.id,
								executionId,
								nodeName: stack.node.name,
							});
							throw new Error(
								`Could not find the node "${stack.node.name}" in workflow. It probably got deleted or renamed. Without it the workflow can sadly not be retried.`,
							);
						}

						// Replace the node data in the stack that it really uses the current data
						stack.node = node;
					}
				}

				const workflowRunner = new WorkflowRunner();
				const retriedExecutionId = await workflowRunner.run(data);

				const executionData = await this.activeExecutionsInstance.getPostExecutePromise(
					retriedExecutionId,
				);

				if (!executionData) {
					throw new Error('The retry did not start for an unknown reason.');
				}

				return !!executionData.finished;
			}),
		);

		// Delete Executions
		// INFORMATION: We use POST instead of DELETE to not run into any issues
		// with the query data getting to long
		this.app.post(
			`/${this.restEndpoint}/executions/delete`,
			ResponseHelper.send(async (req: ExecutionRequest.Delete): Promise<void> => {
				const { deleteBefore, ids, filters: requestFilters } = req.body;

				if (!deleteBefore && !ids) {
					throw new Error('Either "deleteBefore" or "ids" must be present in the request body');
				}

				const sharedWorkflowIds = await getSharedWorkflowIds(req.user);
				const binaryDataManager = BinaryDataManager.getInstance();

				// delete executions by date, if user may access the underyling worfklows

				if (deleteBefore) {
					const filters: IDataObject = {
						startedAt: LessThanOrEqual(deleteBefore),
					};

					if (filters) {
						Object.assign(filters, requestFilters);
					}

					const executions = await Db.collections.Execution.find({
						where: {
							workflowId: In(sharedWorkflowIds),
							...filters,
						},
					});

					if (!executions.length) return;

					const idsToDelete = executions.map(({ id }) => id.toString());

					await Promise.all(
						idsToDelete.map(async (id) => binaryDataManager.deleteBinaryDataByExecutionId(id)),
					);

					await Db.collections.Execution.delete({ id: In(idsToDelete) });

					return;
				}

				// delete executions by IDs, if user may access the underyling worfklows

				if (ids) {
					const executions = await Db.collections.Execution.find({
						where: {
							id: In(ids),
							workflowId: In(sharedWorkflowIds),
						},
					});

					if (!executions.length) {
						LoggerProxy.error('Failed to delete an execution due to insufficient permissions', {
							userId: req.user.id,
							executionIds: ids,
						});
						return;
					}

					const idsToDelete = executions.map(({ id }) => id.toString());

					await Promise.all(
						idsToDelete.map(async (id) => binaryDataManager.deleteBinaryDataByExecutionId(id)),
					);

					await Db.collections.Execution.delete(idsToDelete);
				}
			}),
		);

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

						const findOptions: FindManyOptions<ExecutionEntity> = {
							select: ['id', 'workflowId', 'mode', 'retryOf', 'startedAt'],
							order: { id: 'DESC' },
							where: {
								id: In(currentlyRunningExecutionIds),
							},
						};

						const sharedWorkflowIds = await getSharedWorkflowIds(req.user);

						if (!sharedWorkflowIds.length) return [];

						if (req.query.filter) {
							const { workflowId } = JSON.parse(req.query.filter);
							if (workflowId && sharedWorkflowIds.includes(workflowId)) {
								Object.assign(findOptions.where, { workflowId });
							}
						} else {
							Object.assign(findOptions.where, { workflowId: In(sharedWorkflowIds) });
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

					const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

					const sharedWorkflowIds = await getSharedWorkflowIds(req.user).then((ids) =>
						ids.map((id) => id.toString()),
					);

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
					throw new ResponseHelper.ResponseError('Execution not found', undefined, 404);
				}

				const execution = await Db.collections.Execution.findOne({
					where: {
						id: executionId,
						workflowId: In(sharedWorkflowIds),
					},
				});

				if (!execution) {
					throw new ResponseHelper.ResponseError('Execution not found', undefined, 404);
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

		// Returns binary buffer
		this.app.get(
			`/${this.restEndpoint}/data/:path`,
			ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<string> => {
				// TODO UM: check if this needs permission check for UM
				const dataPath = req.params.path;
				return BinaryDataManager.getInstance()
					.retrieveBinaryDataByIdentifier(dataPath)
					.then((buffer: Buffer) => {
						return buffer.toString('base64');
					});
			}),
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
				// Cut away the "/webhook-test/" to get the registred part of the url
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

						const credentialsOverwrites = CredentialsOverwrites();

						await credentialsOverwrites.init(body);

						this.presetCredentialsLoaded = true;

						ResponseHelper.sendSuccessResponse(res, { success: true }, true, 200);
					} else {
						ResponseHelper.sendErrorResponse(res, new Error('Preset credentials can be set once'));
					}
				},
			);
		}

		if (!config.getEnv('endpoints.disableUi')) {
			// Read the index file and replace the path placeholder
			const editorUiPath = require.resolve('n8n-editor-ui');
			const filePath = pathJoin(pathDirname(editorUiPath), 'dist', 'index.html');
			const n8nPath = config.getEnv('path');

			let readIndexFile = readFileSync(filePath, 'utf8');
			readIndexFile = readIndexFile.replace(/\/%BASE_PATH%\//g, n8nPath);
			readIndexFile = readIndexFile.replace(/\/favicon.ico/g, `${n8nPath}favicon.ico`);

			// Serve the altered index.html file separately
			this.app.get(`/index.html`, async (req: express.Request, res: express.Response) => {
				res.send(readIndexFile);
			});

			// Serve the website
			this.app.use(
				'/',
				express.static(pathJoin(pathDirname(editorUiPath), 'dist'), {
					index: 'index.html',
					setHeaders: (res, path) => {
						if (res.req && res.req.url === '/index.html') {
							// Set last modified date manually to n8n start time so
							// that it hopefully refreshes the page when a new version
							// got used
							res.setHeader('Last-Modified', startTime);
						}
					},
				}),
			);
		}
		const startTime = new Date().toUTCString();
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

		await app.externalHooks.run('n8n.ready', [app]);
		const cpus = os.cpus();
		const binarDataConfig = config.getEnv('binaryDataManager');
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
			binaryDataMode: binarDataConfig.mode,
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

async function getExecutionsCount(
	countFilter: IDataObject,
	user: User,
): Promise<{ count: number; estimated: boolean }> {
	const dbType = (await GenericHelpers.getConfigValue('database.type')) as DatabaseType;
	const filteredFields = Object.keys(countFilter).filter((field) => field !== 'id');

	// For databases other than Postgres, do a regular count
	// when filtering based on `workflowId` or `finished` fields.
	if (dbType !== 'postgresdb' || filteredFields.length > 0 || user.globalRole.name !== 'owner') {
		const sharedWorkflowIds = await getSharedWorkflowIds(user);

		const count = await Db.collections.Execution.count({
			where: {
				workflowId: In(sharedWorkflowIds),
				...countFilter,
			},
		});

		return { count, estimated: false };
	}

	try {
		// Get an estimate of rows count.
		const estimateRowsNumberSql =
			"SELECT n_live_tup FROM pg_stat_all_tables WHERE relname = 'execution_entity';";
		const rows: Array<{ n_live_tup: string }> = await Db.collections.Execution.query(
			estimateRowsNumberSql,
		);

		const estimate = parseInt(rows[0].n_live_tup, 10);
		// If over 100k, return just an estimate.
		if (estimate > 100_000) {
			// if less than 100k, we get the real count as even a full
			// table scan should not take so long.
			return { count: estimate, estimated: true };
		}
	} catch (error) {
		LoggerProxy.warn(`Failed to get executions count from Postgres: ${error}`);
	}

	const sharedWorkflowIds = await getSharedWorkflowIds(user);

	const count = await Db.collections.Execution.count({
		where: {
			workflowId: In(sharedWorkflowIds),
		},
	});

	return { count, estimated: false };
}

const CUSTOM_API_CALL_NAME = 'Custom API Call';
const CUSTOM_API_CALL_KEY = '__CUSTOM_API_CALL__';

/**
 * Inject a `Custom API Call` option into `resource` and `operation`
 * parameters in a node that supports proxy auth.
 */
function injectCustomApiCallOption(description: INodeTypeDescription) {
	if (!supportsProxyAuth(description)) return description;

	description.properties.forEach((p) => {
		if (
			['resource', 'operation'].includes(p.name) &&
			Array.isArray(p.options) &&
			p.options[p.options.length - 1].name !== CUSTOM_API_CALL_NAME
		) {
			p.options.push({
				name: CUSTOM_API_CALL_NAME,
				value: CUSTOM_API_CALL_KEY,
			});
		}

		return p;
	});

	return description;
}

const credentialTypes = CredentialTypes();

/**
 * Whether any of the node's credential types may be used to
 * make a request from a node other than itself.
 */
function supportsProxyAuth(description: INodeTypeDescription) {
	if (!description.credentials) return false;

	return description.credentials.some(({ name }) => {
		const credType = credentialTypes.getByName(name);

		if (credType.authenticate !== undefined) return true;

		return isOAuth(credType);
	});
}

function isOAuth(credType: ICredentialType) {
	return (
		Array.isArray(credType.extends) &&
		credType.extends.some((parentType) =>
			['oAuth2Api', 'googleOAuth2Api', 'oAuth1Api'].includes(parentType),
		)
	);
}

const TRIGGER_NODE_SUFFIXES = ['trigger', 'webhook'];

const isTrigger = (str: string) =>
	TRIGGER_NODE_SUFFIXES.some((suffix) => str.toLowerCase().includes(suffix));

function findFirstPinnedTrigger(workflow: IWorkflowDb, pinData?: IPinData) {
	if (!pinData) return;

	const firstPinnedTriggerName = Object.keys(pinData).find(isTrigger);

	if (!firstPinnedTriggerName) return;

	return workflow.nodes.find(
		({ type, name }) => isTrigger(type) && name === firstPinnedTriggerName,
	);
}
