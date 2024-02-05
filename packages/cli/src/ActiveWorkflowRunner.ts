/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Service } from 'typedi';
import { ActiveWorkflows, NodeExecuteFunctions } from 'n8n-core';

import type {
	ExecutionError,
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IGetExecutePollFunctions,
	IGetExecuteTriggerFunctions,
	INode,
	INodeExecutionData,
	IRun,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	WorkflowActivateMode,
	WorkflowExecuteMode,
	INodeType,
} from 'n8n-workflow';
import {
	Workflow,
	WorkflowActivationError,
	ErrorReporterProxy as ErrorReporter,
	WebhookPathTakenError,
	ApplicationError,
} from 'n8n-workflow';

import type { IWorkflowDb } from '@/Interfaces';
import * as WebhookHelpers from '@/WebhookHelpers';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';

import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { ActiveExecutions } from '@/ActiveExecutions';
import { ExecutionService } from './executions/execution.service';
import {
	STARTING_NODES,
	WORKFLOW_REACTIVATE_INITIAL_TIMEOUT,
	WORKFLOW_REACTIVATE_MAX_TIMEOUT,
} from '@/constants';
import { NodeTypes } from '@/NodeTypes';
import { ExternalHooks } from '@/ExternalHooks';
import { WebhookService } from './services/webhook.service';
import { Logger } from './Logger';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { OrchestrationService } from '@/services/orchestration.service';
import { ActivationErrorsService } from '@/ActivationErrors.service';
import { ActiveWorkflowsService } from '@/services/activeWorkflows.service';
import { WorkflowExecutionService } from '@/workflows/workflowExecution.service';
import { WorkflowStaticDataService } from '@/workflows/workflowStaticData.service';
import { OnShutdown } from '@/decorators/OnShutdown';

interface QueuedActivation {
	activationMode: WorkflowActivateMode;
	lastTimeout: number;
	timeout: NodeJS.Timeout;
	workflowData: IWorkflowDb;
}

@Service()
export class ActiveWorkflowRunner {
	private queuedActivations: { [workflowId: string]: QueuedActivation } = {};

	constructor(
		private readonly logger: Logger,
		private readonly activeWorkflows: ActiveWorkflows,
		private readonly activeExecutions: ActiveExecutions,
		private readonly externalHooks: ExternalHooks,
		private readonly nodeTypes: NodeTypes,
		private readonly webhookService: WebhookService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly orchestrationService: OrchestrationService,
		private readonly activationErrorsService: ActivationErrorsService,
		private readonly executionService: ExecutionService,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
		private readonly activeWorkflowsService: ActiveWorkflowsService,
		private readonly workflowExecutionService: WorkflowExecutionService,
	) {}

	async init() {
		await this.orchestrationService.init();

		await this.addActiveWorkflows('init');

		await this.externalHooks.run('activeWorkflows.initialized', []);
		await this.webhookService.populateCache();
	}

	async getAllWorkflowActivationErrors() {
		return await this.activationErrorsService.getAll();
	}

	/**
	 * Removes all the currently active workflows from memory.
	 */
	async removeAll() {
		let activeWorkflowIds: string[] = [];
		this.logger.verbose('Call to remove all active workflows received (removeAll)');

		activeWorkflowIds.push(...this.activeWorkflows.allActiveWorkflows());

		const activeWorkflows = await this.activeWorkflowsService.getAllActiveIdsInStorage();
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
	 * Returns the ids of the currently active workflows from memory.
	 */
	allActiveInMemory() {
		return this.activeWorkflows.allActiveWorkflows();
	}

	/**
	 * Returns if the workflow is stored as `active`.
	 *
	 * @important Do not confuse with `ActiveWorkflows.isActive()`,
	 * which checks if the workflow is active in memory.
	 */
	async isActive(workflowId: string) {
		const workflow = await this.workflowRepository.findOne({
			select: ['active'],
			where: { id: workflowId },
		});

		return !!workflow?.active;
	}

	/**
	 * Register workflow-defined webhooks in the `workflow_entity` table.
	 */
	async addWebhooks(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	) {
		const webhooks = WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, undefined, true);
		let path = '';

		if (webhooks.length === 0) return;

		this.logger.debug(`Adding webhooks for workflow "${workflow.name}" (ID ${workflow.id})`);

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
					await this.clearWebhooks(workflow.id);
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
					error = new WebhookPathTakenError(webhook.node, error);
				} else if (error.detail) {
					// it's a error running the webhook methods (checkExists, create)
					error.message = error.detail;
				}

