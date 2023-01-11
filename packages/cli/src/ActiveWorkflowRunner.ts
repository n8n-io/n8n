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
	ExecutionError,
	IDeferredPromise,
	IExecuteData,
	IExecuteResponsePromiseData,
	IGetExecutePollFunctions,
	IGetExecuteTriggerFunctions,
	INode,
	INodeExecutionData,
	IRun,
	IRunExecutionData,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData as IWorkflowExecuteAdditionalDataWorkflow,
	NodeHelpers,
	WebhookHttpMethod,
	Workflow,
	WorkflowActivateMode,
	WorkflowActivationError,
	WorkflowExecuteMode,
	LoggerProxy as Logger,
	ErrorReporterProxy as ErrorReporter,
	INodeType,
} from 'n8n-workflow';

import express from 'express';

import * as Db from '@/Db';
import {
	IActivationError,
	IQueuedWorkflowActivations,
	IResponseCallbackData,
	IWorkflowDb,
	IWorkflowExecutionDataProcess,
} from '@/Interfaces';
import * as ResponseHelper from '@/ResponseHelper';
import * as WebhookHelpers from '@/WebhookHelpers';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';

import config from '@/config';
import { User } from '@db/entities/User';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import type { WebhookEntity } from '@db/entities/WebhookEntity';
import * as ActiveExecutions from '@/ActiveExecutions';
import { createErrorExecution } from '@/GenericHelpers';
import { WORKFLOW_REACTIVATE_INITIAL_TIMEOUT, WORKFLOW_REACTIVATE_MAX_TIMEOUT } from '@/constants';
import { NodeTypes } from '@/NodeTypes';
import { WorkflowRunner } from '@/WorkflowRunner';
import { ExternalHooks } from '@/ExternalHooks';
import { whereClause } from './UserManagement/UserManagementHelper';

const WEBHOOK_PROD_UNREGISTERED_HINT =
	"The workflow must be active for a production URL to run successfully. You can activate the workflow using the toggle in the top-right of the editor. Note that unlike test URL calls, production URL calls aren't shown on the canvas (only in the executions list)";

export class ActiveWorkflowRunner {
	private activeWorkflows: ActiveWorkflows | null = null;

	private activationErrors: {
		[key: string]: IActivationError;
	} = {};

	private queuedWorkflowActivations: {
		[key: string]: IQueuedWorkflowActivations;
	} = {};

