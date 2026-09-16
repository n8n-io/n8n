import { z } from 'zod';

/**
 * A credential list response can hold hundreds of rows. When a reader starts to
 * truncate this field, keep its limit and this cap in agreement.
 */
export const CREDENTIAL_DESCRIPTION_MAX_LENGTH = 512;

/**
 * A blank description is stored as `null`, so the trim runs before the cap and
 * an all-whitespace value is accepted here and normalized on write.
 */
export const credentialDescriptionSchema = z
	.string()
	.trim()
	.max(CREDENTIAL_DESCRIPTION_MAX_LENGTH, {
		message: `Credential description cannot be longer than ${CREDENTIAL_DESCRIPTION_MAX_LENGTH} characters`,
	});
