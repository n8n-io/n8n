import type { PromotionResource, PromotionResourceDetail } from '@n8n/api-types';
import type { IConnections, INode, IWorkflowSettings } from 'n8n-workflow';

import type { DiffWorkflowInput } from '@/features/workflows/workflowDiff/workflowDiff.utils';

import { sideState, type DetailSide, type SideState } from './promotionPreview.content';
import type { ResourceKey } from './promotionPreview.selection';

type WorkflowDetail = Extract<PromotionResourceDetail, { type: 'workflow' }>;

/** Turns one side of a workflow detail into the input of the shared diff viewer. */
export function toPromotionDiffSide(
	detail: WorkflowDetail,
	side: DetailSide,
	tagName: (id: string) => string,
): SideState<DiffWorkflowInput> {
	const state = sideState(detail, side);
	if (state.kind !== 'content') return state;

	const workflow = state.content;
	return {
		kind: 'content',
		content: {
			id: workflow.id,
			name: workflow.name,
			// Both sides share the workflow id, so the version keeps their diff documents apart.
			versionId: `promotion-${side}-${detail.revision[side] ?? ''}`,
			// The package schema checks these only loosely, so they need a cast.
			nodes: workflow.nodes as INode[],
			connections: workflow.connections as IConnections,
			nodeGroups: workflow.nodeGroups,
			settings: workflow.settings as IWorkflowSettings | undefined,
			// The diff compares tags in order, so sorting keeps the order out of the diff.
			tags: (workflow.tagIds ?? [])
				.map((id) => ({ id, name: tagName(id) }))
				.sort((a, b) => a.name.localeCompare(b.name)),
			isArchived: workflow.isArchived,
		},
	};
}

/** Only changed workflows have a diff. The page opens one of them at a time. */
export function hasWorkflowDiff(resource: PromotionResource): boolean {
	return resource.type === 'workflow' && resource.change !== 'unchanged';
}

/** The inspected workflow, otherwise the first workflow with a diff. */
export function defaultOpenWorkflow(
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
