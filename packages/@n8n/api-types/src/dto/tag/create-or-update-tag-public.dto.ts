import '../../openapi-extend';
import { z } from 'zod';

import { tagFieldDocs, tagWriteReadOnlyFieldDocs } from './tag-public.openapi';
import { readOnlyPublicSchema } from '../../schemas/read-only-public.schema';
import { Z } from '../../zod-class';

/**
 * The public tag write surface, shared by the create and update request bodies. `name` is the only
 * field a caller may send; the other three stay in the shape so the spec keeps documenting them and
 * a request that carries one still answers 400.
 */
export const tagWritePublicShape = {
	id: readOnlyPublicSchema(tagWriteReadOnlyFieldDocs.id),
	name: z.string().openapi(tagFieldDocs.name),
	createdAt: readOnlyPublicSchema(tagWriteReadOnlyFieldDocs.createdAt),
	updatedAt: readOnlyPublicSchema(tagWriteReadOnlyFieldDocs.updatedAt),
} as const;

export class CreateOrUpdateTagPublicDto extends Z.class(tagWritePublicShape, { strict: true }) {}
