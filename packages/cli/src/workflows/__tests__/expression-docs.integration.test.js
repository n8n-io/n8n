'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const expression_docs_service_1 = require('@/services/expression-docs.service');
describe('Expression Documentation Integration', () => {
	let service;
	beforeEach(() => {
		service = new expression_docs_service_1.ExpressionDocsService();
	});
	describe('Service Integration', () => {
		it('should return valid categories', () => {
			const categories = service.getCategories();
			expect(categories).toBeInstanceOf(Array);
			expect(categories.length).toBeGreaterThan(0);
			categories.forEach((category) => {
				expect(category).toHaveProperty('name');
				expect(category).toHaveProperty('description');
				expect(category).toHaveProperty('functionCount');
				expect(typeof category.name).toBe('string');
				expect(typeof category.description).toBe('string');
				expect(typeof category.functionCount).toBe('number');
			});
		});
		it('should return functions for each category', () => {
			const categories = service.getCategories();
			categories.forEach((category) => {
				const functions = service.getFunctionsByCategory(category.name);
				expect(functions).toBeInstanceOf(Array);
				expect(functions.length).toBe(category.functionCount);
				functions.forEach((func) => {
					expect(func).toHaveProperty('name');
					expect(func).toHaveProperty('returnType');
					expect(func).toHaveProperty('category');
					expect(func.category).toBe(category.name);
					expect(typeof func.name).toBe('string');
					expect(typeof func.returnType).toBe('string');
				});
			});
		});
		it('should return context variables', () => {
			const variables = service.getContextVariables();
			expect(variables).toBeInstanceOf(Array);
			expect(variables.length).toBeGreaterThan(0);
			variables.forEach((variable) => {
				expect(variable).toHaveProperty('name');
				expect(variable).toHaveProperty('type');
				expect(variable).toHaveProperty('context');
				expect(typeof variable.name).toBe('string');
				expect(typeof variable.type).toBe('string');
				expect(typeof variable.context).toBe('string');
			});
		});
		it('should filter variables by context', () => {
			const allVariables = service.getContextVariables();
			const contexts = [...new Set(allVariables.map((v) => v.context))];
			contexts.forEach((context) => {
				const filteredVariables = service.getContextVariables(context);
				expect(filteredVariables).toBeInstanceOf(Array);
				filteredVariables.forEach((variable) => {
					expect(variable.context).toBe(context);
				});
			});
		});
		it('should search functions correctly', () => {
			const allFunctions = service.getAllFunctions();
			if (allFunctions.length > 0) {
				const firstFunction = allFunctions[0];
				const searchResults = service.searchFunctions(firstFunction.name);
				expect(searchResults).toBeInstanceOf(Array);
				expect(searchResults.length).toBeGreaterThan(0);
				expect(searchResults.some((f) => f.name === firstFunction.name)).toBe(true);
			}
		});
	});
	describe('API Response Validation', () => {
		it('should provide valid response structure for categories', () => {
			const categories = service.getCategories();
			const response = {
				categories,
				total: categories.length,
			};
			expect(response).toHaveProperty('categories');
			expect(response).toHaveProperty('total');
			expect(response.categories).toBeInstanceOf(Array);
			expect(typeof response.total).toBe('number');
			expect(response.total).toBe(categories.length);
		});
		it('should provide valid response structure for functions', () => {
			const categories = service.getCategories();
			if (categories.length > 0) {
				const category = categories[0];
				const functions = service.getFunctionsByCategory(category.name);
				const response = {
					functions,
					category: category.name,
					total: functions.length,
				};
				expect(response).toHaveProperty('functions');
				expect(response).toHaveProperty('category');
				expect(response).toHaveProperty('total');
				expect(response.functions).toBeInstanceOf(Array);
				expect(typeof response.category).toBe('string');
				expect(typeof response.total).toBe('number');
			}
		});
		it('should provide valid response structure for variables', () => {
			const variables = service.getContextVariables('node');
			const response = {
				variables,
				context: 'node',
				total: variables.length,
			};
			expect(response).toHaveProperty('variables');
			expect(response).toHaveProperty('context');
			expect(response).toHaveProperty('total');
			expect(response.variables).toBeInstanceOf(Array);
			expect(typeof response.context).toBe('string');
			expect(typeof response.total).toBe('number');
		});
	});
	describe('Error Handling', () => {
		it('should handle invalid category gracefully', () => {
			const functions = service.getFunctionsByCategory('invalid-category');
			expect(functions).toBeInstanceOf(Array);
			expect(functions.length).toBe(0);
		});
		it('should handle invalid context gracefully', () => {
			const variables = service.getContextVariables('invalid-context');
			expect(variables).toBeInstanceOf(Array);
			expect(variables.length).toBe(0);
		});
		it('should handle empty search gracefully', () => {
			const results = service.searchFunctions('');
			expect(results).toBeInstanceOf(Array);
		});
	});
});
//# sourceMappingURL=expression-docs.integration.test.js.map
