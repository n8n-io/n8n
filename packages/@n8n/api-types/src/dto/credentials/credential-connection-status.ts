/**
 * Per-user connection state surfaced on credential responses. Set on private
 * (resolvable) credentials only; omitted for static credentials whose
 * connection is shared across everyone who can read them.
 */
export interface CredentialConnectionStatus {
	connectedByMe?: boolean;
	/** Total number of users who have a per-user entry for this credential. */
	connectedUserCount?: number;
}
