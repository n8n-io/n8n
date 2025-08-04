import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { Post, RestController } from '@n8n/decorators';
import { Request } from 'express';
import { readFile } from 'fs/promises';
import get from 'lodash/get';
import type {
	INodeTypeDescription,
	INodeTypeNameVersion,
	INodeExecutionData,
	IDataObject,
	WorkflowExecuteMode,
	ITaskData,
	INodeParameters,
	INode,
} from 'n8n-workflow';
import { ApplicationError, Workflow } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NodeTypes } from '@/node-types';

@RestController('/node-types')
export class NodeTypesController {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {}

	@Post('/')
	async getNodeInfo(req: Request) {
		const nodeInfos = get(req, 'body.nodeInfos', []) as INodeTypeNameVersion[];

		const defaultLocale = this.globalConfig.defaultLocale;

		if (defaultLocale === 'en') {
			return nodeInfos.reduce<INodeTypeDescription[]>((acc, { name, version }) => {
				const { description } = this.nodeTypes.getByNameAndVersion(name, version);
				acc.push(description);
				return acc;
			}, []);
		}

		const populateTranslation = async (
			name: string,
			version: number,
			nodeTypes: INodeTypeDescription[],
		) => {
			const { description, sourcePath } = this.nodeTypes.getWithSourcePath(name, version);
			const translationPath = await this.nodeTypes.getNodeTranslationPath({
				nodeSourcePath: sourcePath,
				longNodeType: description.name,
				locale: defaultLocale,
			});

			try {
				const translation = await readFile(translationPath, 'utf8');

				description.translation = JSON.parse(translation);
			} catch {
				// ignore - no translation exists at path
			}

			nodeTypes.push(description);
		};

		const nodeTypes: INodeTypeDescription[] = [];

		const promises = nodeInfos.map(
			async ({ name, version }) => await populateTranslation(name, version, nodeTypes),
		);

		await Promise.all(promises);

		return nodeTypes;
	}

	// Advanced Node Testing Endpoints

