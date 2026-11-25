import { Logger } from '@n8n/backend-common';
import { NodeTypesProxy, UrlService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
	OperationalError,
	UserError,
} from '@n8n/errors';
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
	SubworkflowOperationError,
	Workflow,
} from 'n8n-workflow';

import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import { isManualOrChatExecution } from '@/executions/execution.utils';
import {
	CredentialsPermissionChecker,
	SubworkflowPolicyChecker,
} from '@/executions/pre-execution-checks';
import { toEngineWorkflowPayload } from '@/services/engine-v2-workflow-payload';
import type { EngineWorkflowPayload } from '@/services/engine-v2-workflow-payload';
import { OwnershipService } from '@/services/ownership.service';
import { findSubworkflowStart, withExpressionIsolate } from '@/utils';
import {
	findErrorTrigger,
	findErrorWorkflowTarget,
	resolvesErrorWorkflowOnFailure,
} from '@/workflows/error-workflow-id';
import {
	getBase,
	getDraftWorkflowData,
	getPublishedWorkflowData,
	triggerReturnsLastRunOnly,
} from '@/workflow-execute-additional-data';

import { isErrorRun, toErrorItem, toFailedWorkflow } from './engine-error-workflow-item';
import type {
	ResolvedErrorWorkflow,
	ResolvedSubWorkflow,
	ResolveErrorWorkflowRequest,
	ResolveSubWorkflowRequest,
	ResolveWorkflowRequest,
	ResolveWorkflowResponseFor,
} from './engine-workflow-resolve.contract';

/**
 * One workflow to resolve, as the steps that both kinds share need it. The
 * v1 mode of the new execution selects what differs between the kinds: a
 * sub-execution runs as `integrated`, an error execution as `error`.
 */
interface ResolveTarget {
	workflowId: string;
	executionId: string;
	mode: 'integrated' | 'error';
	/** The workflow that starts the new execution, for the caller policy. */
	caller: { workflowId: string; node?: INode; userId?: string; projectId?: string };
	/** A sub-workflow called from a manual or chat run loads the draft. */
	loadDraft: boolean;
	/** The items the trigger receives. */
	items: INodeExecutionData[];
}

type Resolved = EngineWorkflowPayload & {
	workflowData: IWorkflowBase;
	workflowId: string;
	resolveErrorWorkflowOnFailure: boolean;
};

/** Get the node that called this sub-workflow, for policy checks. */
function toCallerNode(node: ResolveSubWorkflowRequest['parent']['node']): INode {
	return { ...node, position: [0, 0], parameters: {} };
}

/**
 * Resolves a workflow that the engine v2 data plane starts: a sub-workflow that
 * a step calls, or the error workflow of an execution that failed. For both
 * kinds it:
 * - loads the workflow version
 * - checks that the caller can start it
 * - runs the trigger
 * - converts the workflow to an engine graph
 *
 * A refusal throws a response error with a 4xx status.
 */
