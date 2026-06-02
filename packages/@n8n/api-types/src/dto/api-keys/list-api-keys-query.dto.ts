import { z } from 'zod';

import { Z } from '../../zod-class';
import { paginationSchema } from '../pagination/pagination.dto';

export class ListApiKeysQueryDto extends Z.class({
	...paginationSchema,
	ownership: z.enum(['mine', 'all']).optional(),
	/** Case-insensitive substring match against the key's label. */
	label: z.string().trim().min(1).max(100).optional(),
}) {}
