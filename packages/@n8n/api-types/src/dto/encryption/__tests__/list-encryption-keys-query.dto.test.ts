import { ListEncryptionKeysQueryDto } from '../list-encryption-keys-query.dto';

describe('ListEncryptionKeysQueryDto', () => {
	describe('Valid requests', () => {
		test('should succeed with no query params', () => {
			const result = ListEncryptionKeysQueryDto.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.type).toBeUndefined();
			}
		});

		test('should succeed with type filter', () => {
			const result = ListEncryptionKeysQueryDto.safeParse({ type: 'data_encryption' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.type).toBe('data_encryption');
			}
		});

		test('should accept arbitrary type string', () => {
			const result = ListEncryptionKeysQueryDto.safeParse({ type: 'some_future_type' });
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{ name: 'number', type: 123 },
			{ name: 'boolean', type: true },
			{ name: 'array', type: ['data_encryption'] },
			{ name: 'object', type: { kind: 'data_encryption' } },
		])('should fail when type is a $name', ({ type }) => {
			const result = ListEncryptionKeysQueryDto.safeParse({ type });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toEqual(['type']);
			}
		});
	});
});
