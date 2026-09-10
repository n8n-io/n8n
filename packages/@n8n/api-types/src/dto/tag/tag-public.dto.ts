import '../../openapi-extend';
import { z } from 'zod';

import { tagFieldDocs } from './tag-public.openapi';
import { Z } from '../../zod-class';

export const tagPublicSchema = z.object({
	id: z.string().openapi(tagFieldDocs.id),
	name: z.string().openapi(tagFieldDocs.name),
	createdAt: z.string().datetime().openapi(tagFieldDocs.createdAt),
	updatedAt: z.string().datetime().openapi(tagFieldDocs.updatedAt),
});

export class TagPublicDto extends Z.class(tagPublicSchema.shape) {}

/**
 * An update writes the row without reading it back, so the tag it answers with carries no
 * `createdAt`. The field stays optional here to keep that response as it has always been.
 */
export const updatedTagPublicSchema = tagPublicSchema.extend({
	createdAt: tagPublicSchema.shape.createdAt.optional().openapi(tagFieldDocs.updatedTagCreatedAt),
});

export class UpdatedTagPublicDto extends Z.class(updatedTagPublicSchema.shape) {}

export class TagListPublicDto extends Z.class({
	data: z.array(tagPublicSchema),
	nextCursor: z.string().nullable(),
}) {}