	@Post('/test')
	async testNode(
		req: AuthenticatedRequest<
			{},
			{},
			{
				nodeType: string;
				nodeVersion?: number;
				parameters?: IDataObject;
				inputData?: INodeExecutionData[];
				mode?: WorkflowExecuteMode;
			}
		>,
	) {
		const { nodeType, nodeVersion = 1, parameters = {}, inputData = [] } = req.body;

		if (!nodeType) {
			throw new BadRequestError('Node type is required');
		}

		this.logger.debug('Node test requested', {
			nodeType,
			nodeVersion,
			userId: req.user.id,
			parametersCount: Object.keys(parameters).length,
			inputDataCount: inputData.length,
		});

		try {
			// Get the node type instance
			const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(nodeType, nodeVersion);
			if (!nodeTypeInstance) {
				throw new NotFoundError(`Node type '${nodeType}' version ${nodeVersion} not found`);
			}

			// Create a test node with the provided parameters
			const testNode: INode = {
				name: 'Test Node',
				typeVersion: nodeVersion,
				type: nodeType,
				position: [0, 0],
				parameters: parameters as INodeParameters,
				disabled: false,
				id: 'test-node-id',
			};

			// Create a minimal workflow for testing
			const testWorkflow = new Workflow({
				id: 'test-workflow',
				name: 'Test Workflow',
				nodes: [testNode],
				connections: {},
				active: false,
				nodeTypes: this.nodeTypes,
				settings: {},
			});

			// Mock execution result (real execution will be implemented in a future update)
			const startTime = Date.now();
			const nodeResult: ITaskData = {
				startTime,
				executionTime: Date.now() - startTime + 50, // Simulate some execution time
				executionIndex: 0, // Required property for ITaskData interface
				data: {
					main: [
						[
							{
								json: {
									message: `Node '${nodeType}' mock execution completed successfully`,
									nodeType,
									nodeVersion,
									parametersReceived: Object.keys(parameters).length,
									inputItemsReceived: inputData.length,
									mockExecution: true,
									timestamp: new Date().toISOString(),
									testWorkflowGenerated: true,
									nodeDescription: nodeTypeInstance.description.displayName,
									testNodeCreated: testNode.name,
									workflowCreated: testWorkflow.name,
								},
							},
						],
					],
				},
				source: [],
			};

			this.logger.debug('Node test completed successfully', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				outputDataCount: nodeResult.data?.main?.[0]?.length || 0,
			});

			// Format the result
			return {
				success: true,
				nodeType,
				nodeVersion,
				parameters,
				result: {
					data: nodeResult.data,
					executionTime: nodeResult.executionTime,
					source: nodeResult.source,
				},
				metadata: {
					executedAt: new Date(),
					inputItemCount: inputData.length,
					outputItemCount: nodeResult.data?.main?.[0]?.length || 0,
					nodeDescription: nodeTypeInstance.description,
					mockExecution: true,
				},
			};
		} catch (error) {
			this.logger.error('Node test failed', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Node test failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Post('/generate-mock-data')
	async generateMockData(
		req: AuthenticatedRequest<
			{},
			{},
			{
				nodeType: string;
				nodeVersion?: number;
				parameterOverrides?: IDataObject;
				inputDataCount?: number;
			}
		>,
	) {
		const { nodeType, nodeVersion = 1, parameterOverrides = {}, inputDataCount = 1 } = req.body;

		if (!nodeType) {
			throw new BadRequestError('Node type is required');
		}

		this.logger.debug('Mock data generation requested', {
			nodeType,
			nodeVersion,
			userId: req.user.id,
			inputDataCount,
		});

		try {
			// Get the node type instance
			const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(nodeType, nodeVersion);
			if (!nodeTypeInstance) {
				throw new NotFoundError(`Node type '${nodeType}' version ${nodeVersion} not found`);
			}

			const { description } = nodeTypeInstance;
			const mockParameters: IDataObject = {};
			const mockInputData: INodeExecutionData[] = [];

			// Generate mock parameters based on node properties
			if (description.properties) {
				for (const property of description.properties) {
					if (parameterOverrides[property.name] !== undefined) {
						mockParameters[property.name] = parameterOverrides[property.name];
						continue;
					}

					switch (property.type) {
						case 'string':
							if (property.options) {
								const firstOption = property.options[0];
								mockParameters[property.name] =
									firstOption && typeof firstOption === 'object' && 'value' in firstOption
										? firstOption.value
										: 'option1';
							} else {
								mockParameters[property.name] = property.default || `mock-${property.name}`;
							}
							break;
						case 'number':
							mockParameters[property.name] = property.default || 42;
							break;
						case 'boolean':
							mockParameters[property.name] =
								property.default !== undefined ? property.default : true;
							break;
						case 'collection':
							mockParameters[property.name] = property.default || {};
							break;
						case 'fixedCollection':
							mockParameters[property.name] = property.default || {};
							break;
						default:
							mockParameters[property.name] = property.default || null;
					}
				}
			}

			// Generate mock input data
			for (let i = 0; i < inputDataCount; i++) {
				mockInputData.push({
					json: {
						id: i + 1,
						name: `Mock Item ${i + 1}`,
						value: `mock-value-${i + 1}`,
						timestamp: new Date().toISOString(),
						data: {
							sample: `Sample data for item ${i + 1}`,
							number: Math.floor(Math.random() * 1000),
							boolean: Math.random() > 0.5,
						},
					},
				});
			}

			this.logger.debug('Mock data generation completed', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				parametersGenerated: Object.keys(mockParameters).length,
				inputItemsGenerated: mockInputData.length,
			});

			return {
				success: true,
				nodeType,
				nodeVersion,
				mockData: {
					parameters: mockParameters,
					inputData: mockInputData,
				},
				metadata: {
					generatedAt: new Date(),
					nodeDescription: description,
					parameterCount: Object.keys(mockParameters).length,
					inputDataCount: mockInputData.length,
				},
			};
		} catch (error) {
			this.logger.error('Mock data generation failed', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Mock data generation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Post('/validate-parameters')
	async validateNodeParameters(
		req: AuthenticatedRequest<
			{},
			{},
			{
				nodeType: string;
				nodeVersion?: number;
				parameters: IDataObject;
			}
		>,
	) {
		const { nodeType, nodeVersion = 1, parameters } = req.body;

		if (!nodeType) {
			throw new BadRequestError('Node type is required');
		}

		if (!parameters || typeof parameters !== 'object') {
			throw new BadRequestError('Parameters object is required');
		}

		this.logger.debug('Node parameter validation requested', {
			nodeType,
			nodeVersion,
			userId: req.user.id,
			parametersCount: Object.keys(parameters).length,
		});

		try {
			// Get the node type instance
			const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(nodeType, nodeVersion);
			if (!nodeTypeInstance) {
				throw new NotFoundError(`Node type '${nodeType}' version ${nodeVersion} not found`);
			}

			const { description } = nodeTypeInstance;
			const validationResult = {
				valid: true,
				issues: [] as Array<{
					field: string;
					message: string;
					severity: 'error' | 'warning';
				}>,
				nodeType,
				nodeVersion,
				validatedParameters: { ...parameters },
			};

			// Enhanced parameter validation
			if (description.properties) {
				for (const property of description.properties) {
					const paramValue = parameters[property.name];
					const isRequired = property.required !== false;

					// Required parameter validation
					if (
						isRequired &&
						(paramValue === undefined || paramValue === null || paramValue === '')
					) {
						validationResult.valid = false;
						validationResult.issues.push({
							field: property.name,
							message: `Required parameter '${property.displayName || property.name}' is missing`,
							severity: 'error',
						});
					}

					// Type validation
					if (paramValue !== undefined && property.type) {
						const expectedType = property.type;
						const actualType = typeof paramValue;

						switch (expectedType) {
							case 'number':
								if (actualType !== 'number' || isNaN(Number(paramValue))) {
									validationResult.issues.push({
										field: property.name,
										message: `Parameter '${property.displayName || property.name}' should be a valid number`,
										severity: 'error',
									});
									validationResult.valid = false;
								}
								break;
							case 'boolean':
								if (actualType !== 'boolean') {
									validationResult.issues.push({
										field: property.name,
										message: `Parameter '${property.displayName || property.name}' should be a boolean`,
										severity: 'error',
									});
									validationResult.valid = false;
								}
								break;
							case 'string':
								if (actualType !== 'string') {
									validationResult.issues.push({
										field: property.name,
										message: `Parameter '${property.displayName || property.name}' should be a string`,
										severity: 'error',
									});
									validationResult.valid = false;
								}
								break;
							case 'collection':
							case 'fixedCollection':
								if (actualType !== 'object') {
									validationResult.issues.push({
										field: property.name,
										message: `Parameter '${property.displayName || property.name}' should be an object`,
										severity: 'error',
									});
									validationResult.valid = false;
								}
								break;
						}
					}

					// Options validation
					if (property.options && paramValue !== undefined) {
						const validOptions = property.options.map((opt: any) => opt.value || opt.name);
						if (!validOptions.includes(paramValue)) {
							validationResult.issues.push({
								field: property.name,
								message: `Parameter '${property.displayName || property.name}' has invalid value. Valid options: ${validOptions.join(', ')}`,
								severity: 'error',
							});
							validationResult.valid = false;
						}
					}
				}
			}

			this.logger.debug('Node parameter validation completed', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				valid: validationResult.valid,
				issuesCount: validationResult.issues.length,
			});

			return validationResult;
		} catch (error) {
			this.logger.error('Node parameter validation failed', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Parameter validation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Post('/batch-test')
	async batchTestNodes(
		req: AuthenticatedRequest<
			{},
			{},
			{
				tests: Array<{
					nodeType: string;
					nodeVersion?: number;
					parameters?: IDataObject;
					inputData?: INodeExecutionData[];
					testName?: string;
				}>;
				parallel?: boolean;
				continueOnError?: boolean;
			}
		>,
	) {
		const { tests, parallel = false, continueOnError = true } = req.body;

		if (!tests || !Array.isArray(tests) || tests.length === 0) {
			throw new BadRequestError('Tests array is required and must not be empty');
		}

		if (tests.length > 10) {
			throw new BadRequestError('Maximum 10 tests allowed per batch');
		}

		this.logger.debug('Batch node testing requested', {
			testsCount: tests.length,
			userId: req.user.id,
			parallel,
			continueOnError,
		});

		const results: Array<{
			testName?: string;
			nodeType: string;
			nodeVersion: number;
			success: boolean;
			result?: any;
			error?: string;
			executionTime: number;
		}> = [];

		const executeTest = async (test: any, index: number) => {
			const startTime = Date.now();
			try {
				// Create a mock request for individual test
				const testReq = {
					...req,
					body: {
						nodeType: test.nodeType,
						nodeVersion: test.nodeVersion || 1,
						parameters: test.parameters || {},
						inputData: test.inputData || [],
					},
				} as any;

				const result = await this.testNode(testReq);
				return {
					testName: test.testName || `Test ${index + 1}`,
					nodeType: test.nodeType,
					nodeVersion: test.nodeVersion || 1,
					success: true,
					result,
					executionTime: Date.now() - startTime,
				};
			} catch (error) {
				return {
					testName: test.testName || `Test ${index + 1}`,
					nodeType: test.nodeType,
					nodeVersion: test.nodeVersion || 1,
					success: false,
					error: error instanceof Error ? error.message : String(error),
					executionTime: Date.now() - startTime,
				};
			}
		};

		try {
			if (parallel) {
				// Execute all tests in parallel
				const promises = tests.map((test, index) => executeTest(test, index));
				const parallelResults = await Promise.allSettled(promises);

				for (const result of parallelResults) {
					if (result.status === 'fulfilled') {
						results.push(result.value);
					} else {
						results.push({
							testName: 'Unknown Test',
							nodeType: 'unknown',
							nodeVersion: 1,
							success: false,
							error: result.reason instanceof Error ? result.reason.message : String(result.reason),
							executionTime: 0,
						});
					}
				}
			} else {
				// Execute tests sequentially
				for (let i = 0; i < tests.length; i++) {
					const result = await executeTest(tests[i], i);
					results.push(result);

					// Stop on first error if continueOnError is false
					if (!result.success && !continueOnError) {
						break;
					}
				}
			}

			const successCount = results.filter((r) => r.success).length;
			const errorCount = results.filter((r) => !r.success).length;
			const totalExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0);

			this.logger.debug('Batch node testing completed', {
				testsCount: tests.length,
				userId: req.user.id,
				successCount,
				errorCount,
				totalExecutionTime,
			});

			return {
				success: errorCount === 0,
				summary: {
					total: tests.length,
					success: successCount,
					errorCount,
					totalExecutionTime,
					averageExecutionTime: Math.round(totalExecutionTime / tests.length),
					parallel,
					continueOnError,
				},
				results,
				metadata: {
					executedAt: new Date(),
					executedBy: req.user.id,
				},
			};
		} catch (error) {
			this.logger.error('Batch node testing failed', {
				testsCount: tests.length,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Batch testing failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
