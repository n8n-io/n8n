import { z } from 'zod';

// Strict: once the importer parses through this schema, adding fields to
// tag.json is a format-breaking change for older importers.
export const serializedTagSchema = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1).max(24),
	})
	.strict();

export type SerializedTag = z.infer<typeof serializedTagSchema>;
