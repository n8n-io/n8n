import { z } from 'zod';

import { aiPreferenceContentSchema } from '../../schemas/ai-preference.schema';

/** Project placement comes from the package layout and destination mapping. */
export const serializedPreferenceSchema = z
	.object({
		id: z.string().uuid(),
		scope: z.enum(['project', 'instance']),
		content: aiPreferenceContentSchema,
	})
	.strict();

export type SerializedPreference = z.infer<typeof serializedPreferenceSchema>;
