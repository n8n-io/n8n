/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-console */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import express from 'express';
import { readFileSync } from 'fs';
import { getConnectionManager } from 'typeorm';
import bodyParser from 'body-parser';

import compression from 'compression';
// eslint-disable-next-line import/no-extraneous-dependencies
import parseUrl from 'parseurl';
import { WebhookHttpMethod } from 'n8n-workflow';

import * as Db from '@/Db';
import * as ActiveExecutions from '@/ActiveExecutions';
import * as ActiveWorkflowRunner from '@/ActiveWorkflowRunner';
import { ExternalHooks } from '@/ExternalHooks';
import * as GenericHelpers from '@/GenericHelpers';
import * as ResponseHelper from '@/ResponseHelper';
import { WaitingWebhooks } from '@/WaitingWebhooks';
import type { ICustomRequest, IExternalHooksClass, IPackageVersions } from '@/Interfaces';
import config from '@/config';
import { WEBHOOK_METHODS } from '@/WebhookHelpers';
import { setupErrorMiddleware } from '@/ErrorReporting';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-call
require('body-parser-xml')(bodyParser);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function registerProductionWebhooks() {
	// ----------------------------------------
	// Regular Webhooks
	// ----------------------------------------

	// Register all webhook requests
	this.app.all(
		`/${this.endpointWebhook}/*`,
		async (req: express.Request, res: express.Response) => {
			// Cut away the "/webhook/" to get the registered part of the url
			const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(
				this.endpointWebhook.length + 2,
			);

			const method = req.method.toUpperCase() as WebhookHttpMethod;

			if (method === 'OPTIONS') {
				let allowedMethods: string[];
				try {
					allowedMethods = await this.activeWorkflowRunner.getWebhookMethods(requestUrl);
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
				ResponseHelper.sendErrorResponse(res, new Error(`The method ${method} is not supported.`));
				return;
			}

			let response;
			try {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				response = await this.activeWorkflowRunner.executeWebhook(method, requestUrl, req, res);
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

	// ----------------------------------------
	// Waiting Webhooks
	// ----------------------------------------

	const waitingWebhooks = new WaitingWebhooks();

	// Register all webhook-waiting requests
	this.app.all(
		`/${this.endpointWebhookWaiting}/*`,
		async (req: express.Request, res: express.Response) => {
			// Cut away the "/webhook-waiting/" to get the registered part of the url
			const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(
				this.endpointWebhookWaiting.length + 2,
			);

			const method = req.method.toUpperCase() as WebhookHttpMethod;

			// TODO: Add support for OPTIONS in the future
			// if (method === 'OPTIONS') {
			// }

			if (!WEBHOOK_METHODS.includes(method)) {
				ResponseHelper.sendErrorResponse(res, new Error(`The method ${method} is not supported.`));
				return;
			}

			let response;
			try {
				response = await waitingWebhooks.executeWebhook(method, requestUrl, req, res);
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
}

class App {
	app: express.Application;

	activeWorkflowRunner: ActiveWorkflowRunner.ActiveWorkflowRunner;

	endpointWebhook: string;

	endpointWebhookWaiting: string;

	endpointPresetCredentials: string;

	externalHooks: IExternalHooksClass;

	saveDataErrorExecution: string;

	saveDataSuccessExecution: string;

	saveManualExecutions: boolean;

	executionTimeout: number;

	maxExecutionTimeout: number;

	timezone: string;

	activeExecutionsInstance: ActiveExecutions.ActiveExecutions;

	versions: IPackageVersions | undefined;

	restEndpoint: string;

	protocol: string;

	sslKey: string;

	sslCert: string;

	presetCredentialsLoaded: boolean;

	constructor() {
		this.app = express();
		this.app.disable('x-powered-by');

		this.endpointWebhook = config.getEnv('endpoints.webhook');
		this.endpointWebhookWaiting = config.getEnv('endpoints.webhookWaiting');
		this.saveDataErrorExecution = config.getEnv('executions.saveDataOnError');
		this.saveDataSuccessExecution = config.getEnv('executions.saveDataOnSuccess');
		this.saveManualExecutions = config.getEnv('executions.saveDataManualExecutions');
		this.executionTimeout = config.getEnv('executions.timeout');
		this.maxExecutionTimeout = config.getEnv('executions.maxTimeout');
		this.timezone = config.getEnv('generic.timezone');
		this.restEndpoint = config.getEnv('endpoints.rest');

		this.activeWorkflowRunner = ActiveWorkflowRunner.getInstance();

		this.activeExecutionsInstance = ActiveExecutions.getInstance();

		this.protocol = config.getEnv('protocol');
		this.sslKey = config.getEnv('ssl_key');
		this.sslCert = config.getEnv('ssl_cert');

		this.externalHooks = ExternalHooks();

		this.presetCredentialsLoaded = false;
		this.endpointPresetCredentials = config.getEnv('credentials.overwrite.endpoint');

		setupErrorMiddleware(this.app);
	}

	/**
	 * Returns the current epoch time
	 *
	 */
	getCurrentDate(): Date {
		return new Date();
	}

	async config(): Promise<void> {
		this.versions = await GenericHelpers.getVersions();

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
				limit: '16mb',
				verify: (req, res, buf) => {
					req.rawBody = buf;
				},
			}),
		);

		// Support application/xml type post data
		this.app.use(
			// @ts-ignore
			bodyParser.xml({
				limit: '16mb',
				xmlParseOptions: {
					normalize: true, // Trim whitespace inside text nodes
					normalizeTags: true, // Transform tags to lowercase
					explicitArray: false, // Only put properties in array if length > 1
				},
			}),
		);

		this.app.use(
			bodyParser.text({
				limit: '16mb',
				verify: (req, res, buf) => {
					req.rawBody = buf;
				},
			}),
		);

		// support application/x-www-form-urlencoded post data
		this.app.use(
			bodyParser.urlencoded({
				extended: false,
				verify: (req, res, buf) => {
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

		this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
			if (!Db.isInitialized) {
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
				// eslint-disable-next-line id-denylist
			} catch (err) {
				const error = new ResponseHelper.ResponseError('No Database connection!', undefined, 503);
				return ResponseHelper.sendErrorResponse(res, error);
			}

			// Everything fine
			const responseData = {
				status: 'ok',
			};

			ResponseHelper.sendSuccessResponse(res, responseData, true, 200);
		});

		registerProductionWebhooks.apply(this);
	}
}

export async function start(): Promise<void> {
	const PORT = config.getEnv('port');
	const ADDRESS = config.getEnv('listen_address');

	const app = new App();

	await app.config();

	let server;

	if (app.protocol === 'https' && app.sslKey && app.sslCert) {
		// eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
		const https = require('https');
		const privateKey = readFileSync(app.sslKey, 'utf8');
		const cert = readFileSync(app.sslCert, 'utf8');
		const credentials = { key: privateKey, cert };
		server = https.createServer(credentials, app.app);
	} else {
		// eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
		const http = require('http');
		server = http.createServer(app.app);
	}

	server.listen(PORT, ADDRESS, async () => {
		const versions = await GenericHelpers.getVersions();
		console.log(`n8n ready on ${ADDRESS}, port ${PORT}`);
		console.log(`Version: ${versions.cli}`);

		await app.externalHooks.run('n8n.ready', [app, config]);
	});
}
