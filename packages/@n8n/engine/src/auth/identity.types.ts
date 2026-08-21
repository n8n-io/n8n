/** The peer a verified identity token proves. */
export interface AuthenticatedCaller {
	cpId: string;
	tenantId: string;
}

/**
 * Turns an identity token into the caller it proves. The only seam that knows
 * the trust source: a shared secret today, an STS JWKS in cloud.
 */
export interface IdentityVerifier {
	verify(token: string): AuthenticatedCaller;
}
