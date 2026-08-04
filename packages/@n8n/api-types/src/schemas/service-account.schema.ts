import { z } from 'zod';

import { roleSchema } from './user.schema';

/**
 * A service account as returned by `/rest/service-accounts`.
 *
 * `name` is the display name (stored in `user.firstName`); `email` is synthesized
 * on an unresolvable `.invalid` domain and shown only for traceability.
 */
export const serviceAccountSchema = z.object({
	id: z.string(),
	name: z.string().nullable().optional(),
	email: z.string().nullable().optional(),
	role: roleSchema.optional(),
	disabled: z.boolean(),
	createdAt: z.string().or(z.date()).optional(),
});

export const serviceAccountsListSchema = z.object({
	count: z.number(),
	items: z.array(serviceAccountSchema),
});

/** The human behind an impersonated session. */
export const impersonationActorSchema = z.object({
	id: z.string(),
	email: z.string().nullable().optional(),
	firstName: z.string().nullable().optional(),
	lastName: z.string().nullable().optional(),
});

export type ServiceAccount = z.infer<typeof serviceAccountSchema>;
export type ServiceAccountsList = z.infer<typeof serviceAccountsListSchema>;
export type ImpersonationActor = z.infer<typeof impersonationActorSchema>;
