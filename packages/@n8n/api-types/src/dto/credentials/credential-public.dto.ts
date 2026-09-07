import '../../openapi-extend';

import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { publicApiCredentialResponseSchema } from '../../schemas/credential-response.schema';
import { Z } from '../../zod-class';

const readOnlyPublicSchema = (descriptor: ZodOpenAPIMetadata) =>
	z.undefined({ invalid_type_error: 'is read-only' }).openapi(descriptor);

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

export const credentialListItemPublicSchema = credentialPublicSchema
	.pick({ id: true, name: true, type: true, createdAt: true, updatedAt: true })
	.extend({ shared: z.array(credentialSharedPublicSchema) });

export class CredentialListPublicDto extends Z.class({
	data: z.array(credentialListItemPublicSchema),
	nextCursor: z.string().nullable(),
}) {}

/**
 * The public request body for `POST /credentials`. Field order matches the legacy
 * `credentialCreate.yml` schema, because field order sets the property order in the
 * generated OpenAPI YAML.
 */
export class CreateCredentialPublicDto extends Z.class(
	{
		id: readOnlyPublicSchema({ type: 'string', readOnly: true, example: 'R2DjclaysHbqn778' }),
		name: z.string().openapi({ example: "Joe's Github Credentials" }),
		type: z.string().openapi({ example: 'githubApi' }),
		data: z.record(z.string(), z.unknown()).openapi({
			writeOnly: true,
			example: { accessToken: 'ada612vad6fa5df4adf5a5dsf4389adsf76da7s' },
		}),
		isResolvable: z
			.boolean()
			.optional()
			.openapi({ example: false, description: 'Whether this credential has resolvable fields' }),
		createdAt: readOnlyPublicSchema({
			type: 'string',
			format: 'date-time',
			readOnly: true,
			example: '2022-04-29T11:02:29.842Z',
		}),
		updatedAt: readOnlyPublicSchema({
			type: 'string',
			format: 'date-time',
			readOnly: true,
			example: '2022-04-29T11:02:29.842Z',
		}),
		projectId: z.string().optional().openapi({
			description: "Project to create the credential in. Defaults to the user's personal project.",
			example: 'VmwOO9HeTEj20kxM',
		}),
	},
	{ strict: true },
) {}

/**
 * The public request body for `PATCH /credentials/{credentialId}`. Every field is optional:
 * a caller sends only the fields to change. Field order matches the legacy
 * `update-credential-request.yml` schema.
 */
export class UpdateCredentialPublicDto extends Z.class(
	{
		name: z.string().optional().openapi({
			example: 'Updated Credential Name',
			description: 'The name of the credential',
		}),
		type: z.string().optional().openapi({
			example: 'githubApi',
			description: 'The credential type. If changing type, data must also be provided.',
		}),
		data: z
			.record(z.string(), z.unknown())
			.optional()
			.openapi({
				writeOnly: true,
				example: { accessToken: 'new_token_value' },
				description: 'The credential data. Required when changing credential type.',
			}),
		isGlobal: z.boolean().optional().openapi({
			example: false,
			description: 'Whether this credential is available globally',
		}),
		isResolvable: z
			.boolean()
			.optional()
			.openapi({ example: false, description: 'Whether this credential has resolvable fields' }),
		isPartialData: z
			.boolean()
			.optional()
			.openapi({
				example: false,
				default: false,
				description:
					'If true, unredacts and merges existing credential data with the provided data. ' +
					'If false, replaces the entire data object.',
			}),
	},
	{ strict: true },
) {}
