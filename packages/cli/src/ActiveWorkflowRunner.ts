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
} from 'n8n-workflow';
import {
	Workflow,
	WorkflowActivationError,
	LoggerProxy as Logger,
	ErrorReporterProxy as ErrorReporter,
} from 'n8n-workflow';

import * as Db from '@/Db';
import type {
	IActivationError,
	IQueuedWorkflowActivations,
	IWorkflowDb,
	IWorkflowExecutionDataProcess,
} from '@/Interfaces';
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
import { In } from 'typeorm';
import { WebhookService } from './services/webhook.service';
import { ActiveWebhooks } from '@/webhooks';
import { WorkflowRepository } from '@/databases/repositories';

@Service()
export class ActiveWorkflowRunner {
	private activeWorkflows = new ActiveWorkflows();

	private activationErrors: Record<string, IActivationError> = {};

	private queuedWorkflowActivations: Record<string, IQueuedWorkflowActivations> = {};

	constructor(
		private activeExecutions: ActiveExecutions,
		private activeWebhooks: ActiveWebhooks,
		private externalHooks: ExternalHooks,
		private nodeTypes: NodeTypes,
		private webhookService: WebhookService,
		private workflowRepository: WorkflowRepository,
	) {}

	async init() {
		// Get the active workflows from database

		// NOTE
		// Here I guess we can have a flag on the workflow table like hasTrigger
		// so instead of pulling all the active webhooks just pull the actives that have a trigger
		const workflowsData = await this.workflowRepository.find({
			where: { active: true },
			relations: ['shared', 'shared.user', 'shared.user.globalRole', 'shared.role'],
		});

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
		Logger.verbose('Call to remove all active workflows received (removeAll)');

		// Make sure IDs are unique
		const activeWorkflowIds = [
			...new Set([
				...this.activeWorkflows.allActiveWorkflowIds(),
				...(await this.workflowRepository.getActiveWorkflowIds()),
			]),
		];

		const removePromises = activeWorkflowIds.map((workflowId) => this.remove(workflowId));
		await Promise.all(removePromises);
	}

	/**
	 * Returns the ids of the currently active workflows
	 */
	async getActiveWorkflowIds(user: User): Promise<string[]> {
		const activeWorkflowIds = await this.workflowRepository.getActiveWorkflowIds();
		if (user.isOwner) {
			return activeWorkflowIds.filter((workflowId) => !this.activationErrors[workflowId]);
		} else {
			const where = whereClause({
				user,
				entityType: 'workflow',
			});
			Object.assign(where, { workflowId: In(activeWorkflowIds) });
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
	 * Runs the given workflow
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
	 */
	getExecuteTriggerFunctions(
		workflowData: WorkflowEntity,
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
	 */
	async add(
		workflowId: string,
		activation: WorkflowActivateMode,
		workflowData?: WorkflowEntity,
	): Promise<void> {
		let workflowInstance: Workflow;
		try {
			if (workflowData === undefined) {
				workflowData = (await this.workflowRepository.findOne({
					where: { id: workflowId },
					relations: ['shared', 'shared.user', 'shared.user.globalRole', 'shared.role'],
				})) as WorkflowEntity;
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
			const workflowOwner = workflowData.shared.find((shared) => shared.role.name === 'owner');
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
			await this.activeWebhooks.addWorkflowWebhooks(
				workflowInstance,
				workflowData,
				additionalData,
				mode,
				activation,
			);

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
					this.activeWebhooks.getWorkflowWebhooks(workflowInstance, additionalData, undefined, true)
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
		workflowData: WorkflowEntity,
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
			await this.activeWebhooks.removeWorkflowWebhooks(workflowId);
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
