import {
	IActivationError,
	Db,
	NodeTypes,
	IResponseCallbackData,
	IWorkflowDb,
	IWorkflowExecutionDataProcess,
	ResponseHelper,
	WebhookHelpers,
	WorkflowCredentials,
	WorkflowHelpers,
	WorkflowRunner,
	WorkflowExecuteAdditionalData,
	IWebhookDb,
} from './';

import {
	ActiveWorkflows,
	NodeExecuteFunctions,
} from 'n8n-core';

import {
	IExecuteData,
	IGetExecutePollFunctions,
	IGetExecuteTriggerFunctions,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	NodeHelpers,
	IWorkflowExecuteAdditionalData as IWorkflowExecuteAdditionalDataWorkflow,
	WebhookHttpMethod,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import * as express from 'express';

export class ActiveWorkflowRunner {
	private activeWorkflows: ActiveWorkflows | null = null;

	private activationErrors: {
		[key: string]: IActivationError;
	} = {};


	async init() {

		// Get the active workflows from database

		// NOTE
		// Here I guess we can have a flag on the workflow table like hasTrigger
		// so intead of pulling all the active wehhooks just pull the actives that have a trigger
		const workflowsData: IWorkflowDb[] = await Db.collections.Workflow!.find({ active: true }) as IWorkflowDb[];

		// Clear up active workflow table
		await Db.collections.Webhook?.clear();

		this.activeWorkflows = new ActiveWorkflows();

		if (workflowsData.length !== 0) {
			console.log('\n ================================');
			console.log('   Start Active Workflows:');
			console.log(' ================================');

			for (const workflowData of workflowsData) {
				console.log(`   - ${workflowData.name}`);
				try {
					await this.add(workflowData.id.toString(), workflowData);
					console.log(`     => Started`);
				} catch (error) {
					console.log(`     => ERROR: Workflow could not be activated:`);
					console.log(`               ${error.message}`);
				}
			}
		}
	}

	/**
	 * Removes all the currently active workflows
	 *
	 * @returns {Promise<void>}
	 * @memberof ActiveWorkflowRunner
	 */
	async removeAll(): Promise<void> {
		const activeWorkflowId: string[] = [];

		if (this.activeWorkflows !== null) {
			// TODO: This should be renamed!
			activeWorkflowId.push.apply(activeWorkflowId, this.activeWorkflows.allActiveWorkflows());
		}

		const activeWorkflows = await this.getActiveWorkflows();
		activeWorkflowId.push.apply(activeWorkflowId, activeWorkflows.map(workflow => workflow.id));

		const removePromises = [];
		for (const workflowId of activeWorkflowId) {
			removePromises.push(this.remove(workflowId));
		}

		await Promise.all(removePromises);
		return;
	}

	/**
	 * Checks if a webhook for the given method and path exists and executes the workflow.
	 *
	 * @param {WebhookHttpMethod} httpMethod
	 * @param {string} path
	 * @param {express.Request} req
	 * @param {express.Response} res
	 * @returns {Promise<object>}
	 * @memberof ActiveWorkflowRunner
	 */
	async executeWebhook(httpMethod: WebhookHttpMethod, path: string, req: express.Request, res: express.Response): Promise<IResponseCallbackData> {
		if (this.activeWorkflows === null) {
			throw new ResponseHelper.ResponseError('The "activeWorkflows" instance did not get initialized yet.', 404, 404);
		}

		const webhook = await Db.collections.Webhook?.findOne({ webhookPath: path, method: httpMethod }) as IWebhookDb;

		// check if something exist
		if (webhook === undefined) {
			// The requested webhook is not registered
			throw new ResponseHelper.ResponseError(`The requested webhook "${httpMethod} ${path}" is not registered.`, 404, 404);
		}

		const workflowData = await Db.collections.Workflow!.findOne(webhook.workflowId);
		if (workflowData === undefined) {
			throw new ResponseHelper.ResponseError(`Could not find workflow with id "${webhook.workflowId}"`, 404, 404);
		}

		const nodeTypes = NodeTypes();
		const workflow = new Workflow({ id: webhook.workflowId.toString(), name: workflowData.name, nodes: workflowData.nodes, connections: workflowData.connections, active: workflowData.active, nodeTypes, staticData: workflowData.staticData, settings: workflowData.settings});

		const credentials = await WorkflowCredentials([workflow.getNode(webhook.node as string) as INode]);

		const additionalData = await WorkflowExecuteAdditionalData.getBase(credentials);

		const webhookData = NodeHelpers.getNodeWebhooks(workflow, workflow.getNode(webhook.node as string) as INode, additionalData).filter((webhook) => {
			return (webhook.httpMethod === httpMethod && webhook.path === path);
		})[0];

		// Get the node which has the webhook defined to know where to start from and to
		// get additional data
		const workflowStartNode = workflow.getNode(webhookData.node);

		if (workflowStartNode === null) {
			throw new ResponseHelper.ResponseError('Could not find node to process webhook.', 404, 404);
		}

		return new Promise((resolve, reject) => {
			const executionMode = 'webhook';
			//@ts-ignore
			WebhookHelpers.executeWebhook(workflow, webhookData, workflowData, workflowStartNode, executionMode, undefined, req, res, (error: Error | null, data: object) => {
				if (error !== null) {
					return reject(error);
				}
				resolve(data);
			});
		});
	}

	/**
	 * Gets all request methods associated with a single webhook
	 *
	 * @param {string} path webhook path
	 * @returns {Promise<string[]>}
	 * @memberof ActiveWorkflowRunner
	 */
	async getWebhookMethods(path: string) : Promise<string[]> {
		const webhooks = await Db.collections.Webhook?.find({ webhookPath: path}) as IWebhookDb[];

		// Gather all request methods in string array
		const webhookMethods: string[] = webhooks.map(webhook => webhook.method);
		return webhookMethods;
	}

	/**
	 * Returns the ids of the currently active workflows
	 *
	 * @returns {string[]}
	 * @memberof ActiveWorkflowRunner
	 */
	getActiveWorkflows(): Promise<IWorkflowDb[]> {
		return Db.collections.Workflow?.find({ where: { active: true }, select: ['id'] }) as Promise<IWorkflowDb[]>;
	}


	/**
	 * Returns if the workflow is active
	 *
	 * @param {string} id The id of the workflow to check
	 * @returns {boolean}
	 * @memberof ActiveWorkflowRunner
	 */
	async isActive(id: string): Promise<boolean> {
		const workflow = await Db.collections.Workflow?.findOne({ id }) as IWorkflowDb;
		return workflow?.active as boolean;
	}

	/**
	 * Return error if there was a problem activating the workflow
	 *
	 * @param {string} id The id of the workflow to return the error of
	 * @returns {(IActivationError | undefined)}
	 * @memberof ActiveWorkflowRunner
	 */
	getActivationError(id: string): IActivationError | undefined {
		if (this.activationErrors[id] === undefined) {
			return undefined;
		}

		return this.activationErrors[id];
	}

	/**
	 * Adds all the webhooks of the workflow
	 *
	 * @param {Workflow} workflow
	 * @param {IWorkflowExecuteAdditionalDataWorkflow} additionalData
	 * @param {WorkflowExecuteMode} mode
	 * @returns {Promise<void>}
	 * @memberof ActiveWorkflowRunner
	 */
	async addWorkflowWebhooks(workflow: Workflow, additionalData: IWorkflowExecuteAdditionalDataWorkflow, mode: WorkflowExecuteMode): Promise<void> {
		const webhooks = WebhookHelpers.getWorkflowWebhooks(workflow, additionalData);
		let path = '' as string | undefined;

		for (const webhookData of webhooks) {

			const node = workflow.getNode(webhookData.node) as INode;
			node.name = webhookData.node;

			path = node.parameters.path as string;

			if (node.parameters.path === undefined) {
				path = workflow.expression.getSimpleParameterValue(node, webhookData.webhookDescription['path']) as string | undefined;

				if (path === undefined) {
					// TODO: Use a proper logger
					console.error(`No webhook path could be found for node "${node.name}" in workflow "${workflow.id}".`);
					continue;
				}
			}

			const isFullPath: boolean = workflow.expression.getSimpleParameterValue(node, webhookData.webhookDescription['isFullPath'], false) as boolean;

			const webhook = {
				workflowId: webhookData.workflowId,
				webhookPath: NodeHelpers.getNodeWebhookPath(workflow.id as string, node, path, isFullPath),
				node: node.name,
				method: webhookData.httpMethod,
			} as IWebhookDb;

			try {

				await Db.collections.Webhook?.insert(webhook);

				const webhookExists = await workflow.runWebhookMethod('checkExists', webhookData, NodeExecuteFunctions, mode, false);
				if (webhookExists === false) {
					// If webhook does not exist yet create it
					await workflow.runWebhookMethod('create', webhookData, NodeExecuteFunctions, mode, false);
				}

			} catch (error) {

				let errorMessage = '';

				await Db.collections.Webhook?.delete({ workflowId: workflow.id });

				// if it's a workflow from the the insert
				// TODO check if there is standard error code for deplicate key violation that works
				// with all databases
				if (error.name === 'MongoError' || error.name === 'QueryFailedError') {

					errorMessage = `The webhook path [${webhook.webhookPath}] and method [${webhook.method}] already exist.`;

				} else if (error.detail) {
					// it's a error runnig the webhook methods (checkExists, create)
					errorMessage = error.detail;
				} else {
					errorMessage = error.message;
				}

				throw new Error(errorMessage);
			}
		}
		// Save static data!
		await WorkflowHelpers.saveStaticData(workflow);
	}


	/**
	 * Remove all the webhooks of the workflow
	 *
	 * @param {string} workflowId
	 * @returns
	 * @memberof ActiveWorkflowRunner
	 */
	async removeWorkflowWebhooks(workflowId: string): Promise<void> {
		const workflowData = await Db.collections.Workflow!.findOne(workflowId);
		if (workflowData === undefined) {
			throw new Error(`Could not find workflow with id "${workflowId}"`);
		}

		const nodeTypes = NodeTypes();
		const workflow = new Workflow({ id: workflowId, name: workflowData.name, nodes: workflowData.nodes, connections: workflowData.connections, active: workflowData.active, nodeTypes, staticData: workflowData.staticData, settings: workflowData.settings });

		const mode = 'internal';

		const credentials = await WorkflowCredentials(workflowData.nodes);
		const additionalData = await WorkflowExecuteAdditionalData.getBase(credentials);

		const webhooks = WebhookHelpers.getWorkflowWebhooks(workflow, additionalData);

		for (const webhookData of webhooks) {
			await workflow.runWebhookMethod('delete', webhookData, NodeExecuteFunctions, mode, false);
		}

		await WorkflowHelpers.saveStaticData(workflow);

		// if it's a mongo objectId convert it to string
		if (typeof workflowData.id === 'object') {
			workflowData.id = workflowData.id.toString();
		}

		const webhook = {
			workflowId: workflowData.id,
		} as IWebhookDb;

		await Db.collections.Webhook?.delete(webhook);
	}

	/**
	 * Runs the given workflow
	 *
	 * @param {IWorkflowDb} workflowData
	 * @param {INode} node
	 * @param {INodeExecutionData[][]} data
	 * @param {IWorkflowExecuteAdditionalDataWorkflow} additionalData
	 * @param {WorkflowExecuteMode} mode
	 * @returns
	 * @memberof ActiveWorkflowRunner
	 */
	runWorkflow(workflowData: IWorkflowDb, node: INode, data: INodeExecutionData[][], additionalData: IWorkflowExecuteAdditionalDataWorkflow, mode: WorkflowExecuteMode) {
		const nodeExecutionStack: IExecuteData[] = [
			{
				node,
				data: {
					main: data,
				}
			}
		];

		const executionData: IRunExecutionData = {
			startData: {},
			resultData: {
				runData: {},
			},
			executionData: {
				contextData: {},
				nodeExecutionStack,
				waitingExecution: {},
			},
		};

		// Start the workflow
		const runData: IWorkflowExecutionDataProcess = {
			credentials: additionalData.credentials,
			executionMode: mode,
			executionData,
			workflowData,
		};

		const workflowRunner = new WorkflowRunner();
		return workflowRunner.run(runData, true);
	}


	/**
	 * Return poll function which gets the global functions from n8n-core
	 * and overwrites the __emit to be able to start it in subprocess
	 *
	 * @param {IWorkflowDb} workflowData
	 * @param {IWorkflowExecuteAdditionalDataWorkflow} additionalData
	 * @param {WorkflowExecuteMode} mode
	 * @returns {IGetExecutePollFunctions}
	 * @memberof ActiveWorkflowRunner
	 */
	getExecutePollFunctions(workflowData: IWorkflowDb, additionalData: IWorkflowExecuteAdditionalDataWorkflow, mode: WorkflowExecuteMode): IGetExecutePollFunctions {
		return ((workflow: Workflow, node: INode) => {
			const returnFunctions = NodeExecuteFunctions.getExecutePollFunctions(workflow, node, additionalData, mode);
			returnFunctions.__emit = (data: INodeExecutionData[][]): void => {
				this.runWorkflow(workflowData, node, data, additionalData, mode);
			};
			return returnFunctions;
		});
	}


	/**
	 * Return trigger function which gets the global functions from n8n-core
	 * and overwrites the emit to be able to start it in subprocess
	 *
	 * @param {IWorkflowDb} workflowData
	 * @param {IWorkflowExecuteAdditionalDataWorkflow} additionalData
	 * @param {WorkflowExecuteMode} mode
	 * @returns {IGetExecuteTriggerFunctions}
	 * @memberof ActiveWorkflowRunner
	 */
	getExecuteTriggerFunctions(workflowData: IWorkflowDb, additionalData: IWorkflowExecuteAdditionalDataWorkflow, mode: WorkflowExecuteMode): IGetExecuteTriggerFunctions{
		return ((workflow: Workflow, node: INode) => {
			const returnFunctions = NodeExecuteFunctions.getExecuteTriggerFunctions(workflow, node, additionalData, mode);
			returnFunctions.emit = (data: INodeExecutionData[][]): void => {
				WorkflowHelpers.saveStaticData(workflow);
				this.runWorkflow(workflowData, node, data, additionalData, mode).catch((err) => console.error(err));
			};
			return returnFunctions;
		});
	}

	/**
	 * Makes a workflow active
	 *
	 * @param {string} workflowId The id of the workflow to activate
	 * @param {IWorkflowDb} [workflowData] If workflowData is given it saves the DB query
	 * @returns {Promise<void>}
	 * @memberof ActiveWorkflowRunner
	 */
	async add(workflowId: string, workflowData?: IWorkflowDb): Promise<void> {
		if (this.activeWorkflows === null) {
			throw new Error(`The "activeWorkflows" instance did not get initialized yet.`);
		}

		let workflowInstance: Workflow;
		try {
			if (workflowData === undefined) {
				workflowData = await Db.collections.Workflow!.findOne(workflowId) as IWorkflowDb;
			}

			if (!workflowData) {
				throw new Error(`Could not find workflow with id "${workflowId}".`);
			}
			const nodeTypes = NodeTypes();
			workflowInstance = new Workflow({ id: workflowId, name: workflowData.name, nodes: workflowData.nodes, connections: workflowData.connections, active: workflowData.active, nodeTypes, staticData: workflowData.staticData, settings: workflowData.settings });

			const canBeActivated = workflowInstance.checkIfWorkflowCanBeActivated(['n8n-nodes-base.start']);
			if (canBeActivated === false) {
				throw new Error(`The workflow can not be activated because it does not contain any nodes which could start the workflow. Only workflows which have trigger or webhook nodes can be activated.`);
			}

			const mode = 'trigger';
			const credentials = await WorkflowCredentials(workflowData.nodes);
			const additionalData = await WorkflowExecuteAdditionalData.getBase(credentials);
			const getTriggerFunctions = this.getExecuteTriggerFunctions(workflowData, additionalData, mode);
			const getPollFunctions = this.getExecutePollFunctions(workflowData, additionalData, mode);

			// Add the workflows which have webhooks defined
			await this.addWorkflowWebhooks(workflowInstance, additionalData, mode);

			if (workflowInstance.getTriggerNodes().length !== 0
				|| workflowInstance.getPollNodes().length !== 0) {
					await this.activeWorkflows.add(workflowId, workflowInstance, additionalData, getTriggerFunctions, getPollFunctions);
			}

			if (this.activationErrors[workflowId] !== undefined) {
				// If there were activation errors delete them
				delete this.activationErrors[workflowId];
			}
		} catch (error) {
			// There was a problem activating the workflow

			// Save the error
			this.activationErrors[workflowId] = {
				time: new Date().getTime(),
				error: {
					message: error.message,
				},
			};

			throw error;
		}

		// If for example webhooks get created it sometimes has to save the
		// id of them in the static data. So make sure that data gets persisted.
		await WorkflowHelpers.saveStaticData(workflowInstance!);
	}

	/**
	 * Makes a workflow inactive
	 *
	 * @param {string} workflowId The id of the workflow to deactivate
	 * @returns {Promise<void>}
	 * @memberof ActiveWorkflowRunner
	 */
	async remove(workflowId: string): Promise<void> {

		if (this.activeWorkflows !== null) {
			// Remove all the webhooks of the workflow
			try {
				await this.removeWorkflowWebhooks(workflowId);
			} catch (error) {
				console.error(`Could not remove webhooks of workflow "${workflowId}" because of error: "${error.message}"`);
			}

			if (this.activationErrors[workflowId] !== undefined) {
				// If there were any activation errors delete them
				delete this.activationErrors[workflowId];
			}

			// if it's active in memory then it's a trigger
			// so remove from list of actives workflows
			if (this.activeWorkflows.isActive(workflowId)) {
				this.activeWorkflows.remove(workflowId);
			}

			return;
		}

		throw new Error(`The "activeWorkflows" instance did not get initialized yet.`);
	}
}



let workflowRunnerInstance: ActiveWorkflowRunner | undefined;

export function getInstance(): ActiveWorkflowRunner {
	if (workflowRunnerInstance === undefined) {
		workflowRunnerInstance = new ActiveWorkflowRunner();
	}

	return workflowRunnerInstance;
}
