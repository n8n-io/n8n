import { assignableProjectRoleSchema } from '@n8n/permissions';
import { z } from 'zod';

export const projectNameSchema = z.string().min(1).max(255);

export const projectTypeSchema = z.enum(['personal', 'team']);
export type ProjectType = z.infer<typeof projectTypeSchema>;

export const projectIconSchema = z.object({
	type: z.enum(['emoji', 'icon']),
	value: z.string().min(1),
	color: z.string().optional(),
});
export type ProjectIcon = z.infer<typeof projectIconSchema>;

export const projectDescriptionSchema = z.string().max(512);

export const projectRelationSchema = z.object({
	userId: z.string().min(1),
	role: assignableProjectRoleSchema,
});
export type ProjectRelation = z.infer<typeof projectRelationSchema>;

const customTelemetryTagSchema = z.object({
	key: z.string().refine((k) => k.trim().length > 0, { message: 'Key must not be empty' }),
	value: z.string(),
});

export const projectCustomTelemetryTagsSchema = z.array(customTelemetryTagSchema).refine(
	(tags) => {
		const trimmedKeys = tags.map((t) => t.key.trim());
		return trimmedKeys.length === new Set(trimmedKeys).size;
	},
	{ message: 'Duplicate keys are not allowed in custom span attributes' },
);
