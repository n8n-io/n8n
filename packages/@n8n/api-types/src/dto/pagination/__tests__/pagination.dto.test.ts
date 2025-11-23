import { PaginationDto, MAX_ITEMS_PER_PAGE, createTakeValidator } from '../pagination.dto';

describe('PaginationDto', () => {
	describe('valid inputs', () => {
		test('should validate with both take and skip', () => {
			const result = PaginationDto.safeParse({ take: '10', skip: '5' });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual({ take: 10, skip: 5 });
			}
		});

		test('should validate with only take', () => {
			const result = PaginationDto.safeParse({ take: '10' });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual({ take: 10, skip: 0 });
			}
		});

		test('should cap take at MAX_ITEMS_PER_PAGE', () => {
			const result = PaginationDto.safeParse({ take: `${MAX_ITEMS_PER_PAGE + 10}` });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual({ take: MAX_ITEMS_PER_PAGE, skip: 0 });
			}
		});

		test('should handle zero values', () => {
			const result = PaginationDto.safeParse({ take: '0', skip: '0' });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual({ take: 0, skip: 0 });
			}
		});
	});

	describe('invalid inputs', () => {
		test('should reject non-integer take', () => {
			const result = PaginationDto.safeParse({ take: 'hello' });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toContain('take');
			}
		});

		test('should reject non-integer skip', () => {
			const result = PaginationDto.safeParse({ take: '10', skip: 'hello' });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toContain('skip');
			}
		});

		test('should reject non-numeric take', () => {
			const result = PaginationDto.safeParse({ take: 'abc' });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toContain('take');
			}
		});

		test('should reject non-numeric skip', () => {
			const result = PaginationDto.safeParse({ take: '10', skip: 'abc' });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toContain('skip');
			}
		});

		test('should reject object as take', () => {
			const result = PaginationDto.safeParse({ take: {} });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toContain('take');
			}
		});

		test('should reject array as skip', () => {
			const result = PaginationDto.safeParse({ take: '10', skip: [] });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toContain('skip');
			}
		});

		test('should reject negative take', () => {
			const result = PaginationDto.safeParse({ take: '-5' });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toContain('take');
			}
		});

		test('should reject negative skip', () => {
			const result = PaginationDto.safeParse({ take: '10', skip: '-5' });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toContain('skip');
			}
		});
	});

	describe('edge cases', () => {
		test('should apply cap on extremely large numbers', () => {
			const veryLargeNumber = '9'.repeat(20);
			const result = PaginationDto.safeParse({ take: veryLargeNumber });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.take).toBe(MAX_ITEMS_PER_PAGE);
			}
		});

		test('should fall back to default on empty string value', () => {
			const result = PaginationDto.safeParse({ take: '' });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.take).toBe(10);
			}
		});
	});

	describe('createTakeValidator', () => {
		test('should create a take validator with custom maxItems', () => {
			const customMaxItems = 100;
			const customTakeValidator = createTakeValidator(customMaxItems);
			const result = customTakeValidator.safeParse('150');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe(customMaxItems);
			}
		});
	});
});
