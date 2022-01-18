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

import * as express from 'express';
import { readFileSync, existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { dirname as pathDirname, join as pathJoin, resolve as pathResolve } from 'path';
import { FindManyOptions, getConnectionManager, In, IsNull, LessThanOrEqual, Not } from 'typeorm';
import * as bodyParser from 'body-parser';
import * as history from 'connect-history-api-fallback';
import * as os from 'os';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as _ from 'lodash';
import * as clientOAuth2 from 'client-oauth2';
import * as clientOAuth1 from 'oauth-1.0a';
import { RequestOptions } from 'oauth-1.0a';
import * as csrf from 'csrf';
import * as requestPromise from 'request-promise-native';
import { createHmac } from 'crypto';
// IMPORTANT! Do not switch to anther bcrypt library unless really necessary and
// tested with all possible systems like Windows, Alpine on ARM, FreeBSD, ...
import { compare } from 'bcryptjs';
import * as promClient from 'prom-client';

import {
	BinaryDataManager,
	Credentials,
	IBinaryDataConfig,
	ICredentialTestFunctions,
	LoadNodeParameterOptions,
	NodeExecuteFunctions,
	UserSettings,
} from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialType,
	IDataObject,
	INodeCredentials,
	INodeCredentialsDetails,
	INodeParameters,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	INodeTypeNameVersion,
	INodeVersionedType,
	ITelemetrySettings,
	IWorkflowBase,
	LoggerProxy,
	NodeCredentialTestRequest,
	NodeCredentialTestResult,
	NodeHelpers,
	Workflow,
	ICredentialsEncrypted,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { NodeVersionedType } from 'n8n-nodes-base';

import * as basicAuth from 'basic-auth';
import * as compression from 'compression';
import * as jwt from 'jsonwebtoken';
import * as jwks from 'jwks-rsa';
// @ts-ignore
import * as timezones from 'google-timezones-json';
import * as parseUrl from 'parseurl';
import * as querystring from 'querystring';
import { OptionsWithUrl } from 'request-promise-native';
import { Registry } from 'prom-client';
import * as Queue from './Queue';
import {
	ActiveExecutions,
	ActiveWorkflowRunner,
	CredentialsHelper,
	CredentialsOverwrites,
	CredentialTypes,
	DatabaseType,
	Db,
	ExternalHooks,
	GenericHelpers,
	IActivationError,
	ICredentialsDb,
	ICredentialsDecryptedDb,
	ICredentialsDecryptedResponse,
	ICredentialsOverwrite,
	ICredentialsResponse,
	ICustomRequest,
	IExecutionDeleteFilter,
	IExecutionFlatted,
	IExecutionFlattedDb,
	IExecutionFlattedResponse,
	IExecutionPushResponse,
	IExecutionResponse,
	IExecutionsListResponse,
	IExecutionsStopData,
	IExecutionsSummary,
	IExternalHooksClass,
	IDiagnosticInfo,
	IN8nUISettings,
	IPackageVersions,
	ITagWithCountDb,
	IWorkflowExecutionDataProcess,
	IWorkflowResponse,
	IPersonalizationSurveyAnswers,
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
} from '.';

import * as config from '../config';

import * as TagHelpers from './TagHelpers';
import * as PersonalizationSurvey from './PersonalizationSurvey';

import { InternalHooksManager } from './InternalHooksManager';
import { TagEntity } from './databases/entities/TagEntity';
import { WorkflowEntity } from './databases/entities/WorkflowEntity';
import { NameRequest } from './WorkflowHelpers';
import { getCredentialTranslationPath, getNodeTranslationPath } from './TranslationHelpers';

require('body-parser-xml')(bodyParser);

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

	saveDataErrorExecution: string;

	saveDataSuccessExecution: string;

	saveManualExecutions: boolean;

	executionTimeout: number;

	maxExecutionTimeout: number;

	timezone: string;

	activeExecutionsInstance: ActiveExecutions.ActiveExecutions;

	push: Push.Push;

	versions: IPackageVersions | undefined;

	restEndpoint: string;

	frontendSettings: IN8nUISettings;

	protocol: string;

	sslKey: string;

	sslCert: string;

	payloadSizeMax: number;

	presetCredentialsLoaded: boolean;

	constructor() {
		this.app = express();

		this.endpointWebhook = config.get('endpoints.webhook') as string;
		this.endpointWebhookWaiting = config.get('endpoints.webhookWaiting') as string;
		this.endpointWebhookTest = config.get('endpoints.webhookTest') as string;

		this.defaultWorkflowName = config.get('workflows.defaultName') as string;
		this.defaultCredentialsName = config.get('credentials.defaultName') as string;

		this.saveDataErrorExecution = config.get('executions.saveDataOnError') as string;
		this.saveDataSuccessExecution = config.get('executions.saveDataOnSuccess') as string;
		this.saveManualExecutions = config.get('executions.saveDataManualExecutions') as boolean;
		this.executionTimeout = config.get('executions.timeout') as number;
		this.maxExecutionTimeout = config.get('executions.maxTimeout') as number;
		this.payloadSizeMax = config.get('endpoints.payloadSizeMax') as number;
		this.timezone = config.get('generic.timezone') as string;
		this.restEndpoint = config.get('endpoints.rest') as string;

		this.activeWorkflowRunner = ActiveWorkflowRunner.getInstance();
		this.testWebhooks = TestWebhooks.getInstance();
		this.push = Push.getInstance();

		this.activeExecutionsInstance = ActiveExecutions.getInstance();
		this.waitTracker = WaitTracker();

		this.protocol = config.get('protocol');
		this.sslKey = config.get('ssl_key');
		this.sslCert = config.get('ssl_cert');

		this.externalHooks = ExternalHooks();

		this.presetCredentialsLoaded = false;
		this.endpointPresetCredentials = config.get('credentials.overwrite.endpoint') as string;

		const urlBaseWebhook = WebhookHelpers.getWebhookBaseUrl();

		const telemetrySettings: ITelemetrySettings = {
			enabled: config.get('diagnostics.enabled') as boolean,
		};

		if (telemetrySettings.enabled) {
			const conf = config.get('diagnostics.config.frontend') as string;
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
			versionCli: '',
			oauthCallbackUrls: {
				oauth1: `${urlBaseWebhook}${this.restEndpoint}/oauth1-credential/callback`,
				oauth2: `${urlBaseWebhook}${this.restEndpoint}/oauth2-credential/callback`,
			},
			versionNotifications: {
				enabled: config.get('versionNotifications.enabled'),
				endpoint: config.get('versionNotifications.endpoint'),
				infoUrl: config.get('versionNotifications.infoUrl'),
			},
			instanceId: '',
			telemetry: telemetrySettings,
			personalizationSurvey: {
				shouldShow: false,
			},
			defaultLocale: config.get('defaultLocale'),
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

	async config(): Promise<void> {
		const enableMetrics = config.get('endpoints.metrics.enable') as boolean;
		let register: Registry;

		if (enableMetrics) {
			const prefix = config.get('endpoints.metrics.prefix') as string;
			register = new promClient.Registry();
			register.setDefaultLabels({ prefix });
			promClient.collectDefaultMetrics({ register });
		}

		this.versions = await GenericHelpers.getVersions();
		this.frontendSettings.versionCli = this.versions.cli;

		this.frontendSettings.instanceId = await UserSettings.getInstanceId();

		this.frontendSettings.personalizationSurvey =
			await PersonalizationSurvey.preparePersonalizationSurvey();

		await this.externalHooks.run('frontend.settings', [this.frontendSettings]);

		const excludeEndpoints = config.get('security.excludeEndpoints') as string;

		const ignoredEndpoints = [
			'healthz',
			'metrics',
			this.endpointWebhook,
			this.endpointWebhookTest,
			this.endpointPresetCredentials,
		];
		// eslint-disable-next-line prefer-spread
		ignoredEndpoints.push.apply(ignoredEndpoints, excludeEndpoints.split(':'));

		// eslint-disable-next-line no-useless-escape
		const authIgnoreRegex = new RegExp(`^\/(${_(ignoredEndpoints).compact().join('|')})\/?.*$`);

		// Check for basic auth credentials if activated
		const basicAuthActive = config.get('security.basicAuth.active') as boolean;
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
					if (authIgnoreRegex.exec(req.url)) {
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
		const jwtAuthActive = config.get('security.jwtAuth.active') as boolean;
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
				if (jwtNamespace === '' || jwtAllowedTenantKey === '' || jwtAllowedTenant === '')
					return true;

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

		// Get push connections
		this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
			if (req.url.indexOf(`/${this.restEndpoint}/push`) === 0) {
				// TODO: Later also has to add some kind of authentication token
				if (req.query.sessionId === undefined) {
					next(new Error('The query parameter "sessionId" is missing!'));
					return;
				}

				this.push.add(req.query.sessionId as string, req, res);
				return;
			}
			next();
		});

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
			if (Db.collections.Workflow === null) {
				const error = new ResponseHelper.ResponseError('Database is not ready!', undefined, 503);
				return ResponseHelper.sendErrorResponse(res, error);
			}

			next();
		});

		// ----------------------------------------
		// Healthcheck
		// ----------------------------------------

		// Does very basic health check
		this.app.get('/healthz', async (req: express.Request, res: express.Response) => {
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

		// Creates a new workflow
		this.app.post(
			`/${this.restEndpoint}/workflows`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<WorkflowEntity> => {
					delete req.body.id; // ignore if sent by mistake
					const incomingData = req.body;

					const newWorkflow = new WorkflowEntity();

					Object.assign(newWorkflow, incomingData);
					newWorkflow.name = incomingData.name.trim();

					const incomingTagOrder = incomingData.tags.slice();

					if (incomingData.tags.length) {
						newWorkflow.tags = await Db.collections.Tag!.findByIds(incomingData.tags, {
							select: ['id', 'name'],
						});
					}

					// check credentials for old format
					await WorkflowHelpers.replaceInvalidCredentials(newWorkflow);

					await this.externalHooks.run('workflow.create', [newWorkflow]);

					await WorkflowHelpers.validateWorkflow(newWorkflow);
					const savedWorkflow = (await Db.collections
						.Workflow!.save(newWorkflow)
						.catch(WorkflowHelpers.throwDuplicateEntryError)) as WorkflowEntity;
					savedWorkflow.tags = TagHelpers.sortByRequestOrder(savedWorkflow.tags, incomingTagOrder);

					// @ts-ignore
					savedWorkflow.id = savedWorkflow.id.toString();
					await this.externalHooks.run('workflow.afterCreate', [savedWorkflow]);
					void InternalHooksManager.getInstance().onWorkflowCreated(newWorkflow as IWorkflowBase);
					return savedWorkflow;
				},
			),
		);

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
			ResponseHelper.send(async (req: express.Request, res: express.Response) => {
				const findQuery: FindManyOptions<WorkflowEntity> = {
					select: ['id', 'name', 'active', 'createdAt', 'updatedAt'],
					relations: ['tags'],
				};

				if (req.query.filter) {
					findQuery.where = JSON.parse(req.query.filter as string);
				}

				const workflows = await Db.collections.Workflow!.find(findQuery);

				workflows.forEach((workflow) => {
					// @ts-ignore
					workflow.id = workflow.id.toString();
					// @ts-ignore
					workflow.tags = workflow.tags.map(({ id, name }) => ({ id: id.toString(), name }));
				});
				return workflows;
			}),
		);

		this.app.get(
			`/${this.restEndpoint}/workflows/new`,
			ResponseHelper.send(
				async (req: NameRequest, res: express.Response): Promise<{ name: string }> => {
					const requestedName =
						req.query.name && req.query.name !== '' ? req.query.name : this.defaultWorkflowName;

					return await GenericHelpers.generateUniqueName(requestedName, 'workflow');
				},
			),
		);

		// Returns a specific workflow
		this.app.get(
			`/${this.restEndpoint}/workflows/:id`,
			ResponseHelper.send(
				async (
					req: express.Request,
					res: express.Response,
				): Promise<WorkflowEntity | undefined> => {
					const workflow = await Db.collections.Workflow!.findOne(req.params.id, {
						relations: ['tags'],
					});

					if (workflow === undefined) {
						return undefined;
					}

					// @ts-ignore
					workflow.id = workflow.id.toString();
					// @ts-ignore
					workflow.tags.forEach((tag) => (tag.id = tag.id.toString()));
					return workflow;
				},
			),
		);

		// Updates an existing workflow
		this.app.patch(
			`/${this.restEndpoint}/workflows/:id`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<WorkflowEntity> => {
					const { tags, ...updateData } = req.body;

					const { id } = req.params;
					updateData.id = id;

					// check credentials for old format
					await WorkflowHelpers.replaceInvalidCredentials(updateData as WorkflowEntity);

					await this.externalHooks.run('workflow.update', [updateData]);

					const isActive = await this.activeWorkflowRunner.isActive(id);

					if (isActive) {
						// When workflow gets saved always remove it as the triggers could have been
						// changed and so the changes would not take effect
						await this.activeWorkflowRunner.remove(id);
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

					// required due to atomic update
					updateData.updatedAt = this.getCurrentDate();

					await WorkflowHelpers.validateWorkflow(updateData);
					await Db.collections
						.Workflow!.update(id, updateData)
						.catch(WorkflowHelpers.throwDuplicateEntryError);

					if (tags) {
						const tablePrefix = config.get('database.tablePrefix');
						await TagHelpers.removeRelations(req.params.id, tablePrefix);

						if (tags.length) {
							await TagHelpers.createRelations(req.params.id, tags, tablePrefix);
						}
					}

					// We sadly get nothing back from "update". Neither if it updated a record
					// nor the new value. So query now the hopefully updated entry.
					const workflow = await Db.collections.Workflow!.findOne(id, { relations: ['tags'] });

					if (workflow === undefined) {
						throw new ResponseHelper.ResponseError(
							`Workflow with id "${id}" could not be found to be updated.`,
							undefined,
							400,
						);
					}

					if (tags?.length) {
						workflow.tags = TagHelpers.sortByRequestOrder(workflow.tags, tags);
					}

					await this.externalHooks.run('workflow.afterUpdate', [workflow]);
					void InternalHooksManager.getInstance().onWorkflowSaved(workflow);

					if (workflow.active) {
						// When the workflow is supposed to be active add it again
						try {
							await this.externalHooks.run('workflow.activate', [workflow]);
							await this.activeWorkflowRunner.add(id, isActive ? 'update' : 'activate');
						} catch (error) {
							// If workflow could not be activated set it again to inactive
							updateData.active = false;
							// @ts-ignore
							await Db.collections.Workflow!.update(id, updateData);

							// Also set it in the returned data
							workflow.active = false;

							// Now return the original error for UI to display
							throw error;
						}
					}

					// @ts-ignore
					workflow.id = workflow.id.toString();
					return workflow;
				},
			),
		);

		// Deletes a specific workflow
		this.app.delete(
			`/${this.restEndpoint}/workflows/:id`,
			ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<boolean> => {
				const { id } = req.params;

				await this.externalHooks.run('workflow.delete', [id]);

				const isActive = await this.activeWorkflowRunner.isActive(id);
				if (isActive) {
					// Before deleting a workflow deactivate it
					await this.activeWorkflowRunner.remove(id);
				}

				await Db.collections.Workflow!.delete(id);
				void InternalHooksManager.getInstance().onWorkflowDeleted(id);
				await this.externalHooks.run('workflow.afterDelete', [id]);

				return true;
			}),
		);

		this.app.post(
			`/${this.restEndpoint}/workflows/run`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<IExecutionPushResponse> => {
					const { workflowData } = req.body;
					const { runData } = req.body;
					const { startNodes } = req.body;
					const { destinationNode } = req.body;
					const executionMode = 'manual';
					const activationMode = 'manual';

					const sessionId = GenericHelpers.getSessionId(req);

					// If webhooks nodes exist and are active we have to wait for till we receive a call
					if (
						runData === undefined ||
						startNodes === undefined ||
						startNodes.length === 0 ||
						destinationNode === undefined
					) {
						const additionalData = await WorkflowExecuteAdditionalData.getBase();
						const nodeTypes = NodeTypes();
						const workflowInstance = new Workflow({
							id: workflowData.id,
							name: workflowData.name,
							nodes: workflowData.nodes,
							connections: workflowData.connections,
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
						sessionId,
						startNodes,
						workflowData,
					};
					const workflowRunner = new WorkflowRunner();
					const executionId = await workflowRunner.run(data);

					return {
						executionId,
					};
				},
			),
		);

		// Retrieves all tags, with or without usage count
		this.app.get(
			`/${this.restEndpoint}/tags`,
			ResponseHelper.send(
				async (
					req: express.Request,
					res: express.Response,
				): Promise<TagEntity[] | ITagWithCountDb[]> => {
					if (req.query.withUsageCount === 'true') {
						const tablePrefix = config.get('database.tablePrefix');
						return TagHelpers.getTagsWithCountDb(tablePrefix);
					}

					const tags = await Db.collections.Tag!.find({ select: ['id', 'name'] });
					// @ts-ignore
					tags.forEach((tag) => (tag.id = tag.id.toString()));
					return tags;
				},
			),
		);

		// Creates a tag
		this.app.post(
			`/${this.restEndpoint}/tags`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<TagEntity | void> => {
					const newTag = new TagEntity();
					newTag.name = req.body.name.trim();

					await this.externalHooks.run('tag.beforeCreate', [newTag]);

					await TagHelpers.validateTag(newTag);
					const tag = await Db.collections
						.Tag!.save(newTag)
						.catch(TagHelpers.throwDuplicateEntryError);

					await this.externalHooks.run('tag.afterCreate', [tag]);

					// @ts-ignore
					tag.id = tag.id.toString();
					return tag;
				},
			),
		);

		// Updates a tag
		this.app.patch(
			`/${this.restEndpoint}/tags/:id`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<TagEntity | void> => {
					const { name } = req.body;
					const { id } = req.params;

					const newTag = new TagEntity();
					newTag.id = Number(id);
					newTag.name = name.trim();

					await this.externalHooks.run('tag.beforeUpdate', [newTag]);

					await TagHelpers.validateTag(newTag);
					const tag = await Db.collections
						.Tag!.save(newTag)
						.catch(TagHelpers.throwDuplicateEntryError);

					await this.externalHooks.run('tag.afterUpdate', [tag]);

					// @ts-ignore
					tag.id = tag.id.toString();
					return tag;
				},
			),
		);

		// Deletes a tag
		this.app.delete(
			`/${this.restEndpoint}/tags/:id`,
			ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<boolean> => {
				const id = Number(req.params.id);

				await this.externalHooks.run('tag.beforeDelete', [id]);

				await Db.collections.Tag!.delete({ id });

				await this.externalHooks.run('tag.afterDelete', [id]);

				return true;
			}),
		);

		// Returns parameter values which normally get loaded from an external API or
		// get generated dynamically
		this.app.get(
			`/${this.restEndpoint}/node-parameter-options`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<INodePropertyOptions[]> => {
					const nodeTypeAndVersion = JSON.parse(
						`${req.query.nodeTypeAndVersion}`,
					) as INodeTypeNameVersion;
					const path = req.query.path as string;
					let credentials: INodeCredentials | undefined;
					const currentNodeParameters = JSON.parse(
						`${req.query.currentNodeParameters}`,
					) as INodeParameters;
					if (req.query.credentials !== undefined) {
						credentials = JSON.parse(req.query.credentials as string);
					}
					const methodName = req.query.methodName as string;

					const nodeTypes = NodeTypes();

					// @ts-ignore
					const loadDataInstance = new LoadNodeParameterOptions(
						nodeTypeAndVersion,
						nodeTypes,
						path,
						currentNodeParameters,
						credentials,
					);

					const additionalData = await WorkflowExecuteAdditionalData.getBase(currentNodeParameters);

					return loadDataInstance.getOptions(methodName, additionalData);
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
							acc.push(description);
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

						nodeTypes.push(description);
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
						return require(headersPath);
					} catch (error) {
						res.status(500).send('Failed to find headers file');
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
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<string[]> => {
					const activeWorkflows = await this.activeWorkflowRunner.getActiveWorkflows();
					return activeWorkflows.map((workflow) => workflow.id.toString());
				},
			),
		);

		// Returns if the workflow with the given id had any activation errors
		this.app.get(
			`/${this.restEndpoint}/active/error/:id`,
			ResponseHelper.send(
				async (
					req: express.Request,
					res: express.Response,
				): Promise<IActivationError | undefined> => {
					const { id } = req.params;
					return this.activeWorkflowRunner.getActivationError(id);
				},
			),
		);

		// ----------------------------------------
		// Credentials
		// ----------------------------------------

		this.app.get(
			`/${this.restEndpoint}/credentials/new`,
			ResponseHelper.send(
				async (req: NameRequest, res: express.Response): Promise<{ name: string }> => {
					const requestedName =
						req.query.name && req.query.name !== '' ? req.query.name : this.defaultCredentialsName;

					return await GenericHelpers.generateUniqueName(requestedName, 'credentials');
				},
			),
		);

		// Deletes a specific credential
		this.app.delete(
			`/${this.restEndpoint}/credentials/:id`,
			ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<boolean> => {
				const { id } = req.params;

				await this.externalHooks.run('credentials.delete', [id]);

				await Db.collections.Credentials!.delete({ id });

				return true;
			}),
		);

		// Creates new credentials
		this.app.post(
			`/${this.restEndpoint}/credentials`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<ICredentialsResponse> => {
					const incomingData = req.body;

					if (!incomingData.name || incomingData.name.length < 3) {
						throw new ResponseHelper.ResponseError(
							`Credentials name must be at least 3 characters long.`,
							undefined,
							400,
						);
					}

					// Add the added date for node access permissions
					for (const nodeAccess of incomingData.nodesAccess) {
						nodeAccess.date = this.getCurrentDate();
					}

					const encryptionKey = await UserSettings.getEncryptionKey();
					if (encryptionKey === undefined) {
						throw new Error('No encryption key got found to encrypt the credentials!');
					}

					if (incomingData.name === '') {
						throw new Error('Credentials have to have a name set!');
					}

					// Encrypt the data
					const credentials = new Credentials(
						{ id: null, name: incomingData.name },
						incomingData.type,
						incomingData.nodesAccess,
					);
					credentials.setData(incomingData.data, encryptionKey);
					const newCredentialsData = credentials.getDataToSave() as ICredentialsDb;

					await this.externalHooks.run('credentials.create', [newCredentialsData]);

					// Save the credentials in DB
					const result = await Db.collections.Credentials!.save(newCredentialsData);
					result.data = incomingData.data;

					// Convert to response format in which the id is a string
					(result as unknown as ICredentialsResponse).id = result.id.toString();
					return result as unknown as ICredentialsResponse;
				},
			),
		);

		// Test credentials
		this.app.post(
			`/${this.restEndpoint}/credentials-test`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<NodeCredentialTestResult> => {
					const incomingData = req.body as NodeCredentialTestRequest;
					const credentialType = incomingData.credentials.type;

					// Find nodes that can test this credential.
					const nodeTypes = NodeTypes();
					const allNodes = nodeTypes.getAll();

					let foundTestFunction:
						| ((
								this: ICredentialTestFunctions,
								credential: ICredentialsDecrypted,
						  ) => Promise<NodeCredentialTestResult>)
						| undefined;
					const nodeThatCanTestThisCredential = allNodes.find((node) => {
						if (
							incomingData.nodeToTestWith &&
							node.description.name !== incomingData.nodeToTestWith
						) {
							return false;
						}

						if (node instanceof NodeVersionedType) {
							const versionNames = Object.keys((node as INodeVersionedType).nodeVersions);
							for (const versionName of versionNames) {
								const nodeType = (node as INodeVersionedType).nodeVersions[
									versionName as unknown as number
								];
								// eslint-disable-next-line @typescript-eslint/no-loop-func
								const credentialTestable = nodeType.description.credentials?.find((credential) => {
									const testFunctionSearch =
										credential.name === credentialType && !!credential.testedBy;
									if (testFunctionSearch) {
										foundTestFunction = (nodeType as unknown as INodeType).methods!.credentialTest![
											credential.testedBy!
										];
									}
									return testFunctionSearch;
								});
								if (credentialTestable) {
									return true;
								}
							}
							return false;
						}
						const credentialTestable = (node as INodeType).description.credentials?.find(
							(credential) => {
								const testFunctionSearch =
									credential.name === credentialType && !!credential.testedBy;
								if (testFunctionSearch) {
									foundTestFunction = (node as INodeType).methods!.credentialTest![
										credential.testedBy!
									];
								}
								return testFunctionSearch;
							},
						);
						return !!credentialTestable;
					});

					if (!nodeThatCanTestThisCredential) {
						return Promise.resolve({
							status: 'Error',
							message: 'There are no nodes that can test this credential.',
						});
					}

					if (foundTestFunction === undefined) {
						return Promise.resolve({
							status: 'Error',
							message: 'No testing function found for this credential.',
						});
					}

					const credentialTestFunctions = NodeExecuteFunctions.getCredentialTestFunctions();

					const output = await foundTestFunction.call(
						credentialTestFunctions,
						incomingData.credentials,
					);
					return Promise.resolve(output);
				},
			),
		);

		// Updates existing credentials
		this.app.patch(
			`/${this.restEndpoint}/credentials/:id`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<ICredentialsResponse> => {
					const incomingData = req.body;

					const { id } = req.params;

					if (incomingData.name === '') {
						throw new Error('Credentials have to have a name set!');
					}

					// Add the date for newly added node access permissions
					for (const nodeAccess of incomingData.nodesAccess) {
						if (!nodeAccess.date) {
							nodeAccess.date = this.getCurrentDate();
						}
					}

					const encryptionKey = await UserSettings.getEncryptionKey();
					if (encryptionKey === undefined) {
						throw new Error('No encryption key got found to encrypt the credentials!');
					}

					// Load the currently saved credentials to be able to persist some of the data if
					const result = await Db.collections.Credentials!.findOne(id);
					if (result === undefined) {
						throw new ResponseHelper.ResponseError(
							`Credentials with the id "${id}" do not exist.`,
							undefined,
							400,
						);
					}

					const currentlySavedCredentials = new Credentials(
						result as INodeCredentialsDetails,
						result.type,
						result.nodesAccess,
						result.data,
					);
					const decryptedData = currentlySavedCredentials.getData(encryptionKey);

					// Do not overwrite the oauth data else data like the access or refresh token would get lost
					// everytime anybody changes anything on the credentials even if it is just the name.
					if (decryptedData.oauthTokenData) {
						incomingData.data.oauthTokenData = decryptedData.oauthTokenData;
					}

					// Encrypt the data
					const credentials = new Credentials(
						{ id, name: incomingData.name },
						incomingData.type,
						incomingData.nodesAccess,
					);
					credentials.setData(incomingData.data, encryptionKey);
					const newCredentialsData = credentials.getDataToSave() as unknown as ICredentialsDb;

					// Add special database related data
					newCredentialsData.updatedAt = this.getCurrentDate();

					await this.externalHooks.run('credentials.update', [newCredentialsData]);

					// Update the credentials in DB
					await Db.collections.Credentials!.update(id, newCredentialsData);

					// We sadly get nothing back from "update". Neither if it updated a record
					// nor the new value. So query now the hopefully updated entry.
					const responseData = await Db.collections.Credentials!.findOne(id);

					if (responseData === undefined) {
						throw new ResponseHelper.ResponseError(
							`Credentials with id "${id}" could not be found to be updated.`,
							undefined,
							400,
						);
					}

					// Remove the encrypted data as it is not needed in the frontend
					responseData.data = '';

					// Convert to response format in which the id is a string
					(responseData as unknown as ICredentialsResponse).id = responseData.id.toString();
					return responseData as unknown as ICredentialsResponse;
				},
			),
		);

		// Returns specific credentials
		this.app.get(
			`/${this.restEndpoint}/credentials/:id`,
			ResponseHelper.send(
				async (
					req: express.Request,
					res: express.Response,
				): Promise<ICredentialsDecryptedResponse | ICredentialsResponse | undefined> => {
					const findQuery = {} as FindManyOptions;

					// Make sure the variable has an expected value
					const includeData = ['true', true].includes(req.query.includeData as string);

					if (!includeData) {
						// Return only the fields we need
						findQuery.select = ['id', 'name', 'type', 'nodesAccess', 'createdAt', 'updatedAt'];
					}

					const result = await Db.collections.Credentials!.findOne(req.params.id);

					if (result === undefined) {
						return result;
					}

					let encryptionKey;
					if (includeData) {
						encryptionKey = await UserSettings.getEncryptionKey();
						if (encryptionKey === undefined) {
							throw new Error('No encryption key got found to decrypt the credentials!');
						}

						const credentials = new Credentials(
							result as INodeCredentialsDetails,
							result.type,
							result.nodesAccess,
							result.data,
						);
						(result as ICredentialsDecryptedDb).data = credentials.getData(encryptionKey);
					}

					(result as ICredentialsDecryptedResponse).id = result.id.toString();

					return result as ICredentialsDecryptedResponse;
				},
			),
		);

		// Returns all the saved credentials
		this.app.get(
			`/${this.restEndpoint}/credentials`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<ICredentialsResponse[]> => {
					const findQuery = {} as FindManyOptions;
					if (req.query.filter) {
						findQuery.where = JSON.parse(req.query.filter as string) as IDataObject;
						if (findQuery.where.id !== undefined) {
							// No idea if multiple where parameters make db search
							// slower but to be sure that that is not the case we
							// remove all unnecessary fields in case the id is defined.
							// @ts-ignore
							findQuery.where = { id: findQuery.where.id };
						}
					}

					findQuery.select = ['id', 'name', 'type', 'nodesAccess', 'createdAt', 'updatedAt'];

					const results = (await Db.collections.Credentials!.find(
						findQuery,
					)) as unknown as ICredentialsResponse[];

					let encryptionKey;

					const includeData = ['true', true].includes(req.query.includeData as string);
					if (includeData) {
						encryptionKey = await UserSettings.getEncryptionKey();
						if (encryptionKey === undefined) {
							throw new Error('No encryption key got found to decrypt the credentials!');
						}
					}

					let result;
					for (result of results) {
						(result as ICredentialsDecryptedResponse).id = result.id.toString();
					}

					return results;
				},
			),
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
			ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<string> => {
				if (req.query.id === undefined) {
					res.status(500).send('Required credential id is missing!');
					return '';
				}

				const result = await Db.collections.Credentials!.findOne(req.query.id as string);
				if (result === undefined) {
					res.status(404).send('The credential is not known.');
					return '';
				}

				let encryptionKey;
				encryptionKey = await UserSettings.getEncryptionKey();
				if (encryptionKey === undefined) {
					res.status(500).send('No encryption key got found to decrypt the credentials!');
					return '';
				}

				const mode: WorkflowExecuteMode = 'internal';
				const credentialsHelper = new CredentialsHelper(encryptionKey);
				const decryptedDataOriginal = await credentialsHelper.getDecrypted(
					result as INodeCredentialsDetails,
					result.type,
					mode,
					true,
				);
				const oauthCredentials = credentialsHelper.applyDefaultsAndOverwrites(
					decryptedDataOriginal,
					result.type,
					mode,
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
					}/oauth1-credential/callback?cid=${req.query.id}`,
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
					result as INodeCredentialsDetails,
					result.type,
					result.nodesAccess,
				);

				credentials.setData(decryptedDataOriginal, encryptionKey);
				const newCredentialsData = credentials.getDataToSave() as unknown as ICredentialsDb;

				// Add special database related data
				newCredentialsData.updatedAt = this.getCurrentDate();

				// Update the credentials in DB
				await Db.collections.Credentials!.update(req.query.id as string, newCredentialsData);

				return returnUri;
			}),
		);

		// Verify and store app code. Generate access tokens and store for respective credential.
		this.app.get(
			`/${this.restEndpoint}/oauth1-credential/callback`,
			async (req: express.Request, res: express.Response) => {
				try {
					const { oauth_verifier, oauth_token, cid } = req.query;

					if (oauth_verifier === undefined || oauth_token === undefined) {
						const errorResponse = new ResponseHelper.ResponseError(
							`Insufficient parameters for OAuth1 callback. Received following query parameters: ${JSON.stringify(
								req.query,
							)}`,
							undefined,
							503,
						);
						return ResponseHelper.sendErrorResponse(res, errorResponse);
					}

					const result = await Db.collections.Credentials!.findOne(cid as any);
					if (result === undefined) {
						const errorResponse = new ResponseHelper.ResponseError(
							'The credential is not known.',
							undefined,
							404,
						);
						return ResponseHelper.sendErrorResponse(res, errorResponse);
					}

					let encryptionKey;
					encryptionKey = await UserSettings.getEncryptionKey();
					if (encryptionKey === undefined) {
						const errorResponse = new ResponseHelper.ResponseError(
							'No encryption key got found to decrypt the credentials!',
							undefined,
							503,
						);
						return ResponseHelper.sendErrorResponse(res, errorResponse);
					}

					const mode: WorkflowExecuteMode = 'internal';
					const credentialsHelper = new CredentialsHelper(encryptionKey);
					const decryptedDataOriginal = await credentialsHelper.getDecrypted(
						result as INodeCredentialsDetails,
						result.type,
						mode,
						true,
					);
					const oauthCredentials = credentialsHelper.applyDefaultsAndOverwrites(
						decryptedDataOriginal,
						result.type,
						mode,
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
						result as INodeCredentialsDetails,
						result.type,
						result.nodesAccess,
					);
					credentials.setData(decryptedDataOriginal, encryptionKey);
					const newCredentialsData = credentials.getDataToSave() as unknown as ICredentialsDb;
					// Add special database related data
					newCredentialsData.updatedAt = this.getCurrentDate();
					// Save the credentials in DB
					await Db.collections.Credentials!.update(cid as any, newCredentialsData);

					res.sendFile(pathResolve(__dirname, '../../templates/oauth-callback.html'));
				} catch (error) {
					// Error response
					return ResponseHelper.sendErrorResponse(res, error);
				}
			},
		);

		// ----------------------------------------
		// OAuth2-Credential/Auth
		// ----------------------------------------

		// Authorize OAuth Data
		this.app.get(
			`/${this.restEndpoint}/oauth2-credential/auth`,
			ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<string> => {
				if (req.query.id === undefined) {
					res.status(500).send('Required credential id is missing.');
					return '';
				}

				const result = await Db.collections.Credentials!.findOne(req.query.id as string);
				if (result === undefined) {
					res.status(404).send('The credential is not known.');
					return '';
				}

				let encryptionKey;
				encryptionKey = await UserSettings.getEncryptionKey();
				if (encryptionKey === undefined) {
					res.status(500).send('No encryption key got found to decrypt the credentials!');
					return '';
				}

				const mode: WorkflowExecuteMode = 'internal';
				const credentialsHelper = new CredentialsHelper(encryptionKey);
				const decryptedDataOriginal = await credentialsHelper.getDecrypted(
					result as INodeCredentialsDetails,
					result.type,
					mode,
					true,
				);
				const oauthCredentials = credentialsHelper.applyDefaultsAndOverwrites(
					decryptedDataOriginal,
					result.type,
					mode,
				);

				const token = new csrf();
				// Generate a CSRF prevention token and send it as a OAuth2 state stringma/ERR
				const csrfSecret = token.secretSync();
				const state = {
					token: token.create(csrfSecret),
					cid: req.query.id,
				};
				const stateEncodedStr = Buffer.from(JSON.stringify(state)).toString('base64');

				const oAuthOptions: clientOAuth2.Options = {
					clientId: _.get(oauthCredentials, 'clientId') as string,
					clientSecret: _.get(oauthCredentials, 'clientSecret', '') as string,
					accessTokenUri: _.get(oauthCredentials, 'accessTokenUrl', '') as string,
					authorizationUri: _.get(oauthCredentials, 'authUrl', '') as string,
					redirectUri: `${WebhookHelpers.getWebhookBaseUrl()}${
						this.restEndpoint
					}/oauth2-credential/callback`,
					scopes: _.split(_.get(oauthCredentials, 'scope', 'openid,') as string, ','),
					state: stateEncodedStr,
				};

				await this.externalHooks.run('oauth2.authenticate', [oAuthOptions]);

				const oAuthObj = new clientOAuth2(oAuthOptions);

				// Encrypt the data
				const credentials = new Credentials(
					result as INodeCredentialsDetails,
					result.type,
					result.nodesAccess,
				);
				decryptedDataOriginal.csrfSecret = csrfSecret;

				credentials.setData(decryptedDataOriginal, encryptionKey);
				const newCredentialsData = credentials.getDataToSave() as unknown as ICredentialsDb;

				// Add special database related data
				newCredentialsData.updatedAt = this.getCurrentDate();

				// Update the credentials in DB
				await Db.collections.Credentials!.update(req.query.id as string, newCredentialsData);

				const authQueryParameters = _.get(oauthCredentials, 'authQueryParameters', '') as string;
				let returnUri = oAuthObj.code.getUri();

				// if scope uses comma, change it as the library always return then with spaces
				if ((_.get(oauthCredentials, 'scope') as string).includes(',')) {
					const data = querystring.parse(returnUri.split('?')[1]);
					data.scope = _.get(oauthCredentials, 'scope') as string;
					returnUri = `${_.get(oauthCredentials, 'authUrl', '')}?${querystring.stringify(data)}`;
				}

				if (authQueryParameters) {
					returnUri += `&${authQueryParameters}`;
				}

				return returnUri;
			}),
		);

		// ----------------------------------------
		// OAuth2-Credential/Callback
		// ----------------------------------------

		// Verify and store app code. Generate access tokens and store for respective credential.
		this.app.get(
			`/${this.restEndpoint}/oauth2-credential/callback`,
			async (req: express.Request, res: express.Response) => {
				try {
					// realmId it's currently just use for the quickbook OAuth2 flow
					const { code, state: stateEncoded } = req.query;

					if (code === undefined || stateEncoded === undefined) {
						const errorResponse = new ResponseHelper.ResponseError(
							`Insufficient parameters for OAuth2 callback. Received following query parameters: ${JSON.stringify(
								req.query,
							)}`,
							undefined,
							503,
						);
						return ResponseHelper.sendErrorResponse(res, errorResponse);
					}

					let state;
					try {
						state = JSON.parse(Buffer.from(stateEncoded as string, 'base64').toString());
					} catch (error) {
						const errorResponse = new ResponseHelper.ResponseError(
							'Invalid state format returned',
							undefined,
							503,
						);
						return ResponseHelper.sendErrorResponse(res, errorResponse);
					}

					const result = await Db.collections.Credentials!.findOne(state.cid);
					if (result === undefined) {
						const errorResponse = new ResponseHelper.ResponseError(
							'The credential is not known.',
							undefined,
							404,
						);
						return ResponseHelper.sendErrorResponse(res, errorResponse);
					}

					let encryptionKey;
					encryptionKey = await UserSettings.getEncryptionKey();
					if (encryptionKey === undefined) {
						const errorResponse = new ResponseHelper.ResponseError(
							'No encryption key got found to decrypt the credentials!',
							undefined,
							503,
						);
						return ResponseHelper.sendErrorResponse(res, errorResponse);
					}

					const mode: WorkflowExecuteMode = 'internal';
					const credentialsHelper = new CredentialsHelper(encryptionKey);
					const decryptedDataOriginal = await credentialsHelper.getDecrypted(
						result as INodeCredentialsDetails,
						result.type,
						mode,
						true,
					);
					const oauthCredentials = credentialsHelper.applyDefaultsAndOverwrites(
						decryptedDataOriginal,
						result.type,
						mode,
					);

					const token = new csrf();
					if (
						decryptedDataOriginal.csrfSecret === undefined ||
						!token.verify(decryptedDataOriginal.csrfSecret as string, state.token)
					) {
						const errorResponse = new ResponseHelper.ResponseError(
							'The OAuth2 callback state is invalid!',
							undefined,
							404,
						);
						return ResponseHelper.sendErrorResponse(res, errorResponse);
					}

					let options = {};

					const oAuth2Parameters = {
						clientId: _.get(oauthCredentials, 'clientId') as string,
						clientSecret: _.get(oauthCredentials, 'clientSecret', '') as string | undefined,
						accessTokenUri: _.get(oauthCredentials, 'accessTokenUrl', '') as string,
						authorizationUri: _.get(oauthCredentials, 'authUrl', '') as string,
						redirectUri: `${WebhookHelpers.getWebhookBaseUrl()}${
							this.restEndpoint
						}/oauth2-credential/callback`,
						scopes: _.split(_.get(oauthCredentials, 'scope', 'openid,') as string, ','),
					};

					if ((_.get(oauthCredentials, 'authentication', 'header') as string) === 'body') {
						options = {
							body: {
								client_id: _.get(oauthCredentials, 'clientId') as string,
								client_secret: _.get(oauthCredentials, 'clientSecret', '') as string,
							},
						};
						delete oAuth2Parameters.clientSecret;
					}

					await this.externalHooks.run('oauth2.callback', [oAuth2Parameters]);

					const oAuthObj = new clientOAuth2(oAuth2Parameters);

					const queryParameters = req.originalUrl.split('?').splice(1, 1).join('');

					const oauthToken = await oAuthObj.code.getToken(
						`${oAuth2Parameters.redirectUri}?${queryParameters}`,
						options,
					);

					if (Object.keys(req.query).length > 2) {
						_.set(oauthToken.data, 'callbackQueryString', _.omit(req.query, 'state', 'code'));
					}

					if (oauthToken === undefined) {
						const errorResponse = new ResponseHelper.ResponseError(
							'Unable to get access tokens!',
							undefined,
							404,
						);
						return ResponseHelper.sendErrorResponse(res, errorResponse);
					}

					if (decryptedDataOriginal.oauthTokenData) {
						// Only overwrite supplied data as some providers do for example just return the
						// refresh_token on the very first request and not on subsequent ones.
						Object.assign(decryptedDataOriginal.oauthTokenData, oauthToken.data);
					} else {
						// No data exists so simply set
						decryptedDataOriginal.oauthTokenData = oauthToken.data;
					}

					_.unset(decryptedDataOriginal, 'csrfSecret');

					const credentials = new Credentials(
						result as INodeCredentialsDetails,
						result.type,
						result.nodesAccess,
					);
					credentials.setData(decryptedDataOriginal, encryptionKey);
					const newCredentialsData = credentials.getDataToSave() as unknown as ICredentialsDb;
					// Add special database related data
					newCredentialsData.updatedAt = this.getCurrentDate();
					// Save the credentials in DB
					await Db.collections.Credentials!.update(state.cid, newCredentialsData);

					res.sendFile(pathResolve(__dirname, '../../templates/oauth-callback.html'));
				} catch (error) {
					// Error response
					return ResponseHelper.sendErrorResponse(res, error);
				}
			},
		);

		// ----------------------------------------
		// Executions
		// ----------------------------------------

		// Returns all finished executions
		this.app.get(
			`/${this.restEndpoint}/executions`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<IExecutionsListResponse> => {
					let filter: any = {};

					if (req.query.filter) {
						filter = JSON.parse(req.query.filter as string);
					}

					let limit = 20;
					if (req.query.limit) {
						limit = parseInt(req.query.limit as string, 10);
					}

					const executingWorkflowIds: string[] = [];

					if (config.get('executions.mode') === 'queue') {
						const currentJobs = await Queue.getInstance().getJobs(['active', 'waiting']);
						executingWorkflowIds.push(
							...(currentJobs.map((job) => job.data.executionId) as string[]),
						);
					}
					// We may have manual executions even with queue so we must account for these.
					executingWorkflowIds.push(
						...this.activeExecutionsInstance
							.getActiveExecutions()
							.map((execution) => execution.id.toString()),
					);

					const countFilter = JSON.parse(JSON.stringify(filter));
					if (countFilter.waitTill !== undefined) {
						countFilter.waitTill = Not(IsNull());
					}
					countFilter.id = Not(In(executingWorkflowIds));

					const resultsQuery = await Db.collections
						.Execution!.createQueryBuilder('execution')
						.select([
							'execution.id',
							'execution.finished',
							'execution.mode',
							'execution.retryOf',
							'execution.retrySuccessId',
							'execution.waitTill',
							'execution.startedAt',
							'execution.stoppedAt',
							'execution.workflowData',
						])
						.orderBy('execution.id', 'DESC')
						.take(limit);

					Object.keys(filter).forEach((filterField) => {
						if (filterField === 'waitTill') {
							resultsQuery.andWhere(`execution.${filterField} is not null`);
						} else if (filterField === 'finished' && filter[filterField] === false) {
							resultsQuery.andWhere(`execution.${filterField} = :${filterField}`, {
								[filterField]: filter[filterField],
							});
							resultsQuery.andWhere(`execution.waitTill is null`);
						} else {
							resultsQuery.andWhere(`execution.${filterField} = :${filterField}`, {
								[filterField]: filter[filterField],
							});
						}
					});
					if (req.query.lastId) {
						resultsQuery.andWhere(`execution.id < :lastId`, { lastId: req.query.lastId });
					}
					if (req.query.firstId) {
						resultsQuery.andWhere(`execution.id > :firstId`, { firstId: req.query.firstId });
					}
					if (executingWorkflowIds.length > 0) {
						resultsQuery.andWhere(`execution.id NOT IN (:...ids)`, { ids: executingWorkflowIds });
					}

					const resultsPromise = resultsQuery.getMany();

					const countPromise = getExecutionsCount(countFilter);

					const results: IExecutionFlattedDb[] = await resultsPromise;
					const countedObjects = await countPromise;

					const returnResults: IExecutionsSummary[] = [];

					for (const result of results) {
						returnResults.push({
							id: result.id.toString(),
							finished: result.finished,
							mode: result.mode,
							retryOf: result.retryOf ? result.retryOf.toString() : undefined,
							retrySuccessId: result.retrySuccessId ? result.retrySuccessId.toString() : undefined,
							waitTill: result.waitTill as Date | undefined,
							startedAt: result.startedAt,
							stoppedAt: result.stoppedAt,
							workflowId: result.workflowData.id ? result.workflowData.id.toString() : '',
							workflowName: result.workflowData.name,
						});
					}

					return {
						count: countedObjects.count,
						results: returnResults,
						estimated: countedObjects.estimate,
					};
				},
			),
		);

		// Returns a specific execution
		this.app.get(
			`/${this.restEndpoint}/executions/:id`,
			ResponseHelper.send(
				async (
					req: express.Request,
					res: express.Response,
				): Promise<IExecutionResponse | IExecutionFlattedResponse | undefined> => {
					const result = await Db.collections.Execution!.findOne(req.params.id);

					if (result === undefined) {
						return undefined;
					}

					if (req.query.unflattedResponse === 'true') {
						const fullExecutionData = ResponseHelper.unflattenExecutionData(result);
						return fullExecutionData;
					}
					// Convert to response format in which the id is a string
					(result as IExecutionFlatted as IExecutionFlattedResponse).id = result.id.toString();
					return result as IExecutionFlatted as IExecutionFlattedResponse;
				},
			),
		);

		// Retries a failed execution
		this.app.post(
			`/${this.restEndpoint}/executions/:id/retry`,
			ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<boolean> => {
				// Get the data to execute
				const fullExecutionDataFlatted = await Db.collections.Execution!.findOne(req.params.id);

				if (fullExecutionDataFlatted === undefined) {
					throw new ResponseHelper.ResponseError(
						`The execution with the id "${req.params.id}" does not exist.`,
						404,
						404,
					);
				}

				const fullExecutionData = ResponseHelper.unflattenExecutionData(fullExecutionDataFlatted);

				if (fullExecutionData.finished) {
					throw new Error('The execution did succeed and can so not be retried.');
				}

				const executionMode = 'retry';

				fullExecutionData.workflowData.active = false;

				// Start the workflow
				const data: IWorkflowExecutionDataProcess = {
					executionMode,
					executionData: fullExecutionData.data,
					retryOf: req.params.id,
					workflowData: fullExecutionData.workflowData,
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

				if (req.body.loadWorkflow === true) {
					// Loads the currently saved workflow to execute instead of the
					// one saved at the time of the execution.
					const workflowId = fullExecutionData.workflowData.id;
					const workflowData = (await Db.collections.Workflow!.findOne(
						workflowId,
					)) as IWorkflowBase;

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
							throw new Error(
								`Could not find the node "${stack.node.name}" in workflow. It probably got deleted or renamed. Without it the workflow can sadly not be retried.`,
							);
						}

						// Replace the node data in the stack that it really uses the current data
						stack.node = node;
					}
				}

				const workflowRunner = new WorkflowRunner();
				const executionId = await workflowRunner.run(data);

				const executionData = await this.activeExecutionsInstance.getPostExecutePromise(
					executionId,
				);

				if (executionData === undefined) {
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
			ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<void> => {
				const deleteData = req.body as IExecutionDeleteFilter;

				if (deleteData.deleteBefore !== undefined) {
					const filters = {
						startedAt: LessThanOrEqual(deleteData.deleteBefore),
					};

					if (deleteData.filters !== undefined) {
						Object.assign(filters, deleteData.filters);
					}

					const execs = await Db.collections.Execution!.find({ ...filters, select: ['id'] });

					await Promise.all(
						execs.map(async (item) =>
							BinaryDataManager.getInstance().deleteBinaryDataByExecutionId(item.id.toString()),
						),
					);

					await Db.collections.Execution!.delete(filters);
				} else if (deleteData.ids !== undefined) {
					await Promise.all(
						deleteData.ids.map(async (id) =>
							BinaryDataManager.getInstance().deleteBinaryDataByExecutionId(id),
						),
					);

					// Deletes all executions with the given ids
					await Db.collections.Execution!.delete(deleteData.ids);
				} else {
					throw new Error('Required body-data "ids" or "deleteBefore" is missing!');
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
				async (req: express.Request, res: express.Response): Promise<IExecutionsSummary[]> => {
					if (config.get('executions.mode') === 'queue') {
						const currentJobs = await Queue.getInstance().getJobs(['active', 'waiting']);

						const currentlyRunningQueueIds = currentJobs.map((job) => job.data.executionId);

						const currentlyRunningManualExecutions =
							this.activeExecutionsInstance.getActiveExecutions();
						const manualExecutionIds = currentlyRunningManualExecutions.map(
							(execution) => execution.id,
						);

						const currentlyRunningExecutionIds =
							currentlyRunningQueueIds.concat(manualExecutionIds);

						if (currentlyRunningExecutionIds.length === 0) {
							return [];
						}

						const resultsQuery = await Db.collections
							.Execution!.createQueryBuilder('execution')
							.select([
								'execution.id',
								'execution.workflowId',
								'execution.mode',
								'execution.retryOf',
								'execution.startedAt',
							])
							.orderBy('execution.id', 'DESC')
							.andWhere(`execution.id IN (:...ids)`, { ids: currentlyRunningExecutionIds });

						if (req.query.filter) {
							const filter = JSON.parse(req.query.filter as string);
							if (filter.workflowId !== undefined) {
								resultsQuery.andWhere('execution.workflowId = :workflowId', {
									workflowId: filter.workflowId,
								});
							}
						}

						const results = await resultsQuery.getMany();

						return results.map((result) => {
							return {
								id: result.id,
								workflowId: result.workflowId,
								mode: result.mode,
								retryOf: result.retryOf !== null ? result.retryOf : undefined,
								startedAt: new Date(result.startedAt),
							} as IExecutionsSummary;
						});
					}
					const executingWorkflows = this.activeExecutionsInstance.getActiveExecutions();

					const returnData: IExecutionsSummary[] = [];

					let filter: any = {};
					if (req.query.filter) {
						filter = JSON.parse(req.query.filter as string);
					}

					for (const data of executingWorkflows) {
						if (filter.workflowId !== undefined && filter.workflowId !== data.workflowId) {
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
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<IExecutionsStopData> => {
					if (config.get('executions.mode') === 'queue') {
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

						const job = currentJobs.find(
							(job) => job.data.executionId.toString() === req.params.id,
						);

						if (!job) {
							throw new Error(`Could not stop "${req.params.id}" as it is no longer in queue.`);
						} else {
							await Queue.getInstance().stopJob(job);
						}

						const executionDb = (await Db.collections.Execution?.findOne(
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
					const executionId = req.params.id;

					// Stopt he execution and wait till it is done and we got the data
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
				},
			),
		);

		// Removes a test webhook
		this.app.delete(
			`/${this.restEndpoint}/test-webhook/:id`,
			ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<boolean> => {
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

		// Returns the settings which are needed in the UI
		this.app.get(
			`/${this.restEndpoint}/settings`,
			ResponseHelper.send(
				async (req: express.Request, res: express.Response): Promise<IN8nUISettings> => {
					return this.frontendSettings;
				},
			),
		);

		// ----------------------------------------
		// User Survey
		// ----------------------------------------

		// Process personalization survey responses
		this.app.post(
			`/${this.restEndpoint}/user-survey`,
			async (req: express.Request, res: express.Response) => {
				if (!this.frontendSettings.personalizationSurvey.shouldShow) {
					ResponseHelper.sendErrorResponse(
						res,
						new ResponseHelper.ResponseError('User survey already submitted', undefined, 400),
						false,
					);
				}

				const answers = req.body as IPersonalizationSurveyAnswers;
				await PersonalizationSurvey.writeSurveyToDisk(answers);
				this.frontendSettings.personalizationSurvey.shouldShow = false;
				this.frontendSettings.personalizationSurvey.answers = answers;
				ResponseHelper.sendSuccessResponse(res, undefined, true, 200);
				void InternalHooksManager.getInstance().onPersonalizationSurveySubmitted(answers);
			},
		);

		// ----------------------------------------
		// Webhooks
		// ----------------------------------------

		if (config.get('endpoints.disableProductionWebhooksOnMainProcess') !== true) {
			WebhookServer.registerProductionWebhooks.apply(this);
		}

		// HEAD webhook requests (test for UI)
		this.app.head(
			`/${this.endpointWebhookTest}/*`,
			async (req: express.Request, res: express.Response) => {
				// Cut away the "/webhook-test/" to get the registred part of the url
				const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(
					this.endpointWebhookTest.length + 2,
				);

				let response;
				try {
					response = await this.testWebhooks.callTestWebhook('HEAD', requestUrl, req, res);
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

		// HEAD webhook requests (test for UI)
		this.app.options(
			`/${this.endpointWebhookTest}/*`,
			async (req: express.Request, res: express.Response) => {
				// Cut away the "/webhook-test/" to get the registred part of the url
				const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(
					this.endpointWebhookTest.length + 2,
				);

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

				ResponseHelper.sendSuccessResponse(res, {}, true, 204);
			},
		);

		// GET webhook requests (test for UI)
		this.app.get(
			`/${this.endpointWebhookTest}/*`,
			async (req: express.Request, res: express.Response) => {
				// Cut away the "/webhook-test/" to get the registred part of the url
				const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(
					this.endpointWebhookTest.length + 2,
				);

				let response;
				try {
					response = await this.testWebhooks.callTestWebhook('GET', requestUrl, req, res);
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

		// POST webhook requests (test for UI)
		this.app.post(
			`/${this.endpointWebhookTest}/*`,
			async (req: express.Request, res: express.Response) => {
				// Cut away the "/webhook-test/" to get the registred part of the url
				const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(
					this.endpointWebhookTest.length + 2,
				);

				let response;
				try {
					response = await this.testWebhooks.callTestWebhook('POST', requestUrl, req, res);
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

		if (config.get('endpoints.disableUi') !== true) {
			// Read the index file and replace the path placeholder
			const editorUiPath = require.resolve('n8n-editor-ui');
			const filePath = pathJoin(pathDirname(editorUiPath), 'dist', 'index.html');
			const n8nPath = config.get('path');

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
	const PORT = config.get('port');
	const ADDRESS = config.get('listen_address');

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

		const defaultLocale = config.get('defaultLocale');

		if (defaultLocale !== 'en') {
			console.log(`Locale: ${defaultLocale}`);
		}

		await app.externalHooks.run('n8n.ready', [app]);
		const cpus = os.cpus();
		const binarDataConfig = config.get('binaryDataManager') as IBinaryDataConfig;
		const diagnosticInfo: IDiagnosticInfo = {
			basicAuthActive: config.get('security.basicAuth.active') as boolean,
			databaseType: (await GenericHelpers.getConfigValue('database.type')) as DatabaseType,
			disableProductionWebhooksOnMainProcess:
				config.get('endpoints.disableProductionWebhooksOnMainProcess') === true,
			notificationsEnabled: config.get('versionNotifications.enabled') === true,
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
				executions_process: config.get('executions.process'),
				executions_mode: config.get('executions.mode'),
				executions_timeout: config.get('executions.timeout'),
				executions_timeout_max: config.get('executions.maxTimeout'),
				executions_data_save_on_error: config.get('executions.saveDataOnError'),
				executions_data_save_on_success: config.get('executions.saveDataOnSuccess'),
				executions_data_save_on_progress: config.get('executions.saveExecutionProgress'),
				executions_data_save_manual_executions: config.get('executions.saveDataManualExecutions'),
				executions_data_prune: config.get('executions.pruneData'),
				executions_data_max_age: config.get('executions.pruneDataMaxAge'),
				executions_data_prune_timeout: config.get('executions.pruneDataTimeout'),
			},
			deploymentType: config.get('deployment.type'),
			binaryDataMode: binarDataConfig.mode,
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
): Promise<{ count: number; estimate: boolean }> {
	const dbType = (await GenericHelpers.getConfigValue('database.type')) as DatabaseType;
	const filteredFields = Object.keys(countFilter).filter((field) => field !== 'id');

	// Do regular count for other databases than pgsql and
	// if we are filtering based on workflowId or finished fields.
	if (dbType !== 'postgresdb' || filteredFields.length > 0) {
		const count = await Db.collections.Execution!.count(countFilter);
		return { count, estimate: false };
	}

	try {
		// Get an estimate of rows count.
		const estimateRowsNumberSql =
			"SELECT n_live_tup FROM pg_stat_all_tables WHERE relname = 'execution_entity';";
		const rows: Array<{ n_live_tup: string }> = await Db.collections.Execution!.query(
			estimateRowsNumberSql,
		);

		const estimate = parseInt(rows[0].n_live_tup, 10);
		// If over 100k, return just an estimate.
		if (estimate > 100000) {
			// if less than 100k, we get the real count as even a full
			// table scan should not take so long.
			return { count: estimate, estimate: true };
		}
	} catch (err) {
		LoggerProxy.warn(`Unable to get executions count from postgres: ${err}`);
	}

	const count = await Db.collections.Execution!.count(countFilter);
	return { count, estimate: false };
}
