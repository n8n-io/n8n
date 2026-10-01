import '../../openapi-extend';

import { z } from 'zod';

import { credentialDescriptionSchema } from '../../schemas/credential-description.schema';
import { publicApiCredentialResponseSchema } from '../../schemas/credential-response.schema';
import { n8nIdSchema } from '../../schemas/id.schema';
import { readOnlyPublicSchema } from '../../schemas/read-only-public.schema';
import { Z } from '../../zod-class';

export const credentialSharedPublicSchema = z.object({
	id: z.string(),
	name: z.string(),
	role: z.string(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export const credentialPublicSchema = publicApiCredentialResponseSchema.extend({
	description: z.string().nullable().optional().openapi({
		example: 'Read-only key for the reporting database',
		description: 'Present only when credential descriptions are enabled.',
	}),
	resolverId: z.string().nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export class CredentialPublicDto extends Z.class(credentialPublicSchema.shape) {}

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

export class CreateCredentialPublicDto extends Z.class({
	id: n8nIdSchema
		.max(16)
		.regex(/^[a-zA-Z0-9_-]+$/, 'Use only letters, digits, underscores, and hyphens for the ID')
		.optional()
		.openapi({
			example: 'R2DjclaysHbqn778',
			description:
				'An unused credential ID of 1–16 letters, digits, underscores, or hyphens. The supplied ID is preserved exactly. Omit to generate an ID.',
		}),
	name: z.string().openapi({ example: "Joe's Github Credentials" }),
	description: credentialDescriptionSchema.optional().openapi({
		example: 'Read-only key for the reporting database',
		description:
			'Plain text, up to 512 characters. A blank value is saved as null. Ignored when credential descriptions are disabled.',
	}),
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
}) {}

export class UpdateCredentialPublicDto extends Z.class({
	name: z.string().optional().openapi({
		example: 'Updated Credential Name',
		description: 'The name of the credential',
	}),
	description: credentialDescriptionSchema.optional().openapi({
		example: 'Read-only key for the reporting database',
		description:
			'Plain text, up to 512 characters. Send null or a blank value to clear it. Omit it to keep the stored value. Ignored when credential descriptions are disabled.',
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
}) {}

export class TransferCredentialPublicDto extends Z.class({
	destinationProjectId: z.string().openapi({
		description: 'The ID of the project to transfer the credential to.',
		example: 'VmwOO9HeTEj20kxM',
	}),
}) {}

export class CredentialTestPublicDto extends Z.class({
	status: z.enum(['OK', 'Error']).openapi({ example: 'OK' }),
	message: z.string().openapi({ example: 'Connection successful!' }),
}) {}

export class CredentialSchemaPublicDto extends Z.class(
	{
		additionalProperties: z.literal(false),
		type: z.literal('object'),
		properties: z.record(z.string(), z.unknown()).openapi({
			description:
				"JSON Schema fragment for each of the credential type's fields, keyed by field name.",
			example: { apiKey: { type: 'string' }, domain: { type: 'string' } },
		}),
		required: z.array(z.string()).openapi({
			description:
				'Names of the fields that a request must include. A field with a default value is not listed.',
			example: ['apiKey', 'domain'],
		}),
		allOf: z.array(z.unknown()).optional(),
	},
	{ strict: true },
) {}
