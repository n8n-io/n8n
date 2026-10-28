import type {
	SubExecutionResult,
	SubExecutionResumeCause,
	SubExecutionDeclaration,
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
 * sub-execution the engine starts: awaited, which suspends the step, or detached,
 * which rides on the outputs. On a sub-execution resume the node runs again, and the
 * same call is answered from the sub-execution's result instead.
 *
 * Only a node that runs through `DurableWaitExecuteContext` reaches this: the
 * Execute Sub-workflow node and its kind, whose work before the call has no
 * side effect. An AI Agent tool calls through a supply-data context, which
 * keeps the host's unimplemented `executeWorkflow`, so it never replays here.
 */
export class SubWorkflowCalls {
	/** The sub-execution the step waits for, once an awaited call was made. */
	awaited?: SubExecutionDeclaration;
	/** The sub-executions the node started without waiting. */
	readonly detached: SubExecutionDeclaration[] = [];
	private called = false;

	constructor(
		private readonly node: INode,
		private readonly stepContext: StepExecutionContext,
		private readonly resolve?: SubWorkflowResolver,
		private readonly resume?: SubExecutionResumeCause,
	) {}

	async call(
		workflowInfo: IExecuteWorkflowInfo,
		items: INodeExecutionData[],
		options: CallOptions = {},
	): Promise<ExecuteWorkflowData> {
		if (this.resume) return this.answerFromSubExecution(this.resume, options);

		// A second call would start a second sub-execution the engine cannot wait for.
		// The first one is dropped too, so no sub-execution starts for a run that fails,
		// whichever way the node reports the failure.
		if (this.called) {
			this.awaited = undefined;
			this.detached.length = 0;
			throw new RepeatedSubWorkflowCallError(this.node.name);
		}
		this.called = true;

		if (workflowInfo.id === undefined) throw new InlineSubWorkflowError(this.node.name);
		if (!this.resolve) throw new SubWorkflowsNotSupportedError(this.node.name);

		// Minted here, before the sub-execution is resolved, so its trigger runs under it
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
		const subExecution: SubExecutionDeclaration = { executionId, ...resolved };

		if (options.doNotWaitToFinish) {
			this.detached.push(subExecution);
			return { executionId: subExecution.executionId, data: [null] };
		}

		// The node completes this run on an empty result, which the executor
		// replaces with the sub-execution declaration. It runs again with the result when
		// the sub-execution ends.
		this.awaited = subExecution;
		return { executionId: subExecution.executionId, data: [[]] };
	}

	private answerFromSubExecution(
		resume: SubExecutionResumeCause,
		options: CallOptions,
	): ExecuteWorkflowData {
		if (resume.status !== 'completed') throw toSubExecutionError(resume.error);
		return {
			executionId: resume.executionId,
			data: toSubWorkflowOutput(resume.result, options.returnLastRunOnly ?? false),
		};
	}
}

/**
 * The sub-execution's result as the node receives it: every terminal step's items,
 * concatenated per output slot in the order the sub-execution reported them.
 *
 * An item's own paired-item mark points into the sub-execution, at the input of the
 * node that produced it, and nothing here can follow it back to the sub-execution's
 * trigger. The marks are dropped, so the node pairs each item with its own
 * input by index instead.
 *
 * The last-run-only option keeps the last pass of each terminal node. v1 keeps
 * the last pass of the one node that ran last, so the two differ for a sub-execution
 * with several terminal branches, as the whole result does.
 */
export function toSubWorkflowOutput(
	result: SubExecutionResult,
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

function lastPassPerNode(result: SubExecutionResult): SubExecutionResult {
	const last = new Map<string, SubExecutionResult[number]>();
	for (const step of result) {
		const seen = last.get(step.nodeId);
		if (!seen || seen.iteration < step.iteration) last.set(step.nodeId, step);
	}
	return result.filter((step) => last.get(step.nodeId) === step);
}

/** The sub-execution's failure, as the error the node would have seen from the sub-execution on v1. */
function toSubExecutionError(error: StepError): Error {
	const subExecutionError = new Error(error.message);
	subExecutionError.name = error.name;
	if (error.stack) subExecutionError.stack = error.stack;
	return subExecutionError;
}
