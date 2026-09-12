import '../../openapi-extend';

import { z } from 'zod';

import {
	createdProjectFieldDocs,
	createProjectReadOnlyFieldDocs,
	projectFieldDocs,
	projectIconOpenApi,
	projectListFieldDocs,
} from './project-public.openapi';
import { nullableObjectGuardSchema } from '../../schemas/object-guard.schema';
import {
	projectNameSchema,
	projectTypeSchema,
	type ProjectIcon,
} from '../../schemas/project.schema';
import { readOnlyPublicSchema } from '../../schemas/read-only-public.schema';
import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

// `icon` is a JSON column, so a strict schema would strip a stored `color` and answer 500 for a
// legacy shape. Check only the basic type, and let `.openapi()` document the shape.
const projectIconPublicSchema =
	nullableObjectGuardSchema<ProjectIcon>().openapi(projectIconOpenApi);

const projectCustomTelemetryTagPublicSchema = z.object({
	key: z.string(),
	value: z.string(),
});

/** The project as the Public API publishes it, on its own routes and inside another resource. */
export const projectPublicSchema = z.object({
	id: z.string().openapi(projectFieldDocs.id),
	name: z.string().openapi(projectFieldDocs.name),
	type: projectTypeSchema.openapi(projectFieldDocs.type),
	icon: projectIconPublicSchema,
	description: z.string().nullable().openapi(projectFieldDocs.description),
	customTelemetryTags: z.array(projectCustomTelemetryTagPublicSchema),
	creatorId: z.string().nullable().openapi(projectFieldDocs.creatorId),
	createdAt: z.string().datetime().openapi(projectFieldDocs.createdAt),
	updatedAt: z.string().datetime().openapi(projectFieldDocs.updatedAt),
});

export type ProjectPublic = z.infer<typeof projectPublicSchema>;

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

export class UpdateProjectPublicDto extends Z.class(
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

export class DeleteProjectQueryPublicDto extends Z.class({}, { strict: true }) {}
