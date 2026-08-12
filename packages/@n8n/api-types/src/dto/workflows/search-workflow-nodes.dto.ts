import { z } from 'zod';

import { Z } from '../../zod-class';

export const NODE_SEARCH_MIN_QUERY_LENGTH = 3;
export const NODE_SEARCH_MAX_QUERY_LENGTH = 200;

/** Node-level hits returned to the client. */
export const NODE_SEARCH_MAX_RESULTS = 50;

/** Hits kept per workflow, so one large workflow can't fill the result list. */
export const NODE_SEARCH_PER_WORKFLOW_CAP = 5;

export class SearchWorkflowNodesQueryDto extends Z.class({
	query: z.string().min(NODE_SEARCH_MIN_QUERY_LENGTH).max(NODE_SEARCH_MAX_QUERY_LENGTH),
	/** When set, only search nodes in workflows owned by this project. */
	projectId: z.string().min(1).optional(),
}) {}

export type NodeSearchHitProject = {
	id: string;
	name: string | null;
	type: string;
	icon: { type: 'emoji'; value: string } | { type: 'icon'; value: string } | null;
};

/** Which node field the query matched. Drives ordering and the result subtitle. */
export type NodeSearchMatchedField = 'name' | 'type' | 'notes' | 'parameters';

export type NodeSearchHit = {
	workflowId: string;
	workflowName: string;
	homeProject: NodeSearchHitProject | null;
	parentFolder: { id: string; name: string } | null;
	nodeId: string;
	nodeName: string;
	nodeType: string;
	disabled: boolean;
	isSticky: boolean;
	matchedField: NodeSearchMatchedField;
	/** Text around the match, so the client can show why the node matched. */
	snippet: string;
};

export type SearchWorkflowNodesResponse = {
	results: NodeSearchHit[];
	/** Whether results were truncated by `NODE_SEARCH_MAX_RESULTS`. */
	hasMore: boolean;
};
