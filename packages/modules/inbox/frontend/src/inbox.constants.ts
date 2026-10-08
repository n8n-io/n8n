export const INBOX_VIEW = 'Inbox';
export const INBOX_ASSISTANT_RESULT_VIEW = 'InboxAssistantResult';
export const INBOX_REFRESH_INTERVAL = 30_000;
export const INBOX_PAGE_LIMIT = 15;

export type InboxSectionKey = 'waiting' | 'authored' | 'closed';

export type InboxSelection =
	| { type: 'workflow_review'; id: string }
	| { type: 'self_healing_result'; id: string; projectId: string; workflowId: string };

export type InboxItemChange = {
	type: InboxSourceType;
	id: string;
	state?: InboxState;
	unavailable?: boolean;
};
import type { InboxSourceType, InboxState } from '@n8n/api-types';
