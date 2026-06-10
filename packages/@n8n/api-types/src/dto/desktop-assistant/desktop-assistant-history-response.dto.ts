import type { ExecutionStatus } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Query params for `GET /desktop-assistant/history`. `limit` is coerced from the
 * query string and bounded; `firstId`/`lastId` are opaque execution-id cursors
 * (newest-first paging walks older via `lastId`).
 */
export class DesktopAssistantHistoryQueryDto extends Z.class({
	limit: z.coerce.number().int().min(1).max(100).optional(),
	firstId: z.string().optional(),
	lastId: z.string().optional(),
}) {}

export type DesktopAssistantHistoryQuery = z.infer<typeof DesktopAssistantHistoryQueryDto.schema>;

/**
 * A single execution row in the desktop assistant History tab. This is a
 * deliberately narrow projection of the instance's internal execution summary:
 * the desktop client only needs enough to render a status icon, the workflow
 * name, a relative timestamp, and a link to the execution in the instance.
 */
export interface DesktopAssistantHistoryEntry {
	id: string;
	workflowId: string;
	/** Display name with any leading emoji already stripped server-side. */
	workflowName: string;
	status: ExecutionStatus;
	/** ISO start time, or null when the execution never started. */
	startedAt: string | null;
	/** ISO creation time; the relative-time fallback when `startedAt` is null. */
	createdAt: string;
}

/**
 * Response shape for `GET /desktop-assistant/history`. Newest-first page of
 * executions across the user's accessible, non-archived workflows, plus the
 * total count for the "Load more" affordance.
 */
export interface DesktopAssistantHistoryResponse {
	results: DesktopAssistantHistoryEntry[];
	count: number;
	/** True when `count` is a database estimate rather than an exact total. */
	estimated: boolean;
}
