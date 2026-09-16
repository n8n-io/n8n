import { z } from 'zod';

/**
 * A credential list response can hold hundreds of rows, and a later reader sends
 * each one to a model, so this cap bounds that cost. When a reader starts to
 * truncate the field, keep its limit and this cap in agreement.
 */
export const CREDENTIAL_DESCRIPTION_MAX_LENGTH = 512;

/**
 * The trim runs before the cap, so trailing spaces cannot fail a value that
 * fits. A read returns `null` for an unset description, so a write accepts
 * `null` too and a client can send back what it read.
 */
export const credentialDescriptionSchema = z
	.string()
	.trim()
	.max(CREDENTIAL_DESCRIPTION_MAX_LENGTH, {
		message: `Credential description cannot be longer than ${CREDENTIAL_DESCRIPTION_MAX_LENGTH} characters`,
	})
	.nullable();
