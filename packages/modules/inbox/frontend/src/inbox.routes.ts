import type { InboxItem } from '@n8n/api-types';
import type { LocationQuery, RouteLocationRaw } from 'vue-router';

import { INBOX_VIEW, type InboxSelection } from './inbox.constants';

function stringParam(value: LocationQuery[string]): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function selectionFromQuery(query: LocationQuery): InboxSelection | null {
	const id = stringParam(query.itemId);
	if (!id) return null;
	if (query.type === 'workflow_review') return { type: 'workflow_review', id };
	const projectId = stringParam(query.projectId);
	const workflowId = stringParam(query.workflowId);
	if (query.type === 'self_healing_result' && projectId && workflowId) {
		return { type: 'self_healing_result', id, projectId, workflowId };
	}
	return null;
}

export function inboxItemLocation(item: InboxItem, query: LocationQuery = {}): RouteLocationRaw {
	const next: LocationQuery = { ...query, type: item.type, itemId: item.id };
	if (query.type !== item.type || query.itemId !== item.id) delete next.tab;
	delete next.projectId;
	delete next.workflowId;
	if (item.type === 'self_healing_result') {
		next.projectId = item.projectId;
		next.workflowId = item.workflowId;
	}
	return { name: INBOX_VIEW, query: next };
}
