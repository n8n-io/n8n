import { z } from 'zod';

import { Z } from '../../zod-class';

export const NODE_SEARCH_MIN_QUERY_LENGTH = 3;

export class SearchWorkflowNodesQueryDto extends Z.class({
	query: z.string().min(NODE_SEARCH_MIN_QUERY_LENGTH).max(200),
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
