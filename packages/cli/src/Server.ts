import * as express from 'express';
import {
	readFileSync,
} from 'fs';
import {
	dirname as pathDirname,
	join as pathJoin,
} from 'path';
import {
	getConnectionManager,
} from 'typeorm';
import * as bodyParser from 'body-parser';
require('body-parser-xml')(bodyParser);
import * as history from 'connect-history-api-fallback';
import * as requestPromise from 'request-promise-native';

import {
	ActiveExecutions,
	ActiveWorkflowRunner,
	CredentialTypes,
	Db,
	IActivationError,
	ICustomRequest,
	ICredentialsDb,
	ICredentialsDecryptedDb,
	ICredentialsDecryptedResponse,
	ICredentialsResponse,
	IExecutionDeleteFilter,
	IExecutionFlatted,
	IExecutionFlattedDb,
	IExecutionFlattedResponse,
	IExecutionPushResponse,
	IExecutionsListResponse,
	IExecutionsStopData,
	IExecutionsSummary,
	IN8nUISettings,
	IPackageVersions,
	IWorkflowBase,
	IWorkflowShortResponse,
	IWorkflowResponse,
	IWorkflowExecutionDataProcess,
	NodeTypes,
	Push,
	ResponseHelper,
	TestWebhooks,
	WorkflowCredentials,
	WebhookHelpers,
	WorkflowExecuteAdditionalData,
	WorkflowHelpers,
	WorkflowRunner,
	GenericHelpers,
} from './';

import {
	Credentials,
	LoadNodeParameterOptions,
	UserSettings,
} from 'n8n-core';

import {
	ICredentialType,
	IDataObject,
	INodeCredentials,
	INodeTypeDescription,
	INodeParameters,
	INodePropertyOptions,
	IRunData,
	Workflow,
} from 'n8n-workflow';

import {
	FindManyOptions,
	FindOneOptions,
	LessThan,
	LessThanOrEqual,
	Not,
} from 'typeorm';

import * as basicAuth from 'basic-auth';
import * as compression from 'compression';
import * as config from '../config';
import * as jwt from 'jsonwebtoken';
import * as jwks from 'jwks-rsa';
// @ts-ignore
import * as timezones from 'google-timezones-json';
import * as parseUrl from 'parseurl';


class App {

	app: express.Application;
	activeWorkflowRunner: ActiveWorkflowRunner.ActiveWorkflowRunner;
	testWebhooks: TestWebhooks.TestWebhooks;
	endpointWebhook: string;
	endpointWebhookTest: string;
	saveDataErrorExecution: string;
	saveDataSuccessExecution: string;
	saveManualExecutions: boolean;
	timezone: string;
	activeExecutionsInstance: ActiveExecutions.ActiveExecutions;
	push: Push.Push;
	versions: IPackageVersions | undefined;

	protocol: string;
	sslKey:  string;
	sslCert: string;

