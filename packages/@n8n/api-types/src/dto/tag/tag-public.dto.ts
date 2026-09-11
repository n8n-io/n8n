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

/**
 * `name` stays an unconstrained string: the published spec constrains only the type, and the tag
 * service owns the length rule.
 */
export class UpdateTagPublicDto extends Z.class(
	{
		id: readOnlyPublicSchema(tagRequestReadOnlyFieldDocs.id),
		name: z.string().openapi(tagFieldDocs.name),
		createdAt: readOnlyPublicSchema(tagRequestReadOnlyFieldDocs.createdAt),
		updatedAt: readOnlyPublicSchema(tagRequestReadOnlyFieldDocs.updatedAt),
	},
	{ strict: true },
) {}

/**
 * An update answers with the columns the write touched, so `createdAt` is absent. It stays optional
 * to keep the response identical to the one the endpoint published before.
 */
export class UpdatedTagPublicDto extends Z.class({
	...tagPublicSchema.shape,
	createdAt: tagPublicSchema.shape.createdAt.optional(),
}) {}
