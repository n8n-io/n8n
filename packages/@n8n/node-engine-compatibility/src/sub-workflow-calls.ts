import type {
	ChildResult,
	ChildResumeCause,
	ChildDeclaration,
	StepExecutionContext,
	StepError,
} from '@n8n/engine';
import type {
	ExecuteWorkflowData,
	IExecuteWorkflowInfo,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import { v7 as uuidv7 } from 'uuid';

import {
	InlineSubWorkflowError,
	RepeatedSubWorkflowCallError,
	SubWorkflowsNotSupportedError,
} from './errors';
import { fromStepInputs } from './io';
import type { SubWorkflowResolver } from './types';
import { toV1ExecuteMode } from './v1-adapters';

/** The options of `executeWorkflow` that the shim reads. */
interface CallOptions {
	doNotWaitToFinish?: boolean;
	returnLastRunOnly?: boolean;
}

/**
 * The sub-workflow calls of one node run. On a first run a call becomes a
 * child the engine starts: awaited, which suspends the step, or detached,
 * which rides on the outputs. On a child resume the node runs again, and the
 * same call is answered from the child's result instead.
 *
 * Only a node that runs through `DurableWaitExecuteContext` reaches this: the
 * Execute Sub-workflow node and its kind, whose work before the call has no
 * side effect. An AI Agent tool calls through a supply-data context, which
 * keeps the host's unimplemented `executeWorkflow`, so it never replays here.
 */
export class SubWorkflowCalls {
	/** The child the step waits for, once an awaited call was made. */
	awaited?: ChildDeclaration;
	/** The children the node started without waiting. */
	readonly detached: ChildDeclaration[] = [];
	private called = false;

	constructor(
		private readonly node: INode,
		private readonly stepContext: StepExecutionContext,
		private readonly resolve?: SubWorkflowResolver,
		private readonly resume?: ChildResumeCause,
	) {}

	async call(
		workflowInfo: IExecuteWorkflowInfo,
		items: INodeExecutionData[],
		options: CallOptions = {},
	): Promise<ExecuteWorkflowData> {
		if (this.resume) return this.answerFromChild(this.resume, options);

		// A second call would start a second child the engine cannot wait for.
		// The first one is dropped too, so no child starts for a run that fails,
		// whichever way the node reports the failure.
		if (this.called) {
			this.awaited = undefined;
			this.detached.length = 0;
			throw new RepeatedSubWorkflowCallError(this.node.name);
		}
		this.called = true;

		if (workflowInfo.id === undefined) throw new InlineSubWorkflowError(this.node.name);
		if (!this.resolve) throw new SubWorkflowsNotSupportedError(this.node.name);

		// Minted here, before the child is resolved, so its trigger runs under it
		// and a fire-and-forget node reports the id as v1 does.
		const executionId = uuidv7();
		const { id, name, type, typeVersion } = this.node;
		const resolved = await this.resolve({
			workflowId: workflowInfo.id,
			executionId,
			parent: {
				executionId: this.stepContext.executionId,
				workflowId: this.stepContext.workflowId,
				mode: toV1ExecuteMode(this.stepContext),
				node: { id, name, type, typeVersion },
			},
			context: {
				userId: this.stepContext.callerContext.userId,
				projectId: this.stepContext.callerContext.projectId,
			},
			items,
		});
		const child: ChildDeclaration = { executionId, ...resolved };

		if (options.doNotWaitToFinish) {
			this.detached.push(child);
			return { executionId: child.executionId, data: [null] };
		}

		// The node completes this run on an empty result, which the executor
		// replaces with the child declaration. It runs again with the result when
		// the child ends.
		this.awaited = child;
		return { executionId: child.executionId, data: [[]] };
	}

	private answerFromChild(resume: ChildResumeCause, options: CallOptions): ExecuteWorkflowData {
		if (resume.status !== 'completed') throw toChildError(resume.error);
		return {
			executionId: resume.executionId,
			data: toSubWorkflowOutput(resume.result, options.returnLastRunOnly ?? false),
		};
	}
}

/**
 * The child's result as the node receives it: every terminal step's items,
 * concatenated per output slot in the order the child reported them.
 *
 * An item's own paired-item mark points into the child, at the input of the
 * node that produced it, and nothing here can follow it back to the child's
 * trigger. The marks are dropped, so the node pairs each item with its own
 * input by index instead.
 *
 * The last-run-only option keeps the last pass of each terminal node. v1 keeps
 * the last pass of the one node that ran last, so the two differ for a child
 * with several terminal branches, as the whole result does.
 */
export function toSubWorkflowOutput(
	result: ChildResult,
	lastRunOnly: boolean,
): Array<INodeExecutionData[] | null> {
	const steps = lastRunOnly ? lastPassPerNode(result) : result;
	const slots: INodeExecutionData[][] = [];
	for (const step of steps) {
		fromStepInputs(step.outputs).forEach((items, slot) => {
			(slots[slot] ??= []).push(...items.map(withoutPairedItem));
		});
	}
	return slots.length === 0 ? [[]] : slots.map((slot) => slot ?? []);
}

function withoutPairedItem({ pairedItem, ...item }: INodeExecutionData): INodeExecutionData {
	return item;
}

function lastPassPerNode(result: ChildResult): ChildResult {
	const last = new Map<string, ChildResult[number]>();
	for (const step of result) {
		const seen = last.get(step.nodeId);
		if (!seen || seen.iteration < step.iteration) last.set(step.nodeId, step);
	}
	return result.filter((step) => last.get(step.nodeId) === step);
}

/** The child's failure, as the error the node would have seen from the child on v1. */
function toChildError(error: StepError): Error {
	const childError = new Error(error.message);
	childError.name = error.name;
	if (error.stack) childError.stack = error.stack;
	return childError;
}
