import { z } from 'zod';

import type { WorkflowReviewInboxItem } from './dto/workflow-reviews/list-workflow-review-inbox.dto';
import type { SelfHealingResultDetail } from './self-healing-results';

export const inboxSourceTypeSchema = z.enum(['workflow_review', 'self_healing_result']);
export type InboxSourceType = z.infer<typeof inboxSourceTypeSchema>;

export const inboxStateSchema = z.enum(['open', 'closed']);
export type InboxState = z.infer<typeof inboxStateSchema>;

export const inboxCategorySchema = z.enum(['waiting', 'authored']);
export type InboxCategory = z.infer<typeof inboxCategorySchema>;

export type InboxWorkflowReviewItem = WorkflowReviewInboxItem & {
	type: 'workflow_review';
};

export type InboxSelfHealingItem = Pick<
	SelfHealingResultDetail,
	'projectId' | 'workflowId' | 'summary' | 'outcome' | 'createdAt' | 'updatedAt' | 'completedAt'
> & {
	type: 'self_healing_result';
	id: string;
	state: InboxState;
	workflowName: string;
};

export type InboxItem = InboxWorkflowReviewItem | InboxSelfHealingItem;

export type InboxCounts = { open: number; closed: number };

export type InboxSourceStatus = {
	partial: boolean;
	failedSources: InboxSourceType[];
	disabledSources: InboxSourceType[];
};

export type ListInboxResponse = InboxSourceStatus & {
	data: InboxItem[];
	hasMore: boolean;
	nextCursor: string | null;
};

export type GetInboxSummaryResponse = InboxSourceStatus & {
	counts: InboxCounts | null;
};

export type InboxSettings = {
	enabled: boolean;
	availableTypes: InboxSourceType[];
	failedTypes: InboxSourceType[];
};
