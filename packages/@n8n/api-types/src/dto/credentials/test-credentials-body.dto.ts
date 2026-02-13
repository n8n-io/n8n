import { z } from 'zod';
import { Z } from 'zod-class';

const projectIconSchema = z
	.object({
		type: z.enum(['emoji', 'icon']),
		value: z.string(),
	})
	.nullable();

const projectSharingDataSchema = z.object({
	id: z.string(),
	name: z.string().nullable(),
	icon: projectIconSchema,
	type: z.enum(['personal', 'team', 'public']),
	createdAt: z.string(),
	updatedAt: z.string(),
});

const credentialsDecryptedSchema = z.object({
	id: z.string(),
	name: z.string().optional(),
	type: z.string(),
	data: z.record(z.string(), z.any()).optional(),
	homeProject: projectSharingDataSchema.optional(),
	sharedWithProjects: z.array(projectSharingDataSchema).optional(),
	isGlobal: z.boolean().optional(),
	isResolvable: z.boolean().optional(),
});

export class TestCredentialsBodyDto extends Z.class({
	credentials: credentialsDecryptedSchema,
}) {}
