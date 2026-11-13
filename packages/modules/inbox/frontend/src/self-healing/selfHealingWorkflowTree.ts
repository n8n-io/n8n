import type { SelfHealingResultDetail, WorkflowSuggestionProposalDetail } from '@n8n/api-types';

export type WorkflowTreeRow = {
	workflowId: string;
	suggestion?: WorkflowSuggestionProposalDetail;
	indent: number;
	callerIds: string[];
};

/**
 * The workflows of a fix, top to bottom. Each workflow appears once, below its nearest caller.
 * Other callers, also the callers that close a cycle, are only in `callerIds`.
 */
export function buildWorkflowTree(
	detail: Pick<SelfHealingResultDetail, 'workflows' | 'calls' | 'suggestions'>,
): WorkflowTreeRow[] {
	const suggestions = new Map(detail.suggestions.map((item) => [item.workflowId, item]));
	// A suggestion is never hidden, because Apply publishes it.
	const listed = new Set(
		[...detail.workflows, ...detail.suggestions].map(({ workflowId }) => workflowId),
	);

	const calledIds = new Map<string, string[]>();
	const callerIds = new Map<string, string[]>();
	for (const { callerWorkflowId: caller, calledWorkflowId: called } of detail.calls) {
		if (caller === called || !listed.has(caller) || !listed.has(called)) continue;
		calledIds.set(caller, [...(calledIds.get(caller) ?? []), called]);
		callerIds.set(called, [...(callerIds.get(called) ?? []), caller]);
	}

	const roots: string[] = [];
	const children = new Map<string, string[]>();
	const placed = new Set<string>();
	for (const root of listed) {
		if (placed.has(root)) continue;
		roots.push(root);
		placed.add(root);
		const queue = [root];
		for (const caller of queue) {
			for (const called of calledIds.get(caller) ?? []) {
				if (placed.has(called)) continue;
				placed.add(called);
				children.set(caller, [...(children.get(caller) ?? []), called]);
				queue.push(called);
			}
		}
	}

	const rows = (workflowId: string, indent: number): WorkflowTreeRow[] => [
		{
			workflowId,
			suggestion: suggestions.get(workflowId),
			indent,
			callerIds: callerIds.get(workflowId) ?? [],
		},
		...(children.get(workflowId) ?? []).flatMap((child) => rows(child, indent + 1)),
	];
	return roots.flatMap((root) => rows(root, 0));
}
