import { z } from 'zod';

const projectIconSchema = z.object({
	type: z.enum(['emoji', 'icon']),
	value: z.string(),
});

const customTelemetryTagSchema = z.object({
	key: z.string(),
	value: z.string(),
});

export const serializedProjectSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string().optional(),
	icon: projectIconSchema.optional(),
	// OTEL custom span attributes. Optional for back-compat with packages
	// exported before this field existed.
	customTelemetryTags: z.array(customTelemetryTagSchema).optional(),
});

export type SerializedProject = z.infer<typeof serializedProjectSchema>;
