import { z } from 'zod';

export const projectNameSchema = z.string().min(1).max(255);

export const projectTypeSchema = z.enum(['personal', 'team']);
export type ProjectType = z.infer<typeof projectTypeSchema>;

const projectIconSchema = z.object({
	type: z.enum(['emoji', 'icon']),
	value: z.string().min(1),
});
export type ProjectIcon = z.infer<typeof projectIconSchema>;

export const projectSettingsSchema = z.object({
	icon: projectIconSchema.optional(),
	dedicatedQueue: z.boolean().default(false).optional(),
	// TODO: add timezone, callerPolicy, saving options, etc
	// TODO: add 'workflowsFromSameProject` to `CallerPolicy`
});
export type ProjectSettings = z.infer<typeof projectSettingsSchema>;

export const projectRoleSchema = z.enum([
	'project:personalOwner', // personalOwner is only used for personal projects
	'project:admin',
	'project:editor',
	'project:viewer',
]);
export type ProjectRole = z.infer<typeof projectRoleSchema>;

export const projectRelationSchema = z.object({
	userId: z.string(),
	role: projectRoleSchema,
});
export type ProjectRelation = z.infer<typeof projectRelationSchema>;
