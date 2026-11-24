import { splitByComma } from '../../helpers/common';

describe('common helper', () => {
	describe('splitByComma', () => {
		it('should split comma-separated string and trim whitespace', () => {
			const input = 'apple, banana, cherry, date';
			const result = splitByComma(input);

			expect(result).toEqual(['apple', 'banana', 'cherry', 'date']);
		});

		it('should handle strings with spaces around commas', () => {
			const input = 'apple , banana , cherry , date';
			const result = splitByComma(input);

			expect(result).toEqual(['apple', 'banana', 'cherry', 'date']);
		});

		it('should handle strings with mixed spacing', () => {
			const input = 'apple,  banana   ,cherry,  date  ';
			const result = splitByComma(input);

			expect(result).toEqual(['apple', 'banana', 'cherry', 'date']);
		});

		it('should filter out empty strings', () => {
			const input = 'apple,,banana, ,cherry,';
			const result = splitByComma(input);

			expect(result).toEqual(['apple', 'banana', 'cherry']);
		});

		it('should handle empty string', () => {
			const input = '';
			const result = splitByComma(input);

			expect(result).toEqual([]);
		});

		it('should handle string with only commas and spaces', () => {
			const input = ' , , , ';
			const result = splitByComma(input);

			expect(result).toEqual([]);
		});

		it('should handle single item', () => {
			const input = 'apple';
			const result = splitByComma(input);

			expect(result).toEqual(['apple']);
		});

		it('should handle single item with spaces', () => {
			const input = '  apple  ';
			const result = splitByComma(input);

			expect(result).toEqual(['apple']);
		});

		it('should handle strings with special characters', () => {
			const input = 'test@example.com, user-name, value_with_underscore';
			const result = splitByComma(input);

			expect(result).toEqual(['test@example.com', 'user-name', 'value_with_underscore']);
		});

		it('should handle strings with numbers', () => {
			const input = '123, 456, 789';
			const result = splitByComma(input);

			expect(result).toEqual(['123', '456', '789']);
		});
	});
});
