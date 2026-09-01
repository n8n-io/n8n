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

/**
 * Shares its field list with `publicApiCredentialResponseSchema` (the legacy mapper's runtime
 * schema) via `.extend()`, so a field added there is picked up here automatically. `resolverId`,
 * `createdAt` and `updatedAt` are overridden because this schema is rendered into the OpenAPI spec
 * via `@ApiResponse`, where the base schema's types don't hold up: `z.coerce.date()` maps to a
 * bare `type: string` with no `format: date-time` (zod-to-openapi has no date-time case for
 * `ZodDate`), and `resolverId` is `.optional()` there only because that schema defends against
 * callers who might omit it — every caller here (and the mapper itself) always supplies it,
 * defaulting to `null`.
 */
export const credentialPublicSchema = publicApiCredentialResponseSchema.extend({
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
