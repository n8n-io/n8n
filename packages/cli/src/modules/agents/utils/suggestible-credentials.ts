import type { CredentialProvider } from '@n8n/agents';
import type { User } from '@n8n/db';

import type { CredentialsPermissionChecker } from '@/executions/pre-execution-checks/credentials-permission-checker';

/**
 * Keeps the credentials that `user` can use through their own access: owned,
 * shared with them, in a project they belong to, or global. An owner or admin
 * may use any personal credential in their personal project, but suggestions
 * stick to their own access. Execution redaction asks the same question, so a
 * suggested credential never leads to a run whose data the user cannot see.
 */
export async function filterSuggestibleCredentials<T extends { id: string }>(
	credentialsPermissionChecker: CredentialsPermissionChecker,
	user: User,
	credentials: T[],
): Promise<T[]> {
	if (credentials.length === 0) return credentials;

	const inaccessibleIds = new Set(
		await credentialsPermissionChecker.resolveInaccessibleCredentialIdsForUser(
			user,
			credentials.map((credential) => credential.id),
			{ ignoreGlobalUseScope: true },
		),
	);

	return credentials.filter((credential) => !inaccessibleIds.has(credential.id));
}

/**
 * Narrows `list()` to the credentials to suggest. `resolve()` is unchanged, so
 * an agent that already references a credential outside that set still runs.
 */
export function withSuggestibleCredentials(
	provider: CredentialProvider,
	credentialsPermissionChecker: CredentialsPermissionChecker,
	user: User,
): CredentialProvider {
	return {
		resolve: async (credentialId) => await provider.resolve(credentialId),
		list: async () =>
			await filterSuggestibleCredentials(credentialsPermissionChecker, user, await provider.list()),
	};
}
