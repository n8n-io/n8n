import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import type { CredentialsResource } from '@/Interface';

import {
	bulkDeleteCredentialsApi,
	bulkTransferCredentialsApi,
	normalizeBulkCredentialActionResult,
} from './bulkCredentialActions.api';

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal()),
	makeRestApiRequest: vi.fn(),
}));

const context = {} as IRestApiContext;

describe('bulk credential action API', () => {
	it('sends Delete to the bulk endpoint', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValue({ status: 'completed', results: [] });

		await bulkDeleteCredentialsApi(context, ['1', '2']);

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'POST', '/credentials/bulk/delete', {
			credentialIds: ['1', '2'],
		});
	});

	it('sends Move to the bulk endpoint', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValue({ status: 'completed', results: [] });

		await bulkTransferCredentialsApi(context, {
			credentialIds: ['1', '2'],
			destinationProjectId: 'project-3',
		});

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'POST', '/credentials/bulk/transfer', {
			credentialIds: ['1', '2'],
			destinationProjectId: 'project-3',
		});
	});

	it('normalizes partial results with display names', () => {
		const credentials = [
			{ resourceType: 'credential', id: '1', name: 'Slack' },
			{ resourceType: 'credential', id: '2', name: 'GitHub' },
		] as CredentialsResource[];

		expect(
			normalizeBulkCredentialActionResult(
				{
					status: 'partial',
					results: [
						{ credentialId: '1', status: 'failed', message: 'Failed' },
						{ credentialId: '2', status: 'notAttempted' },
					],
				},
				credentials,
			),
		).toEqual({
			status: 'partial',
			items: [
				{
					id: '1',
					resourceType: 'credential',
					name: 'Slack',
					status: 'failed',
					message: 'Failed',
				},
				{
					id: '2',
					resourceType: 'credential',
					name: 'GitHub',
					status: 'notAttempted',
					message: undefined,
				},
			],
			mocked: false,
		});
	});
});
