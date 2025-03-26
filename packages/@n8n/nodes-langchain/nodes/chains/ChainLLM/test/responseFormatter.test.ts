import { formatResponse } from '../methods/responseFormatter';

describe('responseFormatter', () => {
	describe('formatResponse', () => {
		it('should format string responses', () => {
			const result = formatResponse('Test response', 1.6);
			expect(result).toEqual({
				text: 'Test response',
			});
		});

		it('should trim string responses', () => {
			const result = formatResponse('  Test response with whitespace   ', 1.6);
			expect(result).toEqual({
				text: 'Test response with whitespace',
			});
		});

		it('should handle array responses', () => {
			const testArray = [{ item: 1 }, { item: 2 }];
			const result = formatResponse(testArray, 1.6);
			expect(result).toEqual({ data: testArray });
		});

		it('should handle object responses', () => {
			const testObject = { key: 'value', nested: { key: 'value' } };
			const result = formatResponse(testObject, 1.6);
			expect(result).toEqual(testObject);
		});

		it('should handle primitive non-string responses', () => {
			const testNumber = 42;
			const result = formatResponse(testNumber, 1.6);
			expect(result).toEqual({
				response: {
					text: 42,
				},
			});
		});
	});
});
