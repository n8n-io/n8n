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
	IHttpRequestMethods,
} from 'n8n-workflow';
import {
	Workflow,
	WorkflowActivationError,
	ErrorReporterProxy as ErrorReporter,
	WebhookPathTakenError,
	ApplicationError,
} from 'n8n-workflow';

import type express from 'express';

import type {
	IResponseCallbackData,
	IWebhookManager,
	IWorkflowDb,
	IWorkflowExecutionDataProcess,
	WebhookAccessControlOptions,
	WebhookRequest,
} from '@/Interfaces';
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
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { MultiMainSetup } from '@/services/orchestration/main/MultiMainSetup.ee';
import { ActivationErrorsService } from '@/ActivationErrors.service';
import type { Scope } from '@n8n/permissions';
import { NotFoundError } from './errors/response-errors/not-found.error';

const WEBHOOK_PROD_UNREGISTERED_HINT =
	"The workflow must be active for a production URL to run successfully. You can activate the workflow using the toggle in the top-right of the editor. Note that unlike test URL calls, production URL calls aren't shown on the canvas (only in the executions list)";

@Service()
export class ActiveWorkflowRunner implements IWebhookManager {
	private webhookWorkflows = new Map<string, WorkflowEntity>();

	activeWorkflows = new ActiveWorkflows();

	private queuedActivations: {
		[workflowId: string]: {
			activationMode: WorkflowActivateMode;
			lastTimeout: number;
			timeout: NodeJS.Timeout;
			workflowData: IWorkflowDb;
		};
	} = {};

	constructor(
		private readonly logger: Logger,
		private readonly activeExecutions: ActiveExecutions,
		private readonly externalHooks: ExternalHooks,
		private readonly nodeTypes: NodeTypes,
		private readonly webhookService: WebhookService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly multiMainSetup: MultiMainSetup,
		private readonly activationErrorsService: ActivationErrorsService,
	) {}

	async init() {
		await this.multiMainSetup.init();

		await this.addActiveWorkflows('init');

		await this.externalHooks.run('activeWorkflows.initialized', []);
	}

	async getAllWorkflowActivationErrors() {
		return this.activationErrorsService.getAll();
	}

