import { TransferCredentialPublicDto } from '../credential-public.dto';

describe('TransferCredentialPublicDto', () => {
	test('accepts destinationProjectId and strips unknown keys', () => {
		const result = TransferCredentialPublicDto.safeParse({
			destinationProjectId: '1234',
			somethingElse: true,
		});

		expect(result).toMatchObject({ success: true, data: { destinationProjectId: '1234' } });
		expect(result.data).not.toHaveProperty('somethingElse');
	});

	test('rejects a missing destinationProjectId', () => {
		expect(TransferCredentialPublicDto.safeParse({}).success).toBe(false);
	});
});
