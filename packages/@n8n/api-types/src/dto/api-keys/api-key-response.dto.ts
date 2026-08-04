import { z } from 'zod';

import { scopesSchema } from '../../schemas/scopes.schema';
import { Z } from '../../zod-class';

/**
 * Wire-accurate response DTOs for the api-keys list endpoint (`GET /rest/api-keys`).
 *
 * These mirror the JSON the backend actually sends (ISO-string dates, redacted
 * `apiKey`, no leaked entity fields). Used as the declared response contract via
 * `@ApiResponse` and as the type/parse source for the generated client. API-42.
 */
const apiKeyOwnerSchema = z.object({
	id: z.string(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	email: z.string(),
});

// The handler returns the raw DB entity, so dates arrive as `Date` in-memory but
// ship as ISO strings on the wire. Accept both and normalize to the wire string,
// so the same DTO both validates the handler output and types the client (API-42).
const isoDate = z
	.union([z.string(), z.date()])
	.transform((v) => (v instanceof Date ? v.toISOString() : v));
const isoDateNullable = z
	.union([z.string(), z.date()])
	.nullable()
	.transform((v) => (v instanceof Date ? v.toISOString() : v));

export class ApiKeyResponseDto extends Z.class({
	id: z.string(),
	label: z.string(),
	apiKey: z.string(),
	createdAt: isoDate,
	updatedAt: isoDate,
	expiresAt: z.number().nullable(),
	scopes: scopesSchema,
	lastUsedAt: isoDateNullable,
	owner: apiKeyOwnerSchema.optional(),
}) {}

export class ApiKeyListResponseDto extends Z.class({
	items: z.array(ApiKeyResponseDto.schema),
	counts: z.object({ mine: z.number(), all: z.number() }),
	totals: z.object({ mine: z.number(), all: z.number() }),
	owners: z.array(apiKeyOwnerSchema.extend({ keyCount: z.number() })),
}) {}

// create/rotate return the key plus its one-time raw secret.
export class ApiKeyWithRawValueResponseDto extends ApiKeyResponseDto.extend({
	rawApiKey: z.string(),
}) {}

// delete/update return a bare success flag.
export class SuccessResponseDto extends Z.class({
	success: z.boolean(),
}) {}

/**
 * Array-root response (the list of scopes for a role). `Z.class` only models
 * object shapes, so a root-level array needs a hand-rolled class exposing the
 * two things `@ApiResponse` + the generator read: `schema` and `parse`. This is
 * the "harder to migrate" shape compared to the object DTOs above (API-42).
 */
export class ApiKeyScopesResponseDto {
	static schema = scopesSchema;
	static parse(data: unknown) {
		return ApiKeyScopesResponseDto.schema.parse(data);
	}
}
