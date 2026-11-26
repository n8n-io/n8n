import { ExecutionRepository } from '@n8n/db';
import type { IExecutionResponse, Project } from '@n8n/db';
import { Service } from '@n8n/di';
import { ExecuteContext, isEngineRequest } from 'n8n-core';
import type {
	IBinaryKeyData,
	INodeExecutionData,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { Workflow, BINARY_ENCODING, UnexpectedError } from 'n8n-workflow';

import { NotFoundError } from '../errors/response-errors/not-found.error';
import * as WorkflowExecuteAdditionalData from '../workflow-execute-additional-data';
import { WorkflowRunner } from '../workflow-runner';
import type { ChatMessage } from './chat-service.types';
import { findResumeNode } from './utils';
import { NodeTypes } from '../node-types';
import { OwnershipService } from '../services/ownership.service';

@Service()
export class ChatExecutionManager {
	constructor(
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRunner: WorkflowRunner,
		private readonly ownershipService: OwnershipService,
		private readonly nodeTypes: NodeTypes,
	) {}

	async runWorkflow(execution: IExecutionResponse, message: ChatMessage) {
		await this.workflowRunner.run(
			await this.getRunData(execution, message),
			true,
			true,
			execution.id,
		);
	}

	async cancelExecution(executionId: string) {
		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!execution) return;

		// Only a chat-driven execution is owned by its socket. A socket attached to
		// any other waiting execution must not cancel it when it goes away.
		if (!this.canResumeOverChat(execution)) return;

		if (['running', 'waiting', 'unknown'].includes(execution.status)) {
			await this.executionRepository.update({ id: executionId }, { status: 'canceled' });
		}
	}

	async findExecution(executionId: string) {
		return await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
	}
	async checkIfExecutionExists(executionId: string) {
		return await this.executionRepository.findSingleExecution(executionId);
	}

	private getWorkflow(execution: IExecutionResponse) {
		const { workflowData } = execution;
		return new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			nodeTypes: this.nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});
	}

	private async mapFilesToBinaryData(context: ExecuteContext, files: ChatMessage['files']) {
		if (!files) return;
		const binary: IBinaryKeyData = {};

		for (const [index, file] of files.entries()) {
			const base64 = file.data;
			const buffer = Buffer.from(base64, BINARY_ENCODING);
			const binaryData = await context.helpers.prepareBinaryData(buffer, file.name, file.type);

			binary[`data_${index}`] = binaryData;
		}

		return binary;
	}

	/**
	 * Resolves the node a chat message would resume and its (version-resolved)
	 * node type, without mutating the execution. Shared by the resume guard and
	 * `runNode` so the authorization decision can never drift from what runs.
	 */
	private resolveResumeTarget(execution: IExecutionResponse, workflow: Workflow) {
		const executionData = execution.data.executionData?.nodeExecutionStack[0];
		if (!executionData) return null;

		const node = findResumeNode(executionData, workflow);
		if (!node) return null;

		const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		return { node, nodeType, executionData };
	}

	/**
	 * `resolveResumeTarget` wrapped to fail closed. Building the workflow / resolving
	 * the parked node's type throws if a node type is unavailable (e.g. an
	 * uninstalled community node). The guards below must never throw — a resume
	 * decision that blows up would, on the heartbeat path, abort the whole
	 * `checkHeartbeats` loop — so an unresolvable node is treated as not chat-resumable.
	 */
	private tryResolveResumeTarget(execution: IExecutionResponse) {
		try {
			return this.resolveResumeTarget(execution, this.getWorkflow(execution));
		} catch {
			return null;
		}
	}

	/**
	 * A chat message may only resume a node that implements the `onMessage` hook:
	 * the Chat node and its tool variant (chatTool), plus RespondToWebhook.
	 * Send-and-Wait gates, Wait nodes and forms have no `onMessage` and must not be
	 * resumable over the socket.
	 */
	canResumeOverChat(execution: IExecutionResponse): boolean {
		const target = this.tryResolveResumeTarget(execution);
		return !!target && typeof target.nodeType.onMessage === 'function';
	}

	/**
	 * The resolved type of the node a chat message would resume, for diagnostics.
	 * Fails closed (undefined) when the node type can't be resolved.
	 */
	resolveResumeNodeType(execution: IExecutionResponse): string | undefined {
		return this.tryResolveResumeTarget(execution)?.node.type;
	}

	private async runNode(execution: IExecutionResponse, message: ChatMessage) {
		const workflow = this.getWorkflow(execution);
		const target = this.resolveResumeTarget(execution, workflow);

		if (!target) return null;

		const { node, nodeType, executionData } = target;
		const additionalData = await WorkflowExecuteAdditionalData.getBase({ workflowId: workflow.id });

		const inputData = executionData.data;
		const connectionInputData = executionData.data.main[0];
		const context = new ExecuteContext(
			workflow,
			node,
			additionalData,
			'manual',
			execution.data,
			0,
			connectionInputData ?? [],
			inputData,
			executionData,
			[],
		);

		const { sessionId, action, chatInput, files } = message;
		const binary = await this.mapFilesToBinaryData(context, files);

		const nodeExecutionData: INodeExecutionData = { json: { sessionId, action, chatInput } };
		if (binary && Object.keys(binary).length > 0) {
			nodeExecutionData.binary = binary;
		}

		if (nodeType.onMessage) {
			await workflow.expression.acquireIsolate();
			try {
				return await nodeType.onMessage(context, nodeExecutionData);
			} finally {
				await workflow.expression.releaseIsolate();
			}
		}

		return [[nodeExecutionData]];
	}

	private async getRunData(execution: IExecutionResponse, message: ChatMessage) {
		const { workflowData, mode: executionMode, data: runExecutionData } = execution;

		const result = await this.runNode(execution, message);

		if (isEngineRequest(result)) {
			throw new UnexpectedError("Can't handle actions inside the chat trigger.");
		}

		runExecutionData.executionData!.nodeExecutionStack[0].data.main = result ?? [
			[{ json: message }],
		];

		let project: Project | undefined = undefined;
		try {
			project = await this.ownershipService.getWorkflowProjectCached(workflowData.id);
		} catch (error) {
			throw new NotFoundError('Cannot find workflow');
		}

		const runData: IWorkflowExecutionDataProcess = {
			executionMode,
			executionData: runExecutionData,
			pushRef: runExecutionData.pushRef,
			workflowData,
			pinData: runExecutionData.resultData.pinData,
			projectId: project?.id,
		};

		return runData;
	}
}
