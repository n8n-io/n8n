import '../../openapi-extend';

import { z } from 'zod';

import {
	createdProjectFieldDocs,
	createProjectReadOnlyFieldDocs,
	projectFieldDocs,
	projectListFieldDocs,
} from './project-public.openapi';
import {
	projectIconSchema,
	projectNameSchema,
	projectTypeSchema,
} from '../../schemas/project.schema';
import { readOnlyPublicSchema } from '../../schemas/read-only-public.schema';
import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

export const projectPublicSchema = z.object({
	id: z.string().openapi(projectFieldDocs.id),
	name: z.string().openapi(projectFieldDocs.name),
	type: z.string().openapi({ ...projectFieldDocs.type, enum: [...projectTypeSchema.options] }),
	icon: z
		.object({
			type: z.string().openapi({ enum: [...projectIconSchema.shape.type.options] }),
			value: z.string(),
			color: z.string().optional(),
		})
		.nullable()
		.openapi(projectFieldDocs.icon),
	description: z.string().nullable().openapi(projectFieldDocs.description),
	customTelemetryTags: z.array(z.object({ key: z.string(), value: z.string() })),
	creatorId: z.string().nullable().openapi(projectFieldDocs.creatorId),
	createdAt: z.string().datetime().openapi(projectFieldDocs.createdAt),
	updatedAt: z.string().datetime().openapi(projectFieldDocs.updatedAt),
});

export class ProjectPublicDto extends Z.class(projectPublicSchema.shape) {}

export class ProjectListPublicDto extends Z.class({
	data: z.array(projectPublicSchema),
	nextCursor: z.string().nullable().openapi(projectListFieldDocs.nextCursor),
}) {}

export class CreatedProjectPublicDto extends Z.class({
	...projectPublicSchema.shape,
	role: z.string().openapi(createdProjectFieldDocs.role),
	scopes: z.array(z.string()).openapi(createdProjectFieldDocs.scopes),
}) {}

export class CreateProjectPublicDto extends Z.class(
	{
		name: projectNameSchema.openapi(projectFieldDocs.name),
		id: readOnlyPublicSchema(createProjectReadOnlyFieldDocs.id),
		type: readOnlyPublicSchema(createProjectReadOnlyFieldDocs.type),
	},
	{ strict: true },
) {}

export class ListProjectsQueryPublicDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}
