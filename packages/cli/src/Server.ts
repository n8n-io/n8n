import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as history from 'connect-history-api-fallback';
import * as requestPromise from 'request-promise-native';

import {
	IActivationError,
	ActiveWorkflowRunner,
	ICustomRequest,
	ICredentialsDb,
	ICredentialsDecryptedDb,
	ICredentialsDecryptedResponse,
	ICredentialsResponse,
	CredentialTypes,
	Db,
	IExecutionDeleteFilter,
	IExecutionFlatted,
	IExecutionFlattedDb,
	IExecutionFlattedResponse,
	IExecutionPushResponse,
	IExecutionsListResponse,
	IExecutionsStopData,
	IExecutionsSummary,
	IN8nUISettings,
	IWorkflowBase,
	IWorkflowShortResponse,
	IWorkflowResponse,
	NodeTypes,
	Push,
	ResponseHelper,
	TestWebhooks,
	WebhookHelpers,
	WorkflowExecuteAdditionalData,
	WorkflowHelpers,
	GenericHelpers,
} from './';

import {
	ActiveExecutions,
	Credentials,
	LoadNodeParameterOptions,
	UserSettings,
	WorkflowExecute,
} from 'n8n-core';

import {
	ICredentialType,
	IDataObject,
	INodeCredentials,
	INodeTypeDescription,
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

import * as parseUrl from 'parseurl';
import * as config from '../config';
// @ts-ignore
import * as timezones from 'google-timezones-json';

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

	constructor() {
		this.app = express();

		this.endpointWebhook = config.get('endpoints.webhook') as string;
		this.endpointWebhookTest = config.get('endpoints.webhookTest') as string;
		this.saveDataErrorExecution = config.get('executions.saveDataOnError') as string;
		this.saveDataSuccessExecution = config.get('executions.saveDataOnSuccess') as string;
		this.saveManualExecutions = config.get('executions.saveDataManualExecutions') as boolean;
		this.timezone = config.get('generic.timezone') as string;

		this.config();
		this.activeWorkflowRunner = ActiveWorkflowRunner.getInstance();
		this.testWebhooks = TestWebhooks.getInstance();
		this.push = Push.getInstance();

		this.activeExecutionsInstance = ActiveExecutions.getInstance();
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


	private config(): void {

		// Get push connections
		this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
			if (req.url.indexOf('/rest/push') === 0) {
				// TODO: Later also has to add some kind of authentication token
				if (req.query.sessionId === undefined) {
					next(new Error('The query parameter "sessionId" is missing!'));
					return;
				}

				this.push.add(req.query.sessionId, req, res);
				return;
			}
			next();
		});

		// Make sure that each request has the "parsedUrl" parameter
		this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
			(req as ICustomRequest).parsedUrl = parseUrl(req);
			next();
		});

		// Support application/json type post data
		this.app.use(bodyParser.json({ limit: "16mb" }));

		// Make sure that Vue history mode works properly
		this.app.use(history({
			rewrites: [
				{
					from: new RegExp(`^\/(rest|${this.endpointWebhook}|${this.endpointWebhookTest})\/.*$`),
					to: (context) => {
						return context.parsedUrl!.pathname!.toString();
					}
				}
			]
		}));

		//support application/x-www-form-urlencoded post data
		this.app.use(bodyParser.urlencoded({ extended: false }));

		this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
			// Allow access also from frontend when developing
			res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
			res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
			res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, sessionid');
			next();
		});


		this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
			if (Db.collections.Workflow === null) {
				const error = new ResponseHelper.ReponseError('Database is not ready!', undefined, 503);
				return ResponseHelper.sendErrorResponse(res, error);
			}

			next();
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
				throw new ResponseHelper.ReponseError(`The parameter "url" is missing!`, undefined, 400);
			}
			if (!req.query.url.match(/^http[s]?:\/\/.*\.json$/i)) {
				throw new ResponseHelper.ReponseError(`The parameter "url" is not valid! It does not seem to be a URL pointing to a n8n workflow JSON file.`, undefined, 400);
			}
			const data = await requestPromise.get(req.query.url);

			let workflowData: IWorkflowResponse | undefined;
			try {
				workflowData = JSON.parse(data);
			} catch (error) {
				throw new ResponseHelper.ReponseError(`The URL does not point to valid JSON file!`, undefined, 400);
			}

			// Do a very basic check if it is really a n8n-workflow-json
			if (workflowData === undefined || workflowData.nodes === undefined || !Array.isArray(workflowData.nodes) ||
				workflowData.connections === undefined || typeof workflowData.connections !== 'object' ||
				Array.isArray(workflowData.connections)) {
				throw new ResponseHelper.ReponseError(`The data in the file does not seem to be a n8n workflow JSON file!`, undefined, 400);
			}

			return workflowData;
		}));


		// Returns workflows
		this.app.get('/rest/workflows', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<IWorkflowShortResponse[]> => {
			const findQuery = {} as FindManyOptions;
			if (req.query.filter) {
				findQuery.where = JSON.parse(req.query.filter);
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
			const reponseData = await Db.collections.Workflow!.findOne(id);

			if (reponseData === undefined) {
				throw new ResponseHelper.ReponseError(`Workflow with id "${id}" could not be found to be updated.`, undefined, 400);
			}

			if (reponseData.active === true) {
				// When the workflow is supposed to be active add it again
				try {
					await this.activeWorkflowRunner.add(id);
				} catch (error) {
					// If workflow could not be activated set it again to inactive
					newWorkflowData.active = false;
					await Db.collections.Workflow!.update(id, newWorkflowData);

					// Also set it in the returned data
					reponseData.active = false;

					// Now return the original error for UI to display
					throw error;
				}
			}

			// Convert to response format in which the id is a string
			(reponseData as IWorkflowBase as IWorkflowResponse).id = reponseData.id.toString();
			return reponseData as IWorkflowBase as IWorkflowResponse;
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
			const nodeTypes = NodeTypes();
			const executionMode = 'manual';

			const sessionId = GenericHelpers.getSessionId(req);

			// Do not supply the saved static data! Tests always run with initially empty static data.
			// The reason is that it contains information like webhook-ids. If a workflow is currently
			// active it would see its id and would so not create an own test-webhook. Additionally would
			// it also delete the webhook at the service in the end. So that the active workflow would end
			// up without still being active but not receiving and webhook requests anymore as it does
			// not exist anymore.
			const workflowInstance = new Workflow(workflowData.id, workflowData.nodes, workflowData.connections, false, nodeTypes, undefined, workflowData.settings);

			const additionalData = await WorkflowExecuteAdditionalData.get(executionMode, workflowData, workflowInstance, sessionId);

			const workflowExecute = new WorkflowExecute(additionalData, executionMode);

			let executionId: string;

			if (runData === undefined || startNodes === undefined || startNodes.length === 0 || destinationNode === undefined) {
				// Execute all nodes

				if (WorkflowHelpers.isWorkflowIdValid(workflowData.id) === true) {
					// Webhooks can only be tested with saved workflows
					const needsWebhook = await this.testWebhooks.needsWebhookData(workflowData, workflowInstance, additionalData, executionMode, sessionId, destinationNode);
					if (needsWebhook === true) {
						return {
							waitingForWebhook: true,
						};
					}
				}

				// Can execute without webhook so go on
				executionId = await workflowExecute.run(workflowInstance, undefined, destinationNode);
			} else {
				// Execute only the nodes between start and destination nodes
				executionId = await workflowExecute.runPartialWorkflow(workflowInstance, runData, startNodes, destinationNode);
			}

			return {
				executionId,
			};
		}));


		// Returns parameter values which normally get loaded from an external API or
		// get generated dynamically
		this.app.get('/rest/node-parameter-options', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<INodePropertyOptions[]> => {
			const nodeType = req.query.nodeType;
			let credentials: INodeCredentials | undefined = undefined;
			if (req.query.credentials !== undefined) {
				credentials = JSON.parse(req.query.credentials);
			}
			const methodName = req.query.methodName;

			const nodeTypes = NodeTypes();
			const executionMode = 'manual';

			const sessionId = GenericHelpers.getSessionId(req);

			const loadDataInstance = new LoadNodeParameterOptions(nodeType, nodeTypes, credentials);

			const workflowData = loadDataInstance.getWorkflowData() as IWorkflowBase;
			const additionalData = await WorkflowExecuteAdditionalData.get(executionMode, workflowData, loadDataInstance.workflow, sessionId);

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

			// Check if credentials with the same name and type exist already
			const findQuery = {
				where: {
					name: incomingData.name,
					type: incomingData.type,
				},
			} as FindOneOptions;

			const checkResult = await Db.collections.Credentials!.findOne(findQuery);
			if (checkResult !== undefined) {
				throw new ResponseHelper.ReponseError(`Credentials with the same type and name exist already.`, undefined, 400);
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
				throw new ResponseHelper.ReponseError(`Credentials with the same type and name exist already.`, undefined, 400);
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
			const reponseData = await Db.collections.Credentials!.findOne(id);

			if (reponseData === undefined) {
				throw new ResponseHelper.ReponseError(`Credentials with id "${id}" could not be found to be updated.`, undefined, 400);
			}

			// Remove the encrypted data as it is not needed in the frontend
			reponseData.data = '';

			// Convert to response format in which the id is a string
			(reponseData as unknown as ICredentialsResponse).id = reponseData.id.toString();
			return reponseData as unknown as ICredentialsResponse;
		}));


		// Returns specific credentials
		this.app.get('/rest/credentials/:id', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<ICredentialsDecryptedResponse | ICredentialsResponse | undefined> => {
			const findQuery = {} as FindManyOptions;

			// Make sure the variable has an expected value
			if (req.query.includeData === 'true') {
				req.query.includeData = true;
			} else {
				req.query.includeData = false;
			}

			if (req.query.includeData !== true) {
				// Return only the fields we need
				findQuery.select = ['id', 'name', 'type', 'nodesAccess', 'createdAt', 'updatedAt'];
			}

			const result = await Db.collections.Credentials!.findOne(req.params.id);

			if (result === undefined) {
				return result;
			}

			let encryptionKey = undefined;
			if (req.query.includeData === true) {
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
				findQuery.where = JSON.parse(req.query.filter);
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
			if (req.query.includeData === true) {
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
				filter = JSON.parse(req.query.filter);
			}

			let limit = 20;
			if (req.query.limit) {
				limit = parseInt(req.query.limit, 10);
			}

			const countFilter = JSON.parse(JSON.stringify(filter));
			if (req.query.lastStartedAt) {
				filter.startedAt = LessThan(req.query.lastStartedAt);
			}
			countFilter.select = ['id'];

			const resultsPromise = Db.collections.Execution!.find({
				select: ['id', 'workflowData'],
				where: filter,
				order: {
					startedAt: "DESC",
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
		this.app.post('/rest/executions/:id/retry', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<string> => {
			// Get the data to execute
			const fullExecutionDataFlatted = await Db.collections.Execution!.findOne(req.params.id);

			if (fullExecutionDataFlatted === undefined) {
				throw new ResponseHelper.ReponseError(`The execution with the id "${req.params.id}" does not exist.`, 404, 404);
			}

			const fullExecutionData = ResponseHelper.unflattenExecutionData(fullExecutionDataFlatted);

			if (fullExecutionData.finished === true) {
				throw new Error('The execution did succeed and can so not be retried.');
			}

			const executionMode = 'retry';

			const nodeTypes = NodeTypes();
			const workflowInstance = new Workflow(req.params.id, fullExecutionData.workflowData.nodes, fullExecutionData.workflowData.connections, false, nodeTypes, fullExecutionData.workflowData.staticData, fullExecutionData.workflowData.settings);

			const additionalData = await WorkflowExecuteAdditionalData.get(executionMode, fullExecutionData.workflowData, workflowInstance, undefined, req.params.id);
			const workflowExecute = new WorkflowExecute(additionalData, executionMode);

			return workflowExecute.runExecutionData(workflowInstance, fullExecutionData.data);
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
		// this.app.get('/rest/executions-current', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<IExecutionsCurrentSummaryExtended[]> => {
		this.app.get('/rest/executions-current', ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<IExecutionsSummary[]> => {
			const executingWorkflows = this.activeExecutionsInstance.getActiveExecutions();

			const returnData: IExecutionsSummary[] = [];

			let filter: any = {}; // tslint:disable-line:no-any
			if (req.query.filter) {
				filter = JSON.parse(req.query.filter);
			}

			for (const data of executingWorkflows) {
				if (filter.workflowId !== undefined && filter.workflowId !== data.workflowId) {
					continue;
				}
				returnData.push(
					{
						idActive: data.id.toString(),
						workflowId: data.workflowId,
						mode:data.mode,
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
			};
		}));



		// ----------------------------------------
		// Webhooks
		// ----------------------------------------


		// GET webhook requests
		this.app.get(`/${this.endpointWebhook}/*`, async (req: express.Request, res: express.Response) => {
			console.log('\n*** WEBHOOK CALLED (GET) ***');

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

			ResponseHelper.sendSuccessResponse(res, response.data, true);
		});


		// POST webhook requests
		this.app.post(`/${this.endpointWebhook}/*`, async (req: express.Request, res: express.Response) => {
			console.log('\n*** WEBHOOK CALLED (POST) ***');

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

			ResponseHelper.sendSuccessResponse(res, response.data, true);
		});


		// GET webhook requests (test for UI)
		this.app.get(`/${this.endpointWebhookTest}/*`, async (req: express.Request, res: express.Response) => {
			console.log('\n*** WEBHOOK-TEST CALLED (GET) ***');

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

			ResponseHelper.sendSuccessResponse(res, response.data, true);
		});


		// POST webhook requests (test for UI)
		this.app.post(`/${this.endpointWebhookTest}/*`, async (req: express.Request, res: express.Response) => {
			console.log('\n*** WEBHOOK-TEST CALLED (POST) ***');

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

			ResponseHelper.sendSuccessResponse(res, response.data, true);
		});


		// Serve the website
		this.app.use('/', express.static(__dirname + '/../../node_modules/n8n-editor-ui/dist', { index: 'index.html' }));
	}

}

export function start() {
	const PORT = config.get('port');

	const app = new App().app;

	app.listen(PORT, () => {
		console.log('n8n ready on port ' + PORT);
	});
}
