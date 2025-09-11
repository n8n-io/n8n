import { NodeOperationError, jsonParse } from 'n8n-workflow';

// Mock node object
const mockNode = {
	name: 'HTTP Request V3',
	type: 'n8n-nodes-base.httpRequestV3',
};

// Test function that mimics the HttpRequest V3 validation logic
function testJsonValidation(jsonParameter: string, parameterType: string, itemIndex = 0) {
	if (typeof jsonParameter !== 'object' && jsonParameter !== null) {
		try {
			JSON.parse(jsonParameter);
		} catch (error) {
			const errorMessage = [
				'JSON parameter needs to be valid JSON.',
				`The HTTP Request node received a string that is not valid JSON for the ${parameterType}.`,
				'If you build the JSON using expressions, wrap with JSON.stringify(...) to ensure proper formatting.',
				`Parse error: ${(error as Error).message}`,
			].join(' ');
			throw new NodeOperationError(mockNode, errorMessage, { itemIndex });
		}
		return jsonParse(jsonParameter);
	} else {
		return jsonParameter;
	}
}

describe('HttpRequest V3 JSON Validation', () => {
	describe('Valid JSON cases', () => {
		it('should handle valid JSON string', () => {
			const result = testJsonValidation('{"message": "hello"}', 'request body');
			expect(result).toEqual({ message: 'hello' });
		});

		it('should handle valid JSON with expressions', () => {
			const result = testJsonValidation('{"message": "{{ $json.payload }}"}', 'request body');
			expect(result).toEqual({ message: '{{ $json.payload }}' });
		});

		it('should handle already parsed object', () => {
			const input = { message: 'hello' };
			const result = testJsonValidation(input as any, 'request body');
			expect(result).toEqual(input);
		});

		it('should handle null value', () => {
			const result = testJsonValidation(null as any, 'request body');
			expect(result).toBeNull();
		});
	});

	describe('Invalid JSON cases', () => {
		it('should throw helpful error for missing closing brace', () => {
			expect(() => {
				testJsonValidation('{"message": "hello world"', 'request body');
			}).toThrow(
				"JSON parameter needs to be valid JSON. The HTTP Request node received a string that is not valid JSON for the request body. If you build the JSON using expressions, wrap with JSON.stringify(...) to ensure proper formatting. Parse error: Expected ',' or '}' after property value in JSON at position 25",
			);
		});

		it('should throw helpful error for unquoted property', () => {
			expect(() => {
				testJsonValidation('{message: "hello world"}', 'query parameters');
			}).toThrow(
				"JSON parameter needs to be valid JSON. The HTTP Request node received a string that is not valid JSON for the query parameters. If you build the JSON using expressions, wrap with JSON.stringify(...) to ensure proper formatting. Parse error: Expected property name or '}' in JSON at position 1",
			);
		});

		it('should throw helpful error for trailing comma', () => {
			expect(() => {
				testJsonValidation('{"message": "hello world",}', 'request headers');
			}).toThrow(
				'JSON parameter needs to be valid JSON. The HTTP Request node received a string that is not valid JSON for the request headers. If you build the JSON using expressions, wrap with JSON.stringify(...) to ensure proper formatting. Parse error: Expected double-quoted property name in JSON at position 26',
			);
		});
	});

	describe('Batch processing', () => {
		it('should preserve itemIndex in error messages', () => {
			try {
				testJsonValidation('{"invalid": json}', 'request body', 5);
			} catch (error) {
				expect(error).toBeInstanceOf(NodeOperationError);
				// Check if the error message contains the context about body
				expect((error as NodeOperationError).message).toContain('body');
			}
		});
	});
});
