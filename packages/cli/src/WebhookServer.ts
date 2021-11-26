/* eslint-disable no-console */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as express from 'express';
import { readFileSync } from 'fs';
import { getConnectionManager } from 'typeorm';
import * as bodyParser from 'body-parser';
// eslint-disable-next-line import/no-extraneous-dependencies, @typescript-eslint/no-unused-vars
import * as _ from 'lodash';

import * as compression from 'compression';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as parseUrl from 'parseurl';
// eslint-disable-next-line import/no-cycle
import {
	ActiveExecutions,
	ActiveWorkflowRunner,
	Db,
	ExternalHooks,
	GenericHelpers,
	ICustomRequest,
	IExternalHooksClass,
	IPackageVersions,
	ResponseHelper,
	WaitingWebhooks,
} from '.';

import * as config from '../config';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-call
require('body-parser-xml')(bodyParser);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function registerProductionWebhooks() {
	// ----------------------------------------
	// Regular Webhooks
	// ----------------------------------------

	// HEAD webhook requests
	this.app.head(
		`/${this.endpointWebhook}/*`,
		async (req: express.Request, res: express.Response) => {
			// Cut away the "/webhook/" to get the registred part of the url
			const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(
				this.endpointWebhook.length + 2,
			);

			let response;
			try {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				response = await this.activeWorkflowRunner.executeWebhook('HEAD', requestUrl, req, res);
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

	// OPTIONS webhook requests
	this.app.options(
		`/${this.endpointWebhook}/*`,
		async (req: express.Request, res: express.Response) => {
			// Cut away the "/webhook/" to get the registred part of the url
			const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(
				this.endpointWebhook.length + 2,
			);

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

			ResponseHelper.sendSuccessResponse(res, {}, true, 204);
		},
	);

	// GET webhook requests
	this.app.get(
		`/${this.endpointWebhook}/*`,
		async (req: express.Request, res: express.Response) => {
			// Cut away the "/webhook/" to get the registred part of the url
			const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(
				this.endpointWebhook.length + 2,
			);

			let response;
			try {
				response = await this.activeWorkflowRunner.executeWebhook('GET', requestUrl, req, res);
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

	// POST webhook requests
	this.app.post(
		`/${this.endpointWebhook}/*`,
		async (req: express.Request, res: express.Response) => {
			// Cut away the "/webhook/" to get the registred part of the url
			const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(
				this.endpointWebhook.length + 2,
			);

			let response;
			try {
				response = await this.activeWorkflowRunner.executeWebhook('POST', requestUrl, req, res);
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

	// HEAD webhook-waiting requests
	this.app.head(
		`/${this.endpointWebhookWaiting}/*`,
		async (req: express.Request, res: express.Response) => {
			// Cut away the "/webhook-waiting/" to get the registred part of the url
			const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(
				this.endpointWebhookWaiting.length + 2,
			);

			let response;
			try {
				response = await waitingWebhooks.executeWebhook('HEAD', requestUrl, req, res);
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

	// GET webhook-waiting requests
	this.app.get(
		`/${this.endpointWebhookWaiting}/*`,
		async (req: express.Request, res: express.Response) => {
			// Cut away the "/webhook-waiting/" to get the registred part of the url
			const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(
				this.endpointWebhookWaiting.length + 2,
			);

			let response;
			try {
				response = await waitingWebhooks.executeWebhook('GET', requestUrl, req, res);
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

	// POST webhook-waiting requests
	this.app.post(
		`/${this.endpointWebhookWaiting}/*`,
		async (req: express.Request, res: express.Response) => {
			// Cut away the "/webhook-waiting/" to get the registred part of the url
			const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(
				this.endpointWebhookWaiting.length + 2,
			);

			let response;
			try {
				response = await waitingWebhooks.executeWebhook('POST', requestUrl, req, res);
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

		this.endpointWebhook = config.get('endpoints.webhook') as string;
		this.endpointWebhookWaiting = config.get('endpoints.webhookWaiting') as string;
		this.saveDataErrorExecution = config.get('executions.saveDataOnError') as string;
		this.saveDataSuccessExecution = config.get('executions.saveDataOnSuccess') as string;
		this.saveManualExecutions = config.get('executions.saveDataManualExecutions') as boolean;
		this.executionTimeout = config.get('executions.timeout') as number;
		this.maxExecutionTimeout = config.get('executions.maxTimeout') as number;
		this.timezone = config.get('generic.timezone') as string;
		this.restEndpoint = config.get('endpoints.rest') as string;

		this.activeWorkflowRunner = ActiveWorkflowRunner.getInstance();

		this.activeExecutionsInstance = ActiveExecutions.getInstance();

		this.protocol = config.get('protocol');
		this.sslKey = config.get('ssl_key');
		this.sslCert = config.get('ssl_cert');

		this.externalHooks = ExternalHooks();

		this.presetCredentialsLoaded = false;
		this.endpointPresetCredentials = config.get('credentials.overwrite.endpoint') as string;
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
		this.versions = await GenericHelpers.getVersions();

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
				limit: '16mb',
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
					// @ts-ignore
					req.rawBody = buf;
				},
			}),
		);

		// support application/x-www-form-urlencoded post data
		this.app.use(
			bodyParser.urlencoded({
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
	const PORT = config.get('port');
	const ADDRESS = config.get('listen_address');

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

		await app.externalHooks.run('n8n.ready', [app]);
	});
}
