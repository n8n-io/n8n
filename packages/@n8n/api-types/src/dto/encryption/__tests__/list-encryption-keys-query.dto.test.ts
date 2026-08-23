import {
	ENCRYPTION_KEYS_SORT_OPTIONS,
	ListEncryptionKeysQueryDto,
} from '../list-encryption-keys-query.dto';

describe('ListEncryptionKeysQueryDto', () => {
	describe('Valid requests', () => {
		test('should succeed with no query params and apply pagination defaults', () => {
			const result = ListEncryptionKeysQueryDto.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.type).toBeUndefined();
				expect(result.data.skip).toBe(0);
				expect(result.data.take).toBe(10);
				expect(result.data.sortBy).toBeUndefined();
				expect(result.data.activatedFrom).toBeUndefined();
				expect(result.data.activatedTo).toBeUndefined();
			}
		});

		test('should succeed with type filter', () => {
			const result = ListEncryptionKeysQueryDto.safeParse({ type: 'data_encryption' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.type).toBe('data_encryption');
			}
		});

		test('should accept skip and take as strings', () => {
			const result = ListEncryptionKeysQueryDto.safeParse({ skip: '20', take: '50' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.skip).toBe(20);
				expect(result.data.take).toBe(50);
			}
		});

		test('should cap take at MAX_ITEMS_PER_PAGE (250)', () => {
			const result = ListEncryptionKeysQueryDto.safeParse({ take: '500' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.take).toBe(250);
			}
		});

		test.each(ENCRYPTION_KEYS_SORT_OPTIONS)('should accept sortBy=%s', (sortBy) => {
			const result = ListEncryptionKeysQueryDto.safeParse({ sortBy });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.sortBy).toBe(sortBy);
			}
		});

		test.each([
			'2026-04-21T10:00:00.000Z',
			'2026-04-21T10:00:00Z',
			'2026-04-21T10:00:00+02:00',
			'2026-04-21T10:00:00-08:00',
		])('should accept activatedFrom=%s', (activatedFrom) => {
			const result = ListEncryptionKeysQueryDto.safeParse({ activatedFrom });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.activatedFrom).toBe(activatedFrom);
			}
		});

		test('should accept activatedTo as ISO datetime', () => {
			const result = ListEncryptionKeysQueryDto.safeParse({
				activatedTo: '2026-04-22T23:59:59.999Z',
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.activatedTo).toBe('2026-04-22T23:59:59.999Z');
			}
		});

		test('should succeed with all params combined', () => {
			const result = ListEncryptionKeysQueryDto.safeParse({
				type: 'data_encryption',
				skip: '10',
				take: '25',
				sortBy: 'updatedAt:desc',
				activatedFrom: '2026-04-01T00:00:00.000Z',
				activatedTo: '2026-04-30T23:59:59.999Z',
			});
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{ name: 'number', type: 123 },
			{ name: 'boolean', type: true },
			{ name: 'array', type: ['data_encryption'] },
			{ name: 'object', type: { kind: 'data_encryption' } },
			{ name: 'unknown literal string', type: 'some_future_type' },
		])('should fail when type is a $name', ({ type }) => {
			const result = ListEncryptionKeysQueryDto.safeParse({ type });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toEqual(['type']);
			}
		});

		test('should fail when skip is negative', () => {
			const result = ListEncryptionKeysQueryDto.safeParse({ skip: '-1' });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toEqual(['skip']);
			}
		});

		test('should fail when take is non-numeric', () => {
			const result = ListEncryptionKeysQueryDto.safeParse({ take: 'abc' });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toEqual(['take']);
			}
		});

		test('should fail when skip is non-numeric', () => {
			const result = ListEncryptionKeysQueryDto.safeParse({ skip: 'abc' });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toEqual(['skip']);
			}
		});

		test.each([
			{ name: 'no direction', sortBy: 'createdAt' },
			{ name: 'unknown field', sortBy: 'foo:asc' },
			{ name: 'unknown direction', sortBy: 'createdAt:up' },
			{ name: 'wrong casing', sortBy: 'CREATEDAT:asc' },
			{ name: 'array', sortBy: ['createdAt:asc'] },
		])('should fail when sortBy is $name', ({ sortBy }) => {
			const result = ListEncryptionKeysQueryDto.safeParse({ sortBy });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toEqual(['sortBy']);
			}
		});

		test.each([
			{ name: 'date-only', value: '2026-04-21' },
			{ name: 'plain string', value: 'not-a-date' },
			{ name: 'empty string', value: '' },
			{ name: 'number', value: 1716290000000 },
		])('should fail when activatedFrom is $name', ({ value }) => {
			const result = ListEncryptionKeysQueryDto.safeParse({ activatedFrom: value });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toEqual(['activatedFrom']);
			}
		});

		test('should fail when activatedTo is not ISO', () => {
			const result = ListEncryptionKeysQueryDto.safeParse({ activatedTo: '2026-04-21' });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toEqual(['activatedTo']);
			}
		});
	});
});
