import type { ICredentialDataDecryptedObject, ICredentialNodeAccess } from 'n8n-workflow';

export interface ExportableCredential {
	id: string;
	name: string;
	type: string;
	data: ICredentialDataDecryptedObject;
	nodesAccess: ICredentialNodeAccess[];

	/**
	 * Email of the user who owns this credential at the source instance.
	 * Ownership is mirrored at target instance if user is also present there.
	 */
	ownedBy: string | null;
}
