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

const tagWritePublicShape = {
	id: readOnlyPublicSchema(tagRequestReadOnlyFieldDocs.id),
	name: z.string().openapi(tagFieldDocs.name),
	createdAt: readOnlyPublicSchema(tagRequestReadOnlyFieldDocs.createdAt),
	updatedAt: readOnlyPublicSchema(tagRequestReadOnlyFieldDocs.updatedAt),
};

export class CreateTagPublicDto extends Z.class(tagWritePublicShape, { strict: true }) {}

export class UpdateTagPublicDto extends Z.class(tagWritePublicShape, { strict: true }) {}

export class UpdatedTagPublicDto extends Z.class({
	...tagPublicSchema.shape,
	createdAt: tagPublicSchema.shape.createdAt.optional(),
	updatedAt: tagPublicSchema.shape.updatedAt.optional(),
}) {}
