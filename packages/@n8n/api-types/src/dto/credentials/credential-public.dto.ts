import { z } from 'zod';

import { Z } from '../../zod-class';

export const credentialSharedPublicSchema = z.object({
	id: z.string(),
	name: z.string(),
	role: z.string(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export const credentialPublicSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
	isManaged: z.boolean(),
	isGlobal: z.boolean(),
	isResolvable: z.boolean(),
	resolvableAllowFallback: z.boolean(),
	resolverId: z.string().nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export class CredentialPublicDto extends Z.class(credentialPublicSchema.shape) {}

export const credentialListItemPublicSchema = credentialPublicSchema
	.pick({ id: true, name: true, type: true, createdAt: true, updatedAt: true })
	.extend({ shared: z.array(credentialSharedPublicSchema) });

export class CredentialListPublicDto extends Z.class({
	data: z.array(credentialListItemPublicSchema),
	nextCursor: z.string().nullable(),
}) {}
