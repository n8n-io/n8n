import '../../openapi-extend';
import { z } from 'zod';

import { tagFieldDocs, tagRequestReadOnlyFieldDocs } from './tag-public.openapi';
import { readOnlyPublicSchema } from '../../schemas/read-only-public.schema';
import { Z } from '../../zod-class';

export const tagPublicSchema = z.object({
	id: z.string().openapi(tagFieldDocs.id),
	name: z.string().openapi(tagFieldDocs.name),
	createdAt: z.string().datetime().openapi(tagFieldDocs.createdAt),
	updatedAt: z.string().datetime().openapi(tagFieldDocs.updatedAt),
});

export class TagPublicDto extends Z.class(tagPublicSchema.shape) {}

export class TagListPublicDto extends Z.class({
	data: z.array(tagPublicSchema),
	nextCursor: z.string().nullable(),
}) {}

/**
 * `name` carries no length bound on purpose. The published request schema never had one, and the
 * entity validator is what rejects a name outside 1-24 characters.
 */
export class CreateTagPublicDto extends Z.class(
	{
		id: readOnlyPublicSchema(tagRequestReadOnlyFieldDocs.id),
		name: z.string().openapi(tagFieldDocs.name),
		createdAt: readOnlyPublicSchema(tagRequestReadOnlyFieldDocs.createdAt),
		updatedAt: readOnlyPublicSchema(tagRequestReadOnlyFieldDocs.updatedAt),
	},
	{ strict: true },
) {}
