import { z } from 'zod';

/** Bounds the cost of sending a whole credential list to a model. */
export const CREDENTIAL_DESCRIPTION_MAX_LENGTH = 512;

/** Trims, caps, and stores a blank description as `null`. */
export const credentialDescriptionSchema = z
	.string()
	.trim()
	.max(CREDENTIAL_DESCRIPTION_MAX_LENGTH, {
		message: `Credential description cannot be longer than ${CREDENTIAL_DESCRIPTION_MAX_LENGTH} characters`,
	})
	.nullable()
	.transform((value) => (value === '' ? null : value));

export const UPDATE_CREDENTIAL_DESCRIPTION_TOOL_DESCRIPTION =
	'Set or replace a credential description only when the user explicitly requests a description change. Describe its purpose and intended use from known context. Keep it concise and exclude secrets. A blank string clears it. Credential names, types, and secret values stay unchanged.';

export const updateCredentialDescriptionSchema = z.object({
	credentialId: z.string().min(1).describe('ID of the credential to update'),
	description: credentialDescriptionSchema,
});
