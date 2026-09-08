import { compareExecutionListItems } from '@n8n/api-types';
import type { ExecutionSummary } from 'n8n-workflow';

import { encodeExecutionCursor, type ExecutionCursor } from './execution-cursor';
import { isExecutionIdV2 } from './execution-id';

export interface ExecutionPage {
	items: ExecutionSummary[];
	hasMore: boolean;
}

export function mergeExecutionPages(
	pages: ExecutionPage[],
	limit: number,
	cursor: ExecutionCursor,
) {
	const candidates = pages.flatMap((page) => page.items).sort(compareExecutionListItems);
	const results = candidates.slice(0, limit);
	const next: ExecutionCursor = { ...cursor };
	for (const item of results) {
		next[isExecutionIdV2(item.id) ? 'v2' : 'v1'] = {
			id: item.id,
			timestamp: new Date(item.startedAt ?? item.createdAt).toISOString(),
		};
	}
	const hasMore = candidates.length > limit || pages.some((page) => page.hasMore);
	return { results, nextCursor: hasMore && results.length ? encodeExecutionCursor(next) : null };
}
