import type { IRestApiContext } from '../types';

/**
 * Returns a mocked response for project scoped connected vaults.
 * Keep in mind that if these were coming from the backend,
 * the backend would ensure that no provider.
 *
 * In prod, this would call a new endpoint like this:
 * GET /rest/secret-providers/secrets/project/{projectId}
 */
export const getProjectExternalSecretsMock = async (
	_context: IRestApiContext,
	_projectId: string,
): Promise<Record<string, string[]>> => {
	await new Promise((resolve) => setTimeout(resolve, 10)); // just to fulfill function signature
	return {
		projectVault: ['secret.helloworld.foo', 'secret.foobar.bar'],
		projectGcpSecretsManager: ['secret.api-one.three'],
	};
};
