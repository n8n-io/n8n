import '../../openapi-extend';
import { z } from 'zod';

import { Z } from '../../zod-class';

export const tagPublicSchema = z.object({
	id: z.string().openapi({ readOnly: true, example: '2tUt1wbLX592XDdX' }),
	name: z.string().openapi({ example: 'Production' }),
	createdAt: z.string().datetime().openapi({ readOnly: true }),
	updatedAt: z.string().datetime().openapi({ readOnly: true }),
});

// Built from `tagPublicSchema` so the generated spec keeps the `readOnly` flags and examples the
// hand-written `tag.yml` carried.
export class TagPublicDto extends Z.class(tagPublicSchema.shape) {}

export class TagListPublicDto extends Z.class({
	data: z.array(tagPublicSchema),
	nextCursor: z.string().nullable(),
}) {}