	constructor() {
		this.app = express();

		this.endpointWebhook = config.get('endpoints.webhook') as string;
		this.endpointWebhookTest = config.get('endpoints.webhookTest') as string;
		this.saveDataErrorExecution = config.get('executions.saveDataOnError') as string;
		this.saveDataSuccessExecution = config.get('executions.saveDataOnSuccess') as string;
		this.saveManualExecutions = config.get('executions.saveDataManualExecutions') as boolean;
		this.timezone = config.get('generic.timezone') as string;

		this.activeWorkflowRunner = ActiveWorkflowRunner.getInstance();
		this.testWebhooks = TestWebhooks.getInstance();
		this.push = Push.getInstance();

		this.activeExecutionsInstance = ActiveExecutions.getInstance();

		this.protocol = config.get('protocol');
		this.sslKey  = config.get('ssl_key');
		this.sslCert = config.get('ssl_cert');
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
		const authIgnoreRegex = new RegExp(`^\/(healthz|${this.endpointWebhook}|${this.endpointWebhookTest})\/?.*$`);

		// Check for basic auth credentials if activated
		const basicAuthActive = config.get('security.basicAuth.active') as boolean;
		if (basicAuthActive === true) {
			const basicAuthUser = await GenericHelpers.getConfigValue('security.basicAuth.user') as string;
			if (basicAuthUser === '') {
				throw new Error('Basic auth is activated but no user got defined. Please set one!');
			}

			const basicAuthPassword = await GenericHelpers.getConfigValue('security.basicAuth.password') as string;
			if (basicAuthPassword === '') {
				throw new Error('Basic auth is activated but no password got defined. Please set one!');
			}

			this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
				if (req.url.match(authIgnoreRegex)) {
					return next();
				}
				const realm = 'n8n - Editor UI';
				const basicAuthData = basicAuth(req);

				if (basicAuthData === undefined) {
					// Authorization data is missing
					return ResponseHelper.basicAuthAuthorizationError(res, realm, 'Authorization is required!');
				}

				if (basicAuthData.name !== basicAuthUser || basicAuthData.pass !== basicAuthPassword) {
					// Provided authentication data is wrong
					return ResponseHelper.basicAuthAuthorizationError(res, realm, 'Authorization data is wrong!');
				}

				next();
			});
		}

		// Check for and validate JWT if configured
		const jwtAuthActive  = config.get('security.jwtAuth.active') as boolean;
		if (jwtAuthActive === true) {
			const jwtAuthHeader = await GenericHelpers.getConfigValue('security.jwtAuth.jwtHeader') as string;
			if (jwtAuthHeader === '') {
				throw new Error('JWT auth is activated but no request header was defined. Please set one!');
			}

			const jwksUri = await GenericHelpers.getConfigValue('security.jwtAuth.jwksUri') as string;
			if (jwksUri === '') {
				throw new Error('JWT auth is activated but no JWK Set URI was defined. Please set one!');
			}

			this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
				if (req.url.match(authIgnoreRegex)) {
					return next();
				}

				const token = req.header(jwtAuthHeader) as string;
				if (token === '') {
					return ResponseHelper.jwtAuthAuthorizationError(res, "Missing token");
				}

				const jwkClient = jwks({ cache: true, jwksUri });
				function getKey(header: any, callback: Function) { // tslint:disable-line:no-any
					jwkClient.getSigningKey(header.kid, (err: Error, key: any) => { // tslint:disable-line:no-any
						if (err) throw ResponseHelper.jwtAuthAuthorizationError(res, err.message);

						const signingKey = key.publicKey || key.rsaPublicKey;
						callback(null, signingKey);
					});
				}

				jwt.verify(token, getKey, {}, (err: jwt.VerifyErrors, decoded: object) => {
					if (err) return ResponseHelper.jwtAuthAuthorizationError(res, 'Invalid token');

					next();
				});
			});
		}

		// Get push connections
		this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
			if (req.url.indexOf('/rest/push') === 0) {
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
			next();
		});

		// Support application/json type post data
		this.app.use(bodyParser.json({
			limit: '16mb', verify: (req, res, buf) => {
				// @ts-ignore
				req.rawBody = buf;
			}
		}));

		// Support application/xml type post data
		// @ts-ignore
		this.app.use(bodyParser.xml({ limit: '16mb', xmlParseOptions: {
			normalize: true,     // Trim whitespace inside text nodes
			normalizeTags: true, // Transform tags to lowercase
			explicitArray: false, // Only put properties in array if length > 1
		  } }));

		this.app.use(bodyParser.text({
			limit: '16mb', verify: (req, res, buf) => {
				// @ts-ignore
				req.rawBody = buf;
			}
		}));

		// Make sure that Vue history mode works properly
		this.app.use(history({
			rewrites: [
				{
					from: new RegExp(`^\/(rest|healthz|css|js|${this.endpointWebhook}|${this.endpointWebhookTest})\/?.*$`),
					to: (context) => {
						return context.parsedUrl!.pathname!.toString();
					}
				}
			]
		}));

		//support application/x-www-form-urlencoded post data
		this.app.use(bodyParser.urlencoded({ extended: false }));

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



		// ----------------------------------------
		// Workflow
		// ----------------------------------------


		// Creates a new workflow
		this.app.post('/rest/workflows', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<IWorkflowResponse> => {

			const newWorkflowData = req.body;

			newWorkflowData.name = newWorkflowData.name.trim();
			newWorkflowData.createdAt = this.getCurrentDate();
			newWorkflowData.updatedAt = this.getCurrentDate();

			newWorkflowData.id = undefined;

			// Save the workflow in DB
			const result = await Db.collections.Workflow!.save(newWorkflowData);

			// Convert to response format in which the id is a string
			(result as IWorkflowBase as IWorkflowResponse).id = result.id.toString();
			return result as IWorkflowBase as IWorkflowResponse;

		}));


		// Reads and returns workflow data from an URL
		this.app.get('/rest/workflows/from-url', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<IWorkflowResponse> => {
			if (req.query.url === undefined) {
				throw new ResponseHelper.ResponseError(`The parameter "url" is missing!`, undefined, 400);
			}
			if (!(req.query.url as string).match(/^http[s]?:\/\/.*\.json$/i)) {
				throw new ResponseHelper.ResponseError(`The parameter "url" is not valid! It does not seem to be a URL pointing to a n8n workflow JSON file.`, undefined, 400);
			}
			const data = await requestPromise.get(req.query.url as string);

			let workflowData: IWorkflowResponse | undefined;
			try {
				workflowData = JSON.parse(data);
			} catch (error) {
				throw new ResponseHelper.ResponseError(`The URL does not point to valid JSON file!`, undefined, 400);
			}

			// Do a very basic check if it is really a n8n-workflow-json
			if (workflowData === undefined || workflowData.nodes === undefined || !Array.isArray(workflowData.nodes) ||
				workflowData.connections === undefined || typeof workflowData.connections !== 'object' ||
				Array.isArray(workflowData.connections)) {
				throw new ResponseHelper.ResponseError(`The data in the file does not seem to be a n8n workflow JSON file!`, undefined, 400);
			}

			return workflowData;
		}));


		// Returns workflows
		this.app.get('/rest/workflows', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<IWorkflowShortResponse[]> => {
			const findQuery = {} as FindManyOptions;
			if (req.query.filter) {
				findQuery.where = JSON.parse(req.query.filter as string);
			}

			// Return only the fields we need
			findQuery.select = ['id', 'name', 'active', 'createdAt', 'updatedAt'];

			const results = await Db.collections.Workflow!.find(findQuery);

			for (const entry of results) {
				(entry as unknown as IWorkflowShortResponse).id = entry.id.toString();
			}

			return results as unknown as IWorkflowShortResponse[];
		}));


		// Returns a specific workflow
		this.app.get('/rest/workflows/:id', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<IWorkflowResponse | undefined> => {
			const result = await Db.collections.Workflow!.findOne(req.params.id);

			if (result === undefined) {
				return undefined;
			}

			// Convert to response format in which the id is a string
			(result as IWorkflowBase as IWorkflowResponse).id = result.id.toString();
			return result as IWorkflowBase as IWorkflowResponse;
		}));


		// Updates an existing workflow
		this.app.patch('/rest/workflows/:id', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<IWorkflowResponse> => {

			const newWorkflowData = req.body;
			const id = req.params.id;

			if (this.activeWorkflowRunner.isActive(id)) {
				// When workflow gets saved always remove it as the triggers could have been
				// changed and so the changes would not take effect
				await this.activeWorkflowRunner.remove(id);
			}

			if (newWorkflowData.settings) {
				if (newWorkflowData.settings.timezone === 'DEFAULT') {
					// Do not save the default timezone
					delete newWorkflowData.settings.timezone;
				}
				if (newWorkflowData.settings.saveDataErrorExecution === 'DEFAULT') {
					// Do not save when default got set
					delete newWorkflowData.settings.saveDataErrorExecution;
				}
				if (newWorkflowData.settings.saveDataSuccessExecution === 'DEFAULT') {
					// Do not save when default got set
					delete newWorkflowData.settings.saveDataSuccessExecution;
				}
				if (newWorkflowData.settings.saveManualExecutions === 'DEFAULT') {
					// Do not save when default got set
					delete newWorkflowData.settings.saveManualExecutions;
				}
			}


			newWorkflowData.updatedAt = this.getCurrentDate();

			await Db.collections.Workflow!.update(id, newWorkflowData);

			// We sadly get nothing back from "update". Neither if it updated a record
			// nor the new value. So query now the hopefully updated entry.
			const responseData = await Db.collections.Workflow!.findOne(id);

			if (responseData === undefined) {
				throw new ResponseHelper.ResponseError(`Workflow with id "${id}" could not be found to be updated.`, undefined, 400);
			}

			if (responseData.active === true) {
				// When the workflow is supposed to be active add it again
				try {
					await this.activeWorkflowRunner.add(id);
				} catch (error) {
					// If workflow could not be activated set it again to inactive
					newWorkflowData.active = false;
					await Db.collections.Workflow!.update(id, newWorkflowData);

					// Also set it in the returned data
					responseData.active = false;

					// Now return the original error for UI to display
					throw error;
				}
			}

			// Convert to response format in which the id is a string
			(responseData as IWorkflowBase as IWorkflowResponse).id = responseData.id.toString();
			return responseData as IWorkflowBase as IWorkflowResponse;
		}));


		// Deletes a specific workflow
		this.app.delete('/rest/workflows/:id', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<boolean> => {
			const id = req.params.id;

			if (this.activeWorkflowRunner.isActive(id)) {
				// Before deleting a workflow deactivate it
				await this.activeWorkflowRunner.remove(id);
			}

			await Db.collections.Workflow!.delete(id);

			return true;
		}));


		this.app.post('/rest/workflows/run', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<IExecutionPushResponse> => {
			const workflowData = req.body.workflowData;
			const runData: IRunData | undefined = req.body.runData;
			const startNodes: string[] | undefined = req.body.startNodes;
			const destinationNode: string | undefined = req.body.destinationNode;
			const executionMode = 'manual';

			const sessionId = GenericHelpers.getSessionId(req);

			// Check if workflow is saved as webhooks can only be tested with saved workflows.
			// If that is the case check if any webhooks calls are present we have to wait for and
			// if that is the case wait till we receive it.
			if (WorkflowHelpers.isWorkflowIdValid(workflowData.id) === true && (runData === undefined || startNodes === undefined || startNodes.length === 0 || destinationNode === undefined)) {
				// Webhooks can only be tested with saved workflows
				const credentials = await WorkflowCredentials(workflowData.nodes);
				const additionalData = await WorkflowExecuteAdditionalData.getBase(credentials);
				const nodeTypes = NodeTypes();
				const workflowInstance = new Workflow({ id: workflowData.id, name: workflowData.name, nodes: workflowData.nodes, connections: workflowData.connections, active: false, nodeTypes, staticData: undefined, settings: workflowData.settings });
				const needsWebhook = await this.testWebhooks.needsWebhookData(workflowData, workflowInstance, additionalData, executionMode, sessionId, destinationNode);
				if (needsWebhook === true) {
					return {
						waitingForWebhook: true,
					};
				}
			}

			// For manual testing always set to not active
			workflowData.active = false;

			const credentials = await WorkflowCredentials(workflowData.nodes);

			// Start the workflow
			const data: IWorkflowExecutionDataProcess = {
				credentials,
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
		}));


		// Returns parameter values which normally get loaded from an external API or
		// get generated dynamically
		this.app.get('/rest/node-parameter-options', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<INodePropertyOptions[]> => {
			const nodeType = req.query.nodeType as string;
			let credentials: INodeCredentials | undefined = undefined;
			const currentNodeParameters = req.query.currentNodeParameters as INodeParameters[];
			if (req.query.credentials !== undefined) {
				credentials = JSON.parse(req.query.credentials as string);
			}
			const methodName = req.query.methodName as string;

			const nodeTypes = NodeTypes();

			const loadDataInstance = new LoadNodeParameterOptions(nodeType, nodeTypes, credentials);

			const workflowData = loadDataInstance.getWorkflowData() as IWorkflowBase;
			const workflowCredentials = await WorkflowCredentials(workflowData.nodes);
			const additionalData = await WorkflowExecuteAdditionalData.getBase(workflowCredentials, currentNodeParameters);

			return loadDataInstance.getOptions(methodName, additionalData);
		}));


		// Returns all the node-types
		this.app.get('/rest/node-types', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<INodeTypeDescription[]> => {

			const returnData: INodeTypeDescription[] = [];

			const nodeTypes = NodeTypes();

			const allNodes = nodeTypes.getAll();

			allNodes.forEach((nodeData) => {
				returnData.push(nodeData.description);
			});

			return returnData;
		}));



		// ----------------------------------------
		// Node-Types
		// ----------------------------------------


		// Returns the node icon
		this.app.get('/rest/node-icon/:nodeType', async (req: express.Request, res: express.Response): Promise<void> => {
			const nodeTypeName = req.params.nodeType;

			const nodeTypes = NodeTypes();
			const nodeType = nodeTypes.getByName(nodeTypeName);

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

			res.sendFile(filepath);
		});



		// ----------------------------------------
		// Active Workflows
		// ----------------------------------------


		// Returns the active workflow ids
		this.app.get('/rest/active', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<string[]> => {
			return this.activeWorkflowRunner.getActiveWorkflows();
		}));


		// Returns if the workflow with the given id had any activation errors
		this.app.get('/rest/active/error/:id', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<IActivationError | undefined> => {
			const id = req.params.id;
			return this.activeWorkflowRunner.getActivationError(id);
		}));



		// ----------------------------------------
		// Credentials
		// ----------------------------------------


		// Deletes a specific credential
		this.app.delete('/rest/credentials/:id', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<boolean> => {
			const id = req.params.id;

			await Db.collections.Credentials!.delete({ id });

			return true;
		}));

		// Creates new credentials
		this.app.post('/rest/credentials', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<ICredentialsResponse> => {
			const incomingData = req.body;

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

			// Check if credentials with the same name and type exist already
			const findQuery = {
				where: {
					name: incomingData.name,
					type: incomingData.type,
				},
			} as FindOneOptions;

			const checkResult = await Db.collections.Credentials!.findOne(findQuery);
			if (checkResult !== undefined) {
				throw new ResponseHelper.ResponseError(`Credentials with the same type and name exist already.`, undefined, 400);
			}

			// Encrypt the data
			const credentials = new Credentials(incomingData.name, incomingData.type, incomingData.nodesAccess);
			credentials.setData(incomingData.data, encryptionKey);
			const newCredentialsData = credentials.getDataToSave() as ICredentialsDb;

			// Add special database related data
			newCredentialsData.createdAt = this.getCurrentDate();
			newCredentialsData.updatedAt = this.getCurrentDate();

			// TODO: also add user automatically depending on who is logged in, if anybody is logged in

			// Save the credentials in DB
			const result = await Db.collections.Credentials!.save(newCredentialsData);

			// Convert to response format in which the id is a string
			(result as unknown as ICredentialsResponse).id = result.id.toString();
			return result as unknown as ICredentialsResponse;
		}));


		// Updates existing credentials
		this.app.patch('/rest/credentials/:id', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<ICredentialsResponse> => {
			const incomingData = req.body;

			const id = req.params.id;

			if (incomingData.name === '') {
				throw new Error('Credentials have to have a name set!');
			}

			// Add the date for newly added node access permissions
			for (const nodeAccess of incomingData.nodesAccess) {
				if (!nodeAccess.date) {
					nodeAccess.date = this.getCurrentDate();
				}
			}

			// Check if credentials with the same name and type exist already
			const findQuery = {
				where: {
					id: Not(id),
					name: incomingData.name,
					type: incomingData.type,
				},
			} as FindOneOptions;

			const checkResult = await Db.collections.Credentials!.findOne(findQuery);
			if (checkResult !== undefined) {
				throw new ResponseHelper.ResponseError(`Credentials with the same type and name exist already.`, undefined, 400);
			}

			const encryptionKey = await UserSettings.getEncryptionKey();
			if (encryptionKey === undefined) {
				throw new Error('No encryption key got found to encrypt the credentials!');
			}

			// Encrypt the data
			const credentials = new Credentials(incomingData.name, incomingData.type, incomingData.nodesAccess);
			credentials.setData(incomingData.data, encryptionKey);
			const newCredentialsData = credentials.getDataToSave() as unknown as ICredentialsDb;

			// Add special database related data
			newCredentialsData.updatedAt = this.getCurrentDate();

			// Update the credentials in DB
			await Db.collections.Credentials!.update(id, newCredentialsData);

			// We sadly get nothing back from "update". Neither if it updated a record
			// nor the new value. So query now the hopefully updated entry.
			const responseData = await Db.collections.Credentials!.findOne(id);

			if (responseData === undefined) {
				throw new ResponseHelper.ResponseError(`Credentials with id "${id}" could not be found to be updated.`, undefined, 400);
			}

			// Remove the encrypted data as it is not needed in the frontend
			responseData.data = '';

			// Convert to response format in which the id is a string
			(responseData as unknown as ICredentialsResponse).id = responseData.id.toString();
			return responseData as unknown as ICredentialsResponse;
		}));


		// Returns specific credentials
		this.app.get('/rest/credentials/:id', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<ICredentialsDecryptedResponse | ICredentialsResponse | undefined> => {
			const findQuery = {} as FindManyOptions;

			// Make sure the variable has an expected value
			const includeData = ['true', true].includes(req.query.includeData as string);

			if (includeData !== true) {
				// Return only the fields we need
				findQuery.select = ['id', 'name', 'type', 'nodesAccess', 'createdAt', 'updatedAt'];
			}

			const result = await Db.collections.Credentials!.findOne(req.params.id);

			if (result === undefined) {
				return result;
			}

			let encryptionKey = undefined;
			if (includeData === true) {
				encryptionKey = await UserSettings.getEncryptionKey();
				if (encryptionKey === undefined) {
					throw new Error('No encryption key got found to decrypt the credentials!');
				}

				const credentials = new Credentials(result.name, result.type, result.nodesAccess, result.data);
				(result as ICredentialsDecryptedDb).data = credentials.getData(encryptionKey!);
			}

			(result as ICredentialsDecryptedResponse).id = result.id.toString();

			return result as ICredentialsDecryptedResponse;
		}));


		// Returns all the saved credentials
		this.app.get('/rest/credentials', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<ICredentialsResponse[]> => {
			const findQuery = {} as FindManyOptions;
			if (req.query.filter) {
				findQuery.where = JSON.parse(req.query.filter as string);
				if ((findQuery.where! as IDataObject).id !== undefined) {
					// No idea if multiple where parameters make db search
					// slower but to be sure that that is not the case we
					// remove all unnecessary fields in case the id is defined.
					findQuery.where = { id: (findQuery.where! as IDataObject).id };
				}
			}

			findQuery.select = ['id', 'name', 'type', 'nodesAccess', 'createdAt', 'updatedAt'];

			const results = await Db.collections.Credentials!.find(findQuery) as unknown as ICredentialsResponse[];

			let encryptionKey = undefined;

			const includeData = ['true', true].includes(req.query.includeData as string);
			if (includeData === true) {
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
		}));



		// ----------------------------------------
		// Credential-Types
		// ----------------------------------------


		// Returns all the credential types which are defined in the loaded n8n-modules
		this.app.get('/rest/credential-types', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<ICredentialType[]> => {

			const returnData: ICredentialType[] = [];

			const credentialTypes = CredentialTypes();

			credentialTypes.getAll().forEach((credentialData) => {
				returnData.push(credentialData);
			});

			return returnData;
		}));



		// ----------------------------------------
		// Executions
		// ----------------------------------------


		// Returns all finished executions
		this.app.get('/rest/executions', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<IExecutionsListResponse> => {
			let filter: any = {}; // tslint:disable-line:no-any

			if (req.query.filter) {
				filter = JSON.parse(req.query.filter as string);
			}

			let limit = 20;
			if (req.query.limit) {
				limit = parseInt(req.query.limit as string, 10);
			}

			const countFilter = JSON.parse(JSON.stringify(filter));
			if (req.query.lastId) {
				filter.id = LessThan(req.query.lastId);
			}
			countFilter.select = ['id'];

			const resultsPromise = Db.collections.Execution!.find({
				select: [
					'id',
					'finished',
					'mode',
					'retryOf',
					'retrySuccessId',
					'startedAt',
					'stoppedAt',
					'workflowData',
				],
				where: filter,
				order: {
					id: 'DESC',
				},
				take: limit,
			});

			const countPromise = Db.collections.Execution!.count(countFilter);

			const results: IExecutionFlattedDb[] = await resultsPromise;
			const count = await countPromise;

			const returnResults: IExecutionsSummary[] = [];

			for (const result of results) {
				returnResults.push({
					id: result.id!.toString(),
					finished: result.finished,
					mode: result.mode,
					retryOf: result.retryOf ? result.retryOf.toString() : undefined,
					retrySuccessId: result.retrySuccessId ? result.retrySuccessId.toString() : undefined,
					startedAt: result.startedAt,
					stoppedAt: result.stoppedAt,
					workflowId: result.workflowData!.id!.toString(),
					workflowName: result.workflowData!.name,
				});
			}

			return {
				count,
				results: returnResults,
			};
		}));


		// Returns a specific execution
		this.app.get('/rest/executions/:id', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<IExecutionFlattedResponse | undefined> => {
			const result = await Db.collections.Execution!.findOne(req.params.id);

			if (result === undefined) {
				return undefined;
			}

			// Convert to response format in which the id is a string
			(result as IExecutionFlatted as IExecutionFlattedResponse).id = result.id.toString();
			return result as IExecutionFlatted as IExecutionFlattedResponse;
		}));


		// Retries a failed execution
		this.app.post('/rest/executions/:id/retry', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<boolean> => {
			// Get the data to execute
			const fullExecutionDataFlatted = await Db.collections.Execution!.findOne(req.params.id);

			if (fullExecutionDataFlatted === undefined) {
				throw new ResponseHelper.ResponseError(`The execution with the id "${req.params.id}" does not exist.`, 404, 404);
			}

			const fullExecutionData = ResponseHelper.unflattenExecutionData(fullExecutionDataFlatted);

			if (fullExecutionData.finished === true) {
				throw new Error('The execution did succeed and can so not be retried.');
			}

			const executionMode = 'retry';

			const credentials = await WorkflowCredentials(fullExecutionData.workflowData.nodes);

			fullExecutionData.workflowData.active = false;

			// Start the workflow
			const data: IWorkflowExecutionDataProcess = {
				credentials,
				executionMode,
				executionData: fullExecutionData.data,
				retryOf: req.params.id,
				workflowData: fullExecutionData.workflowData,
			};

			const lastNodeExecuted = data!.executionData!.resultData.lastNodeExecuted as string;

			// Remove the old error and the data of the last run of the node that it can be replaced
			delete data!.executionData!.resultData.error;
			data!.executionData!.resultData.runData[lastNodeExecuted].pop();

			if (req.body.loadWorkflow === true) {
				// Loads the currently saved workflow to execute instead of the
				// one saved at the time of the execution.
				const workflowId = fullExecutionData.workflowData.id;
				data.workflowData = await Db.collections.Workflow!.findOne(workflowId) as IWorkflowBase;

				if (data.workflowData === undefined) {
					throw new Error(`The workflow with the ID "${workflowId}" could not be found and so the data not be loaded for the retry.`);
				}

				// Replace all of the nodes in the execution stack with the ones of the new workflow
				for (const stack of data!.executionData!.executionData!.nodeExecutionStack) {
					// Find the data of the last executed node in the new workflow
					const node = data.workflowData.nodes.find(node => node.name === stack.node.name);
					if (node === undefined) {
						throw new Error(`Could not find the node "${stack.node.name}" in workflow. It probably got deleted or renamed. Without it the workflow can sadly not be retried.`);
					}

					// Replace the node data in the stack that it really uses the current data
					stack.node = node;
				}
			}

			const workflowRunner = new WorkflowRunner();
			const executionId = await workflowRunner.run(data);

			const executionData = await this.activeExecutionsInstance.getPostExecutePromise(executionId);

			if (executionData === undefined) {
				throw new Error('The retry did not start for an unknown reason.');
			}

			return !!executionData.finished;
		}));


		// Delete Executions
		// INFORMATION: We use POST instead of DELETE to not run into any issues
		// with the query data getting to long
		this.app.post('/rest/executions/delete', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<void> => {
			const deleteData = req.body as IExecutionDeleteFilter;

			if (deleteData.deleteBefore !== undefined) {
				const filters = {
					startedAt: LessThanOrEqual(deleteData.deleteBefore),
				};
				if (deleteData.filters !== undefined) {
					Object.assign(filters, deleteData.filters);
				}

				await Db.collections.Execution!.delete(filters);
			} else if (deleteData.ids !== undefined) {
				// Deletes all executions with the given ids
				await Db.collections.Execution!.delete(deleteData.ids);
			} else {
				throw new Error('Required body-data "ids" or "deleteBefore" is missing!');
			}
		}));


		// ----------------------------------------
		// Executing Workflows
		// ----------------------------------------


		// Returns all the currently working executions
		this.app.get('/rest/executions-current', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<IExecutionsSummary[]> => {
			const executingWorkflows = this.activeExecutionsInstance.getActiveExecutions();

			const returnData: IExecutionsSummary[] = [];

			let filter: any = {}; // tslint:disable-line:no-any
			if (req.query.filter) {
				filter = JSON.parse(req.query.filter as string);
			}

			for (const data of executingWorkflows) {
				if (filter.workflowId !== undefined && filter.workflowId !== data.workflowId) {
					continue;
				}
				returnData.push(
					{
						idActive: data.id.toString(),
						workflowId: data.workflowId.toString(),
						mode: data.mode,
						retryOf: data.retryOf,
						startedAt: new Date(data.startedAt),
					}
				);
			}

			return returnData;
		}));

		// Forces the execution to stop
		this.app.post('/rest/executions-current/:id/stop', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<IExecutionsStopData> => {
			const executionId = req.params.id;

			// Stopt he execution and wait till it is done and we got the data
			const result = await this.activeExecutionsInstance.stopExecution(executionId);

			if (result === undefined) {
				throw new Error(`The execution id "${executionId}" could not be found.`);
			}

			const returnData: IExecutionsStopData = {
				mode: result.mode,
				startedAt: new Date(result.startedAt),
				stoppedAt: new Date(result.stoppedAt),
				finished: result.finished,
			};

			return returnData;
		}));


		// Removes a test webhook
		this.app.delete('/rest/test-webhook/:id', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<boolean> => {
			const workflowId = req.params.id;
			return this.testWebhooks.cancelTestWebhook(workflowId);
		}));



		// ----------------------------------------
		// Options
		// ----------------------------------------

		// Returns all the available timezones
		this.app.get('/rest/options/timezones', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<object> => {
			return timezones;
		}));




		// ----------------------------------------
		// Settings
		// ----------------------------------------


		// Returns the settings which are needed in the UI
		this.app.get('/rest/settings', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<IN8nUISettings> => {
			return {
				endpointWebhook: this.endpointWebhook,
				endpointWebhookTest: this.endpointWebhookTest,
				saveDataErrorExecution: this.saveDataErrorExecution,
				saveDataSuccessExecution: this.saveDataSuccessExecution,
				saveManualExecutions: this.saveManualExecutions,
				timezone: this.timezone,
				urlBaseWebhook: WebhookHelpers.getWebhookBaseUrl(),
				versionCli: this.versions!.cli,
			};
		}));



		// ----------------------------------------
		// Webhooks
		// ----------------------------------------

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

		// GET webhook requests
		this.app.get(`/${this.endpointWebhook}/*`, async (req: express.Request, res: express.Response) => {
			// Cut away the "/webhook/" to get the registred part of the url
			const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(this.endpointWebhook.length + 2);

			let response;
			try {
				response = await this.activeWorkflowRunner.executeWebhook('GET', requestUrl, req, res);
			} catch (error) {
				ResponseHelper.sendErrorResponse(res, error);
				return ;
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

		// HEAD webhook requests (test for UI)
		this.app.head(`/${this.endpointWebhookTest}/*`, async (req: express.Request, res: express.Response) => {
			// Cut away the "/webhook-test/" to get the registred part of the url
			const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(this.endpointWebhookTest.length + 2);

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

			ResponseHelper.sendSuccessResponse(res, response.data, true, response.responseCode);
		});

		// GET webhook requests (test for UI)
		this.app.get(`/${this.endpointWebhookTest}/*`, async (req: express.Request, res: express.Response) => {
			// Cut away the "/webhook-test/" to get the registred part of the url
			const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(this.endpointWebhookTest.length + 2);

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

			ResponseHelper.sendSuccessResponse(res, response.data, true, response.responseCode);
		});

		// POST webhook requests (test for UI)
		this.app.post(`/${this.endpointWebhookTest}/*`, async (req: express.Request, res: express.Response) => {
			// Cut away the "/webhook-test/" to get the registred part of the url
			const requestUrl = (req as ICustomRequest).parsedUrl!.pathname!.slice(this.endpointWebhookTest.length + 2);

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

			ResponseHelper.sendSuccessResponse(res, response.data, true, response.responseCode);
		});


		// Serve the website
		const startTime = (new Date()).toUTCString();
		const editorUiPath = require.resolve('n8n-editor-ui');
		this.app.use('/', express.static(pathJoin(pathDirname(editorUiPath), 'dist'), {
			index: 'index.html',
			setHeaders: (res, path) => {
				if (res.req && res.req.url === '/index.html') {
					// Set last modified date manually to n8n start time so
					// that it hopefully refreshes the page when a new version
					// got used
					res.setHeader('Last-Modified', startTime);
				}
			}
		}));
	}

}

export async function start(): Promise<void> {
	const PORT = config.get('port');

	const app = new App();

	await app.config();

	let server;

	if (app.protocol === 'https' && app.sslKey && app.sslCert){
		const https = require('https');
		const privateKey = readFileSync(app.sslKey, 'utf8');
		const cert = readFileSync(app.sslCert, 'utf8');
		const credentials = { key: privateKey,cert };
		server = https.createServer(credentials,app.app);
	}else{
		const http = require('http');
		server = http.createServer(app.app);
	}

	server.listen(PORT, async () => {
		const versions = await GenericHelpers.getVersions();
		console.log(`n8n ready on port ${PORT}`);
		console.log(`Version: ${versions.cli}`);
	});
}
