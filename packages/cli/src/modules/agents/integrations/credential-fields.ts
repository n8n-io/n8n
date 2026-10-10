import { isRecord } from '@n8n/utils/is-record';
import { UserError } from 'n8n-workflow';

/**
 * Reading a credential field is shared rather than repeated per platform so the
 * trimming stays uniform: pasted IDs and secrets routinely carry surrounding
 * whitespace, and a channel that forgets to trim fails against the vendor with
 * no clue why.
 */
export function credentialField(credential: unknown, field: string): string {
	if (!isRecord(credential)) return '';
	const value = credential[field];
	return typeof value === 'string' ? value.trim() : '';
}

/**
 * The caller supplies the whole message, because a useful one names where in
 * the vendor's console the value comes from.
 *
 * Throws `UserError`: a missing field is the user's to fix, not a bug.
 */
export function requireCredentialField(
	credential: unknown,
	field: string,
	message: string,
): string {
	const value = credentialField(credential, field);
	if (!value) throw new UserError(message);
	return value;
}
