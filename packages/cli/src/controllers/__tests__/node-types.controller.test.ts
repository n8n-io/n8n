import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Request } from 'express';
import { mock } from 'jest-mock-extended';
import type {
	INodeTypeDescription,
	INodeTypeNameVersion,
	INodeExecutionData,
	IDataObject,
} from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NodeTypes } from '@/node-types';

import { NodeTypesController } from '../node-types.controller';

// Mock fs/promises
jest.mock('fs/promises', () => ({
	readFile: jest.fn(),
}));

// Mock lodash get function
jest.mock('lodash/get', () => jest.fn());

describe('NodeTypesController', () => {
	mockInstance(Logger);

	const nodeTypes = mockInstance(NodeTypes);
	const globalConfig = mockInstance(GlobalConfig);
	const logger = Container.get(Logger);

	const controller = Container.get(NodeTypesController);

	const mockUser = mock<User>({
		id: 'user-123',
		email: 'test@example.com',
	});

	const mockNodeTypeDescription = {
		name: 'n8n-nodes-base.HttpRequest',
		displayName: 'HTTP Request',
		group: ['input'],
		version: 1,
		description: 'Makes an HTTP request',
		defaults: {
			name: 'HTTP Request',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				default: 'GET',
				required: true,
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
				],
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
			},
		],
	} as INodeTypeDescription;

	// Simplified node description for testing node execution
	const simpleNodeDescription = {
		name: 'test.SimpleNode',
		displayName: 'Simple Test Node',
		group: ['input'],
		version: 1,
		description: 'Simple node for testing',
		defaults: {
			name: 'Simple Test Node',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	} as INodeTypeDescription;

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock lodash get function
		const get = require('lodash/get');
		get.mockImplementation((obj: any, path: string, defaultValue: any) => {
			if (path === 'body.nodeInfos') {
				return obj?.body?.nodeInfos || defaultValue;
			}
			return defaultValue;
		});

		// Default mocks
		globalConfig.defaultLocale = 'en';
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: mockNodeTypeDescription,
			sourcePath: '/path/to/node',
		});
	});

	describe('getNodeInfo', () => {
		it('should return node descriptions for English locale', async () => {
			// Arrange
			const get = require('lodash/get');
			get.mockReturnValueOnce([
				{ name: 'n8n-nodes-base.HttpRequest', version: 1 },
				{ name: 'n8n-nodes-base.Webhook', version: 1 },
			]);

			const req = mock<Request>({
				body: {
					nodeInfos: [
						{ name: 'n8n-nodes-base.HttpRequest', version: 1 },
						{ name: 'n8n-nodes-base.Webhook', version: 1 },
					] as INodeTypeNameVersion[],
				},
			});

			const webhookDescription = {
				name: 'n8n-nodes-base.Webhook',
				displayName: 'Webhook',
			} as INodeTypeDescription;

			nodeTypes.getByNameAndVersion
				.mockReturnValueOnce({ description: mockNodeTypeDescription, sourcePath: '/path/to/http' })
				.mockReturnValueOnce({ description: webhookDescription, sourcePath: '/path/to/webhook' });

			// Act
			const result = await controller.getNodeInfo(req);

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual(mockNodeTypeDescription);
			expect(result[1]).toEqual(webhookDescription);
			expect(nodeTypes.getByNameAndVersion).toHaveBeenCalledWith('n8n-nodes-base.HttpRequest', 1);
			expect(nodeTypes.getByNameAndVersion).toHaveBeenCalledWith('n8n-nodes-base.Webhook', 1);
		});

		it('should handle empty nodeInfos array', async () => {
			// Arrange
			const get = require('lodash/get');
			get.mockReturnValueOnce([]);

			const req = mock<Request>({
				body: { nodeInfos: [] },
			});

			// Act
			const result = await controller.getNodeInfo(req);

			// Assert
			expect(result).toEqual([]);
			expect(nodeTypes.getByNameAndVersion).not.toHaveBeenCalled();
		});

		it('should handle missing nodeInfos in request body', async () => {
			// Arrange
			const get = require('lodash/get');
			get.mockReturnValueOnce([]);

			const req = mock<Request>({
				body: {},
			});

			// Act
			const result = await controller.getNodeInfo(req);

			// Assert
			expect(result).toEqual([]);
			expect(nodeTypes.getByNameAndVersion).not.toHaveBeenCalled();
		});

		it('should load translations for non-English locale', async () => {
			// Arrange
			globalConfig.defaultLocale = 'de';
			const get = require('lodash/get');
			get.mockReturnValueOnce([{ name: 'n8n-nodes-base.HttpRequest', version: 1 }]);

			const req = mock<Request>({
				body: {
					nodeInfos: [{ name: 'n8n-nodes-base.HttpRequest', version: 1 }] as INodeTypeNameVersion[],
				},
			});

			const translationPath = '/path/to/translation.json';
			const translation = { displayName: 'HTTP Anfrage' };

			nodeTypes.getWithSourcePath.mockReturnValue({
				description: mockNodeTypeDescription,
				sourcePath: '/path/to/node',
			});
			nodeTypes.getNodeTranslationPath.mockResolvedValue(translationPath);

			const { readFile } = require('fs/promises');
			readFile.mockResolvedValue(JSON.stringify(translation));

			// Act
			const result = await controller.getNodeInfo(req);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].translation).toEqual(translation);
			expect(nodeTypes.getNodeTranslationPath).toHaveBeenCalledWith({
				nodeSourcePath: '/path/to/node',
				longNodeType: mockNodeTypeDescription.name,
				locale: 'de',
			});
			expect(readFile).toHaveBeenCalledWith(translationPath, 'utf8');
		});

		it('should handle translation file read errors gracefully', async () => {
			// Arrange
			globalConfig.defaultLocale = 'de';
			const get = require('lodash/get');
			get.mockReturnValueOnce([{ name: 'n8n-nodes-base.HttpRequest', version: 1 }]);

			const req = mock<Request>({
				body: {
					nodeInfos: [{ name: 'n8n-nodes-base.HttpRequest', version: 1 }] as INodeTypeNameVersion[],
				},
			});

			const descriptionWithoutTranslation = { ...mockNodeTypeDescription };

			nodeTypes.getWithSourcePath.mockReturnValue({
				description: descriptionWithoutTranslation,
				sourcePath: '/path/to/node',
			});
			nodeTypes.getNodeTranslationPath.mockResolvedValue('/nonexistent/path.json');

			const { readFile } = require('fs/promises');
			readFile.mockRejectedValue(new Error('File not found'));

			// Act
			const result = await controller.getNodeInfo(req);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(descriptionWithoutTranslation);
			expect(result[0].translation).toBeUndefined();
		});
	});

	describe('testNode', () => {
		it('should successfully test a simple node', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					nodeType: 'test.SimpleNode',
					nodeVersion: 1,
					parameters: {},
					inputData: [{ json: { test: 'data' } }],
				},
			});

			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: simpleNodeDescription,
				sourcePath: '/path/to/simple',
			});

			// Act
			const result = await controller.testNode(req);

			// Assert
			expect(result.success).toBe(true);
			expect(result.nodeType).toBe('test.SimpleNode');
			expect(result.nodeVersion).toBe(1);
			expect(result.metadata.mockExecution).toBe(true);
			expect(result.metadata.nodeDescription).toEqual(simpleNodeDescription);
			expect(nodeTypes.getByNameAndVersion).toHaveBeenCalledWith('test.SimpleNode', 1);
		});

		it('should throw BadRequestError when nodeType is missing', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					nodeVersion: 1,
					parameters: {},
				},
			});

			// Act & Assert
			await expect(controller.testNode(req)).rejects.toThrow(BadRequestError);
			await expect(controller.testNode(req)).rejects.toThrow('Node type is required');
		});

		it('should throw BadRequestError when nodeType is empty string', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					nodeType: '',
					nodeVersion: 1,
					parameters: {},
				},
			});

			// Act & Assert
			await expect(controller.testNode(req)).rejects.toThrow(BadRequestError);
			await expect(controller.testNode(req)).rejects.toThrow('Node type is required');
		});

		it('should throw NotFoundError when node type is not found', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					nodeType: 'nonexistent.Node',
					nodeVersion: 1,
					parameters: {},
				},
			});

			nodeTypes.getByNameAndVersion.mockReturnValue(null);

			// Act & Assert
			await expect(controller.testNode(req)).rejects.toThrow(NotFoundError);
			await expect(controller.testNode(req)).rejects.toThrow(
				"Node type 'nonexistent.Node' version 1 not found",
			);
		});

		it('should handle ApplicationError and rethrow it', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					nodeType: 'test.SimpleNode',
					nodeVersion: 1,
				},
			});

			const appError = new ApplicationError('Node execution failed');
			nodeTypes.getByNameAndVersion.mockImplementation(() => {
				throw appError;
			});

			// Act & Assert
			await expect(controller.testNode(req)).rejects.toThrow(ApplicationError);
			await expect(controller.testNode(req)).rejects.toThrow('Node execution failed');
		});

		it('should wrap other errors in InternalServerError', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					nodeType: 'test.SimpleNode',
					nodeVersion: 1,
				},
			});

			const error = new Error('Unexpected error');
			nodeTypes.getByNameAndVersion.mockImplementation(() => {
				throw error;
			});

			// Act & Assert
			await expect(controller.testNode(req)).rejects.toThrow(InternalServerError);
			await expect(controller.testNode(req)).rejects.toThrow('Node test failed: Unexpected error');
		});
	});

	describe('generateMockData', () => {
		it('should generate mock data for node properties', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					nodeType: 'n8n-nodes-base.HttpRequest',
					nodeVersion: 1,
					inputDataCount: 2,
				},
			});

			// Act
			const result = await controller.generateMockData(req);

			// Assert
			expect(result.success).toBe(true);
			expect(result.nodeType).toBe('n8n-nodes-base.HttpRequest');
			expect(result.mockData.parameters).toHaveProperty('method');
			expect(result.mockData.parameters).toHaveProperty('url');
			expect(result.mockData.inputData).toHaveLength(2);
			expect(result.metadata.nodeDescription).toEqual(mockNodeTypeDescription);
		});

		it('should throw BadRequestError when nodeType is missing', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					nodeVersion: 1,
				},
			});

			// Act & Assert
			await expect(controller.generateMockData(req)).rejects.toThrow(BadRequestError);
			await expect(controller.generateMockData(req)).rejects.toThrow('Node type is required');
		});

		it('should throw NotFoundError when node type is not found', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					nodeType: 'nonexistent.Node',
					nodeVersion: 1,
				},
			});

			nodeTypes.getByNameAndVersion.mockReturnValue(null);

			// Act & Assert
			await expect(controller.generateMockData(req)).rejects.toThrow(NotFoundError);
			await expect(controller.generateMockData(req)).rejects.toThrow(
				"Node type 'nonexistent.Node' version 1 not found",
			);
		});

		it('should handle InternalServerError for unexpected errors', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					nodeType: 'n8n-nodes-base.HttpRequest',
					nodeVersion: 1,
				},
			});

			const error = new Error('Unexpected error');
			nodeTypes.getByNameAndVersion.mockImplementation(() => {
				throw error;
			});

			// Act & Assert
			await expect(controller.generateMockData(req)).rejects.toThrow(InternalServerError);
			await expect(controller.generateMockData(req)).rejects.toThrow(
				'Mock data generation failed: Unexpected error',
			);
		});
	});

	describe('validateNodeParameters', () => {
		it('should validate parameters successfully for simple node', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					nodeType: 'test.SimpleNode',
					nodeVersion: 1,
					parameters: {},
				},
			});

			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: simpleNodeDescription,
				sourcePath: '/path/to/simple',
			});

			// Act
			const result = await controller.validateNodeParameters(req);

			// Assert
			expect(result.valid).toBe(true);
			expect(result.issues).toHaveLength(0);
			expect(result.nodeType).toBe('test.SimpleNode');
		});

		it('should throw BadRequestError when nodeType is missing', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					parameters: {},
				},
			});

			// Act & Assert
			await expect(controller.validateNodeParameters(req)).rejects.toThrow(BadRequestError);
			await expect(controller.validateNodeParameters(req)).rejects.toThrow('Node type is required');
		});

		it('should throw BadRequestError when parameters is missing', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					nodeType: 'n8n-nodes-base.HttpRequest',
				},
			});

			// Act & Assert
			await expect(controller.validateNodeParameters(req)).rejects.toThrow(BadRequestError);
			await expect(controller.validateNodeParameters(req)).rejects.toThrow(
				'Parameters object is required',
			);
		});

		it('should throw BadRequestError when parameters is not an object', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					nodeType: 'n8n-nodes-base.HttpRequest',
					parameters: 'invalid',
				},
			});

			// Act & Assert
			await expect(controller.validateNodeParameters(req)).rejects.toThrow(BadRequestError);
			await expect(controller.validateNodeParameters(req)).rejects.toThrow(
				'Parameters object is required',
			);
		});

		it('should handle nodes without properties', async () => {
			// Arrange
			const simpleNodeDescription = {
				name: 'simple.Node',
				properties: undefined,
			} as INodeTypeDescription;

			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: simpleNodeDescription,
				sourcePath: '/path/to/simple',
			});

			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					nodeType: 'simple.Node',
					nodeVersion: 1,
					parameters: { anyParam: 'value' },
				},
			});

			// Act
			const result = await controller.validateNodeParameters(req);

			// Assert
			expect(result.valid).toBe(true);
			expect(result.issues).toHaveLength(0);
		});
	});

	describe('batchTestNodes', () => {
		beforeEach(() => {
			// Mock the testNode method to avoid complex workflow creation
			jest.spyOn(controller, 'testNode').mockResolvedValue({
				success: true,
				nodeType: 'mock',
				nodeVersion: 1,
				parameters: {},
				result: { data: { main: [[]] } },
				metadata: { executedAt: new Date() },
			} as any);
		});

		it('should execute batch tests sequentially', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					tests: [
						{
							nodeType: 'test1.Node',
							nodeVersion: 1,
							parameters: {},
							testName: 'Test 1',
						},
						{
							nodeType: 'test2.Node',
							nodeVersion: 1,
							parameters: {},
							testName: 'Test 2',
						},
					],
					parallel: false,
					continueOnError: true,
				},
			});

			// Act
			const result = await controller.batchTestNodes(req);

			// Assert
			expect(result.success).toBe(true);
			expect(result.summary.total).toBe(2);
			expect(result.summary.success).toBe(2);
			expect(result.summary.errorCount).toBe(0);
			expect(result.summary.parallel).toBe(false);
			expect(result.results).toHaveLength(2);
			expect(result.results[0].testName).toBe('Test 1');
			expect(result.results[1].testName).toBe('Test 2');
		});

		it('should execute batch tests in parallel', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					tests: [
						{ nodeType: 'test1.Node', nodeVersion: 1 },
						{ nodeType: 'test2.Node', nodeVersion: 1 },
					],
					parallel: true,
					continueOnError: true,
				},
			});

			// Act
			const result = await controller.batchTestNodes(req);

			// Assert
			expect(result.success).toBe(true);
			expect(result.summary.parallel).toBe(true);
			expect(result.results).toHaveLength(2);
		});

		it('should throw BadRequestError when tests array is empty', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					tests: [],
				},
			});

			// Act & Assert
			await expect(controller.batchTestNodes(req)).rejects.toThrow(BadRequestError);
			await expect(controller.batchTestNodes(req)).rejects.toThrow(
				'Tests array is required and must not be empty',
			);
		});

		it('should throw BadRequestError when tests array is missing', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {},
			});

			// Act & Assert
			await expect(controller.batchTestNodes(req)).rejects.toThrow(BadRequestError);
			await expect(controller.batchTestNodes(req)).rejects.toThrow(
				'Tests array is required and must not be empty',
			);
		});

		it('should throw BadRequestError when too many tests are provided', async () => {
			// Arrange
			const tests = Array.from({ length: 11 }, (_, i) => ({
				nodeType: `test.Node${i}`,
				nodeVersion: 1,
			}));

			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: { tests },
			});

			// Act & Assert
			await expect(controller.batchTestNodes(req)).rejects.toThrow(BadRequestError);
			await expect(controller.batchTestNodes(req)).rejects.toThrow(
				'Maximum 10 tests allowed per batch',
			);
		});

		it('should handle test failures when continueOnError is true', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					tests: [
						{ nodeType: 'success.Node', nodeVersion: 1 },
						{ nodeType: 'failure.Node', nodeVersion: 1 },
					],
					parallel: false,
					continueOnError: true,
				},
			});

			jest
				.spyOn(controller, 'testNode')
				.mockResolvedValueOnce({
					success: true,
					nodeType: 'success.Node',
					nodeVersion: 1,
					parameters: {},
					result: { data: { main: [[]] } },
					metadata: { executedAt: new Date() },
				} as any)
				.mockRejectedValueOnce(new Error('Test failed'));

			// Act
			const result = await controller.batchTestNodes(req);

			// Assert
			expect(result.success).toBe(false); // because one test failed
			expect(result.summary.success).toBe(1);
			expect(result.summary.errorCount).toBe(1);
			expect(result.results[0].success).toBe(true);
			expect(result.results[1].success).toBe(false);
			expect(result.results[1].error).toBe('Test failed');
		});

		it('should stop on first error when continueOnError is false', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				body: {
					tests: [
						{ nodeType: 'failure.Node', nodeVersion: 1 },
						{ nodeType: 'should-not-run.Node', nodeVersion: 1 },
					],
					parallel: false,
					continueOnError: false,
				},
			});

			jest.spyOn(controller, 'testNode').mockRejectedValue(new Error('First test failed'));

			// Act
			const result = await controller.batchTestNodes(req);

			// Assert
			expect(result.results).toHaveLength(1); // Only first test ran
			expect(result.results[0].success).toBe(false);
			expect(result.results[0].error).toBe('First test failed');
		});
	});
});
