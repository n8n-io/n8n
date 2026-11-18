import { z } from 'zod';

import { pageContentSchema, pageTitleSchema } from '../../schemas/page.schema';
import { Z } from '../../zod-class';

export class UpdatePageDto extends Z.class({
	title: pageTitleSchema.optional(),
	content: pageContentSchema.optional(),
	/** The `version` of the page that the client edited. The server rejects a stale value. */
	baseVersion: z.number().int().min(1),
}) {}
