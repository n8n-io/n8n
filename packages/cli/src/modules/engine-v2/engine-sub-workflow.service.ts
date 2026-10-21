import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { ExecuteContext } from 'n8n-core';
import type {
	IExecuteData,
	INode,
	INodeExecutionData,
	ITaskDataConnections,
	IWorkflowBase,
} from 'n8n-workflow';
import {
	createEmptyRunExecutionData,
	Node,
	OperationalError,
	SubworkflowOperationError,
	UnexpectedError,
	UserError,
	Workflow,
} from 'n8n-workflow';

import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import { toWorkflowDocument } from '@/executions/execution-data/types';
import { isManualOrChatExecution } from '@/executions/execution.utils';
import {
	CredentialsPermissionChecker,
	SubworkflowPolicyChecker,
} from '@/executions/pre-execution-checks';
import { NodeTypes } from '@/node-types';
import { findSubworkflowStart, withExpressionIsolate } from '@/utils';
import {
	getBase,
	getDraftWorkflowData,
	getPublishedWorkflowData,
	triggerReturnsLastRunOnly,
} from '@/workflow-execute-additional-data';

import type {
	ResolveSubWorkflowRequest,
	ResolveSubWorkflowResponse,
} from './engine-sub-workflow.contract';

/** The calling node as the policy denial names it. Only its identity travels. */
function toCallerNode(node: ResolveSubWorkflowRequest['parent']['node']): INode | undefined {
	return node ? { ...node, position: [0, 0], parameters: {} } : undefined;
}

/**
 * Resolves a sub-workflow for the engine v2 data plane: which version runs,
 * whether the parent may call it, and what the parent's items become at its
 * trigger. The data plane cannot load a workflow or apply a policy, so this is
 * the only place a child is resolved. Starting the child is the engine's.
 */
@Service()
export class EngineSubWorkflowService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly policyChecker: SubworkflowPolicyChecker,
		private readonly credentialsPermissionChecker: CredentialsPermissionChecker,
		private readonly nodeTypes: NodeTypes,
	) {}

	async resolve({
		workflowId,
		executionId,
		parent,
		context,
		items,
	}: ResolveSubWorkflowRequest): Promise<ResolveSubWorkflowResponse> {
		const workflowData = await this.load(workflowId, parent);
		await this.assertCallable(workflowData, parent, context);
		const trigger = this.findTrigger(workflowData);
		const outputs = await this.runTrigger(workflowData, trigger, items, executionId, context);

		// Lazily imported: a top-level import would pull the v1 step executor and
		// its dependencies into every n8n process, including ones with the module off.
		const { V1WorkflowConverter, toStepOutputs } = await import('@n8n/node-engine-compatibility');
		const slots = toStepOutputs(outputs);

		return {
			workflowId: workflowData.id,
			graph: new V1WorkflowConverter().convert(workflowData, trigger.name),
			workflow: toWorkflowDocument(workflowData),
			// The wire schema rejects an empty array; `null` is how "no slots" is sent.
			triggerOutputs: slots.length === 0 ? null : slots,
			returnLastRunOnly: triggerReturnsLastRunOnly(workflowData.nodes),
		};
	}

	/** The v1 rule: the draft for a manual or chat run, the published version otherwise. */
	private async load(
		workflowId: string,
		parent: ResolveSubWorkflowRequest['parent'],
	): Promise<IWorkflowBase> {
		const exists = await this.workflowRepository.findOne({
			where: { id: workflowId },
			select: ['id'],
		});
		if (!exists) throw new NotFoundError(`Workflow "${workflowId}" does not exist`);

		const info = { id: workflowId };
		if (isManualOrChatExecution(parent.mode)) {
			return await getDraftWorkflowData(info, parent.workflowId);
		}
		try {
			return await getPublishedWorkflowData(info, parent.workflowId);
		} catch (error) {
			// Both say the same thing: there is no published version to run.
			if (error instanceof OperationalError || error instanceof UnexpectedError) {
				throw new BadRequestError(error.message);
			}
			throw error;
		}
	}

	/**
	 * The checks v1 runs before a child starts, in the same order. Each refusal
	 * becomes a response the node can show.
	 */
	private async assertCallable(
		workflowData: IWorkflowBase,
		parent: ResolveSubWorkflowRequest['parent'],
		context: ResolveSubWorkflowRequest['context'],
	): Promise<void> {
		try {
			await this.policyChecker.check(
				workflowData,
				parent.workflowId,
				toCallerNode(parent.node),
				context.userId,
			);
			await this.credentialsPermissionChecker.check(
				workflowData.id,
				workflowData.nodes,
				context.userId,
			);
		} catch (error) {
			if (error instanceof SubworkflowPolicyDenialError) {
				throw new ForbiddenError(error.message, error.description ?? undefined);
			}
			if (error instanceof UserError) throw new ForbiddenError(error.message);
			throw error;
		}

		if (workflowData.settings?.engineType !== 'v2') {
			throw new BadRequestError(
				`The sub-workflow "${workflowData.name}" runs on engine v1, and a workflow on engine v2 cannot call it yet`,
			);
		}
	}

	private findTrigger(workflowData: IWorkflowBase): INode {
		try {
			return findSubworkflowStart(workflowData.nodes);
		} catch (error) {
			if (error instanceof SubworkflowOperationError) {
				throw new BadRequestError(`${error.message}: ${error.description}`);
			}
			throw error;
		}
	}

	/**
	 * Runs the trigger node with the parent's items, as v1 runs it as the first
	 * node of the child. Its execute method maps the items onto the fields the
	 * trigger declares. A start node without one passes the items through.
	 */
	private async runTrigger(
		workflowData: IWorkflowBase,
		trigger: INode,
		items: INodeExecutionData[],
		executionId: string,
		context: ResolveSubWorkflowRequest['context'],
	): Promise<INodeExecutionData[][]> {
		const nodeType = this.nodeTypes.getByNameAndVersion(trigger.type, trigger.typeVersion);
		const { execute } = nodeType;
		if (typeof execute !== 'function') return [items];

		const workflow = new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes: this.nodeTypes,
			settings: workflowData.settings,
		});
		const additionalData = await getBase({
			userId: context.userId,
			workflowId: workflowData.id,
			projectId: context.projectId,
		});
		// The trigger runs as the child's first node, so `$execution.id` is the child's.
		additionalData.executionId = executionId;
		const inputData: ITaskDataConnections = { main: [items] };
		const executeData: IExecuteData = { node: trigger, data: inputData, source: null };
		const executeContext = new ExecuteContext(
			workflow,
			trigger,
			additionalData,
			'integrated',
			createEmptyRunExecutionData(),
			0,
			items,
			inputData,
			executeData,
			[],
		);

		const output = await withExpressionIsolate(workflow, async () => {
			// A class-based node takes the context as its argument, a declarative one as `this`.
			if (nodeType instanceof Node && nodeType.execute)
				return await nodeType.execute(executeContext);
			return await execute.call(executeContext);
		});
		// A trigger emits items or nothing. It never asks the engine for anything.
		return Array.isArray(output) ? output : [];
	}
}
