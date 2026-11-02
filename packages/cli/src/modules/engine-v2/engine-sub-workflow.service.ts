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
	UserError,
	Workflow,
} from 'n8n-workflow';

import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import { isManualOrChatExecution } from '@/executions/execution.utils';
import {
	CredentialsPermissionChecker,
	SubworkflowPolicyChecker,
} from '@/executions/pre-execution-checks';
import { NodeTypes } from '@/node-types';
import { toEngineWorkflowPayload } from '@/services/engine-v2-workflow-payload';
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

/** Get the node that called this sub-workflow, for policy checks. */
function toCallerNode(node: ResolveSubWorkflowRequest['parent']['node']): INode {
	return { ...node, position: [0, 0], parameters: {} };
}

/**
 * Resolves a sub-workflow for the engine v2 data plane:
 * - resolve the sub-workflow version
 * - check that the call is allowed
 * - run the trigger
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
		workflowId: subWorkflowId,
		executionId: subExecutionId,
		parent,
		context,
		items,
	}: ResolveSubWorkflowRequest): Promise<ResolveSubWorkflowResponse> {
		const subWorkflowData = await this.load(subWorkflowId, parent);
		await this.assertCallable(subWorkflowData, parent, context);
		const trigger = this.findTrigger(subWorkflowData);
		// We run the trigger here so the execution receives the trigger output like any other execution.
		const triggerOutputs = await this.runTrigger(
			subWorkflowData,
			trigger,
			items,
			subExecutionId,
			context,
		);

		return {
			workflowId: subWorkflowData.id,
			...(await toEngineWorkflowPayload({
				workflowData: subWorkflowData,
				triggerName: trigger.name,
				triggerOutputs,
			})),
			returnLastRunOnly: triggerReturnsLastRunOnly(subWorkflowData.nodes),
		};
	}

	/** The v1 rule: the draft for a manual or chat run, the published version otherwise. */
	private async load(
		workflowId: string,
		parent: ResolveSubWorkflowRequest['parent'],
	): Promise<IWorkflowBase> {
		const exists = await this.workflowRepository.exists({ where: { id: workflowId } });
		if (!exists) throw new NotFoundError(`Workflow "${workflowId}" does not exist`);

		const info = { id: workflowId };
		if (isManualOrChatExecution(parent.mode)) {
			return await getDraftWorkflowData(info, parent.workflowId);
		}
		try {
			return await getPublishedWorkflowData(info, parent.workflowId);
		} catch (error) {
			// The workflow exists, so the only expected failure is that it has no published version.
			if (error instanceof OperationalError) throw new BadRequestError(error.message);
			throw error;
		}
	}

	/** The checks v1 runs before a sub-execution starts, in the same order. */
	private async assertCallable(
		subWorkflowData: IWorkflowBase,
		parent: ResolveSubWorkflowRequest['parent'],
		context: ResolveSubWorkflowRequest['context'],
	): Promise<void> {
		try {
			await this.policyChecker.check(
				subWorkflowData,
				parent.workflowId,
				toCallerNode(parent.node),
				context.userId,
			);
			await this.credentialsPermissionChecker.check(
				subWorkflowData.id,
				subWorkflowData.nodes,
				context.userId,
			);
		} catch (error) {
			if (error instanceof SubworkflowPolicyDenialError) {
				throw new ForbiddenError(error.message, error.description ?? undefined);
			}
			if (error instanceof UserError) throw new ForbiddenError(error.message);
			throw error;
		}

		if (subWorkflowData.settings?.engineType !== 'v2') {
			throw new BadRequestError(
				`The sub-workflow "${subWorkflowData.name}" runs on engine v1, and a workflow on engine v2 cannot call it yet`,
			);
		}
	}

	private findTrigger(subWorkflowData: IWorkflowBase): INode {
		try {
			return findSubworkflowStart(subWorkflowData.nodes);
		} catch (error) {
			if (error instanceof SubworkflowOperationError) {
				throw new BadRequestError(`${error.message}: ${error.description}`);
			}
			throw error;
		}
	}

	/**
	 * Runs the trigger node with the parent's items, as v1 runs it as the first
	 * node of the sub-workflow. Its execute method maps the items onto the fields
	 * the trigger declares. The legacy Start node has no execute method, so the
	 * items pass through unchanged.
	 */
	private async runTrigger(
		subWorkflowData: IWorkflowBase,
		trigger: INode,
		items: INodeExecutionData[],
		executionId: string,
		context: ResolveSubWorkflowRequest['context'],
	): Promise<INodeExecutionData[][]> {
		const nodeType = this.nodeTypes.getByNameAndVersion(trigger.type, trigger.typeVersion);
		const { execute } = nodeType;
		if (typeof execute !== 'function') return [items];

		const workflow = new Workflow({
			id: subWorkflowData.id,
			name: subWorkflowData.name,
			nodes: subWorkflowData.nodes,
			connections: subWorkflowData.connections,
			active: subWorkflowData.activeVersionId !== null,
			nodeTypes: this.nodeTypes,
			settings: subWorkflowData.settings,
		});
		const additionalData = await getBase({
			userId: context.userId,
			workflowId: subWorkflowData.id,
			projectId: context.projectId,
		});
		// The trigger runs as the sub-execution's first node, so `$execution.id` is the sub-execution's.
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