	constructor() {
		this.activeWorkflows = new ActiveWorkflows();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	async init() {
		// Get the active workflows from database

		// NOTE
		// Here I guess we can have a flag on the workflow table like hasTrigger
		// so instead of pulling all the active webhooks just pull the actives that have a trigger
		const workflowsData: IWorkflowDb[] = (await Db.collections.Workflow.find({
			where: { active: true },
			relations: ['shared', 'shared.user', 'shared.user.globalRole'],
		})) as IWorkflowDb[];

		if (!config.getEnv('endpoints.skipWebhooksDeregistrationOnShutdown')) {
			// Do not clean up database when skip registration is done.
			// This flag is set when n8n is running in scaled mode.
			// Impact is minimal, but for a short while, n8n will stop accepting requests.
			// Also, users had issues when running multiple "main process"
			// instances if many of them start at the same time
			// This is not officially supported but there is no reason
			// it should not work.
			// Clear up active workflow table
			await Db.collections.Webhook.clear();
		}

		if (workflowsData.length !== 0) {
			console.info(' ================================');
			console.info('   Start Active Workflows:');
			console.info(' ================================');

			for (const workflowData of workflowsData) {
				console.log(`   - ${workflowData.name} (ID: ${workflowData.id})`);
				Logger.debug(`Initializing active workflow "${workflowData.name}" (startup)`, {
					workflowName: workflowData.name,
					workflowId: workflowData.id,
				});
				try {
					await this.add(workflowData.id, 'init', workflowData);
					Logger.verbose(`Successfully started workflow "${workflowData.name}"`, {
						workflowName: workflowData.name,
						workflowId: workflowData.id,
					});
					console.log('     => Started');
				} catch (error) {
					ErrorReporter.error(error);
					console.log(
						'     => ERROR: Workflow could not be activated on first try, keep on trying',
					);
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					console.log(`               ${error.message}`);
					Logger.error(
						`Issue on intital workflow activation try "${workflowData.name}" (startup)`,
						{
							workflowName: workflowData.name,
							workflowId: workflowData.id,
						},
					);
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					this.executeErrorWorkflow(error, workflowData, 'internal');

					// Keep on trying to activate the workflow
					this.addQueuedWorkflowActivation('init', workflowData);
				}
			}
			Logger.verbose('Finished initializing active workflows (startup)');
		}
		const externalHooks = ExternalHooks();
		await externalHooks.run('activeWorkflows.initialized', []);
	}

	/**
	 * Removes all the currently active workflows
	 *
	 */
	async removeAll(): Promise<void> {
		let activeWorkflowIds: string[] = [];
		Logger.verbose('Call to remove all active workflows received (removeAll)');

		if (this.activeWorkflows !== null) {
			activeWorkflowIds.push.apply(activeWorkflowIds, this.activeWorkflows.allActiveWorkflows());
		}

		const activeWorkflows = await this.getActiveWorkflows();
		activeWorkflowIds = [...activeWorkflowIds, ...activeWorkflows.map((workflow) => workflow.id)];

		// Make sure IDs are unique
		activeWorkflowIds = Array.from(new Set(activeWorkflowIds));

		const removePromises = [];
		for (const workflowId of activeWorkflowIds) {
			removePromises.push(this.remove(workflowId));
		}

		await Promise.all(removePromises);
	}

	/**
	 * Checks if a webhook for the given method and path exists and executes the workflow.
	 *
	 */
	async executeWebhook(
		httpMethod: WebhookHttpMethod,
		path: string,
		req: express.Request,
		res: express.Response,
	): Promise<IResponseCallbackData> {
		Logger.debug(`Received webhook "${httpMethod}" for path "${path}"`);
		if (this.activeWorkflows === null) {
			throw new ResponseHelper.NotFoundError(
				'The "activeWorkflows" instance did not get initialized yet.',
			);
		}

		// Reset request parameters
		req.params = {};

		// Remove trailing slash
		if (path.endsWith('/')) {
			path = path.slice(0, -1);
		}

		let webhook = await Db.collections.Webhook.findOne({
			webhookPath: path,
			method: httpMethod,
		});
		let webhookId: string | undefined;

		// check if path is dynamic
		if (webhook === undefined) {
			// check if a dynamic webhook path exists
			const pathElements = path.split('/');
			webhookId = pathElements.shift();
			const dynamicWebhooks = await Db.collections.Webhook.find({
				webhookId,
				method: httpMethod,
				pathLength: pathElements.length,
			});
			if (dynamicWebhooks === undefined || dynamicWebhooks.length === 0) {
				// The requested webhook is not registered
				throw new ResponseHelper.NotFoundError(
					`The requested webhook "${httpMethod} ${path}" is not registered.`,
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
				throw new ResponseHelper.NotFoundError(
					`The requested webhook "${httpMethod} ${path}" is not registered.`,
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

		const workflowData = await Db.collections.Workflow.findOne(webhook.workflowId, {
			relations: ['shared', 'shared.user', 'shared.user.globalRole'],
		});
		if (workflowData === undefined) {
			throw new ResponseHelper.NotFoundError(
				`Could not find workflow with id "${webhook.workflowId}"`,
			);
		}

		const nodeTypes = NodeTypes();
		const workflow = new Workflow({
			id: webhook.workflowId,
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
			throw new ResponseHelper.NotFoundError('Could not find node to process webhook.');
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
	 */
	async getWebhookMethods(path: string): Promise<string[]> {
		const webhooks = await Db.collections.Webhook.find({ webhookPath: path });

		// Gather all request methods in string array
		const webhookMethods: string[] = webhooks.map((webhook) => webhook.method);
		return webhookMethods;
	}

	/**
	 * Returns the ids of the currently active workflows
	 *
	 */
	async getActiveWorkflows(user?: User): Promise<IWorkflowDb[]> {
		let activeWorkflows: WorkflowEntity[] = [];

		if (!user || user.globalRole.name === 'owner') {
			activeWorkflows = await Db.collections.Workflow.find({
				select: ['id'],
				where: { active: true },
			});
		} else {
			const shared = await Db.collections.SharedWorkflow.find({
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
	 */
	async isActive(id: string): Promise<boolean> {
		const workflow = await Db.collections.Workflow.findOne(id);
		return !!workflow?.active;
	}

	/**
	 * Return error if there was a problem activating the workflow
	 *
	 * @param {string} id The id of the workflow to return the error of
	 */
	getActivationError(id: string): IActivationError | undefined {
		if (this.activationErrors[id] === undefined) {
			return undefined;
		}

		return this.activationErrors[id];
	}

	/**
	 * Adds all the webhooks of the workflow
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

			const webhook: WebhookEntity = {
				workflowId: webhookData.workflowId,
				webhookPath: path,
				node: node.name,
				method: webhookData.httpMethod,
			};

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
				await Db.collections.Webhook.insert(webhook);
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
					config.getEnv('endpoints.skipWebhooksDeregistrationOnShutdown') &&
					error.name === 'QueryFailedError'
				) {
					// When skipWebhooksDeregistrationOnShutdown is enabled,
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
					error = new Error(
						`The URL path that the "${webhook.node}" node uses is already taken. Please change it to something else.`,
						{ cause: error },
					);
				} else if (error.detail) {
					// it's a error running the webhook methods (checkExists, create)
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
	 */
	async removeWorkflowWebhooks(workflowId: string): Promise<void> {
		const workflowData = await Db.collections.Workflow.findOne(workflowId, {
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

		await Db.collections.Webhook.delete({
			workflowId: workflowData.id,
		});
	}

	/**
	 * Runs the given workflow
	 *
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
				source: null,
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
				waitingExecutionSource: {},
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
	 * and overwrites the emit to be able to start it in subprocess
	 *
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
			returnFunctions.__emit = (
				data: INodeExecutionData[][],
				responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
				donePromise?: IDeferredPromise<IRun | undefined>,
			): void => {
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				Logger.debug(`Received event to trigger execution for workflow "${workflow.name}"`);
				WorkflowHelpers.saveStaticData(workflow);
				const executePromise = this.runWorkflow(
					workflowData,
					node,
					data,
					additionalData,
					mode,
					responsePromise,
				);

				if (donePromise) {
					executePromise.then((executionId) => {
						ActiveExecutions.getInstance()
							.getPostExecutePromise(executionId)
							.then(donePromise.resolve)
							.catch(donePromise.reject);
					});
				} else {
					executePromise.catch(console.error);
				}
			};

			returnFunctions.__emitError = async (error: ExecutionError): Promise<void> => {
				await createErrorExecution(error, node, workflowData, workflow, mode);
				this.executeErrorWorkflow(error, workflowData, mode);
			};
			return returnFunctions;
		};
	}

	/**
	 * Return trigger function which gets the global functions from n8n-core
	 * and overwrites the emit to be able to start it in subprocess
	 *
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
				donePromise?: IDeferredPromise<IRun | undefined>,
			): void => {
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				Logger.debug(`Received trigger for workflow "${workflow.name}"`);
				WorkflowHelpers.saveStaticData(workflow);
				// eslint-disable-next-line id-denylist
				const executePromise = this.runWorkflow(
					workflowData,
					node,
					data,
					additionalData,
					mode,
					responsePromise,
				);

				if (donePromise) {
					executePromise.then((executionId) => {
						ActiveExecutions.getInstance()
							.getPostExecutePromise(executionId)
							.then(donePromise.resolve)
							.catch(donePromise.reject);
					});
				} else {
					executePromise.catch(console.error);
				}
			};
			returnFunctions.emitError = async (error: Error): Promise<void> => {
				Logger.info(
					`The trigger node "${node.name}" of workflow "${workflowData.name}" failed with the error: "${error.message}". Will try to reactivate.`,
					{
						nodeName: node.name,
						workflowId: workflowData.id,
						workflowName: workflowData.name,
					},
				);

				// Remove the workflow as "active"

				await this.activeWorkflows?.remove(workflowData.id);
				this.activationErrors[workflowData.id] = {
					time: new Date().getTime(),
					error: {
						message: error.message,
					},
				};

				// Run Error Workflow if defined
				const activationError = new WorkflowActivationError(
					`There was a problem with the trigger node "${node.name}", for that reason did the workflow had to be deactivated`,
					{ cause: error, node },
				);
				this.executeErrorWorkflow(activationError, workflowData, mode);

				this.addQueuedWorkflowActivation(activation, workflowData);
			};
			return returnFunctions;
		};
	}

	executeErrorWorkflow(
		error: ExecutionError,
		workflowData: IWorkflowBase,
		mode: WorkflowExecuteMode,
	): void {
		const fullRunData: IRun = {
			data: {
				resultData: {
					error,
					runData: {},
				},
			},
			finished: false,
			mode,
			startedAt: new Date(),
			stoppedAt: new Date(),
		};

		WorkflowExecuteAdditionalData.executeErrorWorkflow(workflowData, fullRunData, mode);
	}

	/**
	 * Makes a workflow active
	 *
	 * @param {string} workflowId The id of the workflow to activate
	 * @param {IWorkflowDb} [workflowData] If workflowData is given it saves the DB query
	 */
	async add(
		workflowId: string,
		activation: WorkflowActivateMode,
		workflowData?: IWorkflowDb,
	): Promise<void> {
		if (this.activeWorkflows === null) {
			throw new Error('The "activeWorkflows" instance did not get initialized yet.');
		}

		let workflowInstance: Workflow;
		try {
			if (workflowData === undefined) {
				workflowData = (await Db.collections.Workflow.findOne(workflowId, {
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
				'n8n-nodes-base.manualTrigger',
			]);
			if (!canBeActivated) {
				Logger.error(`Unable to activate workflow "${workflowData.name}"`);
				throw new Error(
					'The workflow can not be activated because it does not contain any nodes which could start the workflow. Only workflows which have trigger or webhook nodes can be activated.',
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

			// Workflow got now successfully activated so make sure nothing is left in the queue
			this.removeQueuedWorkflowActivation(workflowId);

			if (this.activationErrors[workflowId] !== undefined) {
				// If there were activation errors delete them
				delete this.activationErrors[workflowId];
			}

			if (workflowInstance.id) {
				// Sum all triggers in the workflow, EXCLUDING the manual trigger
				const triggerFilter = (nodeType: INodeType) =>
					!!nodeType.trigger && !nodeType.description.name.includes('manualTrigger');
				const triggerCount =
					workflowInstance.queryNodes(triggerFilter).length +
					workflowInstance.getPollNodes().length +
					WebhookHelpers.getWorkflowWebhooks(workflowInstance, additionalData, undefined, true)
						.length;
				await Db.collections.Workflow.update(workflowInstance.id, { triggerCount });
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
	 * Add a workflow to the activation queue.
	 * Meaning it will keep on trying to activate it in regular
	 * amounts indefinetly.
	 */
	addQueuedWorkflowActivation(
		activationMode: WorkflowActivateMode,
		workflowData: IWorkflowDb,
	): void {
		const workflowId = workflowData.id;
		const workflowName = workflowData.name;

		const retryFunction = async () => {
			Logger.info(`Try to activate workflow "${workflowName}" (${workflowId})`, {
				workflowId,
				workflowName,
			});
			try {
				await this.add(workflowId, activationMode, workflowData);
			} catch (error) {
				ErrorReporter.error(error);
				let lastTimeout = this.queuedWorkflowActivations[workflowId].lastTimeout;
				if (lastTimeout < WORKFLOW_REACTIVATE_MAX_TIMEOUT) {
					lastTimeout = Math.min(lastTimeout * 2, WORKFLOW_REACTIVATE_MAX_TIMEOUT);
				}

				Logger.info(
					` -> Activation of workflow "${workflowName}" (${workflowId}) did fail with error: "${
						error.message as string
					}" | retry in ${Math.floor(lastTimeout / 1000)} seconds`,
					{
						workflowId,
						workflowName,
					},
				);

				this.queuedWorkflowActivations[workflowId].lastTimeout = lastTimeout;
				this.queuedWorkflowActivations[workflowId].timeout = setTimeout(retryFunction, lastTimeout);
				return;
			}
			Logger.info(` -> Activation of workflow "${workflowName}" (${workflowId}) was successful!`, {
				workflowId,
				workflowName,
			});
		};

		// Just to be sure that there is not chance that for any reason
		// multiple run in parallel
		this.removeQueuedWorkflowActivation(workflowId);

		this.queuedWorkflowActivations[workflowId] = {
			activationMode,
			lastTimeout: WORKFLOW_REACTIVATE_INITIAL_TIMEOUT,
			timeout: setTimeout(retryFunction, WORKFLOW_REACTIVATE_INITIAL_TIMEOUT),
			workflowData,
		};
	}

	/**
	 * Remove a workflow from the activation queue
	 */
	removeQueuedWorkflowActivation(workflowId: string): void {
		if (this.queuedWorkflowActivations[workflowId]) {
			clearTimeout(this.queuedWorkflowActivations[workflowId].timeout);
			delete this.queuedWorkflowActivations[workflowId];
		}
	}

	/**
	 * Remove all workflows from the activation queue
	 */
	removeAllQueuedWorkflowActivations(): void {
		for (const workflowId in this.queuedWorkflowActivations) {
			this.removeQueuedWorkflowActivation(workflowId);
		}
	}

	/**
	 * Makes a workflow inactive
	 *
	 * @param {string} workflowId The id of the workflow to deactivate
	 */
	async remove(workflowId: string): Promise<void> {
		if (this.activeWorkflows !== null) {
			// Remove all the webhooks of the workflow
			try {
				await this.removeWorkflowWebhooks(workflowId);
			} catch (error) {
				ErrorReporter.error(error);
				console.error(
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					`Could not remove webhooks of workflow "${workflowId}" because of error: "${error.message}"`,
				);
			}

			if (this.activationErrors[workflowId] !== undefined) {
				// If there were any activation errors delete them
				delete this.activationErrors[workflowId];
			}

			if (this.queuedWorkflowActivations[workflowId] !== undefined) {
				this.removeQueuedWorkflowActivation(workflowId);
			}

			// if it's active in memory then it's a trigger
			// so remove from list of actives workflows
			if (this.activeWorkflows.isActive(workflowId)) {
				await this.activeWorkflows.remove(workflowId);
				Logger.verbose(`Successfully deactivated workflow "${workflowId}"`, { workflowId });
			}

			return;
		}

		throw new Error('The "activeWorkflows" instance did not get initialized yet.');
	}
}

let workflowRunnerInstance: ActiveWorkflowRunner | undefined;

export function getInstance(): ActiveWorkflowRunner {
	if (workflowRunnerInstance === undefined) {
		workflowRunnerInstance = new ActiveWorkflowRunner();
	}

	return workflowRunnerInstance;
}
