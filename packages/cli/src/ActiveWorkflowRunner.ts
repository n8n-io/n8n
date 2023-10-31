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
	ErrorReporterProxy as ErrorReporter,
	WebhookPathAlreadyTakenError,
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
import { In } from 'typeorm';
import { WebhookService } from './services/webhook.service';
import { Logger } from './Logger';
import { WorkflowRepository } from '@/databases/repositories';
import config from '@/config';

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
		private readonly logger: Logger,
		private readonly activeExecutions: ActiveExecutions,
		private readonly externalHooks: ExternalHooks,
		private readonly nodeTypes: NodeTypes,
		private readonly webhookService: WebhookService,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async init() {
		await this.addActiveWorkflows('init');

		await this.externalHooks.run('activeWorkflows.initialized', []);
		await this.webhookService.populateCache();
	}

	/**
	 * Removes all the currently active workflows
	 */
	async removeAll(): Promise<void> {
		let activeWorkflowIds: string[] = [];
		this.logger.verbose('Call to remove all active workflows received (removeAll)');

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

		this.logger.debug(`Received webhook "${httpMethod}" for path "${path}"`);

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
	 * Populate in the `webhook_entity` table any webhooks defined in the workflow.
	 */
	async addWorkflowWebhooks(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalDataWorkflow,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	) {
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
				if (activation === 'init' && error.name === 'QueryFailedError') {
					// n8n does not remove the registered webhooks on exit.
					// This means that further initializations will always fail
					// when inserting to database. This is why we ignore this error
					// as it's expected to happen.

					continue;
				}

				try {
					await this.removeWorkflowWebhooks(workflow.id);
				} catch (error1) {
					ErrorReporter.error(error1);
					this.logger.error(
						`Could not remove webhooks of workflow "${workflow.id}" because of error: "${error1.message}"`,
					);
				}

				// if it's a workflow from the the insert
				// TODO check if there is standard error code for duplicate key violation that works
				// with all databases
				if (error instanceof Error && error.name === 'QueryFailedError') {
					error = new WebhookPathAlreadyTakenError(webhook.node, error);
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
				metadata: {},
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
				this.logger.debug(`Received event to trigger execution for workflow "${workflow.name}"`);
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
					void executePromise.catch((error: Error) => this.logger.error(error.message, { error }));
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
				this.logger.debug(`Received trigger for workflow "${workflow.name}"`);
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
					executePromise.catch((error: Error) => this.logger.error(error.message, { error }));
				}
			};
			returnFunctions.emitError = (error: Error): void => {
				this.logger.info(
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

				this.addQueuedWorkflowActivation(activation, workflowData as WorkflowEntity); // @TODO: Typing
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
	 * Add all stored workflows marked as `active` to the group of active workflows.
	 */
	async addActiveWorkflows(activationMode: WorkflowActivateMode) {
		const workflows = await this.workflowRepository.getAllActive();

		if (workflows.length === 0) return;

		this.logger.info(' ================================');
		this.logger.info('   Start Active Workflows:');
		this.logger.info(' ================================');

		for (const workflow of workflows) {
			this.logger.info(`   - ${workflow.display()}`);
			this.logger.debug(`Initializing active workflow ${workflow.display()} (startup)`, {
				workflowName: workflow.name,
				workflowId: workflow.id,
			});

			try {
				await this.add(workflow.id, activationMode, workflow);

				this.logger.verbose(`Successfully started workflow ${workflow.display()}`, {
					workflowName: workflow.name,
					workflowId: workflow.id,
				});
				this.logger.info('     => Started');
			} catch (error) {
				ErrorReporter.error(error);
				this.logger.info(
					'     => ERROR: Workflow could not be activated on first try, keep on trying if not an auth issue',
				);

				this.logger.info(`               ${error.message}`);
				this.logger.error(
					`Issue on initial workflow activation try of ${workflow.display()} (startup)`,
					{
						workflowName: workflow.name,
						workflowId: workflow.id,
					},
				);

				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				this.executeErrorWorkflow(error, workflow, 'internal');

				// do not keep trying to activate on authorization error
				if (error.message.includes('Authorization')) continue;

				this.addQueuedWorkflowActivation('init', workflow);
			}
		}

		this.logger.verbose('Finished activating workflows (startup)');
	}

	/**
	 * Add a workflow to the group of active workflows.
	 *
	 * @definitions Three node kinds can start a workflow: webhooks, pollers, and triggers.
	 * A "trigger" is any **non-HTTP-based node** that can start a workflow, such as
	 * the Schedule Trigger or any trigger nodes that communicate via message queue.
	 * Note that the majority of trigger nodes are webhook-based, e.g. Stripe Trigger.
	 *
	 * @difference Triggers and pollers are added to active workflows, but webhooks are added
	 * to the `webhook_entity` table, as webhooks are not continuously executed. On leadership
	 * change, the new leader adds triggers and pollers, but webhooks remain unchanged.
	 */
	async add(
		workflowId: string,
		activationMode: WorkflowActivateMode,
		existingWorkflow?: WorkflowEntity,
	) {
		let workflow: Workflow;

		const shouldAddWebhooks = activationMode !== 'leadershipChange';

		const shouldAddTriggersAndPollers =
			config.get('executions.mode') !== 'queue' || activationMode === 'leadershipChange';

		try {
			const dbWorkflow = existingWorkflow ?? (await this.workflowRepository.findById(workflowId));

			if (!dbWorkflow) {
				throw new WorkflowActivationError(`Failed to find workflow with ID "${workflowId}"`);
			}

			workflow = new Workflow({
				id: dbWorkflow.id,
				name: dbWorkflow.name,
				nodes: dbWorkflow.nodes,
				connections: dbWorkflow.connections,
				active: dbWorkflow.active,
				nodeTypes: this.nodeTypes,
				staticData: dbWorkflow.staticData,
				settings: dbWorkflow.settings,
			});

			const canBeActivated = workflow.checkIfWorkflowCanBeActivated(STARTING_NODES);

			if (!canBeActivated) {
				throw new WorkflowActivationError(
					`Workflow ${dbWorkflow.display()} has no node to start the workflow - at least one trigger, poller or webhook node is required`,
				);
			}

			const sharing = dbWorkflow.shared.find((shared) => shared.role.name === 'owner');

			if (!sharing) {
				throw new WorkflowActivationError(`Workflow ${dbWorkflow.display()} has no owner`);
			}

			const additionalData = await WorkflowExecuteAdditionalData.getBase(sharing.user.id);

			if (shouldAddWebhooks) {
				await this.addWorkflowWebhooks(workflow, additionalData, 'trigger', activationMode);
			}

			if (shouldAddTriggersAndPollers) {
				await this.addTriggerOrPollerBasedWorkflow(dbWorkflow, workflow, {
					activationMode,
					executionMode: 'trigger',
					additionalData,
				});
			}

			// Workflow got now successfully activated so make sure nothing is left in the queue
			this.removeQueuedWorkflowActivation(workflowId);

			if (this.activationErrors[workflowId]) {
				delete this.activationErrors[workflowId];
			}

			const triggerCount = this.countTriggers(workflow, additionalData);
			await WorkflowsService.updateWorkflowTriggerCount(workflow.id, triggerCount);
		} catch (error) {
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
		await WorkflowsService.saveStaticData(workflow);
	}

	/**
	 * Count all triggers in the workflow, **excluding** Manual Trigger.
	 */
	countTriggers(workflow: Workflow, additionalData: IWorkflowExecuteAdditionalDataWorkflow) {
		const triggerFilter = (nodeType: INodeType) =>
			!!nodeType.trigger && !nodeType.description.name.includes('manualTrigger');

		return (
			workflow.queryNodes(triggerFilter).length +
			workflow.getPollNodes().length +
			WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, undefined, true).length
		);
	}

	/**
	 * Add a workflow to the activation queue.
	 * Meaning it will keep on trying to activate it in regular
	 * amounts indefinitely.
	 */
	addQueuedWorkflowActivation(activationMode: WorkflowActivateMode, workflowData: WorkflowEntity) {
		const workflowId = workflowData.id;
		const workflowName = workflowData.name;

		const retryFunction = async () => {
			this.logger.info(`Try to activate workflow "${workflowName}" (${workflowId})`, {
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

				this.logger.info(
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
			this.logger.info(
				` -> Activation of workflow "${workflowName}" (${workflowId}) was successful!`,
				{
					workflowId,
					workflowName,
				},
			);
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
			this.logger.error(
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
				this.logger.verbose(`Successfully deactivated workflow "${workflowId}"`, { workflowId });
			}
		}
	}

	/**
	 * Add a trigger- or poller-based workflow to the group of active workflows.
	 */
	private async addTriggerOrPollerBasedWorkflow(
		// @TODO: Remove duplication of dbWorkflow and workflow
		dbWorkflow: WorkflowEntity,
		workflow: Workflow,
		{
			activationMode,
			executionMode,
			additionalData,
		}: {
			activationMode: WorkflowActivateMode;
			executionMode: WorkflowExecuteMode;
			additionalData: IWorkflowExecuteAdditionalDataWorkflow;
		},
	) {
		const getTriggerFunctions = this.getExecuteTriggerFunctions(
			dbWorkflow,
			additionalData,
			executionMode,
			activationMode,
		);

		const getPollFunctions = this.getExecutePollFunctions(
			dbWorkflow,
			additionalData,
			executionMode,
			activationMode,
		);

		if (workflow.getTriggerNodes().length !== 0 || workflow.getPollNodes().length !== 0) {
			await this.activeWorkflows.add(
				workflow.id,
				workflow,
				additionalData,
				executionMode,
				activationMode,
				getTriggerFunctions,
				getPollFunctions,
			);

			this.logger.verbose(`Workflow ${dbWorkflow.display()} activated`, {
				workflowId: dbWorkflow.id,
				workflowName: dbWorkflow.name,
			});
		}
	}
}
