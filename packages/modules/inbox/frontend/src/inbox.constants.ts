import type { InboxSourceType, InboxState, WorkflowReviewRequestDecision } from '@n8n/api-types';

export const INBOX_VIEW = 'Inbox';
export const INBOX_PAGE_LIMIT = 15;

export type InboxSectionKey = 'waiting' | 'authored' | 'closed';

export type InboxSelection = { type: 'workflow_review'; id: string };

export type InboxItemChange = {
	type: InboxSourceType;
	id: string;
	state?: InboxState;
	decision?: WorkflowReviewRequestDecision;
	updatedAt?: string;
};