				throw error;
			}
		}
		await this.webhookService.populateCache();

		await this.workflowStaticDataService.saveStaticData(workflow);
	}

	/**
	 * Remove all webhooks of a workflow from the database, and
	 * deregister those webhooks from external services.
	 */
	async clearWebhooks(workflowId: string) {
		const workflowData = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: ['shared', 'shared.user'],
		});

		if (workflowData === null) {
			throw new ApplicationError('Could not find workflow', { extra: { workflowId } });
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
			await workflow.deleteWebhook(webhookData, NodeExecuteFunctions, mode, 'update');
		}

		await this.workflowStaticDataService.saveStaticData(workflow);

		await this.webhookService.deleteWorkflowWebhooks(workflowId);
	}

	/**
	 * Return poll function which gets the global functions from n8n-core
	 * and overwrites the emit to be able to start it in subprocess
	 */
	getExecutePollFunctions(
		workflowData: IWorkflowDb,
		additionalData: IWorkflowExecuteAdditionalData,
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
				void this.workflowStaticDataService.saveStaticData(workflow);
				const executePromise = this.workflowExecutionService.runWorkflow(
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
				void this.executionService
					.createErrorExecution(error, node, workflowData, workflow, mode)
					.then(() => {
						this.executeErrorWorkflow(error, workflowData, mode);
					});
			};
			return returnFunctions;
		};
	}

	/**
	 * Return trigger function which gets the global functions from n8n-core
	 * and overwrites the emit to be able to start it in subprocess
	 */
	getExecuteTriggerFunctions(
		workflowData: IWorkflowDb,
		additionalData: IWorkflowExecuteAdditionalData,
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
				void this.workflowStaticDataService.saveStaticData(workflow);

				const executePromise = this.workflowExecutionService.runWorkflow(
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

				void this.activationErrorsService.register(workflowData.id, error.message);

				// Run Error Workflow if defined
				const activationError = new WorkflowActivationError(
					`There was a problem with the trigger node "${node.name}", for that reason did the workflow had to be deactivated`,
					{ cause: error, node },
				);
				this.executeErrorWorkflow(activationError, workflowData, mode);

				this.addQueuedWorkflowActivation(activation, workflowData as WorkflowEntity);
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
	 * Register as active in memory all workflows stored as `active`,
	 * only on instance init or (in multi-main setup) on leadership change.
	 */
	async addActiveWorkflows(activationMode: 'init' | 'leadershipChange') {
		const dbWorkflows = await this.workflowRepository.getAllActive();

		if (dbWorkflows.length === 0) return;

		if (this.orchestrationService.isLeader) {
			this.logger.info(' ================================');
			this.logger.info('   Start Active Workflows:');
			this.logger.info(' ================================');
		}

		for (const dbWorkflow of dbWorkflows) {
			try {
				const wasActivated = await this.add(dbWorkflow.id, activationMode, dbWorkflow, {
					shouldPublish: false,
				});

				if (wasActivated) {
					this.logger.verbose(`Successfully started workflow ${dbWorkflow.display()}`, {
						workflowName: dbWorkflow.name,
						workflowId: dbWorkflow.id,
					});
					this.logger.info('     => Started');
				}
			} catch (error) {
				ErrorReporter.error(error);
				this.logger.info(
					'     => ERROR: Workflow could not be activated on first try, keep on trying if not an auth issue',
				);

				this.logger.info(`               ${error.message}`);
				this.logger.error(
					`Issue on initial workflow activation try of ${dbWorkflow.display()} (startup)`,
					{
						workflowName: dbWorkflow.name,
						workflowId: dbWorkflow.id,
					},
				);

				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				this.executeErrorWorkflow(error, dbWorkflow, 'internal');

				// do not keep trying to activate on authorization error
				if (error.message.includes('Authorization')) continue;

				this.addQueuedWorkflowActivation('init', dbWorkflow);
			}
		}

		this.logger.verbose('Finished activating workflows (startup)');
	}

	async clearAllActivationErrors() {
		this.logger.debug('Clearing all activation errors');

		await this.activationErrorsService.clearAll();
	}

	async addAllTriggerAndPollerBasedWorkflows() {
		this.logger.debug('Adding all trigger- and poller-based workflows');

		await this.addActiveWorkflows('leadershipChange');
	}

	@OnShutdown()
	async removeAllTriggerAndPollerBasedWorkflows() {
		this.logger.debug('Removing all trigger- and poller-based workflows');

		await this.activeWorkflows.removeAllTriggerAndPollerBasedWorkflows();
	}

	/**
	 * Register a workflow as active.
	 *
	 * An activatable workflow may be webhook-, trigger-, or poller-based:
	 *
	 * - A `webhook` is an HTTP-based node that can start a workflow when called
	 * by a third-party service.
	 * - A `poller` is an HTTP-based node that can start a workflow when detecting
	 * a change while regularly checking a third-party service.
	 * - A `trigger` is any non-HTTP-based node that can start a workflow, e.g. a
	 * time-based node like Schedule Trigger or a message-queue-based node.
	 *
	 * Note that despite the name, most "trigger" nodes are actually webhook-based
	 * and so qualify as `webhook`, e.g. Stripe Trigger.
	 *
	 * Triggers and pollers are registered as active in memory at `ActiveWorkflows`,
	 * but webhooks are registered by being entered in the `webhook_entity` table,
	 * since webhooks do not require continuous execution.
	 */
	async add(
		workflowId: string,
		activationMode: WorkflowActivateMode,
		existingWorkflow?: WorkflowEntity,
		{ shouldPublish } = { shouldPublish: true },
	) {
		if (this.orchestrationService.isMultiMainSetupEnabled && shouldPublish) {
			await this.orchestrationService.publish('add-webhooks-triggers-and-pollers', {
				workflowId,
			});

			return;
		}

		let workflow: Workflow;

		const shouldAddWebhooks = this.orchestrationService.shouldAddWebhooks(activationMode);
		const shouldAddTriggersAndPollers = this.orchestrationService.shouldAddTriggersAndPollers();

		const shouldDisplayActivationMessage =
			(shouldAddWebhooks || shouldAddTriggersAndPollers) &&
			['init', 'leadershipChange'].includes(activationMode);

		try {
			const dbWorkflow = existingWorkflow ?? (await this.workflowRepository.findById(workflowId));

			if (!dbWorkflow) {
				throw new WorkflowActivationError(`Failed to find workflow with ID "${workflowId}"`);
			}

			if (shouldDisplayActivationMessage) {
				this.logger.info(`   - ${dbWorkflow.display()}`);
				this.logger.debug(`Initializing active workflow ${dbWorkflow.display()} (startup)`, {
					workflowName: dbWorkflow.name,
					workflowId: dbWorkflow.id,
				});
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

			const sharing = dbWorkflow.shared.find((shared) => shared.role === 'workflow:owner');

			if (!sharing) {
				throw new WorkflowActivationError(`Workflow ${dbWorkflow.display()} has no owner`);
			}

			const additionalData = await WorkflowExecuteAdditionalData.getBase(sharing.user.id);

			if (shouldAddWebhooks) {
				await this.addWebhooks(workflow, additionalData, 'trigger', activationMode);
			}

			if (shouldAddTriggersAndPollers) {
				await this.addTriggersAndPollers(dbWorkflow, workflow, {
					activationMode,
					executionMode: 'trigger',
					additionalData,
				});
			}

			// Workflow got now successfully activated so make sure nothing is left in the queue
			this.removeQueuedWorkflowActivation(workflowId);

			await this.activationErrorsService.deregister(workflowId);

			const triggerCount = this.countTriggers(workflow, additionalData);
			await this.workflowRepository.updateWorkflowTriggerCount(workflow.id, triggerCount);
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);
			await this.activationErrorsService.register(workflowId, error.message);

			throw e;
		}

		// If for example webhooks get created it sometimes has to save the
		// id of them in the static data. So make sure that data gets persisted.
		await this.workflowStaticDataService.saveStaticData(workflow);

		return shouldDisplayActivationMessage;
	}

	/**
	 * Count all triggers in the workflow, excluding Manual Trigger.
	 */
	private countTriggers(workflow: Workflow, additionalData: IWorkflowExecuteAdditionalData) {
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
				let lastTimeout = this.queuedActivations[workflowId].lastTimeout;
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

				this.queuedActivations[workflowId].lastTimeout = lastTimeout;
				this.queuedActivations[workflowId].timeout = setTimeout(retryFunction, lastTimeout);
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

		this.queuedActivations[workflowId] = {
			activationMode,
			lastTimeout: WORKFLOW_REACTIVATE_INITIAL_TIMEOUT,
			timeout: setTimeout(retryFunction, WORKFLOW_REACTIVATE_INITIAL_TIMEOUT),
			workflowData,
		};
	}

	/**
	 * Remove a workflow from the activation queue
	 */
	removeQueuedWorkflowActivation(workflowId: string) {
		if (this.queuedActivations[workflowId]) {
			clearTimeout(this.queuedActivations[workflowId].timeout);
			delete this.queuedActivations[workflowId];
		}
	}

	/**
	 * Remove all workflows from the activation queue
	 */
	removeAllQueuedWorkflowActivations() {
		for (const workflowId in this.queuedActivations) {
			this.removeQueuedWorkflowActivation(workflowId);
		}
	}

	/**
	 * Makes a workflow inactive
	 *
	 * @param {string} workflowId The id of the workflow to deactivate
	 */
	// TODO: this should happen in a transaction
	async remove(workflowId: string) {
		if (this.orchestrationService.isMultiMainSetupEnabled) {
			try {
				await this.clearWebhooks(workflowId);
			} catch (error) {
				ErrorReporter.error(error);
				this.logger.error(
					`Could not remove webhooks of workflow "${workflowId}" because of error: "${error.message}"`,
				);
			}

			await this.orchestrationService.publish('remove-triggers-and-pollers', { workflowId });

			return;
		}

		try {
			await this.clearWebhooks(workflowId);
		} catch (error) {
			ErrorReporter.error(error);
			this.logger.error(
				`Could not remove webhooks of workflow "${workflowId}" because of error: "${error.message}"`,
			);
		}

		await this.activationErrorsService.deregister(workflowId);

		if (this.queuedActivations[workflowId] !== undefined) {
			this.removeQueuedWorkflowActivation(workflowId);
		}

		// if it's active in memory then it's a trigger
		// so remove from list of actives workflows
		await this.removeWorkflowTriggersAndPollers(workflowId);
	}

	/**
	 * Stop running active triggers and pollers for a workflow.
	 */
	async removeWorkflowTriggersAndPollers(workflowId: string) {
		if (!this.activeWorkflows.isActive(workflowId)) return;

		const wasRemoved = await this.activeWorkflows.remove(workflowId);

		if (wasRemoved) {
			this.logger.warn(`Removed triggers and pollers for workflow "${workflowId}"`, {
				workflowId,
			});
		}
	}

	/**
	 * Register as active in memory a trigger- or poller-based workflow.
	 */
	async addTriggersAndPollers(
		dbWorkflow: WorkflowEntity,
		workflow: Workflow,
		{
			activationMode,
			executionMode,
			additionalData,
		}: {
			activationMode: WorkflowActivateMode;
			executionMode: WorkflowExecuteMode;
			additionalData: IWorkflowExecuteAdditionalData;
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
			this.logger.debug(`Adding triggers and pollers for workflow ${dbWorkflow.display()}`);

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

	async removeActivationError(workflowId: string) {
		await this.activationErrorsService.deregister(workflowId);
	}
}
