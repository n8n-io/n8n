import {
	escapeResourceMapperFieldName,
	unescapeResourceMapperFieldName,
	parseResourceMapperFieldName,
} from '../nodeTypesUtils';

describe('Resource Mapper Field Name Handling', () => {
	describe('escapeResourceMapperFieldName', () => {
		it('should encode field names with prefix', () => {
			const result = escapeResourceMapperFieldName('Column Name');
			expect(result).toMatch(/^__enc_/);
			expect(result.length).toBeGreaterThan('__enc_'.length);
		});

		it('should encode newlines safely', () => {
			const result = escapeResourceMapperFieldName('Column\nName');
			expect(result).toMatch(/^__enc_/);
			// Should not contain actual newlines in the encoded result
			expect(result).not.toContain('\n');
		});

		it('should encode all special characters safely', () => {
			const input = 'Column\n"With\tSpecial\\Characters\r';
			const result = escapeResourceMapperFieldName(input);
			expect(result).toMatch(/^__enc_/);
			// Should not contain any of the problematic characters
			expect(result).not.toContain('\n');
			expect(result).not.toContain('\r');
			expect(result).not.toContain('\t');
			expect(result).not.toContain('"');
			expect(result).not.toContain('\\');
		});

		it('should encode normal text consistently', () => {
			const input = 'NormalColumnName';
			const result = escapeResourceMapperFieldName(input);
			expect(result).toMatch(/^__enc_/);
		});
	});

	describe('unescapeResourceMapperFieldName', () => {
		it('should decode encoded field names', () => {
			const original = 'Column Name';
			const encoded = escapeResourceMapperFieldName(original);
			const decoded = unescapeResourceMapperFieldName(encoded);
			expect(decoded).toBe(original);
		});

		it('should decode field names with newlines', () => {
			const original = 'Column\nName';
			const encoded = escapeResourceMapperFieldName(original);
			const decoded = unescapeResourceMapperFieldName(encoded);
			expect(decoded).toBe(original);
		});

		it('should decode field names with all special characters', () => {
			const original = 'Column\n"With\tSpecial\\Characters\r';
			const encoded = escapeResourceMapperFieldName(original);
			const decoded = unescapeResourceMapperFieldName(encoded);
			expect(decoded).toBe(original);
		});

		it('should handle non-encoded field names for backward compatibility', () => {
			// Test old-style escaped field names
			expect(unescapeResourceMapperFieldName('Column\\nName')).toBe('Column\nName');
			expect(unescapeResourceMapperFieldName('Column\\"Name')).toBe('Column"Name');
			expect(unescapeResourceMapperFieldName('Column\\\\Name')).toBe('Column\\Name');
		});

		it('should return original value if decoding fails', () => {
			const invalidEncoded = '__enc_invalid-base64!@#';
			// Should not throw and should return something reasonable
			const result = unescapeResourceMapperFieldName(invalidEncoded);
			expect(typeof result).toBe('string');
		});
	});

	describe('parseResourceMapperFieldName', () => {
		it('should parse and decode field names from parameter names', () => {
			const testCases = [
				{ fieldName: 'Normal Column', expected: 'Normal Column' },
				{ fieldName: 'Column\nWith Newline', expected: 'Column\nWith Newline' },
				{ fieldName: 'Column\rWith CR', expected: 'Column\rWith CR' },
				{ fieldName: 'Column\tWith Tab', expected: 'Column\tWith Tab' },
				{ fieldName: 'Column"With Quote', expected: 'Column"With Quote' },
				{ fieldName: 'Column\\With Backslash', expected: 'Column\\With Backslash' },
			];

			testCases.forEach(({ fieldName, expected }) => {
				const escaped = escapeResourceMapperFieldName(fieldName);
				const parameterName = `value["${escaped}"]`;
				const parsed = parseResourceMapperFieldName(parameterName);
				expect(parsed).toBe(expected);
			});
		});

		it('should return the original string if regex does not match', () => {
			expect(parseResourceMapperFieldName('invalid-parameter-name')).toBe('invalid-parameter-name');
		});

		it('should handle round-trip encoding and decoding', () => {
			const originalFieldNames = [
				'Simple Column',
				'Column\nWith\nMultiple\nNewlines',
				'Column\tWith\tTabs',
				'Column"With"Quotes',
				'Column\\With\\Backslashes',
				'Complex\n"Column\\Name\r\tWith\nAll"Special\\Characters',
				'Unicode字符测试',
				'Emoji😀Test🎉Column',
			];

			originalFieldNames.forEach((originalFieldName) => {
				// Step 1: Encode the field name (what happens in MappingFields.vue)
				const encoded = escapeResourceMapperFieldName(originalFieldName);
				const parameterName = `value["${encoded}"]`;

				// Step 2: Parse it back (what happens in parseResourceMapperFieldName)
				const parsed = parseResourceMapperFieldName(parameterName);

				// Step 3: Verify they match
				expect(parsed).toBe(originalFieldName);
			});
		});
	});
});
