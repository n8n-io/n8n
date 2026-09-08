import '../../openapi-extend';
import { z } from 'zod';

import { tagFieldDocs, tagWriteReadOnlyFieldDocs } from './tag-public.openapi';
import { readOnlyPublicSchema } from '../../schemas/read-only-public.schema';
import { Z } from '../../zod-class';

export const tagPublicSchema = z.object({
	id: z.string().openapi(tagFieldDocs.id),
	name: z.string().openapi(tagFieldDocs.name),
	createdAt: z.string().datetime().openapi(tagFieldDocs.createdAt),
	updatedAt: z.string().datetime().openapi(tagFieldDocs.updatedAt),
});

export class TagPublicDto extends Z.class(tagPublicSchema.shape) {}

/**
 * `PUT /tags/{id}` saves a partial entity, so the value it gets back carries no `createdAt` and the
 * response has always left the field out. `tag.yml` documented every field as optional, so this
 * keeps that response shape rather than adding a field a caller never saw.
 */
export class UpdatedTagPublicDto extends Z.class({
	id: z.string().openapi(tagFieldDocs.id),
	name: z.string().openapi(tagFieldDocs.name),
	createdAt: z.string().datetime().optional().openapi(tagFieldDocs.createdAt),
	updatedAt: z.string().datetime().openapi(tagFieldDocs.updatedAt),
}) {}

export class TagListPublicDto extends Z.class({
	data: z.array(tagPublicSchema),
	nextCursor: z.string().nullable(),
}) {}

/**
 * The write surface `POST /tags` and `PUT /tags/{id}` share, as `tag.yml` defined it: `name` is the
 * only field a caller sets, and the server-managed fields stay in the spec as read-only.
 */
export class TagWritePublicDto extends Z.class(
	{
		id: readOnlyPublicSchema(tagWriteReadOnlyFieldDocs.id),
		name: z.string().openapi(tagFieldDocs.name),
		createdAt: readOnlyPublicSchema(tagWriteReadOnlyFieldDocs.createdAt),
		updatedAt: readOnlyPublicSchema(tagWriteReadOnlyFieldDocs.updatedAt),
	},
	{ strict: true },
) {}
