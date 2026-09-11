import '../../openapi-extend';

import { z } from 'zod';

import { publicApiCredentialResponseSchema } from '../../schemas/credential-response.schema';
import { Z } from '../../zod-class';

export const credentialSharedPublicSchema = z.object({
	id: z.string(),
	name: z.string(),
	role: z.string(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export const credentialPublicSchema = publicApiCredentialResponseSchema.extend({
	resolverId: z.string().nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export class CredentialPublicDto extends Z.class(credentialPublicSchema.shape) {}

/**
 * The delete response carries `usageScope` on top of the standard credential fields, because the
 * legacy handler returned the whole entity minus `data`/`shared`. The route only ever resolves
 * project-scoped credentials, so in practice the value is always `'project'`.
 */
export const credentialDeletedPublicSchema = credentialPublicSchema.extend({
	usageScope: z.enum(['project', 'instance']),
});

export class DeleteCredentialPublicDto extends Z.class(credentialDeletedPublicSchema.shape) {}

export const credentialListItemPublicSchema = credentialPublicSchema
	.pick({ id: true, name: true, type: true, createdAt: true, updatedAt: true })
	.extend({ shared: z.array(credentialSharedPublicSchema) });

export class CredentialListPublicDto extends Z.class({
	data: z.array(credentialListItemPublicSchema),
	nextCursor: z.string().nullable(),
}) {}

export class TransferCredentialPublicDto extends Z.class({
	destinationProjectId: z.string().openapi({
		description: 'The ID of the project to transfer the credential to.',
		example: 'VmwOO9HeTEj20kxM',
	}),
}) {}
