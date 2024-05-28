import { Service } from 'typedi';
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
} from 'n8n-workflow';
import {
	SubworkflowOperationError,
	Workflow,
	ErrorReporterProxy as ErrorReporter,
} from 'n8n-workflow';

import config from '@/config';
import type { User } from '@db/entities/User';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import type { WorkflowRequest } from '@/workflows/workflow.request';
import type {
	ExecutionPayload,
	IWorkflowDb,
	IWorkflowErrorData,
	IWorkflowExecutionDataProcess,
} from '@/Interfaces';
import { NodeTypes } from '@/NodeTypes';
import { WorkflowRunner } from '@/WorkflowRunner';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import { TestWebhooks } from '@/TestWebhooks';
import { Logger } from '@/Logger';
import { PermissionChecker } from '@/UserManagement/PermissionChecker';
import type { Project } from '@/databases/entities/Project';

@Service()
export class WorkflowExecutionService {
	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly testWebhooks: TestWebhooks,
		private readonly permissionChecker: PermissionChecker,
		private readonly workflowRunner: WorkflowRunner,
	) {}

	async runWorkflow(
		workflowData: IWorkflowDb,
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

		return await this.workflowRunner.run(runData, true, undefined, undefined, responsePromise);
	}

	async executeManually(
		{
			workflowData,
			runData,
			pinData,
			startNodes,
			destinationNode,
		}: WorkflowRequest.ManualRunPayload,
		user: User,
		pushRef?: string,
	) {
		const pinnedTrigger = this.selectPinnedActivatorStarter(
			workflowData,
			startNodes?.map((nodeData) => nodeData.name),
			pinData,
		);

		// If webhooks nodes exist and are active we have to wait for till we receive a call
		if (
			pinnedTrigger === null &&
			(runData === undefined ||
				startNodes === undefined ||
				startNodes.length === 0 ||
				destinationNode === undefined)
		) {
			const additionalData = await WorkflowExecuteAdditionalData.getBase(user.id);

			const needsWebhook = await this.testWebhooks.needsWebhook(
				user.id,
				workflowData,
				additionalData,
				runData,
				pushRef,
				destinationNode,
			);

			if (needsWebhook) return { waitingForWebhook: true };
		}

		// For manual testing always set to not active
		workflowData.active = false;

		// Start the workflow
		const data: IWorkflowExecutionDataProcess = {
			destinationNode,
			executionMode: 'manual',
			runData,
			pinData,
			pushRef,
			startNodes,
			workflowData,
			userId: user.id,
		};

		const hasRunData = (node: INode) => runData !== undefined && !!runData[node.name];

		if (pinnedTrigger && !hasRunData(pinnedTrigger)) {
			data.startNodes = [{ name: pinnedTrigger.name, sourceData: null }];
		}

		const executionId = await this.workflowRunner.run(data);

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
				active: workflowData.active,
				staticData: workflowData.staticData,
				settings: workflowData.settings,
			});

			try {
				const failedNode = workflowErrorData.execution?.lastNodeExecuted
					? workflowInstance.getNode(workflowErrorData.execution?.lastNodeExecuted)
					: undefined;
				await this.permissionChecker.checkSubworkflowExecutePolicy(
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
					const fakeExecution = WorkflowHelpers.generateFailedExecutionFromError(
						'error',
						errorWorkflowPermissionError,
						initialNode,
					);

					const fullExecutionData: ExecutionPayload = {
						data: fakeExecution.data,
						mode: fakeExecution.mode,
						finished: false,
						startedAt: new Date(),
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
			const ERROR_TRIGGER_TYPE = config.getEnv('nodes.errorTriggerType');
			for (const nodeName of Object.keys(workflowInstance.nodes)) {
				node = workflowInstance.nodes[nodeName];
				if (node.type === ERROR_TRIGGER_TYPE) {
					workflowStartNode = node;
				}
			}

			if (workflowStartNode === undefined) {
				this.logger.error(
					`Calling Error Workflow for "${workflowErrorData.workflow.id}". Could not find "${ERROR_TRIGGER_TYPE}" in workflow "${workflowId}"`,
				);
				return;
			}

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
			});

			const runExecutionData: IRunExecutionData = {
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

			const runData: IWorkflowExecutionDataProcess = {
				executionMode,
				executionData: runExecutionData,
				workflowData,
				projectId: runningProject.id,
			};

			await this.workflowRunner.run(runData);
		} catch (error) {
			ErrorReporter.error(error);
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
	selectPinnedActivatorStarter(workflow: IWorkflowDb, startNodes?: string[], pinData?: IPinData) {
		if (!pinData || !startNodes) return null;

		const allPinnedActivators = this.findAllPinnedActivators(workflow, pinData);

		if (allPinnedActivators.length === 0) return null;

		const [firstPinnedActivator] = allPinnedActivators;

		// full manual execution

		if (startNodes?.length === 0) return firstPinnedActivator ?? null;

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
			active: workflow.active,
			nodeTypes: this.nodeTypes,
		}).getParentNodes(firstStartNodeName);

		if (parentNodeNames.length > 0) {
			const parentNodeName = parentNodeNames.find((p) => p === firstPinnedActivator.name);

			return allPinnedActivators.find((pa) => pa.name === parentNodeName) ?? null;
		}

		return allPinnedActivators.find((pa) => pa.name === firstStartNodeName) ?? null;
	}

	private findAllPinnedActivators(workflow: IWorkflowDb, pinData?: IPinData) {
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
