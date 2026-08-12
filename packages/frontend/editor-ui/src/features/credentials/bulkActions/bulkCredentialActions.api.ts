import type { BulkCredentialActionResult } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import type { CredentialsResource } from '@/Interface';

import type { NormalizedBulkCredentialActionResult } from './bulkCredentialActions.types';

export async function bulkDeleteCredentialsApi(
	context: IRestApiContext,
	credentialIds: string[],
): Promise<BulkCredentialActionResult> {
	return await makeRestApiRequest(context, 'POST', '/credentials/bulk/delete', { credentialIds });
}

export async function bulkTransferCredentialsApi(
	context: IRestApiContext,
	payload: { credentialIds: string[]; destinationProjectId: string },
): Promise<BulkCredentialActionResult> {
	return await makeRestApiRequest(context, 'POST', '/credentials/bulk/transfer', payload);
}

export function normalizeBulkCredentialActionResult(
	response: BulkCredentialActionResult,
	credentials: CredentialsResource[],
): NormalizedBulkCredentialActionResult {
	const namesById = new Map(credentials.map((credential) => [credential.id, credential.name]));
	return {
		status: response.status,
		items: response.results.map((item) => ({
			id: item.credentialId,
			resourceType: 'credential',
			name: namesById.get(item.credentialId) ?? item.credentialId,
			status: item.status,
			message: item.message ?? item.reason,
		})),
		mocked: false,
	};
}