	async initWebhooks() {
		const webhooks = await this.webhookService.findAll();
		for (const webhook of webhooks) {
			const { workflowId } = webhook;
			try {
				const dbWorkflow = await this.workflowRepository.findById(workflowId);
				if (!dbWorkflow) {
					throw new WorkflowActivationError(`Failed to find workflow with ID "${workflowId}"`);
				}
				const workflow = new Workflow({
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
				await this.addWebhooks(workflow, additionalData, 'trigger', 'init');
				this.webhookWorkflows.set(dbWorkflow.id, dbWorkflow);
			} catch (error) {
				this.logger.error('Failed to activate workflow', { workflowId });
			}
		}
	}

	/**
	 * Removes all the currently active workflows from memory.
	 */
	async removeAll() {
		let activeWorkflowIds: string[] = [];
		this.logger.verbose('Call to remove all active workflows received (removeAll)');

		activeWorkflowIds.push(...this.activeWorkflows.allActiveWorkflows());

		const activeWorkflows = await this.allActiveInStorage();
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
		const path = request.params.path;

		this.logger.debug(`Received webhook "${httpMethod}" for path "${path}"`);

		// Reset request parameters
		request.params = {} as WebhookRequest['params'];

		const webhook = this.findWebhook(path, httpMethod);

		const workflowId = webhook.workflow.id;
		const workflowData = this.webhookWorkflows.get(workflowId);
		if (!workflowData) {
			throw new NotFoundError(`Could not find workflow with id "${workflowId}"`);
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

		return new Promise((resolve, reject) => {
			const executionMode = 'webhook';
			void WebhookHelpers.executeWebhook(
				webhook.workflow,
				webhook.webhookData,
				workflowData,
				webhook.node,
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

	getWebhookMethods(path: string) {
		return this.webhookService.getWebhookMethods(path);
	}

	findAccessControlOptions(path: string, httpMethod: IHttpRequestMethods) {
		const webhook = this.findWebhook(path, httpMethod);

		const workflowId = webhook.workflow.id;
		const workflowData = this.webhookWorkflows.get(workflowId);
		if (!workflowData) {
			throw new NotFoundError(`Could not find workflow with id "${workflowId}"`);
		}

		const nodes = workflowData?.nodes;
		const webhookNode = nodes?.find(
			({ type, parameters, typeVersion }) =>
				parameters?.path === path &&
				(parameters?.httpMethod ?? 'GET') === httpMethod &&
				'webhook' in this.nodeTypes.getByNameAndVersion(type, typeVersion),
		);
		return webhookNode?.parameters?.options as WebhookAccessControlOptions;
	}

	private findWebhook(path: string, httpMethod: IHttpRequestMethods) {
		// Remove trailing slash
		if (path.endsWith('/')) {
			path = path.slice(0, -1);
		}

		const webhook = this.webhookService.findWebhook(httpMethod, path);
		if (!webhook) {
			throw new NotFoundError(
				webhookNotFoundErrorMessage(path, httpMethod),
				WEBHOOK_PROD_UNREGISTERED_HINT,
			);
		}

		return webhook;
	}

	/**
	 * Returns the ids of the currently active workflows from memory.
	 */
	allActiveInMemory() {
		return this.activeWorkflows.allActiveWorkflows();
	}

	/**
	 * Get the IDs of active workflows from storage.
	 */
	async allActiveInStorage(options?: { user: User; scope: Scope | Scope[] }) {
		const isFullAccess = !options?.user || (await options.user.hasGlobalScope(options.scope));

		const activationErrors = await this.activationErrorsService.getAll();
		const activeWorkflowIds = await this.workflowRepository
			.find({
				select: ['id'],
				where: { active: true },
			})
			.then((activeWorkflows) => activeWorkflows.map((workflow) => workflow.id));

		if (isFullAccess) {
			return activeWorkflowIds.filter((workflowId) => !activationErrors[workflowId]);
		}

		const where = await whereClause({
			user: options.user,
			globalScope: 'workflow:list',
			entityType: 'workflow',
		});

		Object.assign(where, { workflowId: In(activeWorkflowIds) });

		const sharings = await this.sharedWorkflowRepository.find({
			select: ['workflowId'],
			where,
		});

		return sharings
			.map((sharing) => sharing.workflowId)
			.filter((workflowId) => !activationErrors[workflowId]);
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
	 * Return error if there was a problem activating the workflow
	 */
	async getActivationError(workflowId: string) {
		return this.activationErrorsService.get(workflowId);
	}

	/**
	 * Register workflow-defined webhooks in the `workflow_entity` table.
	 */
	async addWebhooks(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalDataWorkflow,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	) {
		const webhooks = WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, undefined, true);
		let path = '';

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
				await workflow.createWebhookIfNotExists(
					webhookData,
					NodeExecuteFunctions,
					mode,
					activation,
					false,
				);
				// TODO: this should happen in a transaction, that way we don't need to manually remove this in `catch`
				await this.webhookService.storeWebhook(webhook, { node, workflow, webhookData });
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
		// Save static data!
		await WorkflowsService.saveStaticData(workflow);
	}

	/**
	 * Clear workflow-defined webhooks from the `webhook_entity` table.
	 */
	async clearWebhooks(workflowId: string) {
		this.webhookWorkflows.delete(workflowId);

		const workflowData = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: ['shared', 'shared.user', 'shared.user.globalRole'],
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
			await workflow.deleteWebhook(webhookData, NodeExecuteFunctions, mode, 'update', false);
		}

		await WorkflowsService.saveStaticData(workflow);

		await this.webhookService.deleteWorkflowWebhooks(workflowId);
	}

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

				void this.activationErrorsService.set(workflowData.id, error.message);

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
	 * Register as active in memory all workflows stored as `active`.
	 */
	async addActiveWorkflows(activationMode: WorkflowActivateMode) {
		const dbWorkflows = await this.workflowRepository.getAllActive();

		if (dbWorkflows.length === 0) return;

		this.logger.info(' ================================');
		this.logger.info('   Start Active Workflows:');
		this.logger.info(' ================================');

		for (const dbWorkflow of dbWorkflows) {
			this.logger.info(`   - ${dbWorkflow.display()}`);
			this.logger.debug(`Initializing active workflow ${dbWorkflow.display()} (startup)`, {
				workflowName: dbWorkflow.name,
				workflowId: dbWorkflow.id,
			});

			try {
				await this.add(dbWorkflow.id, activationMode, dbWorkflow);
				this.logger.verbose(`Successfully started workflow ${dbWorkflow.display()}`, {
					workflowName: dbWorkflow.name,
					workflowId: dbWorkflow.id,
				});
				this.logger.info('     => Started');
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
		await this.activationErrorsService.clearAll();
	}

	async addAllTriggerAndPollerBasedWorkflows() {
		await this.addActiveWorkflows('leadershipChange');
	}

	async removeAllTriggerAndPollerBasedWorkflows() {
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
	) {
		let workflow: Workflow;

		let shouldAddWebhooks = true;
		let shouldAddTriggersAndPollers = true;

		if (this.multiMainSetup.isEnabled && activationMode !== 'leadershipChange') {
			shouldAddWebhooks = this.multiMainSetup.isLeader;
			shouldAddTriggersAndPollers = this.multiMainSetup.isLeader;
		}

		if (this.multiMainSetup.isEnabled && activationMode === 'leadershipChange') {
			shouldAddWebhooks = false;
			shouldAddTriggersAndPollers = true;
		}

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
				this.logger.debug(`Adding webhooks for workflow ${dbWorkflow.display()}`);

				await this.addWebhooks(workflow, additionalData, 'trigger', activationMode);
				this.webhookWorkflows.set(dbWorkflow.id, dbWorkflow);
			}

			if (shouldAddTriggersAndPollers) {
				this.logger.debug(`Adding triggers and pollers for workflow ${dbWorkflow.display()}`);

				await this.addTriggersAndPollers(dbWorkflow, workflow, {
					activationMode,
					executionMode: 'trigger',
					additionalData,
				});
			}

			// Workflow got now successfully activated so make sure nothing is left in the queue
			this.removeQueuedWorkflowActivation(workflowId);

			await this.activationErrorsService.unset(workflowId);

			const triggerCount = this.countTriggers(workflow, additionalData);
			await WorkflowsService.updateWorkflowTriggerCount(workflow.id, triggerCount);
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);
			await this.activationErrorsService.set(workflowId, error.message);

			throw e;
		}

		// If for example webhooks get created it sometimes has to save the
		// id of them in the static data. So make sure that data gets persisted.
		await WorkflowsService.saveStaticData(workflow);
	}

	/**
	 * Count all triggers in the workflow, excluding Manual Trigger.
	 */
	private countTriggers(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalDataWorkflow,
	) {
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
		// Remove all the webhooks of the workflow
		try {
			await this.clearWebhooks(workflowId);
		} catch (error) {
			ErrorReporter.error(error);
			this.logger.error(
				`Could not remove webhooks of workflow "${workflowId}" because of error: "${error.message}"`,
			);
		}

		await this.activationErrorsService.unset(workflowId);

		if (this.queuedActivations[workflowId] !== undefined) {
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

	async removeActivationError(workflowId: string) {
		await this.activationErrorsService.unset(workflowId);
	}
}
