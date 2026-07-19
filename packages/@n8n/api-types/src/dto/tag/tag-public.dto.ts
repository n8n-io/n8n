import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Public API tag resource shape — strips internal fields at the registry boundary.
 * Matches `handlers/tags/spec/schemas/tag.yml`.
 */
export const tagPublicSchema = z.object({
	id: z.string(),
	name: z.string(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export class TagPublicDto extends Z.class({
	id: z.string(),
	name: z.string(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
}) {}

export class TagListPublicDto extends Z.class({
	data: z.array(tagPublicSchema),
	nextCursor: z.string().nullable(),
}) {}
