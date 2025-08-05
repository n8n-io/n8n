import { ExpressionExtensions } from '@n8n/workflow';

import { ExpressionDocsService } from '../expression-docs.service';

// Mock the ExpressionExtensions to have predictable test data
jest.mock('@n8n/workflow', () => ({
	ExpressionExtensions: [
		{
			typeName: 'String',
			functions: {
				length: {
					doc: {
						name: 'length',
						description: 'Returns the length of the string',
						returnType: 'number',
						examples: [{ example: "'hello'.length()", evaluated: '5' }],
						docURL:
							'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-length',
					},
				},
				append: {
					doc: {
						name: 'append',
						description: 'Adds text to the end of a string',
						returnType: 'string',
						args: [
							{ name: 'text', type: 'string', optional: false, description: 'Text to append' },
						],
						examples: [{ example: "'hello'.append(' world')", evaluated: "'hello world'" }],
					},
				},
				hidden: {
					doc: {
						name: 'hidden',
						description: 'This function is hidden',
						returnType: 'string',
						hidden: true,
					},
				},
			},
		},
		{
			typeName: 'Array',
			functions: {
				first: {
					doc: {
						name: 'first',
						description: 'Returns the first element of the array',
						returnType: 'any',
						examples: [{ example: "['a', 'b', 'c'].first()", evaluated: "'a'" }],
					},
				},
				unique: {
					doc: {
						name: 'unique',
						description: 'Removes duplicate elements from the array',
						returnType: 'Array',
						aliases: ['removeDuplicates'],
						examples: [{ example: '[1, 2, 2, 3].unique()', evaluated: '[1, 2, 3]' }],
					},
				},
			},
		},
		{
			typeName: 'Number',
			functions: {
				round: {
					doc: {
						name: 'round',
						description: 'Rounds the number to the nearest integer',
						returnType: 'number',
						examples: [{ example: '3.14.round()', evaluated: '3' }],
					},
				},
			},
		},
	],
}));

