import type { WorkflowSet } from '../workflow-set';
import { callHeading, checkContract, subWorkflowCalls } from './contract';
import type { SubWorkflowCall } from './contract';

export interface WorkflowSetIssue {
	code: 'CONTRACT_MISMATCH' | 'CONTRACT_NOT_CHECKED';
	workflow: string;
	node?: string;
	message: string;
}

export function subWorkflowIssues(set: WorkflowSet): WorkflowSetIssue[] {
	return staticCalls(set).flatMap(({ parent, call }) => contractIssues(set, parent, call));
}

function staticCalls(set: WorkflowSet) {
	return set.workflows.flatMap((parent) =>
		subWorkflowCalls(parent.definition).map((call) => ({ parent: parent.name, call })),
	);
}

function contractIssues(
	set: WorkflowSet,
	parent: string,
	call: SubWorkflowCall,
): WorkflowSetIssue[] {
	const node = call.node.name;
	if (call.childId === undefined) {
		const heading = callHeading(parent, node, 'a workflow ID from an expression');
		const message = `${heading}\n  - not checked: the ID is known only at run time`;
		return [{ code: 'CONTRACT_NOT_CHECKED', workflow: parent, node, message }];
	}

	const child = set.workflows.find((workflow) => workflow.id === call.childId);
	const issue = child && checkContract(parent, call.node, child.definition);
	return issue ? [issue] : [];
}
