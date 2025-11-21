import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { Project, User, CreateExecutionPayload } from '@n8n/db';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Response } from 'express';
import { DirectedGraph, ErrorReporter, allReachableRootsHaveRunData } from 'n8n-core';
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
	IRunData,
} from 'n8n-workflow';
import { SubworkflowOperationError, Workflow, createRunExecutionData } from 'n8n-workflow';
import * as a from 'node:assert/strict';

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

	private doesTriggerHaveRunData(
		destinationNode: string,
		workflowData: IWorkflowBase,
		runData: IRunData,
	) {
		return allReachableRootsHaveRunData(
			DirectedGraph.fromNodesAndConnections(workflowData.nodes, workflowData.connections),
			destinationNode,
			runData,
		);
	}

	async executeManually(
		payload: WorkflowRequest.ManualRunPayload,
		user: User,
		pushRef?: string,
		streamingEnabled?: boolean,
		httpResponse?: Response,
	) {
		function isFullManualExecutionFromKnownTriggerPayload(
			payload: WorkflowRequest.ManualRunPayload,
		): payload is WorkflowRequest.FullManualExecutionFromKnownTriggerPayload {
			if ('triggerToStartFrom' in payload && !('runData' in payload)) {
				return true;
			}
			return false;
		}

		function isFullManualExecutionFromUnknownTriggerPayload(
			payload: WorkflowRequest.ManualRunPayload,
		): payload is WorkflowRequest.FullManualExecutionFromUnknownTriggerPayload {
			if (!('triggerToStartFrom' in payload) && !('runData' in payload)) {
				return true;
			}
			return false;
		}

		function isPartialManualExecutionToDestination(
			payload: WorkflowRequest.ManualRunPayload,
		): payload is WorkflowRequest.PartialManualExecutionToDestination {
			if ('destinationNode' in payload && 'runData' in payload) {
				return true;
			}
			return false;
		}

		// For manual testing always set to not active
		payload.workflowData.active = false;
		payload.workflowData.activeVersionId = null;

		// TODO: fix this on the FE
		if ('triggerToStartFrom' in payload) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
			delete (payload as any).runData;
		}

		console.log('payload', payload);

		if (isPartialManualExecutionToDestination(payload)) {
			console.log('isPartialManualExecutionToDestination');

			const destinationNode = payload.destinationNode
				? ({ nodeName: payload.destinationNode, mode: 'inclusive' } as const)
				: undefined;

			if (
				// If the trigger has no runData we have to upgrade to a
				// FullManualExecutionFromUnknownTriggerPayload
				!this.doesTriggerHaveRunData(
					payload.destinationNode,
					payload.workflowData,
					payload.runData,
				) ||
				// If the destination node is a trigger, then per definition this
				// is not a partial execution and thus we can ignore the run data.
				// If we don't do this we'll end up creating an execution, calling the
				// partial execution flow, finding out that we don't have run data to
				// create the execution stack and have to cancel the execution, come back
				// here and either create the runData (e.g. scheduler trigger) or wait for
				// a webhook or event.
				this.isDestinationNodeATrigger(payload.destinationNode, payload.workflowData)
			) {
				console.log('upgrade to FullManualExecutionFromUnknownTriggerPayload');
				payload = {
					workflowData: payload.workflowData,
					destinationNode: payload.destinationNode,
					agentRequest: payload.agentRequest,
				} satisfies WorkflowRequest.FullManualExecutionFromUnknownTriggerPayload;
			} else {
				console.log('prerequisitesAreGiven');
				const executionId = await this.workflowRunner.run({
					destinationNode,
					executionMode: 'manual',
					runData: payload.runData,
					pinData: payload.workflowData.pinData,
					pushRef,
					workflowData: payload.workflowData,
					userId: user.id,
					dirtyNodeNames: payload.dirtyNodeNames,
					agentRequest: payload.agentRequest,
					streamingEnabled,
					httpResponse,
					// startNodes,
					// triggerToStartFrom: payload.triggerToStartFrom,
				});
				return { executionId };
			}
		}

		if (isFullManualExecutionFromKnownTriggerPayload(payload)) {
			console.log('isFullManualExecutionFromKnownTriggerPayload');

			const destinationNode = payload.destinationNode
				? ({ nodeName: payload.destinationNode, mode: 'inclusive' } as const)
				: undefined;

			const pinnedTrigger = this.selectPinnedActivatorStarter(
				payload.workflowData,
				[], //startNodes?.map((nodeData) => nodeData.name),
				payload.workflowData.pinData,
				payload.destinationNode,
			);

			if (pinnedTrigger === null) {
				console.log('check webhooks');
				const additionalData = await WorkflowExecuteAdditionalData.getBase({
					userId: user.id,
					workflowId: payload.workflowData.id,
				});

				const needsWebhook = await this.testWebhooks.needsWebhook({
					userId: user.id,
					workflowEntity: payload.workflowData,
					additionalData,
					pushRef,
					triggerToStartFrom: payload.triggerToStartFrom,
					destinationNode,
					// runData,
				});

				console.log('needsWebhook', needsWebhook);
				if (needsWebhook) {
					return { waitingForWebhook: true };
				}
			}

			const executionId = await this.workflowRunner.run({
				executionMode: 'manual',
				pinData: payload.workflowData.pinData,
				pushRef,
				workflowData: payload.workflowData,
				userId: user.id,
				triggerToStartFrom: payload.triggerToStartFrom,
				agentRequest: payload.agentRequest,
				streamingEnabled,
				httpResponse,
				destinationNode,
				// runData,
				// startNodes,
				// dirtyNodeNames,
			});

			return { executionId };
		}

		if (isFullManualExecutionFromUnknownTriggerPayload(payload)) {
			console.log('isFullManualExecutionFromUnknownTriggerPayload');

			const destinationNode = payload.destinationNode
				? ({ nodeName: payload.destinationNode, mode: 'inclusive' } as const)
				: undefined;

			// TODO: rewrite this, it returns pinned triggers that are not connected
			// to the destinationNode
			const pinnedTrigger = this.selectPinnedActivatorStarter(
				payload.workflowData,
				[], //startNodes?.map((nodeData) => nodeData.name),
				payload.workflowData.pinData,
				payload.destinationNode,
			);

			if (pinnedTrigger === null) {
				console.log('check webhooks');
				const additionalData = await WorkflowExecuteAdditionalData.getBase({
					userId: user.id,
					workflowId: payload.workflowData.id,
				});

				const needsWebhook = await this.testWebhooks.needsWebhook({
					userId: user.id,
					workflowEntity: payload.workflowData,
					additionalData,
					pushRef,
					destinationNode,
					// triggerToStartFrom: payload.triggerToStartFrom,
					// runData,
				});

				console.log('needsWebhook', needsWebhook);
				if (needsWebhook) {
					return { waitingForWebhook: true };
				}
			}

			if (pinnedTrigger) {
				console.log('rewrite startNodes');
				console.log('pinnedTrigger', pinnedTrigger);
			}

			const executionId = this.workflowRunner.run({
				executionMode: 'manual',
				pinData: payload.workflowData.pinData,
				pushRef,
				workflowData: payload.workflowData,
				userId: user.id,
				agentRequest: payload.agentRequest,
				streamingEnabled,
				httpResponse,
				destinationNode,
				triggerToStartFrom: pinnedTrigger ? { name: pinnedTrigger.name } : undefined,
				// startNodes,
				// runData,
				// dirtyNodeNames,
			});

			return { executionId };
		}

		a.fail('should never happen');
	}

	async executeChatWorkflow(
		workflowData: IWorkflowBase,
		executionData: IRunExecutionData,
		user: User,
		httpResponse?: Response,
		streamingEnabled?: boolean,
	) {
		const data: IWorkflowExecutionDataProcess = {
			executionMode: 'chat',
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
	 * Select the pinned activator node to use as starter for a manual execution.
	 *
	 * In a full manual execution, select the pinned activator that was first added
	 * to the workflow, prioritizing `n8n-nodes-base.webhook` over other activators.
	 *
	 * In a partial manual execution, if the executed node has parent nodes among the
	 * pinned activators, select the pinned activator that was first added to the workflow,
	 * prioritizing `n8n-nodes-base.webhook` over other activators. If the executed node
	 * has no upstream nodes and is itself is a pinned activator, select it.
	 */
	selectPinnedActivatorStarter(
		workflow: IWorkflowBase,
		// TODO: remove this argument, it's not used anymore
		startNodes?: string[],
		pinData?: IPinData,
		destinationNode?: string,
	) {
		if (!pinData || !startNodes) return null;

		const allPinnedActivators = this.findAllPinnedActivators(workflow, pinData);

		if (allPinnedActivators.length === 0) return null;

		const [firstPinnedActivator] = allPinnedActivators;

		// full manual execution

		if (startNodes?.length === 0) {
			// If there is a destination node, find the pinned activator that is a parent of the destination node
			if (destinationNode) {
				const destinationParents = new Set(
					new Workflow({
						nodes: workflow.nodes,
						connections: workflow.connections,
						active: workflow.activeVersionId !== null,
						nodeTypes: this.nodeTypes,
					}).getParentNodes(destinationNode),
				);

				const activator = allPinnedActivators.find((a) => destinationParents.has(a.name));

				if (activator) {
					return activator;
				}
			}

			return firstPinnedActivator ?? null;
		}

		// partial manual execution

		/**
		 * If the partial manual execution has 2+ start nodes, we search only the zeroth
		 * start node's parents for a pinned activator. If we had 2+ start nodes without
		 * a common ancestor and so if we end up finding multiple pinned activators, we
		 * would still need to return one to comply with existing usage.
		 */
		const [firstStartNodeName] = startNodes;

		const parentNodeNames = new Workflow({
			nodes: workflow.nodes,
			connections: workflow.connections,
			active: workflow.activeVersionId !== null,
			nodeTypes: this.nodeTypes,
		}).getParentNodes(firstStartNodeName);

		if (parentNodeNames.length > 0) {
			const parentNodeName = parentNodeNames.find((p) => p === firstPinnedActivator.name);

			return allPinnedActivators.find((pa) => pa.name === parentNodeName) ?? null;
		}

		return allPinnedActivators.find((pa) => pa.name === firstStartNodeName) ?? null;
	}

	private findAllPinnedActivators(workflow: IWorkflowBase, pinData?: IPinData) {
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
}
