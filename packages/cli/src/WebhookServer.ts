import * as express from 'express';
import {
	readFileSync,
} from 'fs';
import {
	getConnectionManager,
} from 'typeorm';
import * as bodyParser from 'body-parser';
require('body-parser-xml')(bodyParser);
import * as _ from 'lodash';

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
} from './';

import * as compression from 'compression';
import { config } from '@config';
import * as parseUrl from 'parseurl';

export function registerProductionWebhooks() {
	// HEAD webhook requests
	this.app.head(`/${this.endpointWebhook}/*`, async (req: express.Request, res: express.Response) => {
		// Cut away the "/webhook/" to get the registred part of the url
		const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(this.endpointWebhook.length + 2);

		let response;
		try {
			response = await this.activeWorkflowRunner.executeWebhook('HEAD', requestUrl, req, res);
		} catch (error) {
			ResponseHelper.sendErrorResponse(res, error);
			return;
		}

		if (response.noWebhookResponse === true) {
			// Nothing else to do as the response got already sent
			return;
		}

		ResponseHelper.sendSuccessResponse(res, response.data, true, response.responseCode);
	});

	// OPTIONS webhook requests
	this.app.options(`/${this.endpointWebhook}/*`, async (req: express.Request, res: express.Response) => {
		// Cut away the "/webhook/" to get the registred part of the url
		const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(this.endpointWebhook.length + 2);

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
	});

	// GET webhook requests
	this.app.get(`/${this.endpointWebhook}/*`, async (req: express.Request, res: express.Response) => {
		// Cut away the "/webhook/" to get the registred part of the url
		const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(this.endpointWebhook.length + 2);

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

		ResponseHelper.sendSuccessResponse(res, response.data, true, response.responseCode);
	});

	// POST webhook requests
	this.app.post(`/${this.endpointWebhook}/*`, async (req: express.Request, res: express.Response) => {
		// Cut away the "/webhook/" to get the registred part of the url
		const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(this.endpointWebhook.length + 2);

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

		ResponseHelper.sendSuccessResponse(res, response.data, true, response.responseCode);
	});
}

class App {

	app: express.Application;
	activeWorkflowRunner: ActiveWorkflowRunner.ActiveWorkflowRunner;
	endpointWebhook: string;
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
		this.app.use(bodyParser.json({
			limit: '16mb', verify: (req, res, buf) => {
				// @ts-ignore
				req.rawBody = buf;
			},
		}));

		// Support application/xml type post data
		// @ts-ignore
		this.app.use(bodyParser.xml({
			limit: '16mb', xmlParseOptions: {
				normalize: true,     // Trim whitespace inside text nodes
				normalizeTags: true, // Transform tags to lowercase
				explicitArray: false, // Only put properties in array if length > 1
			},
		}));

		this.app.use(bodyParser.text({
			limit: '16mb', verify: (req, res, buf) => {
				// @ts-ignore
				req.rawBody = buf;
			},
		}));

		//support application/x-www-form-urlencoded post data
		this.app.use(bodyParser.urlencoded({ extended: false,
			verify: (req, res, buf) => {
				// @ts-ignore
				req.rawBody = buf;
			},
		}));

		if (process.env['NODE_ENV'] !== 'production') {
			this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
				// Allow access also from frontend when developing
				res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
				res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
				res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, sessionid');
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

			const connectionManager = getConnectionManager();

			if (connectionManager.connections.length === 0) {
				const error = new ResponseHelper.ResponseError('No Database connection found!', undefined, 503);
				return ResponseHelper.sendErrorResponse(res, error);
			}

			if (connectionManager.connections[0].isConnected === false) {
				// Connection is not active
				const error = new ResponseHelper.ResponseError('Database connection not active!', undefined, 503);
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

		await app.externalHooks.run('n8n.ready', [app]);
	});
}
