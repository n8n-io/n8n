import { z } from 'zod';

import { Z } from '../../zod-class';

export const NODE_SEARCH_MIN_QUERY_LENGTH = 3;
export const NODE_SEARCH_MAX_QUERY_LENGTH = 200;
export const NODE_SEARCH_MAX_RESULTS = 50;
export const NODE_SEARCH_PER_WORKFLOW_CAP = 5;

/**
 * Workflows scanned before matching nodes in memory. Filling
 * NODE_SEARCH_MAX_RESULTS needs at most 50 workflows (1 hit each), so this
 * leaves 2x headroom for workflows that match the raw JSON but yield no node hit.
 */
export const NODE_SEARCH_MAX_CANDIDATE_WORKFLOWS = 100;

export class SearchWorkflowNodesQueryDto extends Z.class({
	query: z.string().min(NODE_SEARCH_MIN_QUERY_LENGTH).max(NODE_SEARCH_MAX_QUERY_LENGTH),
}) {}

export type NodeSearchHit = {
	workflowId: string;
	workflowName: string;
	projectName: string;
	isArchived: boolean;
	nodeId: string;
	nodeName: string;
	nodeType: string;
	disabled: boolean;
	isSticky: boolean;
	stickyPreview?: string;
};

export type SearchWorkflowNodesResponse = {
	results: NodeSearchHit[];
};
