import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import type { RemoteResourceOwner, StatusResourceOwner } from './resource-owner';

export interface ExportableCredential {
	id: string;
	name: string;
	type: string;
	data: ICredentialDataDecryptedObject;

	/**
	 * Email of the user who owns this credential at the source instance.
	 * Ownership is mirrored at target instance if user is also present there.
	 */
	ownedBy: RemoteResourceOwner | null;

	/**
	 * Whether this credential is globally accessible across all projects.
	 */
	isGlobal?: boolean;
}

export type StatusExportableCredential = ExportableCredential & {
	filename: string;
	ownedBy?: StatusResourceOwner;
};
