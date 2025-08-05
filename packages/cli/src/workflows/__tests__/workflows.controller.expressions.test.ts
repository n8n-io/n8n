import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { ExpressionDocsService } from '@/services/expression-docs.service';

import { WorkflowsController } from '../workflows.controller';
import type {
	ExpressionFunctionsCategoryQueryDto,
	ExpressionVariablesContextQueryDto,
	ExpressionFunctionsResponseDto,
	ExpressionVariablesResponseDto,
	ExpressionCategoriesResponseDto,
} from '../expression-docs.dto';

jest.mock('@/services/expression-docs.service');

describe('WorkflowsController - Expression Documentation', () => {
	let controller: WorkflowsController;
	let expressionDocsService: jest.Mocked<ExpressionDocsService>;
	let req: AuthenticatedRequest;
	let res: Response;

	beforeEach(() => {
		expressionDocsService = mock<ExpressionDocsService>();
		controller = Object.create(WorkflowsController.prototype);
		controller['expressionDocsService'] = expressionDocsService;
		controller['logger'] = {
			debug: jest.fn(),
			error: jest.fn(),
		} as any;

		req = mock<AuthenticatedRequest>({
			user: { id: 'test-user-id' },
		});
		res = mock<Response>();
	});

	describe('getExpressionCategories', () => {
		it('should return all expression categories successfully', async () => {
			// Arrange
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

			// Act
			const result = await controller.getExpressionCategories(req, res);

			// Assert
			expect(result).toEqual({
				categories: mockCategories,
				total: 3,
			} as ExpressionCategoriesResponseDto);
			expect(expressionDocsService.getCategories).toHaveBeenCalledTimes(1);
			expect(controller['logger'].debug).toHaveBeenCalledWith('Expression categories requested', {
				userId: 'test-user-id',
			});
		});

		it('should handle errors and throw InternalServerError', async () => {
			// Arrange
			const error = new Error('Service error');
			expressionDocsService.getCategories.mockImplementation(() => {
				throw error;
			});

			// Act & Assert
			await expect(controller.getExpressionCategories(req, res)).rejects.toThrow(
				InternalServerError,
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
			// Arrange
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

			const queryDto: ExpressionFunctionsCategoryQueryDto = {};

			// Act
			const result = await controller.getExpressionFunctions(req, res, category, queryDto);

			// Assert
			expect(result).toEqual({
				functions: mockFunctions,
				category: 'string',
				total: 2,
			} as ExpressionFunctionsResponseDto);
			expect(expressionDocsService.getFunctionsByCategory).toHaveBeenCalledWith('string');
		});

		it('should filter functions by search term', async () => {
			// Arrange
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

			const queryDto: ExpressionFunctionsCategoryQueryDto = { search: 'length' };

			// Act
			const result = await controller.getExpressionFunctions(req, res, category, queryDto);

			// Assert
			expect(result.functions).toHaveLength(1);
			expect(result.functions[0].name).toBe('length');
			expect(result.total).toBe(1);
		});

		it('should filter functions by alias', async () => {
			// Arrange
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

			const queryDto: ExpressionFunctionsCategoryQueryDto = { search: 'removeDuplicates' };

			// Act
			const result = await controller.getExpressionFunctions(req, res, category, queryDto);

			// Assert
			expect(result.functions).toHaveLength(1);
			expect(result.functions[0].name).toBe('unique');
		});

		it('should handle empty results for invalid category', async () => {
			// Arrange
			const category = 'invalid';
			expressionDocsService.getFunctionsByCategory.mockReturnValue([]);

			const queryDto: ExpressionFunctionsCategoryQueryDto = {};

			// Act
			const result = await controller.getExpressionFunctions(req, res, category, queryDto);

			// Assert
			expect(result).toEqual({
				functions: [],
				category: 'invalid',
				total: 0,
			});
		});

		it('should handle errors and throw InternalServerError', async () => {
			// Arrange
			const category = 'string';
			const error = new Error('Service error');
			expressionDocsService.getFunctionsByCategory.mockImplementation(() => {
				throw error;
			});

			const queryDto: ExpressionFunctionsCategoryQueryDto = {};

			// Act & Assert
			await expect(controller.getExpressionFunctions(req, res, category, queryDto)).rejects.toThrow(
				InternalServerError,
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
			// Arrange
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

			const queryDto: ExpressionVariablesContextQueryDto = {};

			// Act
			const result = await controller.getExpressionVariables(req, res, queryDto);

			// Assert
			expect(result).toEqual({
				variables: mockVariables,
				context: undefined,
				total: 2,
			} as ExpressionVariablesResponseDto);
			expect(expressionDocsService.getContextVariables).toHaveBeenCalledWith(undefined);
		});

		it('should return filtered variables by context', async () => {
			// Arrange
			const mockVariables = [
				{
					name: '$json',
					type: 'object',
					description: 'The JSON data from the current node input',
					context: 'node',
				},
			];

			expressionDocsService.getContextVariables.mockReturnValue(mockVariables);

			const queryDto: ExpressionVariablesContextQueryDto = { context: 'node' };

			// Act
			const result = await controller.getExpressionVariables(req, res, queryDto);

			// Assert
			expect(result).toEqual({
				variables: mockVariables,
				context: 'node',
				total: 1,
			});
			expect(expressionDocsService.getContextVariables).toHaveBeenCalledWith('node');
		});

		it('should handle errors and throw InternalServerError', async () => {
			// Arrange
			const error = new Error('Service error');
			expressionDocsService.getContextVariables.mockImplementation(() => {
				throw error;
			});

			const queryDto: ExpressionVariablesContextQueryDto = { context: 'node' };

			// Act & Assert
			await expect(controller.getExpressionVariables(req, res, queryDto)).rejects.toThrow(
				InternalServerError,
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
