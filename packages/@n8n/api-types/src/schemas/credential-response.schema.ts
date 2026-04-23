import { z } from 'zod';

/**
 * Plain credential row in public API responses.
 */
export const publicApiCredentialResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
	isManaged: z.boolean(),
	isGlobal: z.boolean(),
	isResolvable: z.boolean(),
	resolvableAllowFallback: z.boolean(),
	resolverId: z.union([z.string(), z.null()]).optional(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export type PublicApiCredentialResponse = z.infer<typeof publicApiCredentialResponseSchema>;
