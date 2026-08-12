import { z } from 'zod';

import { Z } from '../../zod-class';

export const projectFilePublicSchema = z.object({
	id: z.string(),
	name: z.string(),
	mimeType: z.string(),
	sizeBytes: z.number(),
	projectId: z.string(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export class ProjectFilePublicDto extends Z.class(projectFilePublicSchema.shape) {}

export class ProjectFileListPublicDto extends Z.class({
	data: z.array(projectFilePublicSchema),
	nextCursor: z.string().nullable(),
}) {}

export class ProjectFileDeletedPublicDto extends Z.class({
	deleted: z.boolean(),
	name: z.string(),
}) {}
