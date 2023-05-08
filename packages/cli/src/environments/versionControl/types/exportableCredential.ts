// import type { ICredentialNodeAccess } from 'n8n-workflow';

export interface ExportableCredential {
	id: string;
	name: string;
	type: string;
	// nodesAccess: ICredentialNodeAccess[];
}
