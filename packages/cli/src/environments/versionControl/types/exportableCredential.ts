import type { ICredentialDataDecryptedObject, ICredentialNodeAccess } from 'n8n-workflow';

export interface ExportableCredential {
	id: string;
	name: string;
	type: string;
	data: ICredentialDataDecryptedObject;
	nodesAccess: ICredentialNodeAccess[];
}
