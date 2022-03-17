/* eslint-disable import/no-cycle */
/* eslint-disable prefer-spread */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-param-reassign */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ActiveWorkflows, NodeExecuteFunctions } from 'n8n-core';

import {
	IDeferredPromise,
	IExecuteData,
	IExecuteResponsePromiseData,
	IGetExecutePollFunctions,
	IGetExecuteTriggerFunctions,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData as IWorkflowExecuteAdditionalDataWorkflow,
	NodeHelpers,
	WebhookHttpMethod,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
	LoggerProxy as Logger,
} from 'n8n-workflow';

import * as express from 'express';

// eslint-disable-next-line import/no-cycle
import {
	Db,
	IActivationError,
	IResponseCallbackData,
	IWebhookDb,
	IWorkflowDb,
	IWorkflowExecutionDataProcess,
	NodeTypes,
	ResponseHelper,
	WebhookHelpers,
	WorkflowExecuteAdditionalData,
	WorkflowHelpers,
	WorkflowRunner,
	ExternalHooks,
} from '.';
import config = require('../config');
import { User } from './databases/entities/User';
import { whereClause } from './WorkflowHelpers';
import { WorkflowEntity } from './databases/entities/WorkflowEntity';

const WEBHOOK_PROD_UNREGISTERED_HINT = `The workflow must be active for a production URL to run successfully. You can activate the workflow using the toggle in the top-right of the editor. Note that unlike test URL calls, production URL calls aren't shown on the canvas (only in the executions list)`;

export class ActiveWorkflowRunner {
	private activeWorkflows: ActiveWorkflows | null = null;

