import '../../openapi-extend';
import { z } from 'zod';

import { Z } from '../../zod-class';

export const tagPublicSchema = z.object({
	id: z.string().openapi({ readOnly: true, example: '2tUt1wbLX592XDdX' }),
	name: z.string().openapi({ example: 'Production' }),
	createdAt: z.string().datetime().openapi({ readOnly: true }),
	updatedAt: z.string().datetime().openapi({ readOnly: true }),
});

export class TagPublicDto extends Z.class({
	id: z.string(),
	name: z.string(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
}) {}

export class TagListPublicDto extends Z.class({
	data: z.array(tagPublicSchema),
	nextCursor: z.string().nullable(),
}) {}
