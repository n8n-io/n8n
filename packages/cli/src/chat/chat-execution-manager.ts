import { ExecutionRepository } from '@n8n/db';
import type { IExecutionResponse, Project } from '@n8n/db';
import { Service } from '@n8n/di';
import { ExecuteContext, isEngineRequest } from 'n8n-core';
import type {
	IBinaryKeyData,
	INodeExecutionData,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import {
	Workflow,
	BINARY_ENCODING,
	UnexpectedError,
	CHAT_NODE_TYPE,
	CHAT_TOOL_NODE_TYPE,
	NodeConnectionTypes,
	isHitlToolType,
} from 'n8n-workflow';

import { NotFoundError } from '../errors/response-errors/not-found.error';
import { ExecutionPersistence } from '../executions/execution-persistence';
import * as WorkflowExecuteAdditionalData from '../workflow-execute-additional-data';
import { preserveInputOverride } from '../workflow-helpers';
import { WorkflowRunner } from '../workflow-runner';
import type { ChatMessage } from './chat-service.types';
import { findResumeNode, redirectIfToolExecutor } from './utils';
import { NodeTypes } from '../node-types';
import { OwnershipService } from '../services/ownership.service';
import { stripToolSuffix } from '../utils';

@Service()
export class ChatExecutionManager {
	constructor(
		private readonly executionRepository: ExecutionRepository,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly workflowRunner: WorkflowRunner,
		private readonly ownershipService: OwnershipService,
		private readonly nodeTypes: NodeTypes,
	) {}

	async runWorkflow(execution: IExecutionResponse, message: ChatMessage) {
		// Sink guard shared by every chat resume caller (chat websocket, Chat Hub,
		// the auto-resume watcher): only a node a chat mechanism drives — one that
		// implements onMessage — may be resumed here. This makes the allowlist
		// un-skippable so no caller can resume, e.g., a Send-and-Wait gate. Callers
		// are expected to refuse earlier with a user-facing message; reaching this
		// throw means a caller skipped its check. blockUserInput is a per-message
		// policy enforced by the resume-path callers, not here, so auto-resume of
		// chat nodes keeps working.
		if (!this.isChatDrivenExecution(execution)) {
			throw new UnexpectedError('Refusing to resume a non-chat node over chat', {
				extra: { executionId: execution.id },
			});
		}

		await this.workflowRunner.run(await this.getRunData(execution, message), true, true, {
			executionId: execution.id,
			expectedStatus: 'waiting',
		});
	}

	async cancelExecution(executionId: string) {
		const execution = await this.executionPersistence.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!execution) return;

		if (!this.isChatDrivenExecution(execution)) return;

		if (['running', 'waiting', 'unknown'].includes(execution.status)) {
			await this.executionRepository.update({ id: executionId }, { status: 'canceled' });
		}
	}

	async findExecution(executionId: string) {
		return await this.executionPersistence.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
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
	 * `checkHeartbeats` loop and leave the session uncleaned — so an unresolvable
	 * node is simply treated as not chat-resumable.
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
	 * the Chat node and the tools that inherit it (chatTool, chatHitlTool), plus
	 * RespondToWebhook. Send-and-Wait gates, non-chat HITL tools and Wait nodes
	 * have no `onMessage` and must not be resumable over the socket, whatever
	 * token is presented.
	 */
	canResumeOverChat(execution: IExecutionResponse): boolean {
		const target = this.tryResolveResumeTarget(execution);
		if (!target) return false;

		const { node, nodeType } = target;
		if (typeof nodeType.onMessage !== 'function') return false;

		// A chat node is chat-resumable by type but still refuses input when the
		// builder opted out via blockUserInput. This covers the Chat node and its
		// tool variants (chatTool, chatHitlTool) — all resolve to the base chat type
		// and carry the same parameter.
		const isChatBasedNode = stripToolSuffix(node.type) === CHAT_NODE_TYPE;
		if (isChatBasedNode && node.parameters?.blockUserInput === true) return false;

		return true;
	}

	/**
	 * The resolved type of the node a chat message would resume, for diagnostics.
	 * Uses the same resolution as canResumeOverChat — so a PartialExecutionToolExecutor
	 * entry reports the wrapped tool node, not the virtual executor — and fails closed
	 * (undefined) when the node type can't be resolved.
	 */
	resolveResumeNodeType(execution: IExecutionResponse): string | undefined {
		return this.tryResolveResumeTarget(execution)?.node.type;
	}

	/**
	 * Whether the parked node is one a chat socket legitimately drives.
	 * Unlike canResumeOverChat this ignores blockUserInput: a chat node that
	 * opted out of input is still a chat execution owned by its socket, so an
	 * abandoned one should still be cleaned up. Used to decide whether losing the
	 * socket should cancel the execution.
	 */
	private isChatDrivenExecution(execution: IExecutionResponse): boolean {
		const target = this.tryResolveResumeTarget(execution);
		return !!target && typeof target.nodeType.onMessage === 'function';
	}

	private async runNode(execution: IExecutionResponse, message: ChatMessage) {
		const workflow = this.getWorkflow(execution);
		const target = this.resolveResumeTarget(execution, workflow);

		if (!target) return null;

		const { node, nodeType, executionData } = target;
		const additionalData = await WorkflowExecuteAdditionalData.getBase({ workflowId: workflow.id });

		// PartialExecutionToolExecutor is a virtual node not present in the workflow.
		// `node`/`nodeType` already point at the real tool via findResumeNode; this
		// applies the execution-state redirect so onMessage() runs on it (no-op for
		// an ordinary parked node).
		redirectIfToolExecutor(execution, executionData, workflow);

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

		// The chat-based HITL tool resumes here too, but carries the generated
		// `chatHitlTool` type rather than `chatTool`. Without this its output stays on
		// the `main` channel instead of `ai_tool`, so the agent never sees the approval
		// and the gated tool is never executed. Scope this to chat-based tools only:
		// non-chat HITL tools (e.g. telegramHitlTool) are not chat-resumable and must
		// not receive the approval fix-up, so the suffix check is paired with a base
		// type check.
		const resumingNode = runExecutionData.executionData!.nodeExecutionStack[0].node;
		const isChatBasedHitlTool =
			isHitlToolType(resumingNode.type) && stripToolSuffix(resumingNode.type) === CHAT_NODE_TYPE;
		if (resumingNode.type === CHAT_TOOL_NODE_TYPE || isChatBasedHitlTool) {
			runExecutionData.waitTill = undefined;
			resumingNode.disabled = true;
			resumingNode.rewireOutputLogTo = NodeConnectionTypes.AiTool;

			const lastNodeExecuted = runExecutionData.resultData.lastNodeExecuted as string;
			const runDataArray = runExecutionData.resultData.runData[lastNodeExecuted];
			if (runDataArray?.length) preserveInputOverride(runDataArray);
		}

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
