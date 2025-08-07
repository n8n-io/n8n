'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const node_types_1 = require('@/node-types');
const node_testing_service_1 = require('@/services/node-testing.service');
const ai_helpers_service_1 = require('@/services/ai-helpers.service');
const node_types_controller_1 = require('../node-types.controller');
jest.mock('fs/promises', () => ({
	readFile: jest.fn(),
}));
jest.mock('lodash/get', () => jest.fn());
describe('NodeTypesController', () => {
	(0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	const nodeTypes = (0, backend_test_utils_1.mockInstance)(node_types_1.NodeTypes);
	const globalConfig = (0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig);
	const nodeTestingService = (0, backend_test_utils_1.mockInstance)(
		node_testing_service_1.NodeTestingService,
	);
	const aiHelpersService = (0, backend_test_utils_1.mockInstance)(
		ai_helpers_service_1.AiHelpersService,
	);
	const logger = di_1.Container.get(backend_common_1.Logger);
	const controller = di_1.Container.get(node_types_controller_1.NodeTypesController);
	const mockUser = (0, jest_mock_extended_1.mock)({
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
	};
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
	};
	beforeEach(() => {
		jest.clearAllMocks();
		const get = require('lodash/get');
		get.mockImplementation((obj, path, defaultValue) => {
			if (path === 'body.nodeInfos') {
				return obj?.body?.nodeInfos || defaultValue;
			}
			return defaultValue;
		});
		globalConfig.defaultLocale = 'en';
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: mockNodeTypeDescription,
			sourcePath: '/path/to/node',
		});
		nodeTestingService.testNode.mockImplementation(
			async (nodeType, nodeVersion, parameters, inputData, options) => {
				if (!nodeType) {
					throw new bad_request_error_1.BadRequestError('Node type is required');
				}
				if (nodeType === 'nonexistent.Node') {
					throw new not_found_error_1.NotFoundError(
						"Node type 'nonexistent.Node' version 1 not found",
					);
				}
				return {
					success: true,
					data: { main: [[{ json: { message: 'Node test successful' } }]] },
					executionTime: 50,
					metadata: {
						executedAt: new Date(),
						inputItemCount: 0,
						outputItemCount: 1,
						mockExecution: true,
						nodeDescription: mockNodeTypeDescription,
					},
				};
			},
		);
		nodeTestingService.generateMockData.mockImplementation(
			async (nodeType, nodeVersion, parameters) => {
				if (!nodeType) {
					throw new bad_request_error_1.BadRequestError('Node type is required');
				}
				if (nodeType === 'nonexistent.Node') {
					throw new not_found_error_1.NotFoundError(
						"Node type 'nonexistent.Node' version 1 not found",
					);
				}
				return {
					success: true,
					mockData: {
						parameters: { method: 'GET', url: 'mock-url' },
						inputData: [],
					},
					metadata: {
						generatedAt: new Date(),
						nodeDescription: mockNodeTypeDescription,
						parameterCount: 2,
						inputDataCount: 0,
					},
					nodeType: jest.fn(),
					nodeVersion: 1,
				};
			},
		);
		nodeTestingService.validateNodeParameters.mockImplementation(
			async (nodeType, nodeVersion, parameters) => {
				if (!nodeType) {
					throw new bad_request_error_1.BadRequestError('Node type is required');
				}
				return {
					valid: false,
					issues: [
						{
							field: 'method',
							message: "Parameter 'Method' has invalid value. Valid options: GET, POST",
							severity: 'error',
						},
						{ field: 'url', message: "Parameter 'URL' should be a string", severity: 'error' },
					],
					validatedParameters: {},
					nodeType: jest.fn(),
					nodeVersion: jest.fn(),
				};
			},
		);
		aiHelpersService.generateMockData.mockResolvedValue({
			success: true,
			mockData: { parameters: { method: 'GET', url: 'mock-url' } },
		});
	});
	describe('getNodeInfo', () => {
		it('should return node descriptions for English locale', async () => {
			const get = require('lodash/get');
			get.mockReturnValueOnce([
				{ name: 'n8n-nodes-base.HttpRequest', version: 1 },
				{ name: 'n8n-nodes-base.Webhook', version: 1 },
			]);
			const req = (0, jest_mock_extended_1.mock)({
				body: {
					nodeInfos: [
						{ name: 'n8n-nodes-base.HttpRequest', version: 1 },
						{ name: 'n8n-nodes-base.Webhook', version: 1 },
					],
				},
			});
			const webhookDescription = {
				name: 'n8n-nodes-base.Webhook',
				displayName: 'Webhook',
			};
			nodeTypes.getByNameAndVersion
				.mockReturnValueOnce({ description: mockNodeTypeDescription, sourcePath: '/path/to/http' })
				.mockReturnValueOnce({ description: webhookDescription, sourcePath: '/path/to/webhook' });
			const result = await controller.getNodeInfo(req);
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual(mockNodeTypeDescription);
			expect(result[1]).toEqual(webhookDescription);
			expect(nodeTypes.getByNameAndVersion).toHaveBeenCalledWith('n8n-nodes-base.HttpRequest', 1);
			expect(nodeTypes.getByNameAndVersion).toHaveBeenCalledWith('n8n-nodes-base.Webhook', 1);
		});
		it('should handle empty nodeInfos array', async () => {
			const get = require('lodash/get');
			get.mockReturnValueOnce([]);
			const req = (0, jest_mock_extended_1.mock)({
				body: { nodeInfos: [] },
			});
			const result = await controller.getNodeInfo(req);
			expect(result).toEqual([]);
			expect(nodeTypes.getByNameAndVersion).not.toHaveBeenCalled();
		});
		it('should handle missing nodeInfos in request body', async () => {
			const get = require('lodash/get');
			get.mockReturnValueOnce([]);
			const req = (0, jest_mock_extended_1.mock)({
				body: {},
			});
			const result = await controller.getNodeInfo(req);
			expect(result).toEqual([]);
			expect(nodeTypes.getByNameAndVersion).not.toHaveBeenCalled();
		});
		it('should load translations for non-English locale', async () => {
			globalConfig.defaultLocale = 'de';
			const get = require('lodash/get');
			get.mockReturnValueOnce([{ name: 'n8n-nodes-base.HttpRequest', version: 1 }]);
			const req = (0, jest_mock_extended_1.mock)({
				body: {
					nodeInfos: [{ name: 'n8n-nodes-base.HttpRequest', version: 1 }],
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
			const result = await controller.getNodeInfo(req);
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
			globalConfig.defaultLocale = 'de';
			const get = require('lodash/get');
			get.mockReturnValueOnce([{ name: 'n8n-nodes-base.HttpRequest', version: 1 }]);
			const req = (0, jest_mock_extended_1.mock)({
				body: {
					nodeInfos: [{ name: 'n8n-nodes-base.HttpRequest', version: 1 }],
				},
			});
			const descriptionWithoutTranslation = { ...mockNodeTypeDescription };
			delete descriptionWithoutTranslation.translation;
			nodeTypes.getWithSourcePath.mockReturnValue({
				description: descriptionWithoutTranslation,
				sourcePath: '/path/to/node',
			});
			nodeTypes.getNodeTranslationPath.mockResolvedValue('/nonexistent/path.json');
			const { readFile } = require('fs/promises');
			readFile.mockRejectedValue(new Error('File not found'));
			const result = await controller.getNodeInfo(req);
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(descriptionWithoutTranslation);
			expect(result[0].translation).toBeUndefined();
		});
	});
	describe('testNode', () => {
		it('should successfully test a simple node', async () => {
			const req = (0, jest_mock_extended_1.mock)({
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
			const result = await controller.testNode(req);
			expect(result.success).toBe(true);
			expect(result.nodeType).toBe('test.SimpleNode');
			expect(result.nodeVersion).toBe(1);
			expect(result.metadata.mockExecution).toBe(true);
			expect(result.metadata.nodeDescription).toEqual(simpleNodeDescription);
			expect(nodeTypes.getByNameAndVersion).toHaveBeenCalledWith('test.SimpleNode', 1);
		});
		it('should throw BadRequestError when nodeType is missing', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: {
					nodeType: undefined,
					nodeVersion: 1,
					parameters: {},
				},
			});
			await expect(controller.testNode(req)).rejects.toThrow(bad_request_error_1.BadRequestError);
			await expect(controller.testNode(req)).rejects.toThrow('Node type is required');
		});
		it('should throw BadRequestError when nodeType is empty string', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: {
					nodeType: '',
					nodeVersion: 1,
					parameters: {},
				},
			});
			await expect(controller.testNode(req)).rejects.toThrow(bad_request_error_1.BadRequestError);
			await expect(controller.testNode(req)).rejects.toThrow('Node type is required');
		});
		it('should throw NotFoundError when node type is not found', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: {
					nodeType: 'nonexistent.Node',
					nodeVersion: 1,
					parameters: {},
				},
			});
			nodeTestingService.testNode.mockRejectedValue(
				new not_found_error_1.NotFoundError("Node type 'nonexistent.Node' version 1 not found"),
			);
			await expect(controller.testNode(req)).rejects.toThrow(not_found_error_1.NotFoundError);
			await expect(controller.testNode(req)).rejects.toThrow(
				"Node type 'nonexistent.Node' version 1 not found",
			);
		});
		it('should handle ApplicationError and rethrow it', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: {
					nodeType: 'test.SimpleNode',
					nodeVersion: 1,
				},
			});
			const appError = new n8n_workflow_1.ApplicationError('Node execution failed');
			nodeTypes.getByNameAndVersion.mockImplementation(() => {
				throw appError;
			});
			await expect(controller.testNode(req)).rejects.toThrow(n8n_workflow_1.ApplicationError);
			await expect(controller.testNode(req)).rejects.toThrow('Node execution failed');
		});
		it('should wrap other errors in InternalServerError', async () => {
			const req = (0, jest_mock_extended_1.mock)({
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
			await expect(controller.testNode(req)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
			await expect(controller.testNode(req)).rejects.toThrow('Node test failed: Unexpected error');
		});
	});
	describe('generateMockData', () => {
		it('should generate mock data for node properties', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: {
					nodeType: 'n8n-nodes-base.HttpRequest',
					nodeVersion: 1,
					inputDataCount: 2,
				},
			});
			const result = await controller.generateMockData(req);
			expect(result.success).toBe(true);
			expect(result.nodeType).toBe('n8n-nodes-base.HttpRequest');
			expect(result.mockData.parameters).toHaveProperty('method');
			expect(result.mockData.parameters).toHaveProperty('url');
			expect(result.mockData.inputData).toHaveLength(2);
			expect(result.metadata.nodeDescription).toEqual(mockNodeTypeDescription);
		});
		it('should throw BadRequestError when nodeType is missing', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: {
					nodeType: undefined,
					nodeVersion: 1,
				},
			});
			await expect(controller.generateMockData(req)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.generateMockData(req)).rejects.toThrow('Node type is required');
		});
		it('should throw NotFoundError when node type is not found', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: {
					nodeType: 'nonexistent.Node',
					nodeVersion: 1,
				},
			});
			nodeTestingService.generateMockData.mockRejectedValue(
				new not_found_error_1.NotFoundError("Node type 'nonexistent.Node' version 1 not found"),
			);
			await expect(controller.generateMockData(req)).rejects.toThrow(
				not_found_error_1.NotFoundError,
			);
			await expect(controller.generateMockData(req)).rejects.toThrow(
				"Node type 'nonexistent.Node' version 1 not found",
			);
		});
		it('should handle InternalServerError for unexpected errors', async () => {
			const req = (0, jest_mock_extended_1.mock)({
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
			await expect(controller.generateMockData(req)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
			await expect(controller.generateMockData(req)).rejects.toThrow(
				'Mock data generation failed: Unexpected error',
			);
		});
	});
	describe('validateNodeParameters', () => {
		it('should validate parameters successfully for simple node', async () => {
			const req = (0, jest_mock_extended_1.mock)({
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
			const result = await controller.validateNodeParameters(req);
			expect(result.valid).toBe(true);
			expect(result.issues).toHaveLength(0);
			expect(result.nodeType).toBe('test.SimpleNode');
		});
		it('should throw BadRequestError when nodeType is missing', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: {
					nodeType: undefined,
					parameters: {},
				},
			});
			await expect(controller.validateNodeParameters(req)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.validateNodeParameters(req)).rejects.toThrow('Node type is required');
		});
		it('should throw BadRequestError when parameters is missing', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: {
					nodeType: 'n8n-nodes-base.HttpRequest',
				},
			});
			await expect(controller.validateNodeParameters(req)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.validateNodeParameters(req)).rejects.toThrow(
				'Parameters object is required',
			);
		});
		it('should throw BadRequestError when parameters is not an object', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: {
					nodeType: 'n8n-nodes-base.HttpRequest',
					parameters: 'invalid',
				},
			});
			await expect(controller.validateNodeParameters(req)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.validateNodeParameters(req)).rejects.toThrow(
				'Parameters object is required',
			);
		});
		it('should handle nodes without properties', async () => {
			const simpleNodeDescription = {
				name: 'simple.Node',
				properties: undefined,
			};
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: simpleNodeDescription,
				sourcePath: '/path/to/simple',
			});
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: {
					nodeType: 'simple.Node',
					nodeVersion: 1,
					parameters: { anyParam: 'value' },
				},
			});
			const result = await controller.validateNodeParameters(req);
			expect(result.valid).toBe(true);
			expect(result.issues).toHaveLength(0);
		});
	});
	describe('batchTestNodes', () => {
		beforeEach(() => {
			jest.spyOn(controller, 'testNode').mockResolvedValue({
				success: true,
				nodeType: 'mock',
				nodeVersion: 1,
				parameters: {},
				result: { data: { main: [[]] } },
				metadata: { executedAt: new Date() },
			});
		});
		it('should execute batch tests sequentially', async () => {
			const req = (0, jest_mock_extended_1.mock)({
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
			const result = await controller.batchTestNodes(req);
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
			const req = (0, jest_mock_extended_1.mock)({
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
			const result = await controller.batchTestNodes(req);
			expect(result.success).toBe(true);
			expect(result.summary.parallel).toBe(true);
			expect(result.results).toHaveLength(2);
		});
		it('should throw BadRequestError when tests array is empty', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: {
					tests: [],
				},
			});
			await expect(controller.batchTestNodes(req)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.batchTestNodes(req)).rejects.toThrow(
				'Tests array is required and must not be empty',
			);
		});
		it('should throw BadRequestError when tests array is missing', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: {},
			});
			await expect(controller.batchTestNodes(req)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.batchTestNodes(req)).rejects.toThrow(
				'Tests array is required and must not be empty',
			);
		});
		it('should throw BadRequestError when too many tests are provided', async () => {
			const tests = Array.from({ length: 11 }, (_, i) => ({
				nodeType: `test.Node${i}`,
				nodeVersion: 1,
			}));
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: { tests },
			});
			await expect(controller.batchTestNodes(req)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.batchTestNodes(req)).rejects.toThrow(
				'Maximum 10 tests allowed per batch',
			);
		});
		it('should handle test failures when continueOnError is true', async () => {
			const req = (0, jest_mock_extended_1.mock)({
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
				})
				.mockRejectedValueOnce(new Error('Test failed'));
			const result = await controller.batchTestNodes(req);
			expect(result.success).toBe(false);
			expect(result.summary.success).toBe(1);
			expect(result.summary.errorCount).toBe(1);
			expect(result.results[0].success).toBe(true);
			expect(result.results[1].success).toBe(false);
			expect(result.results[1].error).toBe('Test failed');
		});
		it('should stop on first error when continueOnError is false', async () => {
			const req = (0, jest_mock_extended_1.mock)({
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
			const result = await controller.batchTestNodes(req);
			expect(result.results).toHaveLength(1);
			expect(result.results[0].success).toBe(false);
			expect(result.results[0].error).toBe('First test failed');
		});
	});
});
//# sourceMappingURL=node-types.controller.test.js.map
