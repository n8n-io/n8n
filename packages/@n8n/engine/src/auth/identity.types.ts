/** The peer a verified identity token proves. */
export interface AuthenticatedCaller {
	/** Identifies the control plane that signed the token. Carried in the `sub` claim. */
	cpId: string;
	/** The tenant the call acts for. Scopes every resource the request may touch. */
	tenantId: string;
}

/**
 * Turns an identity token into the caller it proves. The only seam that knows
 * the trust source: a shared secret today, an STS JWKS in cloud.
 */
export interface IdentityVerifier {
	/**
	 * Returns the caller the token proves, or throws when the token is not
	 * trustworthy. Throws one error type only, so no caller can tell which check
	 * failed.
	 */
	verify(token: string): AuthenticatedCaller;
}
