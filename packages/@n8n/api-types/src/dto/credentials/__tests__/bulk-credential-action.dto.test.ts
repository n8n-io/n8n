import {
	BulkDeleteCredentialsDto,
	BulkTransferCredentialsDto,
} from '../bulk-credential-action.dto';

describe('bulk credential action DTOs', () => {
	it('accepts between 1 and 100 credential IDs', () => {
		expect(BulkDeleteCredentialsDto.safeParse({ credentialIds: ['credential-1'] }).success).toBe(
			true,
		);
		expect(
			BulkDeleteCredentialsDto.safeParse({
				credentialIds: Array.from({ length: 100 }, (_, index) => `${index}`),
			}).success,
		).toBe(true);
	});

	it('rejects empty, malformed, and oversized credential ID lists', () => {
		expect(BulkDeleteCredentialsDto.safeParse({ credentialIds: [] }).success).toBe(false);
		expect(BulkDeleteCredentialsDto.safeParse({ credentialIds: [''] }).success).toBe(false);
		expect(
			BulkDeleteCredentialsDto.safeParse({
				credentialIds: Array.from({ length: 101 }, (_, index) => `${index}`),
			}).success,
		).toBe(false);
	});

	it('requires a destination project for transfer', () => {
		expect(
			BulkTransferCredentialsDto.safeParse({
				credentialIds: ['credential-1'],
				destinationProjectId: 'project-1',
			}).success,
		).toBe(true);
		expect(
			BulkTransferCredentialsDto.safeParse({
				credentialIds: ['credential-1'],
				destinationProjectId: '',
			}).success,
		).toBe(false);
	});
});
