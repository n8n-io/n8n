import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

export interface ExportableCredential {
	id: string;
	name: string;
	type: string;
	data: ICredentialDataDecryptedObject;
}
