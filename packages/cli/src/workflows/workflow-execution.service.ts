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
		// TODO:
		// - figure out where to do the OffloadingManualExecutionsInQueueMode changes

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
			console.log('isFullManualExecutionFromTriggerPayload');

			const destinationNode = payload.destinationNode
				? ({ nodeName: payload.destinationNode, mode: 'inclusive' } as const)
				: undefined;

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
			if (needsWebhook) return { waitingForWebhook: true };

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
			console.log('isFullManualExecutionToDestinationPayload');

			const destinationNode = payload.destinationNode
				? ({ nodeName: payload.destinationNode, mode: 'inclusive' } as const)
				: undefined;

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
			if (needsWebhook) return { waitingForWebhook: true };

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
				// triggerToStartFrom: payload.triggerToStartFrom,
				// runData,
				// startNodes,
				// dirtyNodeNames,
			});

			return { executionId };
		}

		a.fail('should never happen');

		// const {
		// 	workflowData,
		// 	destinationNode,
		// 	dirtyNodeNames,
		// 	triggerToStartFrom,
		// 	agentRequest,
		// 	startNodes,
		// } = payload as WorkflowRequest.FullManualExecutionToDestinationPayload &
		// 	WorkflowRequest.FullManualExecutionFromTriggerPayload &
		// 	WorkflowRequest.PartialManualExecutionToDestination & { startNodes?: StartNodeData[] };
		//
		// let { runData } = payload as Partial<
		// 	WorkflowRequest.FullManualExecutionToDestinationPayload &
		// 		WorkflowRequest.FullManualExecutionFromTriggerPayload &
		// 		WorkflowRequest.PartialManualExecutionToDestination & { startNodes?: StartNodeData[] }
		// >;
		//
		// // I don't need the pinned trigger if
		// // * this is a FullManualExecutionFromTriggerPayload and we have a trigger to start from or
		// // * if it's a PartialManualExecutionToDestination (unless there is no trigger in runData connecting to the destinationNode)
		// const pinData = workflowData.pinData;
		// let pinnedTrigger = this.selectPinnedActivatorStarter(
		// 	workflowData,
		// 	startNodes?.map((nodeData) => nodeData.name),
		// 	pinData,
		// 	destinationNode,
		// );
		//
		// // TODO: Reverse the order of events, first find out if the execution is
		// // partial or full, if it's partial create the execution and run, if it's
		// // full get the data first and only then create the execution.
		// //
		// // If the destination node is a trigger, then per definition this
		// // is not a partial execution and thus we can ignore the run data.
		// // If we don't do this we'll end up creating an execution, calling the
		// // partial execution flow, finding out that we don't have run data to
		// // create the execution stack and have to cancel the execution, come back
		// // here and either create the runData (e.g. scheduler trigger) or wait for
		// // a webhook or event.
		// if (destinationNode) {
		// 	if (this.isDestinationNodeATrigger(destinationNode, workflowData)) {
		// 		console.log('isDestinationNodeATrigger');
		// 		runData = undefined;
		// 	}
		// }
		//
		// // NOTE: only necessary for FullManualExecutionToDestinationPayload and
		// // FullManualExecutionFromTriggerPayload if the trigger is a webhook.
		// //
		// // if we have a trigger to start from and it's not the pinned trigger
		// // ignore the pinned trigger
		// if (pinnedTrigger && triggerToStartFrom && pinnedTrigger.name !== triggerToStartFrom.name) {
		// 	console.log('delete pinnedTrigger');
		// 	pinnedTrigger = null;
		// }
		//
		// // If webhooks nodes exist and are active we have to wait for till we receive a call
		// if (
		// 	pinnedTrigger === null &&
		// 	(runData === undefined ||
		// 		startNodes === undefined ||
		// 		startNodes.length === 0 ||
		// 		destinationNode === undefined)
		// ) {
		// 	console.log('check webhooks');
		// 	const additionalData = await WorkflowExecuteAdditionalData.getBase({
		// 		userId: user.id,
		// 		workflowId: workflowData.id,
		// 	});
		//
		// 	const needsWebhook = await this.testWebhooks.needsWebhook({
		// 		userId: user.id,
		// 		workflowEntity: workflowData,
		// 		additionalData,
		// 		runData,
		// 		pushRef,
		// 		destinationNode,
		// 		triggerToStartFrom,
		// 	});
		//
		// 	if (needsWebhook) return { waitingForWebhook: true };
		// }
		//
		// // Start the workflow
		// const data: IWorkflowExecutionDataProcess = {
		// 	destinationNode,
		// 	executionMode: 'manual',
		// 	runData,
		// 	pinData,
		// 	pushRef,
		// 	startNodes,
		// 	workflowData,
		// 	userId: user.id,
		// 	dirtyNodeNames,
		// 	triggerToStartFrom,
		// 	agentRequest,
		// 	streamingEnabled,
		// 	httpResponse,
		// };
		//
		// const hasRunData = (node: INode) => runData !== undefined && !!runData[node.name];
		//
		// if (pinnedTrigger && !hasRunData(pinnedTrigger)) {
		// 	console.log('redo startNodes');
		// 	data.startNodes = [{ name: pinnedTrigger.name, sourceData: null }];
		// }
		//
		// const offloadingManualExecutionsInQueueMode =
		// 	this.globalConfig.executions.mode === 'queue' &&
		// 	process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS === 'true';
		//
		// // NOTE: I think we can move this down the stack.
		// /**
		//  * Historically, manual executions in scaling mode ran in the main process,
		//  * so some execution details were never persisted in the database.
		//  *
		//  * Currently, manual executions in scaling mode are offloaded to workers,
		//  * so we persist all details to give workers full access to them.
		//  */
		// if (offloadingManualExecutionsInQueueMode) {
		// 	console.log('offloadingManualExecutionsInQueueMode');
		// 	data.executionData = createRunExecutionData({
		// 		startData: {
		// 			startNodes: data.startNodes,
		// 			destinationNode,
		// 		},
		// 		resultData: {
		// 			pinData,
		// 			// If `runData` is initialized to an empty object the execution will
		// 			// be treated like a partial manual execution instead of a full
		// 			// manual execution.
		// 			// So we have to set this to null to instruct
		// 			// `createRunExecutionData` to not initialize it.
		// 			runData: runData ?? null,
		// 		},
		// 		manualData: {
		// 			userId: data.userId,
		// 			dirtyNodeNames,
		// 			triggerToStartFrom,
		// 		},
		// 		// If `executionData` is initialized the execution will be treated like
		// 		// a resumed execution after waiting, instead of a manual execution.
		// 		// So we have to set this to null to instruct `createRunExecutionData`
		// 		// to not initialize it.
		// 		executionData: null,
		// 	});
		// }
		//
		// console.log('run');
		// const executionId = await this.workflowRunner.run(data);
		//
		// return {
		// 	executionId,
		// };
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
		if (this.isDestinationNodeATrigger(payload.destinationNode, payload.workflowData)) {
			return false;
		}

		// If we have enough run data to reach the destination from a trigger it's a partial execution.
		// Otherwise it's a full execution.
		return anyReachableRootHasRunData(
			DirectedGraph.fromNodesAndConnections(
				payload.workflowData.nodes,
				payload.workflowData.connections,
			),
			payload.destinationNode,
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
