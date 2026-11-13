import { UUID_V7_PATTERN } from '@n8n/constants';

/**
 * Layout of an engine v2 approval callback. The engine mints and verifies the
 * callback; core reads the step out of it for the node webhook handlers.
 * Telegram allows 64 bytes for the data of a button, so the step id travels
 * as its 16 bytes in 22 base64url characters.
 */
export const APPROVAL_CALLBACK_PREFIX = 'nhitl2|';

export const encodeStepId = (stepId: string): string =>
	Buffer.from(stepId.replaceAll('-', ''), 'hex').toString('base64url');

/** Accepts only the string that `encodeStepId` builds for a UUID v7. */
export function decodeStepId(encoded: string): string | undefined {
	// Check the length before decoding, so an oversized value allocates nothing.
	if (!/^[A-Za-z0-9_-]{22}$/.test(encoded)) return undefined;
	const hex = Buffer.from(encoded, 'base64url').toString('hex');
	const stepId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
	// The last of the 22 characters has 4 unused bits, so 16 strings decode to the same id.
	return UUID_V7_PATTERN.test(stepId) && encodeStepId(stepId) === encoded ? stepId : undefined;
}
