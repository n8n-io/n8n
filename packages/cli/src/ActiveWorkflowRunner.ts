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
} from './';

import {
	ActiveWorkflows,
	ActiveWebhooks,
	NodeExecuteFunctions,
} from 'n8n-core';

import {
	IExecuteData,
	IGetExecutePollFunctions,
	IGetExecuteTriggerFunctions,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	IWebhookData,
	IWorkflowExecuteAdditionalData as IWorkflowExecuteAdditionalDataWorkflow,
	WebhookHttpMethod,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import * as express from 'express';


export class ActiveWorkflowRunner {
	private activeWorkflows: ActiveWorkflows | null = null;
	private activeWebhooks: ActiveWebhooks | null = null;
	private activationErrors: {
		[key: string]: IActivationError;
	} = {};


	async init() {
		// Get the active workflows from database
		const workflowsData: IWorkflowDb[] = await Db.collections.Workflow!.find({ active: true }) as IWorkflowDb[];

		this.activeWebhooks = new ActiveWebhooks();

		// Add them as active workflows
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
		if (this.activeWorkflows === null) {
			return;
		}

		const activeWorkflows = this.activeWorkflows.allActiveWorkflows();

		const removePromises = [];
		for (const workflowId of activeWorkflows) {
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

		const webhookData: IWebhookData | undefined = this.activeWebhooks!.get(httpMethod, path);

		if (webhookData === undefined) {
			// The requested webhook is not registered
			throw new ResponseHelper.ResponseError(`The requested webhook "${httpMethod} ${path}" is not registered.`, 404, 404);
		}

		const workflowData = await Db.collections.Workflow!.findOne(webhookData.workflowId);
		if (workflowData === undefined) {
			throw new ResponseHelper.ResponseError(`Could not find workflow with id "${webhookData.workflowId}"`, 404, 404);
		}

		const nodeTypes = NodeTypes();
		const workflow = new Workflow({ id: webhookData.workflowId, name: workflowData.name, nodes: workflowData.nodes, connections: workflowData.connections, active: workflowData.active, nodeTypes, staticData: workflowData.staticData, settings: workflowData.settings});

		// Get the node which has the webhook defined to know where to start from and to
		// get additional data
		const workflowStartNode = workflow.getNode(webhookData.node);
		if (workflowStartNode === null) {
			throw new ResponseHelper.ResponseError('Could not find node to process webhook.', 404, 404);
		}

		return new Promise((resolve, reject) => {
			const executionMode = 'webhook';
			WebhookHelpers.executeWebhook(workflow, webhookData, workflowData, workflowStartNode, executionMode, undefined, req, res, (error: Error | null, data: object) => {
				if (error !== null) {
					return reject(error);
				}
				resolve(data);
			});
		});
	}


	/**
	 * Returns the ids of the currently active workflows
	 *
	 * @returns {string[]}
	 * @memberof ActiveWorkflowRunner
	 */
	getActiveWorkflows(): string[] {
		if (this.activeWorkflows === null) {
			return [];
		}

		return this.activeWorkflows.allActiveWorkflows();
	}


	/**
	 * Returns if the workflow is active
	 *
	 * @param {string} id The id of the workflow to check
	 * @returns {boolean}
	 * @memberof ActiveWorkflowRunner
	 */
	isActive(id: string): boolean {
		if (this.activeWorkflows !== null) {
			return this.activeWorkflows.isActive(id);
		}

		return false;
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

		for (const webhookData of webhooks) {
			await this.activeWebhooks!.add(workflow, webhookData, mode);
			// Save static data!
			await WorkflowHelpers.saveStaticData(workflow);
		}
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

		await this.activeWebhooks!.removeWorkflow(workflow);

		// Save the static workflow data if needed
		await WorkflowHelpers.saveStaticData(workflow);
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
				this.runWorkflow(workflowData, node, data, additionalData, mode);
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
			await this.activeWorkflows.add(workflowId, workflowInstance, additionalData, getTriggerFunctions, getPollFunctions);

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
			await this.removeWorkflowWebhooks(workflowId);

			if (this.activationErrors[workflowId] !== undefined) {
				// If there were any activation errors delete them
				delete this.activationErrors[workflowId];
			}

			// Remove the workflow from the "list" of active workflows
			return this.activeWorkflows.remove(workflowId);
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
