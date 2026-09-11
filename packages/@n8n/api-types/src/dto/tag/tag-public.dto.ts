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
 * `createdAt` is insert-only, so the row an update writes back never carries it and the update
 * response has always left it out.
 */
export class UpdatedTagPublicDto extends Z.class({
	...tagPublicSchema.shape,
	createdAt: tagPublicSchema.shape.createdAt.optional(),
}) {}

export class TagListPublicDto extends Z.class({
	data: z.array(tagPublicSchema),
	nextCursor: z.string().nullable(),
}) {}

/**
 * Field order follows the published spec, which the generator emits verbatim.
 * `name` is unconstrained: the entity validator, not the schema, rejects a bad length.
 */
const tagWritePublicShape = {
	id: readOnlyPublicSchema(tagWriteReadOnlyFieldDocs.id),
	name: z.string().openapi(tagFieldDocs.name),
	createdAt: readOnlyPublicSchema(tagWriteReadOnlyFieldDocs.createdAt),
	updatedAt: readOnlyPublicSchema(tagWriteReadOnlyFieldDocs.updatedAt),
};

export class CreateTagPublicDto extends Z.class(tagWritePublicShape, { strict: true }) {}

export class UpdateTagPublicDto extends Z.class(tagWritePublicShape, { strict: true }) {}
