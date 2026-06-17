import { buildInputSchemaField } from './descriptions';

describe('buildInputSchemaField', () => {
	it('should create input schema field with noDataExpression set to false', () => {
		const result = buildInputSchemaField();

		expect(result.noDataExpression).toBe(false);
		expect(result.displayName).toBe('Input Schema');
		expect(result.name).toBe('inputSchema');
		expect(result.type).toBe('json');
	});

	it('should include typeOptions with rows set to 10', () => {
		const result = buildInputSchemaField();

		expect(result.typeOptions).toEqual({ rows: 10 });
	});

	it('should have correct default JSON schema', () => {
		const result = buildInputSchemaField();

		const expectedDefault = `{
"type": "object",
"properties": {
	"some_input": {
		"type": "string",
		"description": "Some input to the function"
		}
	}
}`;
		expect(result.default).toBe(expectedDefault);
	});

	it('should include display options with schemaType manual', () => {
		const result = buildInputSchemaField();

		expect(result.displayOptions).toEqual({
			show: {
				schemaType: ['manual'],
			},
		});
	});

	it('should merge showExtraProps when provided', () => {
		const result = buildInputSchemaField({
			showExtraProps: {
				mode: ['advanced'],
				authentication: ['oauth2'],
			},
		});

		expect(result.displayOptions).toEqual({
			show: {
				mode: ['advanced'],
				authentication: ['oauth2'],
				schemaType: ['manual'],
			},
		});
	});

	it('should include description and hint', () => {
		const result = buildInputSchemaField();

		expect(result.description).toBe('Schema to use for the function');
		expect(result.hint).toContain('JSON Schema');
		expect(result.hint).toContain('json-schema.org');
	});

	it('should allow data expressions in the schema field', () => {
		const result = buildInputSchemaField();

		// noDataExpression is false, which means expressions are allowed
		expect(result.noDataExpression).toBe(false);

		// Since noDataExpression is false, this should be valid
		expect(typeof result.default).toBe('string');
		expect(result.noDataExpression).toBe(false);
	});

	it('should be a valid INodeProperties object', () => {
		const result = buildInputSchemaField();

		// Check all required fields for INodeProperties
		expect(result).toHaveProperty('displayName');
		expect(result).toHaveProperty('name');
		expect(result).toHaveProperty('type');
		expect(result).toHaveProperty('default');

		// Verify types
		expect(typeof result.displayName).toBe('string');
		expect(typeof result.name).toBe('string');
		expect(typeof result.type).toBe('string');
		expect(typeof result.default).toBe('string');
	});

	it('should properly handle edge cases with showExtraProps', () => {
		// Empty showExtraProps
		const result1 = buildInputSchemaField({ showExtraProps: {} });
		expect(result1.displayOptions).toEqual({
			show: {
				schemaType: ['manual'],
			},
		});

		// showExtraProps with undefined values
		const result2 = buildInputSchemaField({
			showExtraProps: {
				field1: undefined,
				field2: ['value2'],
			},
		});
		expect(result2.displayOptions).toEqual({
			show: {
				field1: undefined,
				field2: ['value2'],
				schemaType: ['manual'],
			},
		});
	});
});
