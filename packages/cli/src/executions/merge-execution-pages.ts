import { compareExecutionListItems } from '@n8n/api-types';
import type { ExecutionSummary } from 'n8n-workflow';

import { encodeExecutionCursor, type ExecutionCursor } from './execution-cursor';
import { isExecutionIdV2 } from './execution-id';

export interface ExecutionPage {
	items: ExecutionSummary[];
	hasMore: boolean;
}

function positionOf(item: ExecutionSummary) {
	return {
		id: item.id,
		timestamp: new Date(item.startedAt ?? item.createdAt).toISOString(),
	};
}

/**
 * Merges one page from each store into a single newest-first page.
 *
 * Each store is asked for `limit` rows, so up to `limit` candidates are fetched
 * and never used. The cursor therefore carries a separate position per store,
 * each marking that store's last **included** row — not its last fetched one.
 * A candidate that missed the cut is simply fetched again on the next page.
 *
 * ```text
 *  fetched (limit 3)                merged, newest first
 *  ─────────────────────────        ────────────────────────────────
 *  v1  10:05  10:03  10:01         10:05  v1  ┐
 *  v2  10:04  10:02  10:00         10:04  v2  │ page 1   ← last v2 included
 *                                  10:03  v1  ┘          ← last v1 included
 *                                  ╌╌╌╌╌╌ cut ╌╌╌╌╌╌
 *                                  10:02  v2    dropped
 *                                  10:01  v1    dropped
 *                                  10:00  v2    dropped
 *
 *  nextCursor = { v1: 10:03, v2: 10:04 }
 *
 *  Note v2's mark is 10:04, not the 10:00 it read up to, so page 2 re-reads
 *  10:02 and 10:00. Each store resumes just after its own mark:
 *
 *  v1 < 10:03  →  10:01 ...          10:02  v2  ┐
 *  v2 < 10:04  →  10:02  10:00 ...   10:01  v1  │ page 2
 *                                    10:00  v2  ┘
 * ```
 *
 * A page drawn from one store only leaves the other store's position untouched,
 * so that store resumes where the earlier page left it.
 */
export function mergeExecutionPages(
	pages: ExecutionPage[],
	limit: number,
	cursor?: ExecutionCursor,
) {
	const v1v2MergedAndSorted = pages.flatMap((page) => page.items).sort(compareExecutionListItems);
	const results = v1v2MergedAndSorted.slice(0, limit);

	const resultsReversed = Array.from(results).reverse();
	const lastIncludedV1 = resultsReversed.find((item) => !isExecutionIdV2(item.id));
	const lastIncludedV2 = resultsReversed.find((item) => isExecutionIdV2(item.id));

	const nextCursor: ExecutionCursor = cursor ? { ...cursor } : { version: 1 };
	if (lastIncludedV1) nextCursor.v1 = positionOf(lastIncludedV1);
	if (lastIncludedV2) nextCursor.v2 = positionOf(lastIncludedV2);

	const hasMore = v1v2MergedAndSorted.length > limit || pages.some((page) => page.hasMore);
	return {
		results,
		nextCursor: hasMore && results.length ? encodeExecutionCursor(nextCursor) : null,
	};
}
