import type { WorkflowHistoryActionTypes, WorkflowVersionId } from '@n8n/rest-api-client';
import type { WorkflowHistory } from '@n8n/rest-api-client/api/workflowHistory';

export type WorkflowHistoryAction = {
	action: WorkflowHistoryActionTypes[number];
	id: WorkflowVersionId;
	data: {
		formattedCreatedAt: string;
		versionName?: string | null;
		description?: string | null;
	};
};

export type WorkflowHistoryTimelineItemEntry = {
	type: 'item';
	item: WorkflowHistory;
	/**
	 * Index of the item in the original WorkflowHistory[] collection.
	 */
	itemIndex: number;
};

export type WorkflowHistoryTimelineGroupEntry = {
	type: 'group';
	/**
	 * Stable identifier for the group, used for expansion state.
	 */
	id: string;
	/**
	 * Items that belong to this unnamed, unpublished group.
	 */
	items: WorkflowHistory[];
	/**
	 * Indices of the grouped items in the original WorkflowHistory[] collection.
	 */
	itemIndexes: number[];
	count: number;
};

export type WorkflowHistoryTimelineEntry =
	| WorkflowHistoryTimelineItemEntry
	| WorkflowHistoryTimelineGroupEntry;
