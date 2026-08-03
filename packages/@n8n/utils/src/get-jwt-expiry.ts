/**
 * Decode the payload of a JWT without verifying the signature.
 * Returns the `exp` claim (seconds since epoch) or undefined.
 *
 * Use only for trusted tokens (e.g. ones we just received from our own proxy)
 * where the goal is scheduling refresh, not authenticating the issuer.
 */
export function getJwtExpiry(jwt: string): number | undefined {
	const parts = jwt.split('.');
	if (parts.length !== 3) return undefined;
	try {
		const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as {
			exp?: number;
		};
		return typeof payload.exp === 'number' ? payload.exp : undefined;
	} catch {
		return undefined;
	}
}
