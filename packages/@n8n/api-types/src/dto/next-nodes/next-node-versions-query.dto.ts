import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * The node whose action versions the editor lists, e.g. `?type=n8n-nodes-base.slack&typeVersion=3`.
 * A migrated legacy node needs `resource` and `operation` to find its action.
 */
export class NextNodeVersionsQueryDto extends Z.class({
	type: z.string().min(1),
	typeVersion: z.coerce.number().int().nonnegative(),
	resource: z.string().optional(),
	operation: z.string().optional(),
}) {}
