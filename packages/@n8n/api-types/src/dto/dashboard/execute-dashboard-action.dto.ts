import { z } from 'zod';

import { Z } from '../../zod-class';

export class ExecuteDashboardActionDto extends Z.class({
	widgetId: z.string().trim().min(1).max(64).optional(),
	rowId: z.string().trim().min(1).max(64).optional(),
	row: z.record(z.string(), z.unknown()).optional(),
	rows: z.array(z.record(z.string(), z.unknown())).optional(),
	payload: z.record(z.string(), z.unknown()).optional(),
	/**
	 * Client-supplied idempotency token. The action service dedupes identical
	 * (dashboardId, slug, idempotencyKey) calls within a short window so a
	 * double-click or retry won't fire the webhook twice.
	 */
	idempotencyKey: z.string().min(1).max(128).optional(),
}) {}
