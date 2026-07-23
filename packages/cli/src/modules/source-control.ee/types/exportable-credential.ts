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

	/**
	 * Whether this credential is resolved per-user at runtime by a credential
	 * resolver ("private"/dynamic credential). Carried across environments so the
	 * resolvable nature survives promotion. The resolver binding itself
	 * (resolverId) is instance-local and handled separately (see IAM-906).
	 */
	isResolvable?: boolean;

	/**
	 * Whether dynamic resolution may fall back to the static credential data when
	 * resolution fails. Travels with `isResolvable`.
	 */
	resolvableAllowFallback?: boolean;
}

export type StatusExportableCredential = ExportableCredential & {
	filename: string;
	ownedBy?: StatusResourceOwner;
};
