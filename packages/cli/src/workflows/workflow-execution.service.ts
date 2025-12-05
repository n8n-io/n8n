import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { Project, User, CreateExecutionPayload } from '@n8n/db';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Response } from 'express';
import { DirectedGraph, ErrorReporter, anyReachableRootHasRunData } from 'n8n-core';
import type {
	IDeferredPromise,
	IExecuteData,
	IExecuteResponsePromiseData,
	INode,
	INodeExecutionData,
	IPinData,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
	IWorkflowExecutionDataProcess,
	IWorkflowBase,
} from 'n8n-workflow';
import {
	SubworkflowOperationError,
	UnexpectedError,
	Workflow,
	createRunExecutionData,
} from 'n8n-workflow';

import { ExecutionDataService } from '@/executions/execution-data.service';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import type { IWorkflowErrorData } from '@/interfaces';
import { NodeTypes } from '@/node-types';
import { TestWebhooks } from '@/webhooks/test-webhooks';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowRequest } from '@/workflows/workflow.request';

@Service()
export class WorkflowExecutionService {
	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly testWebhooks: TestWebhooks,
		private readonly workflowRunner: WorkflowRunner,
		private readonly globalConfig: GlobalConfig,
		private readonly subworkflowPolicyChecker: SubworkflowPolicyChecker,
		private readonly executionDataService: ExecutionDataService,
	) {}

	async runWorkflow(
		workflowData: IWorkflowBase,
		node: INode,
		data: INodeExecutionData[][],
		additionalData: IWorkflowExecuteAdditionalData,
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

		const executionData = createRunExecutionData({
			executionData: {
				nodeExecutionStack,
			},
		});

		// Start the workflow
		const runData: IWorkflowExecutionDataProcess = {
			userId: additionalData.userId,
			executionMode: mode,
			executionData,
			workflowData,
		};

		return await this.workflowRunner.run(runData, true, undefined, undefined, responsePromise);
	}

	private isDestinationNodeATrigger(destinationNode: string, workflow: IWorkflowBase) {
		const node = workflow.nodes.find((n) => n.name === destinationNode);

		if (node === undefined) {
			return false;
		}

		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		return nodeType.description.group.includes('trigger');
	}

	async executeManually(
		payload: WorkflowRequest.ManualRunPayload,
		user: User,
		pushRef?: string,
	): Promise<{ executionId: string } | { waitingForWebhook: boolean }> {
		// Check whether this workflow is active.
		const workflowIsActive = await this.workflowRepository.isActive(payload.workflowData.id);

		// For manual testing always set to not active
		payload.workflowData.active = false;
		payload.workflowData.activeVersionId = null;

		// TODO: Will be fixed on the FE side with CAT-1808
		if ('triggerToStartFrom' in payload) {
			Reflect.deleteProperty(payload, 'runData');
		}

		let data: IWorkflowExecutionDataProcess | undefined;

		// Case 1: Partial execution to a destination node, and we have enough runData to start the execution.
		if (isPartialExecution(payload)) {
			if (this.partialExecutionFulfilsPreconditions(payload)) {
				data = {
					destinationNode: payload.destinationNode,
					executionMode: 'manual',
					runData: payload.runData,
					pinData: payload.workflowData.pinData,
					pushRef,
					workflowData: payload.workflowData,
					userId: user.id,
					dirtyNodeNames: payload.dirtyNodeNames,
					agentRequest: payload.agentRequest,
				};
			} else {
				payload = upgradeToFullManualExecutionFromUnknownTrigger(payload);
			}
		}

		// Case 2: Full execution from a known trigger.
		if (isFullExecutionFromKnownTrigger(payload)) {
			// Check if we need a webhook.
			if (
				triggerHasNoPinnedData(payload) &&
				(await this.testWebhooks.needsWebhook({
					userId: user.id,
					workflowEntity: payload.workflowData,
					additionalData: await WorkflowExecuteAdditionalData.getBase({
						userId: user.id,
						workflowId: payload.workflowData.id,
					}),
					pushRef,
					triggerToStartFrom: payload.triggerToStartFrom,
					destinationNode: payload.destinationNode,
					workflowIsActive,
				}))
			) {
				return { waitingForWebhook: true };
			}

			data = {
				executionMode: 'manual',
				pinData: payload.workflowData.pinData,
				pushRef,
				workflowData: payload.workflowData,
				userId: user.id,
				triggerToStartFrom: payload.triggerToStartFrom,
				agentRequest: payload.agentRequest,
				destinationNode: payload.destinationNode,
			};
		}

		// Case 3: Full execution from an unknown trigger.
		if (isFullExecutionFromUnknownTrigger(payload)) {
			const pinnedTrigger = this.selectPinnedTrigger(
				payload.workflowData,
				payload.destinationNode.nodeName,
				payload.workflowData.pinData ?? {},
			);

			if (
				pinnedTrigger === undefined &&
				(await this.testWebhooks.needsWebhook({
					userId: user.id,
					workflowEntity: payload.workflowData,
					additionalData: await WorkflowExecuteAdditionalData.getBase({
						userId: user.id,
						workflowId: payload.workflowData.id,
					}),
					pushRef,
					destinationNode: payload.destinationNode,
					workflowIsActive,
				}))
			) {
				return { waitingForWebhook: true };
			}

			data = {
				executionMode: 'manual',
				pinData: payload.workflowData.pinData,
				pushRef,
				workflowData: payload.workflowData,
				userId: user.id,
				agentRequest: payload.agentRequest,
				destinationNode: payload.destinationNode,
				triggerToStartFrom: pinnedTrigger ? { name: pinnedTrigger.name } : undefined,
			};
		}

		if (data) {
			const offloadingManualExecutionsInQueueMode =
				this.globalConfig.executions.mode === 'queue' &&
				process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS === 'true';

			/**
			 * Historically, manual executions in scaling mode ran in the main process,
			 * so some execution details were never persisted in the database.
			 *
			 * Currently, manual executions in scaling mode are offloaded to workers,
			 * so we persist all details to give workers full access to them.
			 */
			if (data.executionMode === 'manual' && offloadingManualExecutionsInQueueMode) {
				data.executionData = createRunExecutionData({
					startData: {
						startNodes: data.startNodes,
						destinationNode: data.destinationNode,
					},
					resultData: {
						pinData: data.pinData,
						// Set this to null so `createRunExecutionData` doesn't initialize it.
						// Otherwise this would be treated as a partial execution.
						runData: data.runData ?? null,
					},
					manualData: {
						userId: data.userId,
						dirtyNodeNames: data.dirtyNodeNames,
						triggerToStartFrom: data.triggerToStartFrom,
					},
					// Set this to null so `createRunExecutionData` doesn't initialize it.
					// Otherwise this would be treated as a resumed execution after waiting.
					executionData: null,
				});
			}

			const executionId = await this.workflowRunner.run(data);
			return { executionId };
		}

		throw new UnexpectedError('`executeManually` was called with an unexpected payload', {
			extra: { payload },
		});
	}

	async executeChatWorkflow(
		workflowData: IWorkflowBase,
		executionData: IRunExecutionData,
		user: User,
		httpResponse?: Response,
		streamingEnabled?: boolean,
		executionMode: WorkflowExecuteMode = 'chat',
	) {
		const data: IWorkflowExecutionDataProcess = {
			executionMode,
			workflowData,
			userId: user.id,
			executionData,
			streamingEnabled,
			httpResponse,
		};

		const executionId = await this.workflowRunner.run(data, undefined, true);

		return {
			executionId,
		};
	}

	/** Executes an error workflow */
	async executeErrorWorkflow(
		workflowId: string,
		workflowErrorData: IWorkflowErrorData,
		runningProject: Project,
	): Promise<void> {
		// Wrap everything in try/catch to make sure that no errors bubble up and all get caught here
		try {
			const workflowData = await this.workflowRepository.findOneBy({ id: workflowId });
			if (workflowData === null) {
				// The error workflow could not be found
				this.logger.error(
					`Calling Error Workflow for "${workflowErrorData.workflow.id}". Could not find error workflow "${workflowId}"`,
					{ workflowId },
				);
				return;
			}

			const executionMode = 'error';
			const workflowInstance = new Workflow({
				id: workflowId,
				name: workflowData.name,
				nodeTypes: this.nodeTypes,
				nodes: workflowData.nodes,
				connections: workflowData.connections,
				active: workflowData.activeVersion !== null,
				staticData: workflowData.staticData,
				settings: workflowData.settings,
			});

			try {
				const failedNode = workflowErrorData.execution?.lastNodeExecuted
					? workflowInstance.getNode(workflowErrorData.execution?.lastNodeExecuted)
					: undefined;
				await this.subworkflowPolicyChecker.check(
					workflowInstance,
					workflowErrorData.workflow.id!,
					failedNode ?? undefined,
				);
			} catch (error) {
				const initialNode = workflowInstance.getStartNode();
				if (initialNode) {
					const errorWorkflowPermissionError = new SubworkflowOperationError(
						`Another workflow: (ID ${workflowErrorData.workflow.id}) tried to invoke this workflow to handle errors.`,
						"Unfortunately current permissions do not allow this. Please check that this workflow's settings allow it to be called by others",
					);

					// Create a fake execution and save it to DB.
					const fakeExecution = this.executionDataService.generateFailedExecutionFromError(
						'error',
						errorWorkflowPermissionError,
						initialNode,
					);

					const fullExecutionData: CreateExecutionPayload = {
						data: fakeExecution.data,
						mode: fakeExecution.mode,
						finished: false,
						stoppedAt: new Date(),
						workflowData,
						waitTill: null,
						status: fakeExecution.status,
						workflowId: workflowData.id,
					};

					await this.executionRepository.createNewExecution(fullExecutionData);
				}
				this.logger.info('Error workflow execution blocked due to subworkflow settings', {
					erroredWorkflowId: workflowErrorData.workflow.id,
					errorWorkflowId: workflowId,
				});
				return;
			}

			let node: INode;
			let workflowStartNode: INode | undefined;
			const { errorTriggerType } = this.globalConfig.nodes;
			for (const nodeName of Object.keys(workflowInstance.nodes)) {
				node = workflowInstance.nodes[nodeName];
				if (node.type === errorTriggerType) {
					workflowStartNode = node;
				}
			}

			if (workflowStartNode === undefined) {
				this.logger.error(
					`Calling Error Workflow for "${workflowErrorData.workflow.id}". Could not find "${errorTriggerType}" in workflow "${workflowId}"`,
				);
				return;
			}

			const parentExecution =
				workflowErrorData.execution?.id && workflowErrorData.workflow?.id
					? {
							executionId: workflowErrorData.execution.id,
							workflowId: workflowErrorData.workflow.id,
							executionContext: workflowErrorData.execution.executionContext,
						}
					: undefined;

			// Can execute without webhook so go on
			// Initialize the data of the webhook node
			const nodeExecutionStack: IExecuteData[] = [];
			nodeExecutionStack.push({
				node: workflowStartNode,
				data: {
					main: [
						[
							{
								json: workflowErrorData,
							},
						],
					],
				},
				source: null,
				...(parentExecution && {
					metadata: {
						parentExecution,
					},
				}),
			});

			const runExecutionData = createRunExecutionData({
				executionData: {
					nodeExecutionStack,
				},
			});

			const runData: IWorkflowExecutionDataProcess = {
				executionMode,
				executionData: runExecutionData,
				workflowData,
				projectId: runningProject.id,
			};

			await this.workflowRunner.run(runData);
		} catch (error) {
			this.errorReporter.error(error);
			this.logger.error(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				`Calling Error Workflow for "${workflowErrorData.workflow.id}": "${error.message}"`,
				{ workflowId: workflowErrorData.workflow.id },
			);
		}
	}

	/**
	 * Select the pinned trigger node to use as starter for a manual execution.
	 *
	 * Finds all pinned trigger nodes in the workflow, then returns the first pinned trigger
	 * that is a parent of the destination node. Webhook triggers are prioritized over other
	 * trigger types in the sorting order.
	 *
	 * @param workflow The workflow containing the nodes and connections
	 * @param destinationNode The name of the node to find a pinned trigger for
	 * @param pinData Pin data mapping node names to their pinned data
	 * @returns The pinned trigger node if found, undefined otherwise
	 */
	selectPinnedTrigger(
		workflow: IWorkflowBase,
		destinationNode: string,
		pinData: IPinData,
	): INode | undefined {
		const allPinnedTriggers = this.findAllPinnedTriggers(workflow, pinData);

		if (allPinnedTriggers.length === 0) return undefined;

		const destinationParents = new Set(
			new Workflow({
				nodes: workflow.nodes,
				connections: workflow.connections,
				active: workflow.activeVersionId !== null,
				nodeTypes: this.nodeTypes,
			}).getParentNodes(destinationNode),
		);

		const trigger = allPinnedTriggers.find((a) => destinationParents.has(a.name));

		return trigger;
	}

	private findAllPinnedTriggers(workflow: IWorkflowBase, pinData?: IPinData) {
		return workflow.nodes
			.filter(
				(node) =>
					!node.disabled &&
					pinData?.[node.name] &&
					['trigger', 'webhook'].some((suffix) => node.type.toLowerCase().endsWith(suffix)) &&
					node.type !== 'n8n-nodes-base.respondToWebhook',
			)
			.sort((a) => (a.type.endsWith('webhook') ? -1 : 1));
	}

	/**
	 * Checks if there is enough run data to run this as a partial execution and
	 * that we're not having the edge case that the destination node itself is a
	 * trigger.
	 */
	private partialExecutionFulfilsPreconditions(
		payload: WorkflowRequest.PartialManualExecutionToDestinationPayload,
	): boolean {
		// If the destination is a trigger node, we treat it as a full execution.
		if (this.isDestinationNodeATrigger(payload.destinationNode.nodeName, payload.workflowData)) {
			return false;
		}

		// If we have enough run data to reach the destination from a trigger it's a partial execution.
		// Otherwise it's a full execution.
		return anyReachableRootHasRunData(
			DirectedGraph.fromNodesAndConnections(
				payload.workflowData.nodes,
				payload.workflowData.connections,
			),
			payload.destinationNode.nodeName,
			payload.runData,
		);
	}
}

