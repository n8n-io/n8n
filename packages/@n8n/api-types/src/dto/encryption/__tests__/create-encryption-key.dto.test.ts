import { CreateEncryptionKeyDto } from '../create-encryption-key.dto';

describe('CreateEncryptionKeyDto', () => {
	describe('Valid requests', () => {
		test('should succeed for type=data_encryption', () => {
			const result = CreateEncryptionKeyDto.safeParse({ type: 'data_encryption' });
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid type', () => {
		test.each([
			{ name: 'unknown string', type: 'other_type' },
			{ name: 'empty string', type: '' },
			{ name: 'number', type: 123 },
			{ name: 'boolean', type: true },
			{ name: 'null', type: null },
			{ name: 'missing', type: undefined },
		])('should fail for $name', ({ type }) => {
			const result = CreateEncryptionKeyDto.safeParse({ type });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toEqual(['type']);
			}
		});
	});

	test('should strip unknown fields', () => {
		const result = CreateEncryptionKeyDto.safeParse({
			type: 'data_encryption',
			value: 'should-be-ignored',
			algorithm: 'aes-256-gcm',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({ type: 'data_encryption' });
		}
	});
});
