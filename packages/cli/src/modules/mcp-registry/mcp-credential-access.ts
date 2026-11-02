import type { CredentialsFinderService } from '@n8n/backend-services';
import type { CredentialsEntity, User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';

/**
 * An MCP connection sends requests as the credential's account, so read access
 * is not enough: a project viewer can read a credential but not use it.
 * `credential:connect` is held by the roles that can use it (project editors
 * and admins, direct sharees, instance owners and admins). Read access is
 * enough for a static global credential, which every member can use, and for a
 * user whose instance role may use any credential (`credential:use`).
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
	if (!readable || readable.isResolvable) return null;
	return readable.isGlobal || hasGlobalScope(user, 'credential:use') ? readable : null;
}
