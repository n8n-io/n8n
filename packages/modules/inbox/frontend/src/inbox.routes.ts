import type { InboxItem } from '@n8n/api-types';
import type { LocationQuery, RouteLocationNormalizedLoaded, RouteLocationRaw } from 'vue-router';

import { INBOX_ASSISTANT_RESULT_VIEW, INBOX_VIEW, type InboxSelection } from './inbox.constants';
import { WORKFLOW_REVIEW_REQUESTS_VIEW } from './reviews/constants';

type InboxRoute = Pick<RouteLocationNormalizedLoaded, 'name' | 'params' | 'query'>;

function stringParam(value: LocationQuery[string]): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function isInboxRoute(route: Pick<InboxRoute, 'name'>): boolean {
	return (
		route.name === INBOX_VIEW ||
		route.name === WORKFLOW_REVIEW_REQUESTS_VIEW ||
		route.name === INBOX_ASSISTANT_RESULT_VIEW
	);
}

export function selectionFromRoute({ name, params, query }: InboxRoute): InboxSelection | null {
	if (name === WORKFLOW_REVIEW_REQUESTS_VIEW) {
		const id = stringParam(params.reviewId);
		return id ? { type: 'workflow_review', id } : null;
	}
	if (name !== INBOX_ASSISTANT_RESULT_VIEW) return null;
	const id = stringParam(params.resultId);
	if (!id) return null;
	const projectId = stringParam(query.projectId);
	const workflowId = stringParam(query.workflowId);
	if (projectId && workflowId) {
		return { type: 'self_healing_result', id, projectId, workflowId };
	}
	return null;
}

export function inboxItemLocation(item: InboxItem, route?: InboxRoute): RouteLocationRaw {
	const next: LocationQuery = { ...route?.query };
	const selected = route ? selectionFromRoute(route) : null;
	if (selected?.type !== item.type || selected.id !== item.id) delete next.tab;
	delete next.type;
	delete next.itemId;
	delete next.projectId;
	delete next.workflowId;
	if (item.type === 'self_healing_result') {
		next.projectId = item.projectId;
		next.workflowId = item.workflowId;
		return { name: INBOX_ASSISTANT_RESULT_VIEW, params: { resultId: item.id }, query: next };
	}
	return { name: WORKFLOW_REVIEW_REQUESTS_VIEW, params: { reviewId: item.id }, query: next };
}
