import { z } from 'zod';

import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

/**
 * Query for `GET /api/v1/tags`. Clients send `limit` + optional `cursor`;
 * the controller decodes the cursor into an offset.
 */
export class ListTagsQueryDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}
