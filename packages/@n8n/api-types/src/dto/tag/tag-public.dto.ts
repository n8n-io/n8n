import { z } from 'zod';

import { Z } from '../../zod-class';

export const tagPublicSchema = z.object({
	id: z.string(),
	name: z.string(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
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