	private activationErrors: {
		[key: string]: IActivationError;
	} = {};

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	async init() {
		// Get the active workflows from database

		// NOTE
		// Here I guess we can have a flag on the workflow table like hasTrigger
		// so intead of pulling all the active wehhooks just pull the actives that have a trigger
		const workflowsData: IWorkflowDb[] = (await Db.collections.Workflow!.find({
			where: { active: true },
			relations: ['shared', 'shared.user', 'shared.user.globalRole'],
		})) as IWorkflowDb[];

		if (!config.get('endpoints.skipWebhoooksDeregistrationOnShutdown')) {
			// Do not clean up database when skip registration is done.
			// This flag is set when n8n is running in scaled mode.
			// Impact is minimal, but for a short while, n8n will stop accepting requests.
			// Also, users had issues when running multiple "main process"
			// instances if many of them start at the same time
			// This is not officially supported but there is no reason
			// it should not work.
			// Clear up active workflow table
			await Db.collections.Webhook?.clear();
		}

		this.activeWorkflows = new ActiveWorkflows();

		if (workflowsData.length !== 0) {
			console.info(' ================================');
			console.info('   Start Active Workflows:');
			console.info(' ================================');

			for (const workflowData of workflowsData) {
				console.log(`   - ${workflowData.name}`);
				Logger.debug(`Initializing active workflow "${workflowData.name}" (startup)`, {
					workflowName: workflowData.name,
					workflowId: workflowData.id,
				});
				try {
					await this.add(workflowData.id.toString(), 'init', workflowData);
					Logger.verbose(`Successfully started workflow "${workflowData.name}"`, {
						workflowName: workflowData.name,
						workflowId: workflowData.id,
					});
					console.log(`     => Started`);
				} catch (error) {
					console.log(`     => ERROR: Workflow could not be activated`);
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					console.log(`               ${error.message}`);
					Logger.error(`Unable to initialize workflow "${workflowData.name}" (startup)`, {
						workflowName: workflowData.name,
						workflowId: workflowData.id,
					});
				}
			}
			Logger.verbose('Finished initializing active workflows (startup)');
		}
		const externalHooks = ExternalHooks();
		await externalHooks.run('activeWorkflows.initialized', []);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	async initWebhooks() {
		this.activeWorkflows = new ActiveWorkflows();
	}

	/**
	 * Removes all the currently active workflows
	 *
	 * @returns {Promise<void>}
	 * @memberof ActiveWorkflowRunner
	 */
	async removeAll(): Promise<void> {
		const activeWorkflowId: string[] = [];
		Logger.verbose('Call to remove all active workflows received (removeAll)');

		if (this.activeWorkflows !== null) {
			// TODO: This should be renamed!
			activeWorkflowId.push.apply(activeWorkflowId, this.activeWorkflows.allActiveWorkflows());
		}

		const activeWorkflows = await this.getActiveWorkflows();
		activeWorkflowId.push.apply(
			activeWorkflowId,
			activeWorkflows.map((workflow) => workflow.id),
		);

		const removePromises = [];
		for (const workflowId of activeWorkflowId) {
			removePromises.push(this.remove(workflowId));
		}

		await Promise.all(removePromises);
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
	async executeWebhook(
		httpMethod: WebhookHttpMethod,
		path: string,
		req: express.Request,
		res: express.Response,
	): Promise<IResponseCallbackData> {
		Logger.debug(`Received webhoook "${httpMethod}" for path "${path}"`);
		if (this.activeWorkflows === null) {
			throw new ResponseHelper.ResponseError(
				'The "activeWorkflows" instance did not get initialized yet.',
				404,
				404,
			);
		}

		// Reset request parameters
		req.params = {};

		// Remove trailing slash
		if (path.endsWith('/')) {
			path = path.slice(0, -1);
		}

		let webhook = (await Db.collections.Webhook?.findOne({
			webhookPath: path,
			method: httpMethod,
		})) as IWebhookDb;
		let webhookId: string | undefined;

		// check if path is dynamic
		if (webhook === undefined) {
			// check if a dynamic webhook path exists
			const pathElements = path.split('/');
			webhookId = pathElements.shift();
			const dynamicWebhooks = await Db.collections.Webhook?.find({
				webhookId,
				method: httpMethod,
				pathLength: pathElements.length,
			});
			if (dynamicWebhooks === undefined || dynamicWebhooks.length === 0) {
				// The requested webhook is not registered
				throw new ResponseHelper.ResponseError(
					`The requested webhook "${httpMethod} ${path}" is not registered.`,
					404,
					404,
					WEBHOOK_PROD_UNREGISTERED_HINT,
				);
			}

			let maxMatches = 0;
			const pathElementsSet = new Set(pathElements);
			// check if static elements match in path
			// if more results have been returned choose the one with the most static-route matches
			dynamicWebhooks.forEach((dynamicWebhook) => {
				const staticElements = dynamicWebhook.webhookPath
					.split('/')
					.filter((ele) => !ele.startsWith(':'));
				const allStaticExist = staticElements.every((staticEle) => pathElementsSet.has(staticEle));

				if (allStaticExist && staticElements.length > maxMatches) {
					maxMatches = staticElements.length;
					webhook = dynamicWebhook;
				}
				// handle routes with no static elements
				else if (staticElements.length === 0 && !webhook) {
					webhook = dynamicWebhook;
				}
			});
			if (webhook === undefined) {
				throw new ResponseHelper.ResponseError(
					`The requested webhook "${httpMethod} ${path}" is not registered.`,
					404,
					404,
					WEBHOOK_PROD_UNREGISTERED_HINT,
				);
			}

			// @ts-ignore
			// eslint-disable-next-line no-param-reassign
			path = webhook.webhookPath;
			// extracting params from path
			// @ts-ignore
			webhook.webhookPath.split('/').forEach((ele, index) => {
				if (ele.startsWith(':')) {
					// write params to req.params
					req.params[ele.slice(1)] = pathElements[index];
				}
			});
		}

		const workflowData = await Db.collections.Workflow!.findOne(webhook.workflowId, {
			relations: ['shared', 'shared.user', 'shared.user.globalRole'],
		});
		if (workflowData === undefined) {
			throw new ResponseHelper.ResponseError(
				`Could not find workflow with id "${webhook.workflowId}"`,
				404,
				404,
			);
		}

		const nodeTypes = NodeTypes();
		const workflow = new Workflow({
			id: webhook.workflowId.toString(),
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});

		const additionalData = await WorkflowExecuteAdditionalData.getBase(
			workflowData.shared[0].user.id,
		);

		const webhookData = NodeHelpers.getNodeWebhooks(
			workflow,
			workflow.getNode(webhook.node) as INode,
			additionalData,
		).filter((webhook) => {
			return webhook.httpMethod === httpMethod && webhook.path === path;
		})[0];

		// Get the node which has the webhook defined to know where to start from and to
		// get additional data
		const workflowStartNode = workflow.getNode(webhookData.node);

		if (workflowStartNode === null) {
			throw new ResponseHelper.ResponseError('Could not find node to process webhook.', 404, 404);
		}

		return new Promise((resolve, reject) => {
			const executionMode = 'webhook';
			// @ts-ignore
			WebhookHelpers.executeWebhook(
				workflow,
				webhookData,
				workflowData,
				workflowStartNode,
				executionMode,
				undefined,
				undefined,
				undefined,
				req,
				res,
				// eslint-disable-next-line consistent-return
				(error: Error | null, data: object) => {
					if (error !== null) {
						return reject(error);
					}
					resolve(data);
				},
			);
		});
	}

	/**
	 * Gets all request methods associated with a single webhook
	 *
	 * @param {string} path webhook path
	 * @returns {Promise<string[]>}
	 * @memberof ActiveWorkflowRunner
	 */
	async getWebhookMethods(path: string): Promise<string[]> {
		const webhooks = (await Db.collections.Webhook?.find({ webhookPath: path })) as IWebhookDb[];

		// Gather all request methods in string array
		const webhookMethods: string[] = webhooks.map((webhook) => webhook.method);
		return webhookMethods;
	}

	/**
	 * Returns the ids of the currently active workflows
	 *
	 * @returns {string[]}
	 * @memberof ActiveWorkflowRunner
	 */
	async getActiveWorkflows(user?: User): Promise<IWorkflowDb[]> {
		let activeWorkflows: WorkflowEntity[] = [];

		if (!user || user.globalRole.name === 'owner') {
			activeWorkflows = await Db.collections.Workflow!.find({
				select: ['id'],
				where: { active: true },
			});
		} else {
			const shared = await Db.collections.SharedWorkflow!.find({
				relations: ['workflow'],
				where: whereClause({
					user,
					entityType: 'workflow',
				}),
			});

			activeWorkflows = shared.reduce<WorkflowEntity[]>((acc, cur) => {
				if (cur.workflow.active) acc.push(cur.workflow);
				return acc;
			}, []);
		}

		return activeWorkflows.filter((workflow) => this.activationErrors[workflow.id] === undefined);
	}

	/**
	 * Returns if the workflow is active
	 *
	 * @param {string} id The id of the workflow to check
	 * @returns {boolean}
	 * @memberof ActiveWorkflowRunner
	 */
	async isActive(id: string): Promise<boolean> {
		const workflow = await Db.collections.Workflow!.findOne(id);
		return !!workflow?.active;
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
	async addWorkflowWebhooks(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalDataWorkflow,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): Promise<void> {
		const webhooks = WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, undefined, true);
		let path = '' as string | undefined;

		for (const webhookData of webhooks) {
			const node = workflow.getNode(webhookData.node) as INode;
			node.name = webhookData.node;

			path = webhookData.path;

			const webhook = {
				workflowId: webhookData.workflowId,
				webhookPath: path,
				node: node.name,
				method: webhookData.httpMethod,
			} as IWebhookDb;

			if (webhook.webhookPath.startsWith('/')) {
				webhook.webhookPath = webhook.webhookPath.slice(1);
			}
			if (webhook.webhookPath.endsWith('/')) {
				webhook.webhookPath = webhook.webhookPath.slice(0, -1);
			}

			if ((path.startsWith(':') || path.includes('/:')) && node.webhookId) {
				webhook.webhookId = node.webhookId;
				webhook.pathLength = webhook.webhookPath.split('/').length;
			}

			try {
				// eslint-disable-next-line no-await-in-loop
				await Db.collections.Webhook?.insert(webhook);
				const webhookExists = await workflow.runWebhookMethod(
					'checkExists',
					webhookData,
					NodeExecuteFunctions,
					mode,
					activation,
					false,
				);
				if (webhookExists !== true) {
					// If webhook does not exist yet create it
					await workflow.runWebhookMethod(
						'create',
						webhookData,
						NodeExecuteFunctions,
						mode,
						activation,
						false,
					);
				}
			} catch (error) {
				if (
					activation === 'init' &&
					config.get('endpoints.skipWebhoooksDeregistrationOnShutdown') &&
					error.name === 'QueryFailedError'
				) {
					// When skipWebhoooksDeregistrationOnShutdown is enabled,
					// n8n does not remove the registered webhooks on exit.
					// This means that further initializations will always fail
					// when inserting to database. This is why we ignore this error
					// as it's expected to happen.
					// eslint-disable-next-line no-continue
					continue;
				}

				try {
					await this.removeWorkflowWebhooks(workflow.id as string);
				} catch (error) {
					console.error(
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						`Could not remove webhooks of workflow "${workflow.id}" because of error: "${error.message}"`,
					);
				}

				// if it's a workflow from the the insert
				// TODO check if there is standard error code for duplicate key violation that works
				// with all databases
				if (error.name === 'QueryFailedError') {
					error.message = `The URL path that the "${webhook.node}" node uses is already taken. Please change it to something else.`;
				} else if (error.detail) {
					// it's a error runnig the webhook methods (checkExists, create)
					error.message = error.detail;
				}

				throw error;
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
		const workflowData = await Db.collections.Workflow!.findOne(workflowId, {
			relations: ['shared', 'shared.user', 'shared.user.globalRole'],
		});
		if (workflowData === undefined) {
			throw new Error(`Could not find workflow with id "${workflowId}"`);
		}

		const nodeTypes = NodeTypes();
		const workflow = new Workflow({
			id: workflowId,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});

		const mode = 'internal';

		const additionalData = await WorkflowExecuteAdditionalData.getBase(
			workflowData.shared[0].user.id,
		);

		const webhooks = WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, undefined, true);

		for (const webhookData of webhooks) {
			await workflow.runWebhookMethod(
				'delete',
				webhookData,
				NodeExecuteFunctions,
				mode,
				'update',
				false,
			);
		}

		await WorkflowHelpers.saveStaticData(workflow);

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
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	async runWorkflow(
		workflowData: IWorkflowDb,
		node: INode,
		data: INodeExecutionData[][],
		additionalData: IWorkflowExecuteAdditionalDataWorkflow,
		mode: WorkflowExecuteMode,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	) {
		const nodeExecutionStack: IExecuteData[] = [
			{
				node,
				data: {
					main: data,
				},
			},
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
			userId: additionalData.userId,
			executionMode: mode,
			executionData,
			workflowData,
		};

		const workflowRunner = new WorkflowRunner();
		return workflowRunner.run(runData, true, undefined, undefined, responsePromise);
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
	getExecutePollFunctions(
		workflowData: IWorkflowDb,
		additionalData: IWorkflowExecuteAdditionalDataWorkflow,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): IGetExecutePollFunctions {
		return (workflow: Workflow, node: INode) => {
			const returnFunctions = NodeExecuteFunctions.getExecutePollFunctions(
				workflow,
				node,
				additionalData,
				mode,
				activation,
			);
			// eslint-disable-next-line no-underscore-dangle
			returnFunctions.__emit = (data: INodeExecutionData[][]): void => {
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				Logger.debug(`Received event to trigger execution for workflow "${workflow.name}"`);
				this.runWorkflow(workflowData, node, data, additionalData, mode);
			};
			return returnFunctions;
		};
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
	getExecuteTriggerFunctions(
		workflowData: IWorkflowDb,
		additionalData: IWorkflowExecuteAdditionalDataWorkflow,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): IGetExecuteTriggerFunctions {
		return (workflow: Workflow, node: INode) => {
			const returnFunctions = NodeExecuteFunctions.getExecuteTriggerFunctions(
				workflow,
				node,
				additionalData,
				mode,
				activation,
			);
			returnFunctions.emit = (
				data: INodeExecutionData[][],
				responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
			): void => {
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				Logger.debug(`Received trigger for workflow "${workflow.name}"`);
				WorkflowHelpers.saveStaticData(workflow);
				// eslint-disable-next-line id-denylist
				this.runWorkflow(workflowData, node, data, additionalData, mode, responsePromise).catch(
					(error) => console.error(error),
				);
			};
			return returnFunctions;
		};
	}

	/**
	 * Makes a workflow active
	 *
	 * @param {string} workflowId The id of the workflow to activate
	 * @param {IWorkflowDb} [workflowData] If workflowData is given it saves the DB query
	 * @returns {Promise<void>}
	 * @memberof ActiveWorkflowRunner
	 */
	async add(
		workflowId: string,
		activation: WorkflowActivateMode,
		workflowData?: IWorkflowDb,
	): Promise<void> {
		if (this.activeWorkflows === null) {
			throw new Error(`The "activeWorkflows" instance did not get initialized yet.`);
		}

		let workflowInstance: Workflow;
		try {
			if (workflowData === undefined) {
				workflowData = (await Db.collections.Workflow!.findOne(workflowId, {
					relations: ['shared', 'shared.user', 'shared.user.globalRole'],
				})) as IWorkflowDb;
			}

			if (!workflowData) {
				throw new Error(`Could not find workflow with id "${workflowId}".`);
			}
			const nodeTypes = NodeTypes();
			workflowInstance = new Workflow({
				id: workflowId,
				name: workflowData.name,
				nodes: workflowData.nodes,
				connections: workflowData.connections,
				active: workflowData.active,
				nodeTypes,
				staticData: workflowData.staticData,
				settings: workflowData.settings,
			});

			const canBeActivated = workflowInstance.checkIfWorkflowCanBeActivated([
				'n8n-nodes-base.start',
			]);
			if (!canBeActivated) {
				Logger.error(`Unable to activate workflow "${workflowData.name}"`);
				throw new Error(
					`The workflow can not be activated because it does not contain any nodes which could start the workflow. Only workflows which have trigger or webhook nodes can be activated.`,
				);
			}

			const mode = 'trigger';
			const additionalData = await WorkflowExecuteAdditionalData.getBase(
				(workflowData as WorkflowEntity).shared[0].user.id,
			);
			const getTriggerFunctions = this.getExecuteTriggerFunctions(
				workflowData,
				additionalData,
				mode,
				activation,
			);
			const getPollFunctions = this.getExecutePollFunctions(
				workflowData,
				additionalData,
				mode,
				activation,
			);

			// Add the workflows which have webhooks defined
			await this.addWorkflowWebhooks(workflowInstance, additionalData, mode, activation);

			if (
				workflowInstance.getTriggerNodes().length !== 0 ||
				workflowInstance.getPollNodes().length !== 0
			) {
				await this.activeWorkflows.add(
					workflowId,
					workflowInstance,
					additionalData,
					mode,
					activation,
					getTriggerFunctions,
					getPollFunctions,
				);
				Logger.verbose(`Successfully activated workflow "${workflowData.name}"`, {
					workflowId,
					workflowName: workflowData.name,
				});
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
				console.error(
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					`Could not remove webhooks of workflow "${workflowId}" because of error: "${error.message}"`,
				);
			}

			if (this.activationErrors[workflowId] !== undefined) {
				// If there were any activation errors delete them
				delete this.activationErrors[workflowId];
			}

			// if it's active in memory then it's a trigger
			// so remove from list of actives workflows
			if (this.activeWorkflows.isActive(workflowId)) {
				await this.activeWorkflows.remove(workflowId);
				Logger.verbose(`Successfully deactivated workflow "${workflowId}"`, { workflowId });
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
