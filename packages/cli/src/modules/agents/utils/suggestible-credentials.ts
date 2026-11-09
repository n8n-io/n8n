import type { CredentialProvider } from '@n8n/agents';

import type { CredentialsService } from '@/credentials/credentials.service';

/**
 * Keeps the credentials that the project owns or that are shared with it, and
 * global credentials. In the personal project of an owner or admin, the usable
 * set also holds every other user's personal credentials. An owner or admin
 * may use those, but they must not be suggested or picked for them, because
 * the agent would then act with a colleague's identity.
 */
export async function filterSuggestibleCredentials<T extends { id: string }>(
	credentialsService: CredentialsService,
	projectId: string,
	credentials: T[],
): Promise<T[]> {
	if (credentials.length === 0) return credentials;

	const [projectCredentials, globalCredentials] = await Promise.all([
		credentialsService.findAllCredentialIdsForProject(projectId, {
			excludeInstanceWideRoute: true,
		}),
		credentialsService.findAllGlobalCredentialIds(),
	]);
	const suggestibleIds = new Set(
		[...projectCredentials, ...globalCredentials].map((credential) => credential.id),
	);

	return credentials.filter((credential) => suggestibleIds.has(credential.id));
}

/**
 * Narrows `list()` to the credentials to suggest. `resolve()` is unchanged, so
 * an agent that already references a credential outside that set still runs.
 */
export function withSuggestibleCredentials(
	provider: CredentialProvider,
	credentialsService: CredentialsService,
	projectId: string,
): CredentialProvider {
	return {
		resolve: async (credentialId) => await provider.resolve(credentialId),
		list: async () =>
			await filterSuggestibleCredentials(credentialsService, projectId, await provider.list()),
	};
}
