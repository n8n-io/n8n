import '../../openapi-extend';

import { z } from 'zod';

import { folderFieldDocs, updateFolderFieldDocs } from './folder-public.openapi';
import { folderIdSchema, folderNameSchema } from '../../schemas/folder.schema';
import { Z } from '../../zod-class';

/** The folder as the Public API publishes it. Allowlist of the fields `folder.yml` documented. */
const folderPublicSchema = z.object({
	id: z.string().openapi(folderFieldDocs.id),
	name: z.string().openapi(folderFieldDocs.name),
	parentFolderId: z.string().nullable(),
	createdAt: z.string().datetime().openapi(folderFieldDocs.createdAt),
	updatedAt: z.string().datetime().openapi(folderFieldDocs.updatedAt),
});

export class FolderPublicDto extends Z.class(folderPublicSchema.shape) {}

/**
 * `name` and `parentFolderId` keep the rules the legacy handler applied after
 * express-openapi-validator, so a body the old route rejected is still rejected. `tagIds` stays
 * out: the hand-written schema set `additionalProperties: false`, so the route never took it.
 */
const updateFolderPublicSchema = z
	.object({
		name: folderNameSchema.optional().openapi(updateFolderFieldDocs.name),
		parentFolderId: folderIdSchema.optional().openapi(updateFolderFieldDocs.parentFolderId),
	})
	.strict()
	.refine(({ name, parentFolderId }) => name !== undefined || parentFolderId !== undefined, {
		message: 'At least one field is required',
	})
	.openapi({ minProperties: 1 });

type UpdateFolderPublic = z.infer<typeof updateFolderPublicSchema>;

export class UpdateFolderPublicDto implements UpdateFolderPublic {
	name?: string;

	parentFolderId?: string;

	static schema = updateFolderPublicSchema;

	constructor(data: UpdateFolderPublic) {
		Object.assign(this, updateFolderPublicSchema.parse(data));
	}

	static safeParse(data: unknown) {
		return updateFolderPublicSchema.safeParse(data);
	}

	static parse(data: unknown) {
		return updateFolderPublicSchema.parse(data);
	}
}
