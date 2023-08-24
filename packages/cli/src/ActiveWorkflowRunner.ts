/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Service } from 'typedi';
import { ActiveWorkflows, NodeExecuteFunctions } from 'n8n-core';

import type {
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
	WorkflowActivateMode,
	WorkflowExecuteMode,
	INodeType,
	IWebhookData,
} from 'n8n-workflow';
import {
	NodeHelpers,
	Workflow,
	WorkflowActivationError,
	LoggerProxy as Logger,
	ErrorReporterProxy as ErrorReporter,
} from 'n8n-workflow';

import type express from 'express';

import * as Db from '@/Db';
import type {
	IActivationError,
	IQueuedWorkflowActivations,
	IResponseCallbackData,
	IWebhookManager,
	IWorkflowDb,
	IWorkflowExecutionDataProcess,
	WebhookRequest,
} from '@/Interfaces';
import * as ResponseHelper from '@/ResponseHelper';
import * as WebhookHelpers from '@/WebhookHelpers';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';

import config from '@/config';
import type { User } from '@db/entities/User';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { ActiveExecutions } from '@/ActiveExecutions';
import { createErrorExecution } from '@/GenericHelpers';
import {
	STARTING_NODES,
	WORKFLOW_REACTIVATE_INITIAL_TIMEOUT,
	WORKFLOW_REACTIVATE_MAX_TIMEOUT,
} from '@/constants';
import { NodeTypes } from '@/NodeTypes';
import { WorkflowRunner } from '@/WorkflowRunner';
import { ExternalHooks } from '@/ExternalHooks';
import { whereClause } from './UserManagement/UserManagementHelper';
import { WorkflowsService } from './workflows/workflows.services';
import { webhookNotFoundErrorMessage } from './utils';
import { In } from '@n8n/typeorm';
import { WebhookService } from './services/webhook.service';

const WEBHOOK_PROD_UNREGISTERED_HINT =
	"The workflow must be active for a production URL to run successfully. You can activate the workflow using the toggle in the top-right of the editor. Note that unlike test URL calls, production URL calls aren't shown on the canvas (only in the executions list)";

@Service()
export class ActiveWorkflowRunner implements IWebhookManager {
	private activeWorkflows = new ActiveWorkflows();

	private activationErrors: {
		[key: string]: IActivationError;
	} = {};

	private queuedWorkflowActivations: {
		[key: string]: IQueuedWorkflowActivations;
	} = {};

	constructor(
		private activeExecutions: ActiveExecutions,
		private externalHooks: ExternalHooks,
		private nodeTypes: NodeTypes,
		private webhookService: WebhookService,
	) {}