describe('ExpressionDocsService', () => {
	let service: ExpressionDocsService;

	beforeEach(() => {
		service = new ExpressionDocsService();
	});

	describe('getCategories', () => {
		it('should return all available categories with function counts', () => {
			const categories = service.getCategories();

			expect(categories).toHaveLength(3);
			expect(categories).toEqual([
				{
					name: 'string',
					description: 'Functions for string manipulation and formatting',
					functionCount: 2, // length and append (hidden is excluded)
				},
				{
					name: 'array',
					description: 'Functions for working with arrays and lists',
					functionCount: 2, // first and unique
				},
				{
					name: 'number',
					description: 'Functions for mathematical operations and number formatting',
					functionCount: 1, // round
				},
			]);
		});

		it('should exclude hidden functions from function count', () => {
			const categories = service.getCategories();
			const stringCategory = categories.find((cat) => cat.name === 'string');

			expect(stringCategory?.functionCount).toBe(2); // Should not count the hidden function
		});
	});

	describe('getFunctionsByCategory', () => {
		it('should return functions for a valid category', () => {
			const functions = service.getFunctionsByCategory('string');

			expect(functions).toHaveLength(2);
			expect(functions.map((f) => f.name)).toEqual(['append', 'length']);
			expect(functions[0]).toMatchObject({
				name: 'append',
				description: 'Adds text to the end of a string',
				returnType: 'string',
				category: 'string',
				args: [{ name: 'text', type: 'string', optional: false, description: 'Text to append' }],
			});
		});

		it('should exclude hidden functions', () => {
			const functions = service.getFunctionsByCategory('string');
			const hiddenFunction = functions.find((f) => f.name === 'hidden');

			expect(hiddenFunction).toBeUndefined();
		});

		it('should return empty array for invalid category', () => {
			const functions = service.getFunctionsByCategory('invalid');

			expect(functions).toEqual([]);
		});

		it('should handle case-insensitive category names', () => {
			const functions = service.getFunctionsByCategory('STRING');

			expect(functions).toHaveLength(2);
		});

		it('should return functions with all documentation properties', () => {
			const functions = service.getFunctionsByCategory('array');
			const uniqueFunction = functions.find((f) => f.name === 'unique');

			expect(uniqueFunction).toMatchObject({
				name: 'unique',
				description: 'Removes duplicate elements from the array',
				returnType: 'Array',
				category: 'array',
				aliases: ['removeDuplicates'],
				examples: [{ example: '[1, 2, 2, 3].unique()', evaluated: '[1, 2, 3]' }],
			});
		});

		it('should sort functions alphabetically by name', () => {
			const functions = service.getFunctionsByCategory('string');
			const names = functions.map((f) => f.name);

			expect(names).toEqual(['append', 'length']); // Sorted alphabetically
		});
	});

	describe('getAllFunctions', () => {
		it('should return all functions from all categories', () => {
			const allFunctions = service.getAllFunctions();

			expect(allFunctions).toHaveLength(5); // 2 string + 2 array + 1 number (excluding hidden)
			expect(allFunctions.map((f) => f.name).sort()).toEqual([
				'append',
				'first',
				'length',
				'round',
				'unique',
			]);
		});

		it('should exclude hidden functions', () => {
			const allFunctions = service.getAllFunctions();
			const hiddenFunction = allFunctions.find((f) => f.name === 'hidden');

			expect(hiddenFunction).toBeUndefined();
		});

		it('should sort all functions alphabetically by name', () => {
			const allFunctions = service.getAllFunctions();
			const names = allFunctions.map((f) => f.name);

			expect(names).toEqual(['append', 'first', 'length', 'round', 'unique']);
		});
	});

	describe('searchFunctions', () => {
		it('should find functions by name', () => {
			const results = service.searchFunctions('length');

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('length');
		});

		it('should find functions by description', () => {
			const results = service.searchFunctions('duplicate');

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('unique');
		});

		it('should find functions by alias', () => {
			const results = service.searchFunctions('removeDuplicates');

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('unique');
		});

		it('should be case-insensitive', () => {
			const results = service.searchFunctions('LENGTH');

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('length');
		});

		it('should return empty array for no matches', () => {
			const results = service.searchFunctions('nonexistent');

			expect(results).toEqual([]);
		});

		it('should return multiple matches when applicable', () => {
			const results = service.searchFunctions('the'); // Should match descriptions containing "the"

			expect(results.length).toBeGreaterThan(0);
		});
	});

	describe('getContextVariables', () => {
		it('should return all variables when no context is specified', () => {
			const variables = service.getContextVariables();

			expect(variables.length).toBeGreaterThan(0);
			expect(variables.map((v) => v.name)).toContain('$json');
			expect(variables.map((v) => v.name)).toContain('$workflow');
			expect(variables.map((v) => v.name)).toContain('$execution');
		});

		it('should filter variables by context', () => {
			const nodeVariables = service.getContextVariables('node');

			expect(nodeVariables.length).toBeGreaterThan(0);
			nodeVariables.forEach((variable) => {
				expect(variable.context).toBe('node');
			});
		});

		it('should return variables with proper structure', () => {
			const variables = service.getContextVariables();
			const jsonVariable = variables.find((v) => v.name === '$json');

			expect(jsonVariable).toMatchObject({
				name: '$json',
				type: 'object',
				description: 'The JSON data from the current node input',
				context: 'node',
				examples: expect.arrayContaining([
					expect.objectContaining({
						example: '$json.id',
						description: 'Access the id field from the input data',
					}),
				]),
			});
		});

		it('should include global variables', () => {
			const variables = service.getContextVariables('global');

			expect(variables.length).toBeGreaterThan(0);
			expect(variables.map((v) => v.name)).toContain('$vars');
			expect(variables.map((v) => v.name)).toContain('$now');
			expect(variables.map((v) => v.name)).toContain('$today');
		});

		it('should return empty array for invalid context', () => {
			const variables = service.getContextVariables('invalid');

			expect(variables).toEqual([]);
		});
	});

	describe('private methods', () => {
		it('should provide appropriate category descriptions', () => {
			const categories = service.getCategories();
			const stringCategory = categories.find((cat) => cat.name === 'string');
			const arrayCategory = categories.find((cat) => cat.name === 'array');
			const numberCategory = categories.find((cat) => cat.name === 'number');

			expect(stringCategory?.description).toBe('Functions for string manipulation and formatting');
			expect(arrayCategory?.description).toBe('Functions for working with arrays and lists');
			expect(numberCategory?.description).toBe(
				'Functions for mathematical operations and number formatting',
			);
		});
	});
});
