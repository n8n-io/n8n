import type { SkillSourceCredentialOption } from '@n8n/api-types';
import type { User } from '@n8n/db';

/**
 * The data of one credential, decrypted, with a fresh token when the type mints one. `id` lets
 * a client key its caches by credential, as a fresh token changes on every resolve.
 */
export type ResolvedSkillSourceCredential = {
	id: string;
	type: string;
	data: Record<string, unknown>;
};

export type SkillSourceCredentialScope = {
	projectId: string | null;
	user?: User;
	types: readonly string[];
	/**
	 * Runs on the decrypted credential before a fresh token is minted, so a credential that the
	 * source cannot use, such as one for another host, sends no request. Throws to refuse it.
	 */
	check?: (credential: ResolvedSkillSourceCredential) => void;
};

/**
 * The n8n credentials that a skill source may use. The skills module cannot import the
 * credential services of cli, so it owns this contract, and the agents module implements it
 * and registers it on `SkillSourceCredentialsProxy`.
 *
 * The scope of a source decides which credentials it accepts. A project source accepts the
 * credentials that its project owns or that are shared with it. A Global source
 * (`projectId` null) accepts a credential whose owner may manage Global skills.
 */
export abstract class SkillSourceCredentials {
	/** The credentials of these types that the scope accepts and the user can use. */
	abstract listUsable(
		user: User,
		projectId: string | null,
		types: readonly string[],
	): Promise<SkillSourceCredentialOption[]>;

	/**
	 * Decrypts a credential of one of `types` for a source in this scope. Answers null, without
	 * decrypting, when the credential does not exist, has another type, is not accepted by the
	 * scope, or when `user` is given and cannot use it. A type that mints short-lived tokens,
	 * such as a GitHub App, gets a fresh token, after `check` passes.
	 */
	abstract resolve(
		credentialId: string,
		scope: SkillSourceCredentialScope,
	): Promise<ResolvedSkillSourceCredential | null>;
}
