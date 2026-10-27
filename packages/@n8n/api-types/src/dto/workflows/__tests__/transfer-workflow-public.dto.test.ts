import { TransferWorkflowPublicDto } from '../transfer-workflow-public.dto';

describe('TransferWorkflowPublicDto', () => {
	// The internal DTO accepts `shareCredentials` and `destinationParentFolderId`. The public one must
	// not, so neither can be reached through the Public API.
	test('strips fields not part of the public contract', () => {
		const result = TransferWorkflowPublicDto.safeParse({
			destinationProjectId: '1234',
			shareCredentials: ['cred-1'],
			destinationParentFolderId: 'folder-1',
		});

		expect(result).toMatchObject({ success: true, data: { destinationProjectId: '1234' } });
		expect(result.data).not.toHaveProperty('shareCredentials');
		expect(result.data).not.toHaveProperty('destinationParentFolderId');
	});
});
