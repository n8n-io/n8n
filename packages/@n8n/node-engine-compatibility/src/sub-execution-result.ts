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
 * Convert the result of the sub-execution into the appropriate output - the
 * results of the terminal branches, concatenated.
 *
 * TODO(CET-617): trace paired items appropriately. For now, we fall back to
 * per-index, so this breaks if the number of items differs from input to output.
 *
 * TODO(CET-618): apply the child trigger's own "Items to Return" setting
 * (triggers before 1.2 default to the last run only). Only the caller's
 * option is applied today.
 */
export function toSubWorkflowOutput(
	result: SubExecutionResult,
	lastRunOnly: boolean,
): Array<INodeExecutionData[] | null> {
	const steps = lastRunOnly ? lastPassPerNode(result) : result;
	const slots: INodeExecutionData[][] = [];
	for (const step of steps) {
		fromStepInputs(step.outputs).forEach((items, slot) => {
			// One push per item: a spread can exceed the argument limit, and a concat
			// copies the slot on every pass.
			const target = (slots[slot] ??= []);
			for (const item of items) target.push(withoutPairedItem(item));
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
