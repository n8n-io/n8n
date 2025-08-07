'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const workflows_controller_1 = require('../workflows.controller');
jest.mock('@/services/expression-docs.service');
describe('WorkflowsController - Expression Documentation', () => {
	let controller;
	let expressionDocsService;
	let req;
	let res;
	beforeEach(() => {
		expressionDocsService = (0, jest_mock_extended_1.mock)();
		controller = Object.create(workflows_controller_1.WorkflowsController.prototype);
		controller['expressionDocsService'] = expressionDocsService;
		controller['logger'] = {
			debug: jest.fn(),
			error: jest.fn(),
		};
		req = (0, jest_mock_extended_1.mock)({
			user: { id: 'test-user-id' },
		});
		res = (0, jest_mock_extended_1.mock)();
	});
	describe('getExpressionCategories', () => {
		it('should return all expression categories successfully', async () => {
			const mockCategories = [
				{
					name: 'array',
					description: 'Functions for working with arrays and lists',
					functionCount: 15,
				},
				{
					name: 'string',
					description: 'Functions for string manipulation and formatting',
					functionCount: 20,
				},
				{
					name: 'number',
					description: 'Functions for mathematical operations and number formatting',
					functionCount: 10,
				},
			];
			expressionDocsService.getCategories.mockReturnValue(mockCategories);
			const result = await controller.getExpressionCategories(req, res);
			expect(result).toEqual({
				categories: mockCategories,
				total: 3,
			});
			expect(expressionDocsService.getCategories).toHaveBeenCalledTimes(1);
			expect(controller['logger'].debug).toHaveBeenCalledWith('Expression categories requested', {
				userId: 'test-user-id',
			});
		});
		it('should handle errors and throw InternalServerError', async () => {
			const error = new Error('Service error');
			expressionDocsService.getCategories.mockImplementation(() => {
				throw error;
			});
			await expect(controller.getExpressionCategories(req, res)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
			expect(controller['logger'].error).toHaveBeenCalledWith(
				'Failed to get expression categories',
				{
					userId: 'test-user-id',
					error: 'Service error',
				},
			);
		});
	});
	describe('getExpressionFunctions', () => {
		it('should return functions for a specific category without search', async () => {
			const category = 'string';
			const mockFunctions = [
				{
					name: 'append',
					description: 'Adds text to the end of a string',
					returnType: 'string',
					category: 'string',
					examples: [{ example: "'hello'.append(' world')", evaluated: "'hello world'" }],
				},
				{
					name: 'length',
					description: 'Returns the length of the string',
					returnType: 'number',
					category: 'string',
					examples: [{ example: "'hello'.length()", evaluated: '5' }],
				},
			];
			expressionDocsService.getFunctionsByCategory.mockReturnValue(mockFunctions);
			const queryDto = {};
			const result = await controller.getExpressionFunctions(req, res, category, queryDto);
			expect(result).toEqual({
				functions: mockFunctions,
				category: 'string',
				total: 2,
			});
			expect(expressionDocsService.getFunctionsByCategory).toHaveBeenCalledWith('string');
		});
		it('should filter functions by search term', async () => {
			const category = 'string';
			const mockFunctions = [
				{
					name: 'append',
					description: 'Adds text to the end of a string',
					returnType: 'string',
					category: 'string',
				},
				{
					name: 'length',
					description: 'Returns the length of the string',
					returnType: 'number',
					category: 'string',
				},
				{
					name: 'toUpperCase',
					description: 'Converts string to uppercase',
					returnType: 'string',
					category: 'string',
				},
			];
			expressionDocsService.getFunctionsByCategory.mockReturnValue(mockFunctions);
			const queryDto = { search: 'length' };
			const result = await controller.getExpressionFunctions(req, res, category, queryDto);
			expect(result.functions).toHaveLength(1);
			expect(result.functions[0].name).toBe('length');
			expect(result.total).toBe(1);
		});
		it('should filter functions by alias', async () => {
			const category = 'array';
			const mockFunctions = [
				{
					name: 'unique',
					description: 'Removes duplicate elements',
					returnType: 'Array',
					category: 'array',
					aliases: ['removeDuplicates'],
				},
			];
			expressionDocsService.getFunctionsByCategory.mockReturnValue(mockFunctions);
			const queryDto = { search: 'removeDuplicates' };
			const result = await controller.getExpressionFunctions(req, res, category, queryDto);
			expect(result.functions).toHaveLength(1);
			expect(result.functions[0].name).toBe('unique');
		});
		it('should handle empty results for invalid category', async () => {
			const category = 'invalid';
			expressionDocsService.getFunctionsByCategory.mockReturnValue([]);
			const queryDto = {};
			const result = await controller.getExpressionFunctions(req, res, category, queryDto);
			expect(result).toEqual({
				functions: [],
				category: 'invalid',
				total: 0,
			});
		});
		it('should handle errors and throw InternalServerError', async () => {
			const category = 'string';
			const error = new Error('Service error');
			expressionDocsService.getFunctionsByCategory.mockImplementation(() => {
				throw error;
			});
			const queryDto = {};
			await expect(controller.getExpressionFunctions(req, res, category, queryDto)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
			expect(controller['logger'].error).toHaveBeenCalledWith(
				'Failed to get expression functions',
				{
					userId: 'test-user-id',
					category: 'string',
					search: undefined,
					error: 'Service error',
				},
			);
		});
	});
	describe('getExpressionVariables', () => {
		it('should return all variables without context filter', async () => {
			const mockVariables = [
				{
					name: '$json',
					type: 'object',
					description: 'The JSON data from the current node input',
					context: 'node',
					examples: [{ example: '$json.id', description: 'Access the id field' }],
				},
				{
					name: '$workflow',
					type: 'object',
					description: 'Information about the current workflow',
					context: 'workflow',
					examples: [{ example: '$workflow.name', description: 'Get workflow name' }],
				},
			];
			expressionDocsService.getContextVariables.mockReturnValue(mockVariables);
			const queryDto = {};
			const result = await controller.getExpressionVariables(req, res, queryDto);
			expect(result).toEqual({
				variables: mockVariables,
				context: undefined,
				total: 2,
			});
			expect(expressionDocsService.getContextVariables).toHaveBeenCalledWith(undefined);
		});
		it('should return filtered variables by context', async () => {
			const mockVariables = [
				{
					name: '$json',
					type: 'object',
					description: 'The JSON data from the current node input',
					context: 'node',
				},
			];
			expressionDocsService.getContextVariables.mockReturnValue(mockVariables);
			const queryDto = { context: 'node' };
			const result = await controller.getExpressionVariables(req, res, queryDto);
			expect(result).toEqual({
				variables: mockVariables,
				context: 'node',
				total: 1,
			});
			expect(expressionDocsService.getContextVariables).toHaveBeenCalledWith('node');
		});
		it('should handle errors and throw InternalServerError', async () => {
			const error = new Error('Service error');
			expressionDocsService.getContextVariables.mockImplementation(() => {
				throw error;
			});
			const queryDto = { context: 'node' };
			await expect(controller.getExpressionVariables(req, res, queryDto)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
			expect(controller['logger'].error).toHaveBeenCalledWith(
				'Failed to get expression variables',
				{
					userId: 'test-user-id',
					context: 'node',
					error: 'Service error',
				},
			);
		});
	});
});
//# sourceMappingURL=workflows.controller.expressions.test.js.map