	async init() {
		// Get the active workflows from database

		// NOTE
		// Here I guess we can have a flag on the workflow table like hasTrigger
		// so instead of pulling all the active webhooks just pull the actives that have a trigger
		const workflowsData: IWorkflowDb[] = (await Db.collections.Workflow.find({
			where: { active: true },
			relations: ['shared', 'shared.user', 'shared.user.globalRole', 'shared.role'],
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
			await this.webhookService.deleteInstanceWebhooks();
		}

		if (workflowsData.length !== 0) {
			Logger.info(' ================================');
			Logger.info('   Start Active Workflows:');
			Logger.info(' ================================');

			for (const workflowData of workflowsData) {
				Logger.info(`   - ${workflowData.name} (ID: ${workflowData.id})`);
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
					Logger.info('     => Started');
				} catch (error) {
					ErrorReporter.error(error);
					Logger.info(
						'     => ERROR: Workflow could not be activated on first try, keep on trying if not an auth issue',
					);

					Logger.info(`               ${error.message}`);
					Logger.error(
						`Issue on initial workflow activation try "${workflowData.name}" (startup)`,
						{
							workflowName: workflowData.name,
							workflowId: workflowData.id,
						},
					);
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					this.executeErrorWorkflow(error, workflowData, 'internal');

					if (!error.message.includes('Authorization')) {
						// Keep on trying to activate the workflow if not an auth issue
						this.addQueuedWorkflowActivation('init', workflowData);
					}
				}
			}
			Logger.verbose('Finished initializing active workflows (startup)');
		}

		await this.externalHooks.run('activeWorkflows.initialized', []);
		await this.webhookService.populateCache();
	}

	/**
	 * Removes all the currently active workflows
	 */
	async removeAll(): Promise<void> {
		let activeWorkflowIds: string[] = [];
		Logger.verbose('Call to remove all active workflows received (removeAll)');

		activeWorkflowIds.push(...this.activeWorkflows.allActiveWorkflows());

		const activeWorkflows = await this.getActiveWorkflows();
		activeWorkflowIds = [...activeWorkflowIds, ...activeWorkflows];
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
	 */
	async executeWebhook(
		request: WebhookRequest,
		response: express.Response,
	): Promise<IResponseCallbackData> {
		const httpMethod = request.method;
		let path = request.params.path;

		Logger.debug(`Received webhook "${httpMethod}" for path "${path}"`);

		// Reset request parameters
		request.params = {} as WebhookRequest['params'];

		// Remove trailing slash
		if (path.endsWith('/')) {
			path = path.slice(0, -1);
		}

		const webhook = await this.webhookService.findWebhook(httpMethod, path);

		if (webhook === null) {
			throw new ResponseHelper.NotFoundError(
				webhookNotFoundErrorMessage(path, httpMethod),
				WEBHOOK_PROD_UNREGISTERED_HINT,
			);
		}

		if (webhook.isDynamic) {
			const pathElements = path.split('/').slice(1);

			// extracting params from path
			// @ts-ignore
			webhook.webhookPath.split('/').forEach((ele, index) => {
				if (ele.startsWith(':')) {
					// write params to req.params
					// @ts-ignore
					request.params[ele.slice(1)] = pathElements[index];
				}
			});
		}

		const workflowData = await Db.collections.Workflow.findOne({
			where: { id: webhook.workflowId },
			relations: ['shared', 'shared.user', 'shared.user.globalRole'],
		});

		if (workflowData === null) {
			throw new ResponseHelper.NotFoundError(
				`Could not find workflow with id "${webhook.workflowId}"`,
			);
		}

		const workflow = new Workflow({
			id: webhook.workflowId,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			nodeTypes: this.nodeTypes,
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
		).find((w) => w.httpMethod === httpMethod && w.path === webhook.webhookPath) as IWebhookData;

		// Get the node which has the webhook defined to know where to start from and to
		// get additional data
		const workflowStartNode = workflow.getNode(webhookData.node);

		if (workflowStartNode === null) {
			throw new ResponseHelper.NotFoundError('Could not find node to process webhook.');
		}

		return new Promise((resolve, reject) => {
			const executionMode = 'webhook';
			void WebhookHelpers.executeWebhook(
				workflow,
				webhookData,
				workflowData,
				workflowStartNode,
				executionMode,
				undefined,
				undefined,
				undefined,
				request,
				response,
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
	 */
	async getWebhookMethods(path: string) {
		return this.webhookService.getWebhookMethods(path);
	}

	/**
	 * Returns the ids of the currently active workflows
	 */
	async getActiveWorkflows(user?: User): Promise<string[]> {
		let activeWorkflows: WorkflowEntity[] = [];
		if (!user || user.globalRole.name === 'owner') {
			activeWorkflows = await Db.collections.Workflow.find({
				select: ['id'],
				where: { active: true },
			});
			return activeWorkflows
				.map((workflow) => workflow.id)
				.filter((workflowId) => !this.activationErrors[workflowId]);
		} else {
			const active = await Db.collections.Workflow.find({
				select: ['id'],
				where: { active: true },
			});
			const activeIds = active.map((workflow) => workflow.id);
			const where = whereClause({
				user,
				entityType: 'workflow',
			});
			Object.assign(where, { workflowId: In(activeIds) });
			const shared = await Db.collections.SharedWorkflow.find({
				select: ['workflowId'],
				where,
			});
			return shared
				.map((id) => id.workflowId)
				.filter((workflowId) => !this.activationErrors[workflowId]);
		}
	}

	/**
	 * Returns if the workflow is active
	 *
	 * @param {string} id The id of the workflow to check
	 */
	async isActive(id: string): Promise<boolean> {
		const workflow = await Db.collections.Workflow.findOne({
			select: ['active'],
			where: { id },
		});
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

			const webhook = this.webhookService.createWebhook({
				workflowId: webhookData.workflowId,
				webhookPath: path,
				node: node.name,
				method: webhookData.httpMethod,
			});

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
				// TODO: this should happen in a transaction, that way we don't need to manually remove this in `catch`
				await this.webhookService.storeWebhook(webhook);
				await workflow.createWebhookIfNotExists(
					webhookData,
					NodeExecuteFunctions,
					mode,
					activation,
					false,
				);
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

					continue;
				}

				try {
					await this.removeWorkflowWebhooks(workflow.id as string);
				} catch (error1) {
					ErrorReporter.error(error1);
					Logger.error(
						`Could not remove webhooks of workflow "${workflow.id}" because of error: "${error1.message}"`,
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
		await this.webhookService.populateCache();
		// Save static data!
		await WorkflowsService.saveStaticData(workflow);
	}

	/**
	 * Remove all the webhooks of the workflow
	 *
	 */
	async removeWorkflowWebhooks(workflowId: string): Promise<void> {
		const workflowData = await Db.collections.Workflow.findOne({
			where: { id: workflowId },
			relations: ['shared', 'shared.user', 'shared.user.globalRole'],
		});
		if (workflowData === null) {
			throw new Error(`Could not find workflow with id "${workflowId}"`);
		}

		const workflow = new Workflow({
			id: workflowId,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			nodeTypes: this.nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});

		const mode = 'internal';

		const additionalData = await WorkflowExecuteAdditionalData.getBase(
			workflowData.shared[0].user.id,
		);

		const webhooks = WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, undefined, true);

		for (const webhookData of webhooks) {
			await workflow.deleteWebhook(webhookData, NodeExecuteFunctions, mode, 'update', false);
		}

		await WorkflowsService.saveStaticData(workflow);

		await this.webhookService.deleteWorkflowWebhooks(workflowId);
	}

	/**
	 * Runs the given workflow
	 *
	 */

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
				Logger.debug(`Received event to trigger execution for workflow "${workflow.name}"`);
				void WorkflowsService.saveStaticData(workflow);
				const executePromise = this.runWorkflow(
					workflowData,
					node,
					data,
					additionalData,
					mode,
					responsePromise,
				);

				if (donePromise) {
					void executePromise.then((executionId) => {
						this.activeExecutions
							.getPostExecutePromise(executionId)
							.then(donePromise.resolve)
							.catch(donePromise.reject);
					});
				} else {
					void executePromise.catch(Logger.error);
				}
			};

			returnFunctions.__emitError = (error: ExecutionError): void => {
				void createErrorExecution(error, node, workflowData, workflow, mode).then(() => {
					this.executeErrorWorkflow(error, workflowData, mode);
				});
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
				Logger.debug(`Received trigger for workflow "${workflow.name}"`);
				void WorkflowsService.saveStaticData(workflow);

				const executePromise = this.runWorkflow(
					workflowData,
					node,
					data,
					additionalData,
					mode,
					responsePromise,
				);

				if (donePromise) {
					void executePromise.then((executionId) => {
						this.activeExecutions
							.getPostExecutePromise(executionId)
							.then(donePromise.resolve)
							.catch(donePromise.reject);
					});
				} else {
					executePromise.catch(Logger.error);
				}
			};
			returnFunctions.emitError = (error: Error): void => {
				Logger.info(
					`The trigger node "${node.name}" of workflow "${workflowData.name}" failed with the error: "${error.message}". Will try to reactivate.`,
					{
						nodeName: node.name,
						workflowId: workflowData.id,
						workflowName: workflowData.name,
					},
				);

				// Remove the workflow as "active"

				void this.activeWorkflows.remove(workflowData.id);
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
			status: 'running',
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
		let workflowInstance: Workflow;
		try {
			if (workflowData === undefined) {
				workflowData = (await Db.collections.Workflow.findOne({
					where: { id: workflowId },
					relations: ['shared', 'shared.user', 'shared.user.globalRole', 'shared.role'],
				})) as IWorkflowDb;
			}

			if (!workflowData) {
				throw new Error(`Could not find workflow with id "${workflowId}".`);
			}
			workflowInstance = new Workflow({
				id: workflowId,
				name: workflowData.name,
				nodes: workflowData.nodes,
				connections: workflowData.connections,
				active: workflowData.active,
				nodeTypes: this.nodeTypes,
				staticData: workflowData.staticData,
				settings: workflowData.settings,
			});

			const canBeActivated = workflowInstance.checkIfWorkflowCanBeActivated(STARTING_NODES);
			if (!canBeActivated) {
				Logger.error(`Unable to activate workflow "${workflowData.name}"`);
				throw new Error(
					'The workflow can not be activated because it does not contain any nodes which could start the workflow. Only workflows which have trigger or webhook nodes can be activated.',
				);
			}

			const mode = 'trigger';
			const workflowOwner = (workflowData as WorkflowEntity).shared.find(
				(shared) => shared.role.name === 'owner',
			);
			if (!workflowOwner) {
				throw new Error('Workflow cannot be activated because it has no owner');
			}
			const additionalData = await WorkflowExecuteAdditionalData.getBase(workflowOwner.user.id);
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
				await WorkflowsService.updateWorkflowTriggerCount(workflowInstance.id, triggerCount);
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
		await WorkflowsService.saveStaticData(workflowInstance!);
	}

	/**
	 * Add a workflow to the activation queue.
	 * Meaning it will keep on trying to activate it in regular
	 * amounts indefinitely.
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
	// TODO: this should happen in a transaction
	async remove(workflowId: string): Promise<void> {
		// Remove all the webhooks of the workflow
		try {
			await this.removeWorkflowWebhooks(workflowId);
		} catch (error) {
			ErrorReporter.error(error);
			Logger.error(
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
			const removalSuccess = await this.activeWorkflows.remove(workflowId);
			if (removalSuccess) {
				Logger.verbose(`Successfully deactivated workflow "${workflowId}"`, { workflowId });
			}
		}
	}
}
