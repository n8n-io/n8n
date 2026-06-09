/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import type { WorkflowEntity, IWorkflowDb } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import {
	ActiveWorkflowTriggers,
	ErrorReporter,
	PollContext,
	StorageConfig,
	TriggerContext,
	type IGetExecutePollFunctions,
	type IGetExecuteTriggerFunctions,
} from 'n8n-core';
import type {
	ExecutionError,
	IConnections,
	IDeferredPromise,
	IExecuteResponsePromiseData,
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
	UnexpectedError,
	IsolateError,
	createRunExecutionData,
} from 'n8n-workflow';

import { ActivationErrorsService } from '@/activation-errors.service';
import { ActiveExecutions } from '@/active-executions';
import {
	TRIGGER_COUNT_EXCLUDED_NODES,
	WORKFLOW_REACTIVATE_INITIAL_TIMEOUT,
	WORKFLOW_REACTIVATE_MAX_TIMEOUT,
} from '@/constants';
import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import { EventService } from '@/events/event.service';
import { executeErrorWorkflow } from '@/execution-lifecycle/execute-error-workflow';
import { ExecutionService } from '@/executions/execution.service';
import { NodeTypes } from '@/node-types';
import { WebhookActivationService } from '@/webhooks/webhook-activation.service';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import { WebhookService } from '@/webhooks/webhook.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';
import { formatWorkflow } from '@/workflows/workflow.formatter';

interface QueuedTriggerNodeActivation {
	lastTimeout: number;
	timeout: NodeJS.Timeout;
}

/**
 * Activates and deactivates individual trigger nodes of a workflow version for
 * the workflow publication outbox flow. Unlike `ActiveWorkflowManager`, which
 * activates/deactivates whole workflows, this service operates per trigger node
 * so a publication only touches the triggers that actually changed.
 */
