/**
 * Detect when a WebAuthn ceremony rejection was a user cancellation —
 * pressing ESC, clicking "Cancel" in the OS prompt, dismissing the
 * picker, or a password-manager extension (Bitwarden, 1Password) hijacking
 * the call. `@simplewebauthn/browser` wraps the original DOMException, so
 * the marker can live on `e.name`, `e.cause.name`, or as one of the
 * library's own `code` strings.
 */
export function isWebauthnUserCancellation(e: unknown): boolean {
	if (!e || typeof e !== 'object') return false;
	const candidate = e as { name?: string; code?: string; cause?: { name?: string } };
	if (candidate.name === 'NotAllowedError' || candidate.name === 'AbortError') return true;
	if (candidate.code === 'ERROR_CEREMONY_ABORTED') return true;
	if (candidate.code === 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY') return true;
	const causeName = candidate.cause?.name;
	return causeName === 'NotAllowedError' || causeName === 'AbortError';
}
