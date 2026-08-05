import { z } from 'zod';

import { paginationSchema } from '../pagination/pagination.dto';
import { Z } from '../../zod-class';

export class ListAuditLogEventsQueryDto extends Z.class({
	...paginationSchema,
	// Event-name prefix filter, e.g. "n8n.audit".
	prefix: z.string().trim().min(1).max(128).optional(),
}) {}
