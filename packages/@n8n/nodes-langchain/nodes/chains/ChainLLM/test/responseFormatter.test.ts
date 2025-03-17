import { formatResponse } from '../methods/responseFormatter';

describe('responseFormatter', () => {
	describe('formatResponse', () => {
		it('should format string responses', () => {
			const result = formatResponse('Test response');
			expect(result).toEqual({
				response: {
					text: 'Test response',
				},
			});
		});

		it('should trim string responses', () => {
			const result = formatResponse('  Test response with whitespace   ');
			expect(result).toEqual({
				response: {
					text: 'Test response with whitespace',
				},
			});
		});

		it('should handle array responses', () => {
			const testArray = [{ item: 1 }, { item: 2 }];
			const result = formatResponse(testArray);
			expect(result).toEqual({ data: testArray });
		});

		it('should handle object responses', () => {
			const testObject = { key: 'value', nested: { key: 'value' } };
			const result = formatResponse(testObject);
			expect(result).toEqual(testObject);
		});

		it('should handle primitive non-string responses', () => {
			const testNumber = 42;
			const result = formatResponse(testNumber);
			expect(result).toEqual({
				response: {
					text: 42,
				},
			});
		});
	});
});
