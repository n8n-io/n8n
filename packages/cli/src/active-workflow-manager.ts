/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
	STARTING_NODES,
	TRIGGER_COUNT_EXCLUDED_NODES,
	WORKFLOW_REACTIVATE_INITIAL_TIMEOUT,
	WORKFLOW_REACTIVATE_MAX_TIMEOUT,
} from '@/constants';
import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import type { WorkflowEntity, IWorkflowDb } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import chunk from 'lodash/chunk';
import {
	ActiveWorkflowTriggers,
	ErrorReporter,
	InstanceSettings,
	type IGetExecutePollFunctions,
	type IGetExecuteTriggerFunctions,
} from 'n8n-core';
import type {
	ExecutionError,
	INode,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	WorkflowActivateMode,
	WorkflowExecuteMode,
	INodeType,
	WorkflowId,
} from 'n8n-workflow';
import {
	Workflow,
	WorkflowActivationError,
	WebhookPathTakenError,
	UnexpectedError,
	IsolateError,
	ensureError,
	validateWorkflowHasTriggerLikeNode,
} from 'n8n-workflow';
import { strict } from 'node:assert';

import { ActivationErrorsService } from '@/activation-errors.service';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { ExternalHooks } from '@/external-hooks';
import { NodeTypes } from '@/node-types';
import { Push } from '@/push';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { ActiveWorkflowsService } from '@/services/active-workflows.service';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import { WebhookService } from '@/webhooks/webhook.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';
import { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';
import { getErrorDescription, getErrorNodeId } from '@/workflows/utils';
import { formatWorkflow } from '@/workflows/workflow.formatter';

interface QueuedActivation {
	activationMode: WorkflowActivateMode;
	lastTimeout: number;
	timeout: NodeJS.Timeout;
	workflowData: IWorkflowDb;
}

@Service()
export class ActiveWorkflowManager {
	private queuedActivations: Record<WorkflowId, QueuedActivation> = {};

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly activeWorkflowTriggers: ActiveWorkflowTriggers,
		private readonly externalHooks: ExternalHooks,
		private readonly nodeTypes: NodeTypes,
		private readonly webhookService: WebhookService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly activationErrorsService: ActivationErrorsService,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
		private readonly activeWorkflowsService: ActiveWorkflowsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly push: Push,
		private readonly triggerExecutionContextFactory: TriggerExecutionContextFactory,
		private readonly eventBus: MessageEventBus,
	) {
		this.logger = this.logger.scoped(['workflow-activation']);
	}

	async init() {
		strict(
			this.instanceSettings.instanceRole !== 'unset',
			'Active workflow manager expects instance role to be set',
		);

		await this.addActiveWorkflows('init');

		await this.externalHooks.run('activeWorkflows.initialized');
	}

	async getAllWorkflowActivationErrors() {
		return await this.activationErrorsService.getAll();
	}

	/**
	 * Removes all the currently active workflows from memory.
	 */
	async removeAll() {
		let activeWorkflowIds: string[] = [];
		this.logger.debug('Call to remove all active workflows received (removeAll)');

		activeWorkflowIds.push(...this.activeWorkflowTriggers.allActiveWorkflows());

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
		return this.activeWorkflowTriggers.allActiveWorkflows();
	}

	/**
	 * Register workflow-defined webhooks in the `workflow_entity` table.
	 */
	async addWebhooks(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
		nodeIds?: Set<string>,
	) {
		let webhooks = WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, undefined, true);
		let path = '';

		if (nodeIds) {
			webhooks = webhooks.filter((webhookData) =>
				nodeIds.has(workflow.getNode(webhookData.node)?.id ?? ''),
			);
		}

		if (webhooks.length === 0) return false;

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
				// `storeWebhook` registers the webhook atomically on the
				// (webhookPath, method) primary key and rejects a path already owned
				// by another workflow. The `catch` below still cleans up any webhooks
				// already registered for this workflow if a later step fails.
				await this.webhookService.storeWebhook(webhook);
				await this.webhookService.createWebhookIfNotExists(workflow, webhookData, mode, activation);
			} catch (error) {
				if (
					['init', 'leadershipChange'].includes(activation) &&
					error.name === 'QueryFailedError'
				) {
					// n8n does not remove the registered webhooks on exit.
					// This means that further initializations will always fail
					// when inserting to database. This is why we ignore this error
					// as it's expected to happen.

					continue;
				}

				try {
					await this.clearWebhooks(workflow.id);
				} catch (error1) {
					this.errorReporter.error(error1);
					this.logger.error(
						`Could not remove webhooks of workflow "${workflow.id}" because of error: "${error1.message}"`,
					);
				}

				// if it's a workflow from the insert
				// TODO check if there is standard error code for duplicate key violation that works
				// with all databases
				if (error instanceof Error && error.name === 'QueryFailedError') {
					error = new WebhookPathTakenError(webhook.node, error);
				} else if (error.detail) {
					// it's a error running the webhook methods (checkExists, create)
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					error.message = error.detail;
				}

				throw error;
			}
		}

		await this.workflowStaticDataService.saveStaticData(workflow);

		this.logger.debug(`Added webhooks for workflow "${workflow.name}" (ID ${workflow.id})`, {
			workflowId: workflow.id,
		});

		return true;
	}

	/**
	 * Remove all webhooks of a workflow from the database, and
	 * deregister those webhooks from external services.
	 */
	async clearWebhooks(workflowId: WorkflowId) {
		const workflowData = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: { activeVersion: true },
		});

		if (workflowData === null) {
			throw new UnexpectedError('Could not find workflow', { extra: { workflowId } });
		}

		if (!workflowData.activeVersion) {
			throw new UnexpectedError('Active version not found for workflow', {
				extra: { workflowId },
			});
		}

		const { nodes, connections } = workflowData.activeVersion;

		const workflow = new Workflow({
			id: workflowId,
			name: workflowData.name,
			nodes,
			connections,
			active: true,
			nodeTypes: this.nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId: workflow.id,
			workflowSettings: workflowData.settings,
		});

		await this.deregisterWebhooks(workflow, additionalData);

		await this.webhookService.deleteWorkflowWebhooks(workflowId);
	}

	/**
	 * Deregisters a workflow's webhooks from external services and persists any
	 * resulting static data. When `nodeIds` is given, only the webhooks of those
	 * nodes are deregistered. Returns the names of the nodes whose webhooks were
	 * deregistered.
	 */
	private async deregisterWebhooks(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeIds?: Set<string>,
	) {
		const removedNodeNames: string[] = [];

		await workflow.expression.acquireIsolate();
		try {
			const webhooks = WebhookHelpers.getWorkflowWebhooks(
				workflow,
				additionalData,
				undefined,
				true,
			);

			for (const webhookData of webhooks) {
				if (nodeIds && !nodeIds.has(workflow.getNode(webhookData.node)?.id ?? '')) {
					continue;
				}
				await this.webhookService.deleteWebhook(workflow, webhookData, 'internal', 'update');
				removedNodeNames.push(webhookData.node);
			}
		} finally {
			await workflow.expression.releaseIsolate();
		}

		await this.workflowStaticDataService.saveStaticData(workflow);

		return removedNodeNames;
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
		resolveWorkflowData: () => Promise<IWorkflowBase>,
	): IGetExecutePollFunctions {
		return this.triggerExecutionContextFactory.getExecutePollFunctions(
			workflowData,
			additionalData,
			mode,
			activation,
			resolveWorkflowData,
		);
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
		resolveWorkflowData: () => Promise<IWorkflowBase>,
	): IGetExecuteTriggerFunctions {
		return this.triggerExecutionContextFactory.getExecuteTriggerFunctions(
			workflowData,
			additionalData,
			mode,
			activation,
			resolveWorkflowData,
			({
				error,
				node,
				workflowData: failedWorkflowData,
				mode: failureMode,
				activation: failureActivation,
			}) => {
				this.logger.info(
					`The trigger node "${node.name}" of workflow "${failedWorkflowData.name}" failed with the error: "${error.message}". Will try to reactivate.`,
					{
						nodeName: node.name,
						workflowId: failedWorkflowData.id,
						workflowName: failedWorkflowData.name,
					},
				);
				void this.activeWorkflowTriggers.remove(failedWorkflowData.id);
				void this.activationErrorsService.register(failedWorkflowData.id, error.message);
				const activationError = new WorkflowActivationError(
					`The workflow was deactivated because its trigger node "${node.name}" failed`,
					{ cause: error, node },
				);
				this.executeErrorWorkflow(activationError, failedWorkflowData, failureMode);
				this.addQueuedWorkflowActivation(failureActivation, failedWorkflowData as WorkflowEntity);
			},
		);
	}

	executeErrorWorkflow(
		error: ExecutionError,
		workflowData: IWorkflowBase,
		mode: WorkflowExecuteMode,
	): void {
		this.triggerExecutionContextFactory.executeErrorWorkflow(error, workflowData, mode);
	}

	private isActivationInProgress = false;

	/**
	 * Register as active in memory all workflows stored as `active`,
	 * only on instance init or (in multi-main setup) on leadership change.
	 */
	async addActiveWorkflows(activationMode: 'init' | 'leadershipChange') {
		if (this.isActivationInProgress) {
			this.logger.debug(`Skipping activation - already in progress for mode: ${activationMode}`);
			return;
		}

		this.isActivationInProgress = true;
		try {
			const dbWorkflowIds = await this.workflowRepository.getAllActiveIds();

			if (dbWorkflowIds.length === 0) return;

			if (this.instanceSettings.isLeader) {
				this.logger.info('Start Active Workflows:');
			}

			const batches = chunk(dbWorkflowIds, this.workflowsConfig.activationBatchSize);

			for (const batch of batches) {
				const activationPromises = batch.map(async (dbWorkflowId) => {
					await this.activateWorkflow(dbWorkflowId, activationMode);
				});

				await Promise.all(activationPromises);
			}

			this.logger.debug('Finished activating all workflows');
		} finally {
			this.isActivationInProgress = false;
		}
	}

	private async activateWorkflow(
		workflowId: WorkflowId,
		activationMode: 'init' | 'leadershipChange',
	) {
		const dbWorkflow = await this.workflowRepository.findById(workflowId);
		if (!dbWorkflow) return;

		try {
			const added = await this.add(dbWorkflow.id, activationMode, dbWorkflow, {
				shouldPublish: false,
			});

			if (added.webhooks || added.triggersAndPollers) {
				this.logger.info(`Activated workflow ${formatWorkflow(dbWorkflow)}`, {
					workflowName: dbWorkflow.name,
					workflowId: dbWorkflow.id,
				});

				void this.eventBus.sendAuditEvent({
					eventName: 'n8n.audit.workflow.activated',
					payload: {
						workflowId: dbWorkflow.id,
						workflowName: dbWorkflow.name,
						activeVersionId: dbWorkflow.activeVersionId,
						activationMode,
					},
				});
			}
		} catch (error) {
			this.errorReporter.error(error);
			this.logger.error(
				`Issue on initial workflow activation try of ${formatWorkflow(dbWorkflow)} (startup)`,
				{
					error,
					workflowName: dbWorkflow.name,
					workflowId: dbWorkflow.id,
				},
			);

			if (!dbWorkflow.activeVersion) {
				throw new UnexpectedError('Active version not found for workflow', {
					extra: { workflowId: dbWorkflow.id },
				});
			}

			const { nodes, connections } = dbWorkflow.activeVersion;
			const workflowForError = { ...dbWorkflow, nodes, connections };

			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			this.executeErrorWorkflow(error, workflowForError, 'internal');

			// do not keep trying to activate on authorization error
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			if (error.message.includes('Authorization')) return;

			this.addQueuedWorkflowActivation('init', dbWorkflow);
		}
	}

	async clearAllActivationErrors() {
		this.logger.debug('Clearing all activation errors');

		await this.activationErrorsService.clearAll();
	}

	@OnLeaderTakeover()
	async addAllNonWebhookTriggerWorkflows() {
		// Feature flag whether the activation is handled via outbox
		if (this.workflowsConfig.useWorkflowPublicationService) return;

		await this.addActiveWorkflows('leadershipChange');
	}

	@OnLeaderStepdown()
	@OnShutdown()
	async removeAllNonWebhookTriggerWorkflows() {
		// Feature flag whether the activation is handled via outbox
		if (this.workflowsConfig.useWorkflowPublicationService) return;

		this.removeAllQueuedWorkflowActivations();
		await this.activeWorkflowTriggers.removeAllNonWebhookTriggerWorkflows();
	}

	/**
	 * Register a workflow as active.
	 *
	 * An activatable workflow may start from:
	 *
	 * - A webhook trigger, invoked by an HTTP request.
	 * - A poll trigger, which regularly checks an external service.
	 * - An active trigger, which keeps a listener or persistent connection open.
	 * - A schedule trigger, which registers its own crons.
	 *
	 * Note that despite the name, most "trigger" nodes are actually webhook-based
	 * and so qualify as webhook triggers, e.g. Stripe Trigger.
	 *
	 * Active triggers, poll triggers, and schedule triggers are registered as
	 * active in memory at `ActiveWorkflowTriggers`, but webhook triggers are registered
	 * by being entered in the `webhook_entity` table, since webhooks do not
	 * require continuous execution.
	 *
	 * Returns whether this operation added webhooks and/or non-webhook triggers.
	 */
	async add(
		workflowId: WorkflowId,
		activationMode: WorkflowActivateMode,
		existingWorkflow?: WorkflowEntity,
		{ shouldPublish } = { shouldPublish: true },
	) {
		const added = { webhooks: false, triggersAndPollers: false };

		const dbWorkflow = existingWorkflow ?? (await this.workflowRepository.findById(workflowId));

		if (!dbWorkflow) {
			throw new WorkflowActivationError(`Failed to find workflow with ID "${workflowId}"`, {
				level: 'warning',
			});
		}

		if (dbWorkflow.isArchived) {
			this.logger.debug('Cannot publish archived Workflow', { workflowId: dbWorkflow.id });
			return added;
		}

		if (this.instanceSettings.isMultiMain && shouldPublish) {
			if (!dbWorkflow?.activeVersionId) {
				throw new UnexpectedError('Active version ID not found for workflow', {
					extra: { workflowId },
				});
			}

			void this.publisher.publishCommand({
				command: 'add-webhooks-triggers-and-pollers',
				payload: { workflowId, activeVersionId: dbWorkflow.activeVersionId, activationMode },
			});

			return added;
		}

		let workflow: Workflow;

		const shouldAddWebhooks = this.shouldAddWebhooks(activationMode);
		const shouldAddNonWebhookTriggers = this.shouldAddNonWebhookTriggers();

		try {
			if (['init', 'leadershipChange'].includes(activationMode) && !dbWorkflow.activeVersion) {
				this.logger.debug(
					`Skipping workflow ${formatWorkflow(dbWorkflow)} as it is no longer active`,
					{ workflowId: dbWorkflow.id },
				);

				return added;
			}

			// Get workflow data from the active version
			if (!dbWorkflow.activeVersion) {
				throw new UnexpectedError('Active version not found for workflow', {
					extra: { workflowId: dbWorkflow.id },
				});
			}

			const { nodes, connections } = dbWorkflow.activeVersion;

			dbWorkflow.nodes = nodes;
			dbWorkflow.connections = connections;

			workflow = new Workflow({
				id: dbWorkflow.id,
				name: dbWorkflow.name,
				nodes,
				connections,
				active: true,
				nodeTypes: this.nodeTypes,
				staticData: dbWorkflow.staticData,
				settings: dbWorkflow.settings,
			});

			const validation = validateWorkflowHasTriggerLikeNode(
				workflow.nodes,
				this.nodeTypes,
				STARTING_NODES,
			);

			if (!validation.isValid) {
				throw new WorkflowActivationError(
					`Workflow ${formatWorkflow(dbWorkflow)} has no node to start the workflow - at least one active trigger, poll trigger, webhook trigger, or schedule trigger node is required`,
					{ level: 'warning' },
				);
			}

			const additionalData = await WorkflowExecuteAdditionalData.getBase({
				workflowId: workflow.id,
				workflowSettings: dbWorkflow.settings,
			});

			let triggerCount = 0;
			await workflow.expression.acquireIsolate();
			try {
				if (shouldAddWebhooks) {
					added.webhooks = await this.addWebhooks(
						workflow,
						additionalData,
						'trigger',
						activationMode,
					);
				}

				// When the flag is on, non-webhook trigger emit callbacks re-read the
				// published version from the DB so they pick up updates without deactivate/reactivate.
				// When the flag is off, they use the in-memory workflowData (same as before).
				//
				// Note: we intentionally load the latest published version when the trigger
				// fires so all triggers are updated at the same time without any downtime.
				// The workflow publication service is responsible for ensuring that
				// removed/disabled triggers in a new workflow version are deactivated before
				// updating the published version.
				const resolveWorkflowData = this.workflowsConfig.useWorkflowPublicationService
					? async () =>
							await this.triggerExecutionContextFactory.loadPublishedWorkflowData(dbWorkflow.id)
					: async () => dbWorkflow as IWorkflowBase;

				if (shouldAddNonWebhookTriggers) {
					added.triggersAndPollers = await this.addNonWebhookTriggers(dbWorkflow, workflow, {
						activationMode,
						executionMode: 'trigger',
						additionalData,
						resolveWorkflowData,
					});
				}

				triggerCount = this.countTriggers(workflow, additionalData);
			} finally {
				await workflow.expression.releaseIsolate();
			}

			// Workflow got now successfully activated so make sure nothing is left in the queue
			this.removeQueuedWorkflowActivation(workflowId);

			await this.activationErrorsService.deregister(workflowId);

			await this.workflowRepository.updateWorkflowTriggerCount(workflow.id, triggerCount);
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);
			await this.activationErrorsService.register(workflowId, error.message);

			throw e;
		}

		// If for example webhooks get created it sometimes has to save the
		// id of them in the static data. So make sure that data gets persisted.
		await this.workflowStaticDataService.saveStaticData(workflow);

		return added;
	}

	@OnPubSubEvent('display-workflow-activation', { instanceType: 'main' })
	handleDisplayWorkflowActivation({
		workflowId,
		activeVersionId,
	}: PubSubCommandMap['display-workflow-activation']) {
		this.push.broadcast({ type: 'workflowActivated', data: { workflowId, activeVersionId } });
	}

	@OnPubSubEvent('display-workflow-deactivation', { instanceType: 'main' })
	handleDisplayWorkflowDeactivation({ workflowId }: { workflowId: string }) {
		this.push.broadcast({ type: 'workflowDeactivated', data: { workflowId } });
	}

	@OnPubSubEvent('display-workflow-activation-error', { instanceType: 'main' })
	handleDisplayWorkflowActivationError({
		workflowId,
		errorMessage,
		errorDescription,
		nodeId,
	}: {
		workflowId: string;
		errorMessage: string;
		errorDescription?: string;
		nodeId?: string;
	}) {
		this.push.broadcast({
			type: 'workflowFailedToActivate',
			data: { workflowId, errorMessage, errorDescription, nodeId },
		});
	}

	@OnPubSubEvent('add-webhooks-triggers-and-pollers', {
		instanceType: 'main',
		instanceRole: 'leader',
	})
	async handleAddWebhooksAndNonWebhookTriggers({
		workflowId,
		activeVersionId,
		activationMode,
	}: PubSubCommandMap['add-webhooks-triggers-and-pollers']) {
		try {
			await this.add(workflowId, activationMode, undefined, {
				shouldPublish: false, // prevent leader from re-publishing message
			});

			this.push.broadcast({ type: 'workflowActivated', data: { workflowId, activeVersionId } });

			await this.publisher.publishCommand({
				command: 'display-workflow-activation',
				payload: { workflowId, activeVersionId },
			}); // instruct followers to show activation in UI
		} catch (e) {
			const error = ensureError(e);
			const { message } = error;
			const nodeId = getErrorNodeId(e);
			const errorDescription = getErrorDescription(e);

			if (error instanceof IsolateError) {
				this.logger.warn(
					`Isolate error activating workflow "${workflowId}", queuing for retry: "${message}"`,
					{ workflowId },
				);

				const dbWorkflow = await this.workflowRepository.findById(workflowId);
				if (dbWorkflow) this.addQueuedWorkflowActivation(activationMode, dbWorkflow);

				return;
			}

			const dbWorkflow = await this.workflowRepository.findById(workflowId);

			await this.workflowRepository.update(workflowId, { active: false, activeVersionId: null });

			if (dbWorkflow && (activationMode === 'init' || activationMode === 'leadershipChange')) {
				void this.eventBus.sendAuditEvent({
					eventName: 'n8n.audit.workflow.deactivated',
					payload: {
						workflowId,
						workflowName: dbWorkflow.name,
						deactivatedVersionId: dbWorkflow.activeVersionId ?? null,
						activationMode,
						reason: error.name,
					},
				});
			}

			this.push.broadcast({
				type: 'workflowFailedToActivate',
				data: { workflowId, errorMessage: message, nodeId, errorDescription },
			});

			await this.publisher.publishCommand({
				command: 'display-workflow-activation-error',
				payload: { workflowId, errorMessage: message, nodeId, errorDescription },
			}); // instruct followers to show activation error in UI
		}
	}

	/**
	 * Count all triggers in the workflow, excluding Manual Trigger and other n8n-internal triggers.
	 */
	private countTriggers(workflow: Workflow, additionalData: IWorkflowExecuteAdditionalData) {
		const triggerFilter = (nodeType: INodeType) =>
			!!nodeType.trigger &&
			!nodeType.description.name.includes('manualTrigger') &&
			!TRIGGER_COUNT_EXCLUDED_NODES.some((x) => x.endsWith(nodeType.description.name));

		// Retrieve unique webhooks as some nodes have multiple webhooks
		const workflowWebhooks = WebhookHelpers.getWorkflowWebhooks(
			workflow,
			additionalData,
			undefined,
			true,
		);

		const uniqueWebhooks = workflowWebhooks.reduce<Set<string>>((acc, webhook) => {
			acc.add(webhook.node);
			return acc;
		}, new Set());

		return (
			workflow.queryNodes(triggerFilter).length +
			workflow.getPollNodes().length +
			uniqueWebhooks.size
		);
	}

	/**
	 * Add a workflow to the activation queue.
	 * Meaning it will keep on trying to activate it in regular
	 * amounts indefinitely.
	 */
	private addQueuedWorkflowActivation(
		activationMode: WorkflowActivateMode,
		workflowData: WorkflowEntity,
	) {
		const workflowId = workflowData.id;
		const workflowName = workflowData.name;

		const retryFunction = async () => {
			this.logger.info(`Try to activate workflow "${workflowName}" (${workflowId})`, {
				workflowId,
				workflowName,
			});
			try {
				await this.add(workflowId, activationMode, workflowData, { shouldPublish: false });
			} catch (error) {
				this.errorReporter.error(error);
				let lastTimeout = this.queuedActivations[workflowId].lastTimeout;
				if (!(error instanceof IsolateError) && lastTimeout < WORKFLOW_REACTIVATE_MAX_TIMEOUT) {
					lastTimeout = Math.min(lastTimeout * 2, WORKFLOW_REACTIVATE_MAX_TIMEOUT);
				}

				this.logger.info(
					`Activation of workflow "${workflowName}" (${workflowId}) did fail with error: "${
						error.message as string
					}" | retry in ${Math.floor(lastTimeout / 1000)} seconds`,
					{
						error,
						workflowId,
						workflowName,
					},
				);

				this.queuedActivations[workflowId].lastTimeout = lastTimeout;
				this.queuedActivations[workflowId].timeout = setTimeout(retryFunction, lastTimeout);
				return;
			}
			this.logger.info(`Activation of workflow "${workflowName}" (${workflowId}) was successful!`, {
				workflowId,
				workflowName,
			});
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
	private removeQueuedWorkflowActivation(workflowId: WorkflowId) {
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
	// maybe, see: https://github.com/n8n-io/n8n/pull/8904#discussion_r1530150510
	async remove(workflowId: WorkflowId) {
		if (this.instanceSettings.isMultiMain) {
			try {
				await this.clearWebhooks(workflowId);
			} catch (error) {
				this.errorReporter.error(error);
				this.logger.error(
					`Could not remove webhooks of workflow "${workflowId}" because of error: "${error.message}"`,
				);
			}

			void this.publisher.publishCommand({
				command: 'remove-triggers-and-pollers',
				payload: { workflowId },
			});

			return;
		}

		try {
			await this.clearWebhooks(workflowId);
		} catch (error) {
			this.errorReporter.error(error);
			this.logger.error(
				`Could not remove webhooks of workflow "${workflowId}" because of error: "${error.message}"`,
			);
		}

		await this.activationErrorsService.deregister(workflowId);

		if (this.queuedActivations[workflowId] !== undefined) {
			this.removeQueuedWorkflowActivation(workflowId);
		}

		// If it is active in memory, it is a non-webhook trigger workflow.
		await this.removeNonWebhookTriggers(workflowId);
	}

	@OnPubSubEvent('remove-triggers-and-pollers', { instanceType: 'main', instanceRole: 'leader' })
	async handleRemoveNonWebhookTriggers({
		workflowId,
	}: PubSubCommandMap['remove-triggers-and-pollers']) {
		await this.removeActivationError(workflowId);
		await this.removeNonWebhookTriggers(workflowId);

		this.push.broadcast({ type: 'workflowDeactivated', data: { workflowId } });

		// instruct followers to show workflow deactivation in UI
		await this.publisher.publishCommand({
			command: 'display-workflow-deactivation',
			payload: { workflowId },
		});
	}

	/**
	 * Stop running active, poll, and schedule triggers for a workflow.
	 */
	async removeNonWebhookTriggers(workflowId: WorkflowId) {
		// `activeWorkflowTriggers.remove` is idempotent and always deregisters the workflow's
		// crons, to ensure they stop running on a deactivated workflow
		const wasRemoved = await this.activeWorkflowTriggers.remove(workflowId);

		if (wasRemoved) {
			this.logger.debug(`Removed non-webhook triggers for workflow "${workflowId}"`, {
				workflowId,
			});
		}
	}

	/**
	 * Register a workflow's active, poll, and schedule triggers in memory.
	 */
	async addNonWebhookTriggers(
		dbWorkflow: WorkflowEntity,
		workflow: Workflow,
		{
			activationMode,
			executionMode,
			additionalData,
			resolveWorkflowData,
			nodeIds,
		}: {
			activationMode: WorkflowActivateMode;
			executionMode: WorkflowExecuteMode;
			additionalData: IWorkflowExecuteAdditionalData;
			resolveWorkflowData: () => Promise<IWorkflowBase>;
			nodeIds?: Set<string>;
		},
	) {
		const getTriggerFunctions = this.getExecuteTriggerFunctions(
			dbWorkflow,
			additionalData,
			executionMode,
			activationMode,
			resolveWorkflowData,
		);

		const getPollFunctions = this.getExecutePollFunctions(
			dbWorkflow,
			additionalData,
			executionMode,
			activationMode,
			resolveWorkflowData,
		);

		const triggerAndPollNodeIds = [...workflow.getTriggerNodes(), ...workflow.getPollNodes()].map(
			(node) => node.id,
		);
		const nodeIdsToAdd = nodeIds
			? triggerAndPollNodeIds.filter((id) => nodeIds.has(id))
			: triggerAndPollNodeIds;

		if (nodeIdsToAdd.length === 0) {
			return false;
		}

		await this.activeWorkflowTriggers.addTriggers(
			workflow.id,
			workflow,
			nodeIdsToAdd,
			additionalData,
			executionMode,
			activationMode,
			getTriggerFunctions,
			getPollFunctions,
		);

		return true;
	}

	async removeActivationError(workflowId: WorkflowId) {
		await this.activationErrorsService.deregister(workflowId);
	}

	/**
	 * Whether this instance may add webhooks to the `webhook_entity` table.
	 */
	shouldAddWebhooks(activationMode: WorkflowActivateMode) {
		// Always try to populate the webhook entity table as well as register the webhooks
		// to prevent issues with users upgrading from a version < 1.15, where the webhook entity
		// was cleared on shutdown to anything past 1.28.0, where we stopped populating it on init,
		// causing all webhooks to break
		if (['init', 'leadershipChange'].includes(activationMode)) return true;

		return this.instanceSettings.isLeader; // 'update' or 'activate'
	}

	/**
	 * Whether this instance may add active, poll, and schedule triggers to memory.
	 *
	 * In both single- and multi-main setup, only the leader is allowed to manage
	 * non-webhook triggers in memory, to ensure they are not duplicated.
	 */
	shouldAddNonWebhookTriggers() {
		return this.instanceSettings.isLeader;
	}
}
