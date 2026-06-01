// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager } from '@n8n/typeorm';

/**
 * Interface for per-user credential connection state providers.
 *
 * Implementations look up whether the current user has per-user storage
 * associated with each given credential. Used by the credentials service to
 * populate the `connectedByMe` field on credential responses and to mirror
 * `data.oauthTokenData` per user on resolvable credentials.
 *
 * Modules register a concrete provider at init time; if no provider is
 * registered, the {@link CredentialConnectionStatusProxy} degrades to a no-op
 * (empty set), so read endpoints stay functional even when the
 * dynamic-credentials feature is disabled.
 */
export interface ICredentialConnectionStatusProvider {
	/**
	 * Returns the subset of `credentialIds` for which the user has at least
	 * one per-user storage entry.
	 *
	 * Implementations must execute a single bulk query (no N+1).
	 */
	findConnectedCredentialIds(userId: string, credentialIds: string[]): Promise<Set<string>>;

	/**
	 * Returns the number of distinct users who have a per-user entry for this
	 * credential under the system resolver.
	 */
	countConnectedUsers(credentialId: string): Promise<number>;

	/**
	 * Deletes all per-user entries for the given credential. Used when toggling Private→Static.
	 */
	deleteAllUserEntries(credentialId: string, em?: EntityManager): Promise<void>;
}
