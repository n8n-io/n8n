import { z } from 'zod';

import { PAGE_TITLE_MAX_LENGTH } from '../../schemas/page.schema';
import { Z } from '../../zod-class';

export class ListAllPagesQueryDto extends Z.class({
	/** Keeps the pages with a title that contains this text. The case does not count. */
	query: z.string().trim().max(PAGE_TITLE_MAX_LENGTH).optional(),
}) {}
