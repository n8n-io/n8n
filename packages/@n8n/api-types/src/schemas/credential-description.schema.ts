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