@Service()
export class WorkflowTriggerActivationService {
	private queuedTriggerNodeActivations: Record<string, QueuedTriggerNodeActivation> = {};

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly activeWorkflowTriggers: ActiveWorkflowTriggers,
		private readonly activeExecutions: ActiveExecutions,
		private readonly nodeTypes: NodeTypes,
		private readonly webhookService: WebhookService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly activationErrorsService: ActivationErrorsService,
		private readonly executionService: ExecutionService,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
		private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly eventService: EventService,
		private readonly storageConfig: StorageConfig,
		private readonly workflowPublishedDataService: WorkflowPublishedDataService,
		private readonly webhookActivationService: WebhookActivationService,
	) {
		this.logger = this.logger.scoped(['workflow-activation']);
	}

	/**
	 * Returns the enabled trigger-like nodes (active, poll, schedule and webhook
	 * triggers) of a workflow version. Disabled nodes are excluded, so the result
	 * is the set of nodes that actually drive trigger registration. Used to
	 * compute the trigger-level diff during publication.
	 */
	getEnabledTriggerNodes(version: { nodes: INode[]; connections: IConnections } | null): INode[] {
		if (!version) return [];

		const workflow = new Workflow({
			id: 'trigger-diff',
			name: 'trigger-diff',
			nodes: version.nodes,
			connections: version.connections,
			active: false,
			nodeTypes: this.nodeTypes,
		});

		return workflow.queryNodes(
			(nodeType) => !!nodeType.trigger || !!nodeType.poll || !!nodeType.webhook,
		);
	}

	/**
	 * Registers only the given trigger nodes (webhook and non-webhook) of the
	 * given workflow version, leaving any other already-active triggers
	 * untouched. The "add" side of a publication trigger diff; runs on the leader
	 * after the published version has been advanced.
	 */
	async addTriggerNodes(
		dbWorkflow: WorkflowEntity,
		version: { nodes: INode[]; connections: IConnections },
		nodeIds: Set<INode['id']>,
	) {
		const { nodes, connections } = version;
		dbWorkflow.nodes = nodes;
		dbWorkflow.connections = connections;

		const workflow = new Workflow({
			id: dbWorkflow.id,
			name: dbWorkflow.name,
			nodes,
			connections,
			active: true,
			nodeTypes: this.nodeTypes,
			staticData: dbWorkflow.staticData,
			settings: dbWorkflow.settings,
		});

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId: workflow.id,
			workflowSettings: dbWorkflow.settings,
		});

		const resolveWorkflowData = this.workflowsConfig.useWorkflowPublicationService
			? async () => await this.loadPublishedWorkflowData(dbWorkflow)
			: async () => dbWorkflow as IWorkflowBase;

		let triggerCount = 0;
		await workflow.expression.acquireIsolate();
		try {
			await this.webhookActivationService.addWebhooks({
				workflow,
				additionalData,
				mode: 'trigger',
				activation: 'update',
				nodeIds,
			});

			await this.addNonWebhookTriggers(dbWorkflow, workflow, {
				activationMode: 'update',
				executionMode: 'trigger',
				additionalData,
				resolveWorkflowData,
				nodeIds,
			});

			triggerCount = this.countTriggers(workflow, additionalData);
		} finally {
			await workflow.expression.releaseIsolate();
		}

		await Promise.all([
			this.workflowRepository.updateWorkflowTriggerCount(workflow.id, triggerCount),
			this.workflowStaticDataService.saveStaticData(workflow),
		]);
	}

	/**
	 * Recomputes the persisted trigger count for a workflow version without
	 * registering any triggers. Used when publication only removes triggers.
	 */
	async updateWorkflowTriggerCount(
		dbWorkflow: WorkflowEntity,
		version: { nodes: INode[]; connections: IConnections },
	) {
		const workflow = new Workflow({
			id: dbWorkflow.id,
			name: dbWorkflow.name,
			nodes: version.nodes,
			connections: version.connections,
			active: true,
			nodeTypes: this.nodeTypes,
			staticData: dbWorkflow.staticData,
			settings: dbWorkflow.settings,
		});

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId: workflow.id,
			workflowSettings: dbWorkflow.settings,
		});

		let triggerCount = 0;
		await workflow.expression.acquireIsolate();
		try {
			triggerCount = this.countTriggers(workflow, additionalData);
		} finally {
			await workflow.expression.releaseIsolate();
		}

		await this.workflowRepository.updateWorkflowTriggerCount(workflow.id, triggerCount);
	}

	/**
	 * Deregisters only the given trigger nodes (webhook and non-webhook) of the
	 * given workflow version, leaving the rest active. The "remove" side of a
	 * publication trigger diff; the caller passes the currently published version
	 * so the right webhooks are deregistered.
	 */
	async removeTriggerNodes(
		dbWorkflow: WorkflowEntity,
		version: { nodes: INode[]; connections: IConnections },
		nodeIds: Set<INode['id']>,
	) {
		if (nodeIds.size === 0) return;

		const workflow = new Workflow({
			id: dbWorkflow.id,
			name: dbWorkflow.name,
			nodes: version.nodes,
			connections: version.connections,
			active: true,
			nodeTypes: this.nodeTypes,
			staticData: dbWorkflow.staticData,
			settings: dbWorkflow.settings,
		});

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId: workflow.id,
			workflowSettings: dbWorkflow.settings,
		});

		const removedNodeNames = await this.webhookActivationService.deregisterWebhooks(
			workflow,
			additionalData,
			nodeIds,
		);
		await this.webhookService.deleteWorkflowWebhooksForNodes(dbWorkflow.id, removedNodeNames);

		await this.activeWorkflowTriggers.removeTriggers(dbWorkflow.id, nodeIds);
	}

	/**
	 * Register a workflow's active, poll, and schedule triggers in memory. When
	 * `nodeIds` is given, only those trigger/poll nodes are registered.
	 */
	private async addNonWebhookTriggers(
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

		this.logger.debug(`Added non-webhook triggers for workflow ${formatWorkflow(dbWorkflow)}`);

		return true;
	}

	/**
	 * Return poll function which gets the global functions from n8n-core
	 * and overwrites the emit to be able to start it in subprocess
	 */
	private getExecutePollFunctions(
		workflowData: IWorkflowDb,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
		resolveWorkflowData: () => Promise<IWorkflowBase>,
	): IGetExecutePollFunctions {
		return (workflow: Workflow, node: INode) => {
			const __emit = (
				data: INodeExecutionData[][],
				responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
				donePromise?: IDeferredPromise<IRun | undefined>,
			) => {
				this.logger.debug(`Received event to trigger execution for workflow "${workflow.name}"`);
				void this.workflowStaticDataService.saveStaticData(workflow);

				const executePromise = resolveWorkflowData().then(
					async (freshWorkflowData) =>
						await this.workflowExecutionService.runWorkflow(
							freshWorkflowData,
							node,
							data,
							additionalData,
							mode,
							responsePromise,
						),
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

			const __emitError = (error: ExecutionError) => {
				void this.executionService
					.createErrorExecution(error, node, workflowData, workflow, mode)
					.then(() => {
						this.executeErrorWorkflow(error, workflowData, mode);
					});
			};

			return new PollContext(workflow, node, additionalData, mode, activation, __emit, __emitError);
		};
	}

	/**
	 * Return trigger function which gets the global functions from n8n-core
	 * and overwrites the emit to be able to start it in subprocess
	 */
	private getExecuteTriggerFunctions(
		workflowData: IWorkflowDb,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
		resolveWorkflowData: () => Promise<IWorkflowBase>,
	): IGetExecuteTriggerFunctions {
		return (workflow: Workflow, node: INode) => {
			const emit = (
				data: INodeExecutionData[][],
				responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
				donePromise?: IDeferredPromise<IRun | undefined>,
				deduplicationKey?: string,
			) => {
				this.logger.debug(`Received trigger for workflow "${workflow.name}"`);
				void this.workflowStaticDataService.saveStaticData(workflow);

				const executePromise = resolveWorkflowData()
					.then(
						async (freshWorkflowData) =>
							await this.workflowExecutionService.runWorkflow(
								freshWorkflowData,
								node,
								data,
								additionalData,
								mode,
								responsePromise,
								deduplicationKey,
							),
					)
					.catch((error: unknown) => {
						if (error instanceof DuplicateExecutionError) {
							const context = {
								workflowId: workflowData.id,
								nodeId: node.id,
								deduplicationKey: error.deduplicationKey,
							};
							this.logger.warn('Scheduled execution skipped: duplicate deduplication key', context);
							this.errorReporter.warn(error, { extra: context, shouldBeLogged: false });
							return undefined;
						}
						throw error;
					});

				void executePromise.then((executionId) => {
					// `executionId` is undefined when the catch above swallowed a
					// duplicate scheduled execution; nothing ran, so nothing to emit.
					if (executionId === undefined) return;
					this.eventService.emit('workflow-executed', {
						workflowId: workflowData.id,
						workflowName: workflowData.name,
						executionId,
						source: 'trigger',
					});
				});

				if (donePromise) {
					void executePromise.then((executionId) => {
						// Same as above: a duplicate scheduled execution was skipped,
						// so resolve with undefined and don't wait on a non-existent run.
						if (executionId === undefined) {
							donePromise.resolve(undefined);
							return;
						}
						this.activeExecutions
							.getPostExecutePromise(executionId)
							.then(donePromise.resolve)
							.catch(donePromise.reject);
					});
				} else {
					executePromise.catch((error: Error) => this.logger.error(error.message, { error }));
				}
			};
			const emitError = (error: Error): void => {
				this.logger.info(
					`The trigger node "${node.name}" of workflow "${workflowData.name}" failed with the error: "${error.message}". Will try to reactivate.`,
					{
						nodeName: node.name,
						workflowId: workflowData.id,
						workflowName: workflowData.name,
					},
				);

				// Remove only the failing node's trigger from memory, leaving the
				// workflow's other triggers running.
				void this.activeWorkflowTriggers.removeTriggers(workflowData.id, new Set([node.id]));

				void this.activationErrorsService.register(workflowData.id, error.message);

				// Run Error Workflow if defined
				const activationError = new WorkflowActivationError(
					`There was a problem with the trigger node "${node.name}", for that reason did the workflow had to be deactivated`,
					{ cause: error, node },
				);
				this.executeErrorWorkflow(activationError, workflowData, mode);

				// Retry activation of only this trigger node.
				this.addQueuedTriggerNodeActivation(workflowData as WorkflowEntity, node.id);
			};

			const saveFailedExecution = (error: ExecutionError) => {
				this.logger.info(
					`The trigger node "${node.name}" of workflow "${workflowData.name}" reported the error: "${error.message}". Saving to failed executions`,
					{
						nodeName: node.name,
						workflowId: workflowData.id,
						workflowName: workflowData.name,
					},
				);
				void this.executionService
					.createErrorExecution(error, node, workflowData, workflow, mode)
					.then(() => {
						this.executeErrorWorkflow(error, workflowData, mode);
					});
			};
			return new TriggerContext(
				workflow,
				node,
				additionalData,
				mode,
				activation,
				emit,
				emitError,
				saveFailedExecution,
			);
		};
	}

	private executeErrorWorkflow(
		error: ExecutionError,
		workflowData: IWorkflowBase,
		mode: WorkflowExecuteMode,
	) {
		const fullRunData: IRun = {
			data: createRunExecutionData({
				resultData: {
					error,
					runData: {},
				},
			}),
			finished: false,
			mode,
			startedAt: new Date(),
			stoppedAt: new Date(),
			status: 'running',
			storedAt: this.storageConfig.modeTag,
		};

		executeErrorWorkflow(workflowData, fullRunData, mode);
	}

	/**
	 * Load the published workflow nodes/connections from the
	 * `workflow_published_version` table. The passed-in workflow is used
	 * for all other fields (staticData, settings, etc.).
	 */
	private async loadPublishedWorkflowData(
		initialWorkflowData: IWorkflowDb,
	): Promise<IWorkflowBase> {
		const publishedData = await this.workflowPublishedDataService.getPublishedWorkflowData(
			initialWorkflowData.id,
		);

		if (!publishedData) {
			throw new UnexpectedError('Published version not found for workflow', {
				extra: { workflowId: initialWorkflowData.id },
			});
		}

		const { nodes, connections } = publishedData.publishedVersion;
		return { ...initialWorkflowData, nodes, connections };
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
	 * Add a single trigger node to the activation retry queue. It keeps retrying
	 * the node's activation with exponential backoff until it succeeds.
	 */
	private addQueuedTriggerNodeActivation(dbWorkflow: WorkflowEntity, nodeId: INode['id']) {
		const key = `${dbWorkflow.id}:${nodeId}`;
		const version = { nodes: dbWorkflow.nodes, connections: dbWorkflow.connections };

		const retryFunction = async () => {
			this.logger.info(
				`Try to activate trigger node "${nodeId}" of workflow "${dbWorkflow.name}" (${dbWorkflow.id})`,
				{ workflowId: dbWorkflow.id, nodeId },
			);
			try {
				await this.addTriggerNodes(dbWorkflow, version, new Set([nodeId]));
			} catch (error) {
				this.errorReporter.error(error);
				let lastTimeout = this.queuedTriggerNodeActivations[key].lastTimeout;
				if (!(error instanceof IsolateError) && lastTimeout < WORKFLOW_REACTIVATE_MAX_TIMEOUT) {
					lastTimeout = Math.min(lastTimeout * 2, WORKFLOW_REACTIVATE_MAX_TIMEOUT);
				}

				this.logger.info(
					`Activation of trigger node "${nodeId}" of workflow "${dbWorkflow.name}" (${dbWorkflow.id}) did fail with error: "${
						error.message as string
					}" | retry in ${Math.floor(lastTimeout / 1000)} seconds`,
					{ error, workflowId: dbWorkflow.id, nodeId },
				);

				this.queuedTriggerNodeActivations[key].lastTimeout = lastTimeout;
				this.queuedTriggerNodeActivations[key].timeout = setTimeout(retryFunction, lastTimeout);
				return;
			}
			this.removeQueuedTriggerNodeActivation(key);
			this.logger.info(
				`Activation of trigger node "${nodeId}" of workflow "${dbWorkflow.name}" (${dbWorkflow.id}) was successful!`,
				{ workflowId: dbWorkflow.id, nodeId },
			);
		};

		// Just to be sure that there is no chance that multiple run in parallel
		this.removeQueuedTriggerNodeActivation(key);

		this.queuedTriggerNodeActivations[key] = {
			lastTimeout: WORKFLOW_REACTIVATE_INITIAL_TIMEOUT,
			timeout: setTimeout(retryFunction, WORKFLOW_REACTIVATE_INITIAL_TIMEOUT),
		};
	}

	/**
	 * Remove a single trigger node from the activation retry queue.
	 */
	private removeQueuedTriggerNodeActivation(key: string) {
		if (this.queuedTriggerNodeActivations[key]) {
			clearTimeout(this.queuedTriggerNodeActivations[key].timeout);
			delete this.queuedTriggerNodeActivations[key];
		}
	}

	/**
	 * Remove all trigger nodes from the activation retry queue.
	 */
	@OnShutdown()
	removeAllQueuedTriggerNodeActivations() {
		for (const key in this.queuedTriggerNodeActivations) {
			this.removeQueuedTriggerNodeActivation(key);
		}
	}
}