@Service()
export class EngineWorkflowResolveService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly policyChecker: SubworkflowPolicyChecker,
		private readonly credentialsPermissionChecker: CredentialsPermissionChecker,
		private readonly nodeTypes: NodeTypesProxy,
		private readonly ownershipService: OwnershipService,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	async resolve<R extends ResolveWorkflowRequest>(
		request: R,
	): Promise<ResolveWorkflowResponseFor<R['kind']>>;
	async resolve(
		request: ResolveWorkflowRequest,
	): Promise<ResolvedSubWorkflow | ResolvedErrorWorkflow> {
		return request.kind === 'sub-workflow'
			? await this.resolveSubWorkflow(request)
			: await this.resolveErrorWorkflow(request);
	}

	private get errorTriggerType(): string {
		return this.globalConfig.nodes.errorTriggerType;
	}

	private async resolveSubWorkflow({
		workflowId,
		executionId,
		parent,
		context,
		items,
	}: ResolveSubWorkflowRequest): Promise<ResolvedSubWorkflow> {
		const { workflowData, ...resolved } = await this.resolveTarget({
			workflowId,
			executionId,
			mode: 'integrated',
			caller: {
				workflowId: parent.workflowId,
				node: toCallerNode(parent.node),
				userId: context.userId,
				projectId: context.projectId,
			},
			loadDraft: isManualOrChatExecution(parent.mode),
			items,
		});
		return {
			kind: 'sub-workflow',
			...resolved,
			returnLastRunOnly: triggerReturnsLastRunOnly(workflowData.nodes),
		};
	}

	/** Applies the v1 rules that pick the error workflow, then resolves it like a sub-workflow. */
	private async resolveErrorWorkflow({
		executionId,
		source,
	}: ResolveErrorWorkflowRequest): Promise<ResolvedErrorWorkflow> {
		const failedWorkflow = toFailedWorkflow(source);
		if (!failedWorkflow) {
			throw new BadRequestError('The stored workflow of the failed execution has no nodes');
		}

		const target = findErrorWorkflowTarget(
			failedWorkflow,
			isErrorRun(source),
			this.errorTriggerType,
		);
		if (target.kind === 'loop') {
			throw new BadRequestError(
				'The error execution failed, and its workflow names itself as its error workflow',
			);
		}
		if (target.kind === 'none') {
			throw new NotFoundError(
				'The settings name no error workflow, and the workflow has no Error Trigger',
			);
		}

		// v1 reads the project of the failed workflow, and finds none for a deleted workflow.
		if (!(await this.workflowRepository.exists({ where: { id: source.workflowId } }))) {
			throw new NotFoundError(`The failed workflow "${source.workflowId}" no longer exists`);
		}
		// v1 runs the error workflow in the project of the failed workflow, with no user.
		const project = await this.ownershipService.getWorkflowProjectCached(source.workflowId);

		const url = `${this.urlService.getInstanceBaseUrl()}/workflow/${source.workflowId}/executions/${source.executionId}`;
		const { workflowData: _, ...resolved } = await this.resolveTarget({
			workflowId: target.workflowId,
			executionId,
			mode: 'error',
			caller: {
				workflowId: source.workflowId,
				node: failedWorkflow.nodes.find((node) => node.name === source.failedStep?.nodeName),
				projectId: project.id,
			},
			loadDraft: false,
			items: [{ json: toErrorItem(source, failedWorkflow, url) }],
		});
		return { kind: 'error-workflow', ...resolved, projectId: project.id };
	}

	/** The steps that both kinds share. */
	private async resolveTarget(target: ResolveTarget): Promise<Resolved> {
		const workflowData = await this.load(target);
		await this.assertCallable(workflowData, target);
		const trigger = this.findTrigger(workflowData, target.mode);
		// We run the trigger here so the execution receives the trigger output like any other execution.
		const triggerOutputs = await this.runTrigger(workflowData, trigger, target);

		return {
			workflowData,
			workflowId: workflowData.id,
			...(await this.toPayload(workflowData, trigger, triggerOutputs)),
			// v1 suppresses the error workflow only for a top-level run, so the
			// suppression flag of the caller never applies here.
			resolveErrorWorkflowOnFailure: resolvesErrorWorkflowOnFailure(
				workflowData,
				target.mode,
				this.errorTriggerType,
			),
		};
	}

	/** The v1 rule: the draft for a manual or chat run, the published version otherwise. */
	private async load({ workflowId, caller, loadDraft }: ResolveTarget): Promise<IWorkflowBase> {
		const exists = await this.workflowRepository.exists({ where: { id: workflowId } });
		if (!exists) throw new NotFoundError(`Workflow "${workflowId}" does not exist`);

		const info = { id: workflowId };
		if (loadDraft) return await getDraftWorkflowData(info, caller.workflowId);
		try {
			return await getPublishedWorkflowData(info, caller.workflowId);
		} catch (error) {
			// The workflow exists, so the only expected failure is that it has no published version.
			if (error instanceof OperationalError) throw new BadRequestError(error.message);
			throw error;
		}
	}

	/**
	 * The checks v1 runs before the new execution starts. v1 runs no credential
	 * check for an error workflow.
	 */
	private async assertCallable(workflowData: IWorkflowBase, target: ResolveTarget): Promise<void> {
		const { caller, mode } = target;
		try {
			// Independent checks. When both refuse, the first rejection is the one reported.
			await Promise.all([
				this.policyChecker.check(workflowData, caller.workflowId, caller.node, caller.userId),
				mode === 'integrated'
					? this.credentialsPermissionChecker.check(
							workflowData.id,
							workflowData.nodes,
							caller.userId,
						)
					: undefined,
			]);
		} catch (error) {
			if (error instanceof SubworkflowPolicyDenialError) {
				if (mode === 'error') {
					this.logger.info('Error workflow execution blocked due to subworkflow settings', {
						erroredWorkflowId: caller.workflowId,
						errorWorkflowId: workflowData.id,
					});
				}
				throw new ForbiddenError(error.message, error.description ?? undefined);
			}
			if (error instanceof UserError) throw new ForbiddenError(error.message);
			throw error;
		}

		if (workflowData.settings?.engineType !== 'v2') {
			throw new BadRequestError(
				`The ${labelOf(mode)} "${workflowData.name}" runs on engine v1, and a workflow on engine v2 cannot use it`,
			);
		}
	}

	private findTrigger(workflowData: IWorkflowBase, mode: ResolveTarget['mode']): INode {
		const trigger =
			mode === 'error'
				? findErrorTrigger(workflowData.nodes, this.errorTriggerType)
				: this.findSubWorkflowTrigger(workflowData);
		if (!trigger) {
			throw new BadRequestError(
				`The published version of error workflow "${workflowData.name}" has no enabled Error Trigger`,
			);
		}
		// The finder does not skip disabled nodes, and the converter drops them from the graph.
		if (trigger.disabled) {
			throw new BadRequestError(
				`The trigger "${trigger.name}" of ${labelOf(mode)} "${workflowData.name}" is disabled`,
			);
		}
		return trigger;
	}

	private findSubWorkflowTrigger(workflowData: IWorkflowBase): INode {
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
	 * Runs the trigger node with the given items, as v1 runs it as the first
	 * node of the workflow. The Execute Workflow Trigger maps the items onto the
	 * fields it declares. The Error Trigger returns them unchanged outside a
	 * manual run. The legacy Start node has no execute method, so the items
	 * pass through unchanged.
	 */
	private async runTrigger(
		workflowData: IWorkflowBase,
		trigger: INode,
		{ items, executionId, mode, caller }: ResolveTarget,
	): Promise<INodeExecutionData[][]> {
		const nodeType = this.nodeTypes.getByNameAndVersion(trigger.type, trigger.typeVersion);
		const { execute } = nodeType;
		if (typeof execute !== 'function') return [items];

		const workflow = new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.activeVersionId !== null,
			nodeTypes: this.nodeTypes,
			settings: workflowData.settings,
		});
		const additionalData = await getBase({
			userId: caller.userId,
			workflowId: workflowData.id,
			projectId: caller.projectId,
		});
		// The trigger runs as the new execution's first node, so `$execution.id` is the new execution's.
		additionalData.executionId = executionId;
		const inputData: ITaskDataConnections = { main: [items] };
		const executeData: IExecuteData = { node: trigger, data: inputData, source: null };
		const executeContext = new ExecuteContext(
			workflow,
			trigger,
			additionalData,
			mode,
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

	/** A workflow that the converter refuses never becomes runnable by a retry, so it is a refusal. */
	private async toPayload(
		workflowData: IWorkflowBase,
		trigger: INode,
		triggerOutputs: INodeExecutionData[][],
	): Promise<EngineWorkflowPayload> {
		try {
			return await toEngineWorkflowPayload({
				workflowData,
				triggerName: trigger.name,
				triggerOutputs,
			});
		} catch (error) {
			if (!(error instanceof UserError)) throw error;
			throw new BadRequestError(
				`Engine v2 cannot run the workflow "${workflowData.name}": ${error.message}`,
			);
		}
	}
}

function labelOf(mode: ResolveTarget['mode']): string {
	return mode === 'error' ? 'error workflow' : 'sub-workflow';
}
