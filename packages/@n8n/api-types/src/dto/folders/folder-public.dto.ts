import '../../openapi-extend';

import { z } from 'zod';

import {
	folderContentCountFieldDocs,
	folderFieldDocs,
	folderListFieldDocs,
	folderListQueryFieldDocs,
	folderProjectFieldDocs,
	folderProjectIconOpenApi,
} from './folder-public.openapi';
import {
	filterValidator,
	selectValidator,
	skipValidator,
	takeValidator,
	VALID_SORT_OPTIONS,
} from './list-folder-query.dto';
import { nullableObjectGuardSchema } from '../../schemas/object-guard.schema';
import { projectTypeSchema, type ProjectIcon } from '../../schemas/project.schema';
import { Z } from '../../zod-class';

/** The project a folder lives in, reduced to the columns the list query loads. */
const folderProjectPublicSchema = z.object({
	id: z.string().openapi(folderProjectFieldDocs.id),
	name: z.string().openapi(folderProjectFieldDocs.name),
	// Legacy rows may hold a type the current enum no longer lists, and a response mismatch is a 500.
	type: z
		.string()
		.openapi({ ...folderProjectFieldDocs.type, enum: [...projectTypeSchema.options] }),
	icon: nullableObjectGuardSchema<ProjectIcon>().openapi(folderProjectIconOpenApi),
});

const folderParentPublicSchema = z.object({
	id: z.string().openapi(folderFieldDocs.id),
	name: z.string().openapi(folderFieldDocs.name),
	parentFolderId: z.string().nullable(),
});

const folderTagPublicSchema = z.object({
	id: z.string(),
	name: z.string(),
});

/**
 * Every field is optional because the `select` query parameter decides which columns the route
 * loads: an unselected field is absent from the response, not null.
 */
export const folderPublicSchema = z.object({
	id: z.string().openapi(folderFieldDocs.id),
	name: z.string().optional().openapi(folderFieldDocs.name),
	parentFolderId: z.string().nullable().optional().openapi(folderFieldDocs.parentFolderId),
	createdAt: z.string().datetime().optional().openapi(folderFieldDocs.createdAt),
	updatedAt: z.string().datetime().optional().openapi(folderFieldDocs.updatedAt),
	homeProject: folderProjectPublicSchema.optional(),
	parentFolder: folderParentPublicSchema.nullable().optional(),
	tags: z.array(folderTagPublicSchema).optional(),
	workflowCount: z.number().optional().openapi(folderFieldDocs.workflowCount),
	subFolderCount: z.number().optional().openapi(folderFieldDocs.subFolderCount),
	path: z.array(z.string()).optional().openapi(folderFieldDocs.path),
});

export type FolderPublic = z.infer<typeof folderPublicSchema>;

export class FolderPublicDto extends Z.class(folderPublicSchema.shape) {}

export class FolderListPublicDto extends Z.class({
	count: z.number().int().openapi(folderListFieldDocs.count),
	data: z.array(folderPublicSchema),
}) {}

export class ListFoldersQueryPublicDto extends Z.class(
	{
		filter: filterValidator.openapi(folderListQueryFieldDocs.filter),
		select: selectValidator.openapi(folderListQueryFieldDocs.select),
		sortBy: z
			.enum(VALID_SORT_OPTIONS, {
				// Keep the wording the legacy validator produced, so the 400 body does not change.
				message: `must be equal to one of the allowed values: ${VALID_SORT_OPTIONS.join(', ')}`,
			})
			.optional()
			.openapi(folderListQueryFieldDocs.sortBy),
		skip: skipValidator.openapi(folderListQueryFieldDocs.skip),
		take: takeValidator.openapi(folderListQueryFieldDocs.take),
	},
	{ strict: true },
) {}

export class FolderDetailsPublicDto extends Z.class({
	id: z.string().openapi(folderFieldDocs.id),
	name: z.string().openapi(folderFieldDocs.name),
	parentFolderId: z.string().nullable().openapi(folderFieldDocs.parentFolderId),
	createdAt: z.string().datetime().openapi(folderFieldDocs.createdAt),
	updatedAt: z.string().datetime().openapi(folderFieldDocs.updatedAt),
	totalSubFolders: z.number().int().openapi(folderContentCountFieldDocs.totalSubFolders),
	totalWorkflows: z.number().int().openapi(folderContentCountFieldDocs.totalWorkflows),
}) {}
