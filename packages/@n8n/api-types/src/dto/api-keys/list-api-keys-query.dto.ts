import { z } from 'zod';

import { Z } from '../../zod-class';
import { paginationSchema } from '../pagination/pagination.dto';

export class ListApiKeysQueryDto extends Z.class({
	...paginationSchema,
	ownership: z.enum(['mine', 'all']).optional(),
}) {}
