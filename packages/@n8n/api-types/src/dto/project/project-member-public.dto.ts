import '../../openapi-extend';

import { z } from 'zod';

import {
	projectMemberDocs,
	projectMemberFieldDocs,
	projectMemberListFieldDocs,
} from './project-member-public.openapi';
import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

export const projectMemberPublicSchema = z
	.object({
		id: z.string().openapi(projectMemberFieldDocs.id),
		email: z.string().openapi(projectMemberFieldDocs.email),
		firstName: z.string().nullable().openapi(projectMemberFieldDocs.firstName),
		lastName: z.string().nullable().openapi(projectMemberFieldDocs.lastName),
		createdAt: z.string().datetime().openapi(projectMemberFieldDocs.createdAt),
		updatedAt: z.string().datetime().openapi(projectMemberFieldDocs.updatedAt),
		role: z.string().nullable().openapi(projectMemberFieldDocs.role),
	})
	.openapi(projectMemberDocs);

export class ProjectMemberPublicDto extends Z.class(projectMemberPublicSchema.shape) {}

export class ProjectMemberListPublicDto extends Z.class({
	data: z.array(projectMemberPublicSchema),
	nextCursor: z.string().nullable().openapi(projectMemberListFieldDocs.nextCursor),
}) {}

export class ListProjectMembersQueryPublicDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}
