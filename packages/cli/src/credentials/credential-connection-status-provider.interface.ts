import type { EntityManager } from '@n8n/typeorm';

/** One user's connection to one credential. */
export type UserConnection = {
	/**
	 * The provider account the connection authenticates as (e.g. the connected
	 * Gmail address). Undefined whenever the provider returns no identity claim,
	 * which is common — callers must be able to render a connection without it.
	 */
	accountIdentifier?: string;
};

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
 * (empty map), so read endpoints stay functional even when the
 * dynamic-credentials feature is disabled.
 */
export interface ICredentialConnectionStatusProvider {
	/**
	 * Returns the subset of `credentialIds` the user has a per-user storage entry
	 * for, keyed by credential id.
	 *
	 * Implementations must execute a single bulk query (no N+1).
	 */
	findMyConnections(userId: string, credentialIds: string[]): Promise<Map<string, UserConnection>>;

	/**
	 * Returns the number of distinct users who have a per-user entry for this
	 * credential under the system resolver.
	 */
	countConnectedUsers(credentialId: string): Promise<number>;

	/**
	 * Deletes all per-user entries for the given credential. Used when toggling Private→Static.
	 */
	deleteAllUserEntries(credentialId: string, em?: EntityManager): Promise<void>;

	/**
	 * Re-evaluates access for the given users and deletes all their per-user
	 * entries (across all resolvers) for any credential where they no longer
	 * hold `credential:connect`. Pass `credentialId` to scope to one credential.
	 */
	cleanupOrphanedEntriesForUsers(
		userIds: string[],
		em?: EntityManager,
		credentialId?: string,
	): Promise<void>;

	/**
	 * Re-evaluates one credential's connections for members of the given
	 * projects, deleting those who no longer hold `credential:connect`.
	 */
	cleanupOrphanedEntriesForProjects(
		credentialId: string,
		projectIds: string[],
		em?: EntityManager,
	): Promise<void>;
}
