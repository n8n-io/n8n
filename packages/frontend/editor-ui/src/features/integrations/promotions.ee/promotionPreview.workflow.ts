import type {
	PromotionDirection,
	PromotionResource,
	PromotionResourceDetail,
} from '@n8n/api-types';
import type { SlotWorkflowDiffSnapshot } from '@n8n/frontend-module-sdk';
import type { IConnections, INode, IWorkflowSettings } from 'n8n-workflow';

import { sideState, type DetailSide, type SideState } from './promotionPreview.content';
import type { ResourceKey } from './promotionPreview.selection';

type WorkflowDetail = Extract<PromotionResourceDetail, { type: 'workflow' }>;

/** Turns one side of a workflow detail into a snapshot for the `workflow-diff` slot. */
export function toPromotionDiffSide(
	detail: WorkflowDetail,
	side: DetailSide,
	tagName: (id: string) => string,
): SideState<SlotWorkflowDiffSnapshot> {
	const state = sideState(detail, side);
	if (state.kind !== 'content') return state;

	const workflow = state.content;
	return {
		kind: 'content',
		content: {
			workflowName: workflow.name,
			// Both sides share the workflow id, so the version keeps their diff documents apart.
			versionId: `promotion-${side}-${detail.revision[side] ?? ''}`,
			// The package schema checks these only loosely, so they need a cast.
			nodes: workflow.nodes as INode[],
			connections: workflow.connections as IConnections,
			nodeGroups: workflow.nodeGroups,
			settings: workflow.settings as IWorkflowSettings | undefined,
			tags: (workflow.tagIds ?? []).map((id) => ({ id, name: tagName(id) })),
			isArchived: workflow.isArchived,
		},
	};
}

/** Only changed workflows have a diff. */
export function hasWorkflowDiff(resource: PromotionResource): boolean {
	return resource.type === 'workflow' && resource.change !== 'unchanged';
}

/** What the diff area shows while the real diff is not on screen. */
export type WorkflowShellStatus = 'idle' | 'loading' | 'error' | 'missing' | 'unreadable';

/** Promote changes the branch to match this instance. Apply does the opposite. */
export function isBranchSide(side: DetailSide, direction: PromotionDirection): boolean {
	return side === (direction === 'promote' ? 'before' : 'after');
}

/** The inspected workflow, otherwise the first workflow with a diff. */
export function defaultActiveWorkflow(
	order: readonly ResourceKey[],
	resources: ReadonlyMap<ResourceKey, PromotionResource>,
	inspectedKey: ResourceKey | undefined,
): ResourceKey | undefined {
	const candidates = order.filter((key) => {
		const resource = resources.get(key);
		return !!resource && hasWorkflowDiff(resource);
	});
	return candidates.find((key) => key === inspectedKey) ?? candidates[0];
}
