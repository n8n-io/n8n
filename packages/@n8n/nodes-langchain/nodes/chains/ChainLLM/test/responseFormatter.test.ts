import { formatResponse } from '../methods/responseFormatter';

describe('responseFormatter', () => {
	describe('formatResponse', () => {
		it('should format string responses', () => {
			const result = formatResponse('Test response', true);
			expect(result).toEqual({
				text: 'Test response',
			});
		});

		it('should trim string responses', () => {
			const result = formatResponse('  Test response with whitespace   ', true);
			expect(result).toEqual({
				text: 'Test response with whitespace',
			});
		});

		it('should handle array responses', () => {
			const testArray = [{ item: 1 }, { item: 2 }];
			const result = formatResponse(testArray, true);
			expect(result).toEqual({ data: testArray });
		});

		it('should handle object responses when unwrapping is enabled', () => {
			const testObject = { key: 'value', nested: { key: 'value' } };
			const result = formatResponse(testObject, true);
			expect(result).toEqual(testObject);
		});

		it('should stringify object responses when unwrapping is disabled', () => {
			const testObject = { key: 'value', nested: { key: 'value' } };
			const result = formatResponse(testObject, false);
			expect(result).toEqual({
				text: JSON.stringify(testObject),
			});
		});

		it('should handle primitive non-string responses', () => {
			const testNumber = 42;
			const result = formatResponse(testNumber, true);
			expect(result).toEqual({
				response: {
					text: 42,
				},
			});
		});

		it('should handle complex object structures when unwrapping is enabled', () => {
			const complexObject = {
				person: {
					name: 'John',
					age: 30,
					address: {
						street: '123 Main St',
						city: 'Anytown',
					},
				},
				items: [1, 2, 3],
				active: true,
			};

			const result = formatResponse(complexObject, true);
			expect(result).toEqual(complexObject);
		});

		it('should stringify complex object structures when unwrapping is disabled', () => {
			const complexObject = {
				person: {
					name: 'John',
					age: 30,
					address: {
						street: '123 Main St',
						city: 'Anytown',
					},
				},
				items: [1, 2, 3],
				active: true,
			};

			const result = formatResponse(complexObject, false);
			expect(result).toEqual({
				text: JSON.stringify(complexObject),
			});
		});
	});
});
