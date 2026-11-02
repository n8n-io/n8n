import type { SubExecutionResult, SubExecutionResumeCause, StepError } from '@n8n/engine';
import type { ExecuteWorkflowData, INodeExecutionData } from 'n8n-workflow';

import { fromStepInputs } from './io';
import type { CallOptions } from './types';

/**
 * Answers the node's `executeWorkflow` call on the run after its sub-execution
 * ended: the sub-execution's items as v1 would return them, or its error.
 */
export function supplySubExecutionResult(
	resume: SubExecutionResumeCause,
	options: CallOptions = {},
): ExecuteWorkflowData {
	if (resume.status !== 'completed') throw toSubExecutionError(resume.error);
	return {
		executionId: resume.executionId,
		data: toSubWorkflowOutput(resume.result, options.returnLastRunOnly ?? false),
	};
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
