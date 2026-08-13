import { z } from 'zod';

import { Z } from '../../zod-class';
import { paginationSchema } from '../pagination/pagination.dto';

export class ListProjectFilesQueryDto extends Z.class({
	...paginationSchema,
	/** Case-insensitive substring match on the file name. */
	search: z.string().trim().max(255).optional(),
}) {}
