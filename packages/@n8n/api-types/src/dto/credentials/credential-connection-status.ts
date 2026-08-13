/**
 * Per-user connection state surfaced on credential responses. Set on private
 * (resolvable) credentials only; omitted for static credentials whose
 * connection is shared across everyone who can read them.
 */
export interface CredentialConnectionStatus {
	connectedByMe?: boolean;
	/**
	 * The provider account the requesting user's own connection authenticates as
	 * (e.g. the connected Gmail address). Undefined when the provider returns no
	 * identity claim, which is common — never fall back to the n8n account here.
	 */
	connectedAccountIdentifier?: string;
	/** Total number of users who have a per-user entry for this credential. */
	connectedUserCount?: number;
}
