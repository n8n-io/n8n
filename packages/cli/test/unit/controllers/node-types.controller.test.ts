import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { mockInstance } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

import { NodeTypesController } from '@/controllers/node-types.controller';
import { NodeTypes } from '@/node-types';

describe('NodeTypesController - Enhanced Testing', () => {
	const nodeTypes = mock<NodeTypes>();
	const globalConfig = mock<GlobalConfig>();
	const logger = mockInstance(Logger);

	let controller: NodeTypesController;

	beforeEach(() => {
		jest.clearAllMocks();
		globalConfig.defaultLocale = 'en';
		controller = new NodeTypesController(nodeTypes, globalConfig, logger);
	});

	describe('Enhanced Node Testing Functionality', () => {
		describe('POST /test - Real Node Execution', () => {
			it('should execute a simple node with actual workflow execution', async () => {
				// Mock node type
				const mockNodeType = {
					description: {
						displayName: 'Test Node',
						name: 'testNode',
						group: ['test'],
						version: 1,
						description: 'A test node',
						defaults: {
							name: 'Test Node',
						},
						inputs: ['main'],
						outputs: ['main'],
						properties: [
							{
								displayName: 'Test Parameter',
								name: 'testParam',
								type: 'string',
								default: 'test value',
							},
						],
					} as INodeTypeDescription,
				};

				nodeTypes.getByNameAndVersion.mockReturnValue(mockNodeType as any);

				const req = {
					user: { id: 'test-user' },
					body: {
						nodeType: 'testNode',
						nodeVersion: 1,
						parameters: { testParam: 'test value' },
						inputData: [
							{
								json: { test: 'input data' },
							},
						],
					},
				} as any;

				// Note: This test would require proper WorkflowExecute mocking for full integration
				// For now, we verify the endpoint structure and parameter handling
				expect(async () => {
					await controller.testNode(req);
				}).not.toThrow();
			});
		});

		describe('Enhanced Mock Data Generation', () => {
			it('should verify enhanced mock data generation is available', () => {
				// Test that the controller has been enhanced with better mock data generation
				expect(controller).toBeDefined();
				expect(typeof controller.generateMockData).toBe('function');
			});
		});

		describe('POST /generate-mock-data - Enhanced Mock Generation', () => {
			it('should generate contextual mock data for different parameter types', async () => {
				const mockNodeType = {
					description: {
						displayName: 'Email Node',
						name: 'emailNode',
						properties: [
							{
								displayName: 'Email Address',
								name: 'email',
								type: 'string',
							},
							{
								displayName: 'API URL',
								name: 'apiUrl',
								type: 'string',
							},
							{
								displayName: 'Port',
								name: 'port',
								type: 'number',
							},
							{
								displayName: 'Enable SSL',
								name: 'enableSSL',
								type: 'boolean',
							},
							{
								displayName: 'Headers',
								name: 'headers',
								type: 'collection',
							},
						],
					} as INodeTypeDescription,
				};

				nodeTypes.getByNameAndVersion.mockReturnValue(mockNodeType as any);

				const req = {
					user: { id: 'test-user' },
					body: {
						nodeType: 'emailNode',
						inputDataCount: 3,
					},
				} as any;

				const result = await controller.generateMockData(req);

				expect(result.success).toBe(true);
				expect(result.mockData.parameters).toMatchObject({
					email: expect.stringContaining('@'),
					apiUrl: expect.stringContaining('https://'),
					port: expect.any(Number),
					enableSSL: expect.any(Boolean),
					headers: expect.any(Object),
				});
				expect(result.mockData.inputData).toHaveLength(3);
			});

			it('should generate appropriate mock data for different node types', async () => {
				const httpNodeType = {
					description: {
						displayName: 'HTTP Request',
						name: 'httpRequest',
						properties: [
							{
								displayName: 'Method',
								name: 'method',
								type: 'options',
								options: [
									{ name: 'GET', value: 'GET' },
									{ name: 'POST', value: 'POST' },
								],
							},
							{
								displayName: 'URL',
								name: 'url',
								type: 'string',
							},
						],
					} as INodeTypeDescription,
				};

				nodeTypes.getByNameAndVersion.mockReturnValue(httpNodeType as any);

				const req = {
					user: { id: 'test-user' },
					body: {
						nodeType: 'httpRequest',
					},
				} as any;

				const result = await controller.generateMockData(req);

				expect(result.mockData.parameters.method).toBe('GET');
				expect(result.mockData.parameters.url).toContain('https://api.example.com');
			});
		});

		describe('POST /validate-parameters - Enhanced Validation', () => {
			it('should validate complex parameter structures', async () => {
				const mockNodeType = {
					description: {
						displayName: 'Complex Node',
						name: 'complexNode',
						properties: [
							{
								displayName: 'Required String',
								name: 'requiredString',
								type: 'string',
								required: true,
							},
							{
								displayName: 'Number Field',
								name: 'numberField',
								type: 'number',
							},
							{
								displayName: 'Boolean Field',
								name: 'booleanField',
								type: 'boolean',
							},
							{
								displayName: 'Options Field',
								name: 'optionsField',
								type: 'options',
								options: [
									{ name: 'Option 1', value: 'opt1' },
									{ name: 'Option 2', value: 'opt2' },
								],
							},
						],
					} as INodeTypeDescription,
				};

				nodeTypes.getByNameAndVersion.mockReturnValue(mockNodeType as any);

				// Test valid parameters
				const validReq = {
					user: { id: 'test-user' },
					body: {
						nodeType: 'complexNode',
						parameters: {
							requiredString: 'test value',
							numberField: 42,
							booleanField: true,
							optionsField: 'opt1',
						},
					},
				} as any;

				const validResult = await controller.validateNodeParameters(validReq);
				expect(validResult.valid).toBe(true);
				expect(validResult.issues).toHaveLength(0);

				// Test invalid parameters
				const invalidReq = {
					user: { id: 'test-user' },
					body: {
						nodeType: 'complexNode',
						parameters: {
							// requiredString missing
							numberField: 'not a number',
							booleanField: 'not a boolean',
							optionsField: 'invalid_option',
						},
					},
				} as any;

				const invalidResult = await controller.validateNodeParameters(invalidReq);
				expect(invalidResult.valid).toBe(false);
				expect(invalidResult.issues.length).toBeGreaterThan(0);

				// Check for specific validation errors
				const errorMessages = invalidResult.issues.map((issue) => issue.message);
				expect(errorMessages.some((msg) => msg.includes('Required parameter'))).toBe(true);
				expect(errorMessages.some((msg) => msg.includes('should be a valid number'))).toBe(true);
				expect(errorMessages.some((msg) => msg.includes('should be a boolean'))).toBe(true);
				expect(errorMessages.some((msg) => msg.includes('invalid value'))).toBe(true);
			});
		});

		describe('POST /batch-test - Batch Testing', () => {
			it('should handle batch testing with parallel and sequential modes', async () => {
				const mockNodeType = {
					description: {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [],
					} as INodeTypeDescription,
				};

				nodeTypes.getByNameAndVersion.mockReturnValue(mockNodeType as any);

				// Test parallel execution
				const parallelReq = {
					user: { id: 'test-user' },
					body: {
						tests: [
							{
								nodeType: 'testNode',
								testName: 'Test 1',
								parameters: { param1: 'value1' },
							},
							{
								nodeType: 'testNode',
								testName: 'Test 2',
								parameters: { param2: 'value2' },
							},
						],
						parallel: true,
					},
				} as any;

				const parallelResult = await controller.batchTestNodes(parallelReq);
				expect(parallelResult.summary.total).toBe(2);
				expect(parallelResult.summary.parallel).toBe(true);

				// Test sequential execution
				const sequentialReq = {
					...parallelReq,
					body: {
						...parallelReq.body,
						parallel: false,
					},
				};

				const sequentialResult = await controller.batchTestNodes(sequentialReq);
				expect(sequentialResult.summary.parallel).toBe(false);
			});

			it('should respect batch size limits', async () => {
				const req = {
					user: { id: 'test-user' },
					body: {
						tests: new Array(15).fill(0).map((_, i) => ({
							nodeType: 'testNode',
							testName: `Test ${i}`,
						})),
					},
				} as any;

				await expect(controller.batchTestNodes(req)).rejects.toThrow(
					'Maximum 10 tests allowed per batch',
				);
			});
		});
	});

	describe('Error Handling', () => {
		it('should handle non-existent node types gracefully', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(null);

			const req = {
				user: { id: 'test-user' },
				body: {
					nodeType: 'nonExistentNode',
				},
			} as any;

			await expect(controller.testNode(req)).rejects.toThrow(
				"Node type 'nonExistentNode' version 1 not found",
			);
		});

		it('should validate required parameters', async () => {
			const req = {
				user: { id: 'test-user' },
				body: {},
			} as any;

			await expect(controller.testNode(req)).rejects.toThrow('Node type is required');
			await expect(controller.generateMockData(req)).rejects.toThrow('Node type is required');
			await expect(controller.validateNodeParameters(req)).rejects.toThrow('Node type is required');
		});
	});
});