/**
 * Type guard to check if payload is a PartialManualExecutionToDestinationPayload.
 *
 * A partial execution payload has both `destinationNode` and `runData`.
 * This indicates execution to a specific node using existing run data.
 */
function isPartialExecution(
	payload: WorkflowRequest.ManualRunPayload,
): payload is WorkflowRequest.PartialManualExecutionToDestinationPayload {
	return 'destinationNode' in payload && 'runData' in payload;
}

/**
 * Type guard to check if payload is a FullManualExecutionFromKnownTriggerPayload.
 *
 * A known trigger payload has `triggerToStartFrom` specified but no `runData`.
 * This indicates the user has selected a specific trigger node to start the execution from.
 */
function isFullExecutionFromKnownTrigger(
	payload: WorkflowRequest.ManualRunPayload,
): payload is WorkflowRequest.FullManualExecutionFromKnownTriggerPayload {
	return 'triggerToStartFrom' in payload;
}

/**
 * Type guard to check if payload is a FullManualExecutionFromUnknownTriggerPayload.
 *
 * An unknown trigger payload has neither `triggerToStartFrom` nor `runData`.
 * The trigger will need to be determined.
 */
function isFullExecutionFromUnknownTrigger(
	payload: WorkflowRequest.ManualRunPayload,
): payload is WorkflowRequest.FullManualExecutionFromUnknownTriggerPayload {
	if ('triggerToStartFrom' in payload) {
		return false;
	}
	return !('runData' in payload);
}

function triggerHasNoPinnedData(
	payload: WorkflowRequest.FullManualExecutionFromKnownTriggerPayload,
) {
	return payload.workflowData.pinData?.[payload.triggerToStartFrom.name] === undefined;
}

function upgradeToFullManualExecutionFromUnknownTrigger(
	payload: WorkflowRequest.PartialManualExecutionToDestinationPayload,
): WorkflowRequest.FullManualExecutionFromUnknownTriggerPayload {
	// If the payload has runData or executionData, remove them to convert to full execution.
	return {
		workflowData: payload.workflowData,
		destinationNode: payload.destinationNode,
		agentRequest: payload.agentRequest,
	};
}
