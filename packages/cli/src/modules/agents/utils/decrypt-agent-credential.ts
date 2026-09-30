import type { CredentialsEntity } from '@n8n/db';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import type { CredentialsHelper } from '@/credentials-helper';

export async function decryptAgentCredential(
	credentialsHelper: CredentialsHelper,
	credential: Pick<CredentialsEntity, 'id' | 'name' | 'type'>,
	scope: { projectId: string; userId?: string },
): Promise<ICredentialDataDecryptedObject> {
	// Load lazily because the execution stack imports the agent module.
	const { getBase } = await import('@/workflow-execute-additional-data.js');
	const additionalData = await getBase(scope);

	// Agents have no workflow execution context for dynamic credential resolution.
	return await credentialsHelper.getDecrypted(
		additionalData,
		{ id: credential.id, name: credential.name },
		credential.type,
		'internal',
	);
}
