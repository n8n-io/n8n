import type { CredentialsFinderService } from '@n8n/backend-services';
import type { CredentialsEntity, User } from '@n8n/db';

/**
 * An MCP connection sends requests as the credential's account, so read access
 * is not enough: a project viewer can read a credential but not use it.
 * `credential:connect` is held by the roles that can use it (project editors
 * and admins, direct sharees, instance owners and admins). A static global
 * credential is open to every member, so read access is enough for it.
 */
export async function findUsableMcpCredential(
	credentialsFinderService: CredentialsFinderService,
	credentialId: string,
	user: User,
): Promise<CredentialsEntity | null> {
	const connectable = await credentialsFinderService.findCredentialForUser(credentialId, user, [
		'credential:connect',
	]);
	if (connectable) return connectable;

	const readable = await credentialsFinderService.findCredentialForUser(credentialId, user, [
		'credential:read',
	]);
	return readable?.isGlobal && !readable.isResolvable ? readable : null;
}
