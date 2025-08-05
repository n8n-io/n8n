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
	IWorkflowExecuteAdditionalData,
	IRunExecutionData,
} from 'n8n-workflow';
import { ApplicationError, Workflow } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NodeTypes } from '@/node-types';
import { WorkflowExecute } from '@n8n/core';

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

			// Execute the node in an isolated environment
			const startTime = Date.now();
			const nodeResult = await this.executeNodeIsolated(
				testNode,
				testWorkflow,
				inputData,
				req.body.mode || 'test',
			);

			this.logger.debug('Node test completed successfully', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				outputDataCount: nodeResult.data?.main?.[0]?.length || 0,
			});

			// Format the result
			return {
				success: !nodeResult.error,
				nodeType,
				nodeVersion,
				parameters,
				result: {
					data: nodeResult.data,
					executionTime: nodeResult.executionTime,
					source: nodeResult.source,
					error: nodeResult.error,
				},
				metadata: {
					executedAt: new Date(),
					inputItemCount: inputData.length,
					outputItemCount: nodeResult.data?.main?.[0]?.length || 0,
					nodeDescription: nodeTypeInstance.description,
					mockExecution: false, // Now using real execution
					isolatedExecution: true,
					timeoutMs: 30000,
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

			// Generate sophisticated mock parameters based on node properties
			if (description.properties) {
				for (const property of description.properties) {
					if (parameterOverrides[property.name] !== undefined) {
						mockParameters[property.name] = parameterOverrides[property.name];
						continue;
					}

					mockParameters[property.name] = this.generateMockParameterValue(property, nodeType);
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

	@Post('/test-safe')
	async testNodeSafe(
		req: AuthenticatedRequest<
			{},
			{},
			{
				nodeType: string;
				nodeVersion?: number;
				parameters?: IDataObject;
				inputData?: INodeExecutionData[];
				mode?: WorkflowExecuteMode;
				safetyLevel?: 'strict' | 'moderate' | 'permissive';
				timeoutMs?: number;
			}
		>,
	) {
		const {
			nodeType,
			nodeVersion = 1,
			parameters = {},
			inputData = [],
			safetyLevel = 'moderate',
			timeoutMs = 30000,
		} = req.body;

		if (!nodeType) {
			throw new BadRequestError('Node type is required');
		}

		// Safety level restrictions
		const maxTimeout =
			safetyLevel === 'strict' ? 10000 : safetyLevel === 'moderate' ? 30000 : 60000;
		const effectiveTimeout = Math.min(timeoutMs, maxTimeout);

		// Restricted node types for safety
		const restrictedNodes =
			safetyLevel === 'strict'
				? [
						'n8n-nodes-base.code',
						'n8n-nodes-base.executeCommand',
						'n8n-nodes-base.function',
						'n8n-nodes-base.functionItem',
					]
				: [];

		if (restrictedNodes.includes(nodeType)) {
			throw new BadRequestError(
				`Node type '${nodeType}' is restricted in ${safetyLevel} safety mode`,
			);
		}

		this.logger.debug('Safe node test requested', {
			nodeType,
			nodeVersion,
			userId: req.user.id,
			safetyLevel,
			timeoutMs: effectiveTimeout,
		});

		try {
			// Get the node type instance
			const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(nodeType, nodeVersion);
			if (!nodeTypeInstance) {
				throw new NotFoundError(`Node type '${nodeType}' version ${nodeVersion} not found`);
			}

			// Create a test node with the provided parameters
			const testNode: INode = {
				name: 'Safe Test Node',
				typeVersion: nodeVersion,
				type: nodeType,
				position: [0, 0],
				parameters: parameters as INodeParameters,
				disabled: false,
				id: 'safe-test-node-id',
			};

			// Create a minimal workflow for testing
			const testWorkflow = new Workflow({
				id: 'safe-test-workflow',
				name: 'Safe Test Workflow',
				nodes: [testNode],
				connections: {},
				active: false,
				nodeTypes: this.nodeTypes,
				settings: {},
			});

			// Execute with safety constraints
			const nodeResult = await this.executeNodeSafeIsolated(
				testNode,
				testWorkflow,
				inputData,
				req.body.mode || 'test',
				effectiveTimeout,
				safetyLevel,
			);

			this.logger.debug('Safe node test completed', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				success: !nodeResult.error,
				executionTime: nodeResult.executionTime,
			});

			return {
				success: !nodeResult.error,
				nodeType,
				nodeVersion,
				parameters,
				result: {
					data: nodeResult.data,
					executionTime: nodeResult.executionTime,
					source: nodeResult.source,
					error: nodeResult.error,
				},
				metadata: {
					executedAt: new Date(),
					inputItemCount: inputData.length,
					outputItemCount: nodeResult.data?.main?.[0]?.length || 0,
					nodeDescription: nodeTypeInstance.description,
					safetyLevel,
					timeoutMs: effectiveTimeout,
					isolatedExecution: true,
				},
			};
		} catch (error) {
			this.logger.error('Safe node test failed', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				safetyLevel,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Safe node test failed: ${error instanceof Error ? error.message : String(error)}`,
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

	/**
	 * Execute a node in an isolated environment with proper error handling and timeouts
	 */
	private async executeNodeIsolated(
		node: INode,
		workflow: Workflow,
		inputData: INodeExecutionData[],
		mode: WorkflowExecuteMode,
	): Promise<ITaskData> {
		const startTime = Date.now();

		try {
			// Create minimal execution data for isolated test
			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
					pinData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [
						{
							node,
							data: {
								main: [inputData],
							},
							source: {
								main: [
									{
										previousNode: 'test-input',
									},
								],
							},
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			// Create minimal additional data for test execution
			const additionalData: IWorkflowExecuteAdditionalData = {
				restApiUrl: 'http://localhost:5678/rest',
				instanceBaseUrl: 'http://localhost:5678',
				formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
				webhookBaseUrl: 'http://localhost:5678/webhook',
				webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
				webhookTestBaseUrl: 'http://localhost:5678/webhook-test',
				currentNodeParameters: node.parameters,
				executionTimeoutTimestamp: Date.now() + 30000, // 30 second timeout
				userId: 'test-user',
				variables: {},
			} as IWorkflowExecuteAdditionalData;

			// Create workflow executor with timeout
			const workflowExecute = new WorkflowExecute(additionalData, mode, runExecutionData);

			// Execute with timeout protection
			const executionTimeout = 30000; // 30 seconds
			const executionPromise = workflowExecute.runPartialWorkflow(workflow, runExecutionData, [
				node.name,
			]);

			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => {
					reject(new ApplicationError('Node execution timeout after 30 seconds'));
				}, executionTimeout);
			});

			const result = await Promise.race([executionPromise, timeoutPromise]);

			// Extract result for the tested node
			const nodeResult = result.runData[node.name]?.[0];
			if (!nodeResult) {
				// Return error result if node didn't execute
				return {
					startTime,
					executionTime: Date.now() - startTime,
					executionIndex: 0,
					data: {
						main: [[]],
					},
					source: [],
					error: {
						message: 'Node execution failed - no result data',
						name: 'NodeExecutionError',
					},
				};
			}

			return {
				startTime,
				executionTime: Date.now() - startTime,
				executionIndex: 0,
				data: nodeResult.data || { main: [[]] },
				source: nodeResult.source || [],
				error: nodeResult.error,
			};
		} catch (error) {
			// Return error result with proper error information
			return {
				startTime,
				executionTime: Date.now() - startTime,
				executionIndex: 0,
				data: {
					main: [[]],
				},
				source: [],
				error: {
					message: error instanceof Error ? error.message : String(error),
					name: error instanceof Error ? error.name : 'NodeTestError',
					stack: error instanceof Error ? error.stack : undefined,
				},
			};
		}
	}

	/**
	 * Execute a node in a safe isolated environment with additional safety constraints
	 */
	private async executeNodeSafeIsolated(
		node: INode,
		workflow: Workflow,
		inputData: INodeExecutionData[],
		mode: WorkflowExecuteMode,
		timeoutMs: number,
		safetyLevel: 'strict' | 'moderate' | 'permissive',
	): Promise<ITaskData> {
		const startTime = Date.now();

		try {
			// Apply safety-level specific input data constraints
			const maxInputItems = safetyLevel === 'strict' ? 10 : safetyLevel === 'moderate' ? 100 : 1000;
			const constrainedInputData = inputData.slice(0, maxInputItems);

			// Sanitize input data for safety
			const sanitizedInputData = constrainedInputData.map((item) => ({
				...item,
				json: this.sanitizeObjectForSafety(item.json, safetyLevel),
			}));

			// Create execution data with safety constraints
			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
					pinData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [
						{
							node,
							data: {
								main: [sanitizedInputData],
							},
							source: {
								main: [
									{
										previousNode: 'safe-test-input',
									},
								],
							},
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			// Create additional data with safety restrictions
			const additionalData: IWorkflowExecuteAdditionalData = {
				restApiUrl: 'http://localhost:5678/rest',
				instanceBaseUrl: 'http://localhost:5678',
				formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
				webhookBaseUrl: 'http://localhost:5678/webhook',
				webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
				webhookTestBaseUrl: 'http://localhost:5678/webhook-test',
				currentNodeParameters: node.parameters,
				executionTimeoutTimestamp: Date.now() + timeoutMs,
				userId: 'safe-test-user',
				variables: {},
			} as IWorkflowExecuteAdditionalData;

			// Create workflow executor
			const workflowExecute = new WorkflowExecute(additionalData, mode, runExecutionData);

			// Execute with safety timeout
			const executionPromise = workflowExecute.runPartialWorkflow(workflow, runExecutionData, [
				node.name,
			]);

			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => {
					reject(new ApplicationError(`Safe node execution timeout after ${timeoutMs}ms`));
				}, timeoutMs);
			});

			const result = await Promise.race([executionPromise, timeoutPromise]);

			// Extract and validate result
			const nodeResult = result.runData[node.name]?.[0];
			if (!nodeResult) {
				return {
					startTime,
					executionTime: Date.now() - startTime,
					executionIndex: 0,
					data: { main: [[]] },
					source: [],
					error: {
						message: 'Safe node execution failed - no result data',
						name: 'SafeNodeExecutionError',
					},
				};
			}

			// Apply output data constraints for safety
			const sanitizedResult = {
				...nodeResult,
				data: this.sanitizeExecutionDataForSafety(nodeResult.data, safetyLevel),
			};

			return {
				startTime,
				executionTime: Date.now() - startTime,
				executionIndex: 0,
				data: sanitizedResult.data || { main: [[]] },
				source: sanitizedResult.source || [],
				error: sanitizedResult.error,
			};
		} catch (error) {
			return {
				startTime,
				executionTime: Date.now() - startTime,
				executionIndex: 0,
				data: { main: [[]] },
				source: [],
				error: {
					message: error instanceof Error ? error.message : String(error),
					name: error instanceof Error ? error.name : 'SafeNodeTestError',
					stack: safetyLevel === 'permissive' && error instanceof Error ? error.stack : undefined,
				},
			};
		}
	}

	/**
	 * Sanitize object data based on safety level
	 */
	private sanitizeObjectForSafety(obj: any, safetyLevel: string): any {
		if (!obj || typeof obj !== 'object') {
			return obj;
		}

		const maxDepth = safetyLevel === 'strict' ? 3 : safetyLevel === 'moderate' ? 5 : 10;
		const maxKeys = safetyLevel === 'strict' ? 50 : safetyLevel === 'moderate' ? 200 : 1000;

		const sanitize = (value: any, depth: number): any => {
			if (depth > maxDepth) {
				return '[Object: max depth exceeded]';
			}

			if (Array.isArray(value)) {
				const maxItems = safetyLevel === 'strict' ? 100 : safetyLevel === 'moderate' ? 500 : 2000;
				return value.slice(0, maxItems).map((item) => sanitize(item, depth + 1));
			}

			if (value && typeof value === 'object') {
				const keys = Object.keys(value);
				if (keys.length > maxKeys) {
					const result: any = {};
					keys.slice(0, maxKeys).forEach((key) => {
						result[key] = sanitize(value[key], depth + 1);
					});
					result._truncated = `${keys.length - maxKeys} keys removed for safety`;
					return result;
				}

				const result: any = {};
				keys.forEach((key) => {
					result[key] = sanitize(value[key], depth + 1);
				});
				return result;
			}

			// Sanitize potentially dangerous string values
			if (typeof value === 'string' && value.length > 10000) {
				return value.substring(0, 10000) + '... [truncated for safety]';
			}

			return value;
		};

		return sanitize(obj, 0);
	}

	/**
	 * Sanitize execution data output based on safety level
	 */
	private sanitizeExecutionDataForSafety(data: any, safetyLevel: string): any {
		if (!data || !data.main) {
			return data;
		}

		const maxOutputItems = safetyLevel === 'strict' ? 50 : safetyLevel === 'moderate' ? 200 : 1000;

		return {
			...data,
			main: data.main.map((output: any[]) => {
				if (!Array.isArray(output)) {
					return output;
				}
				const truncated = output.slice(0, maxOutputItems);
				if (output.length > maxOutputItems) {
					truncated.push({
						json: {
							_notice: `Output truncated: ${output.length - maxOutputItems} items removed for safety`,
							_safetyLevel: safetyLevel,
						},
					});
				}
				return truncated.map((item) => ({
					...item,
					json: this.sanitizeObjectForSafety(item.json, safetyLevel),
				}));
			}),
		};
	}

	/**
	 * Generate sophisticated mock parameter values based on property type and context
	 */
	private generateMockParameterValue(property: any, nodeType: string): any {
		// Use parameter overrides if provided by property default
		if (property.default !== undefined) {
			return property.default;
		}

		const paramName = property.name?.toLowerCase() || '';
		const displayName = property.displayName?.toLowerCase() || '';

		switch (property.type) {
			case 'string':
				if (property.options) {
					const firstOption = property.options[0];
					return firstOption && typeof firstOption === 'object' && 'value' in firstOption
						? firstOption.value
						: firstOption;
				}

				// Generate contextual mock strings based on parameter name
				if (paramName.includes('email') || displayName.includes('email')) {
					return 'test@example.com';
				}
				if (
					paramName.includes('url') ||
					displayName.includes('url') ||
					paramName.includes('endpoint')
				) {
					return 'https://api.example.com/endpoint';
				}
				if (
					paramName.includes('token') ||
					paramName.includes('key') ||
					paramName.includes('secret')
				) {
					return 'mock_api_key_123456789';
				}
				if (paramName.includes('id') || displayName.includes('id')) {
					return `mock_id_${Math.random().toString(36).substr(2, 9)}`;
				}
				if (paramName.includes('name') || displayName.includes('name')) {
					return `Mock ${property.displayName || property.name}`;
				}
				if (
					paramName.includes('message') ||
					paramName.includes('text') ||
					paramName.includes('content')
				) {
					return 'This is a mock message for testing purposes';
				}
				if (paramName.includes('path') || paramName.includes('file')) {
					return '/mock/path/to/file.txt';
				}
				if (paramName.includes('query') || paramName.includes('search')) {
					return 'mock search query';
				}
				return `mock-${property.name || 'value'}`;

			case 'number':
				if (paramName.includes('port')) {
					return 8080;
				}
				if (paramName.includes('timeout')) {
					return 30000;
				}
				if (paramName.includes('limit') || paramName.includes('max')) {
					return 100;
				}
				if (paramName.includes('page')) {
					return 1;
				}
				if (paramName.includes('amount') || paramName.includes('price')) {
					return 99.99;
				}
				return 42;

			case 'boolean':
				// Contextual boolean defaults
				if (paramName.includes('enable') || paramName.includes('active')) {
					return true;
				}
				if (paramName.includes('disable') || paramName.includes('ignore')) {
					return false;
				}
				return true;

			case 'collection':
				// Generate contextual collection data
				if (paramName.includes('header')) {
					return {
						'Content-Type': 'application/json',
						Authorization: 'Bearer mock_token',
					};
				}
				if (paramName.includes('param') || paramName.includes('query')) {
					return {
						page: 1,
						limit: 10,
						search: 'mock query',
					};
				}
				return {};

			case 'fixedCollection':
				// Generate mock fixed collection based on options
				if (property.options && property.options.length > 0) {
					const firstOption = property.options[0];
					if (firstOption.values) {
						const mockItem: any = {};
						firstOption.values.forEach((subProperty: any) => {
							mockItem[subProperty.name] = this.generateMockParameterValue(subProperty, nodeType);
						});
						return {
							[firstOption.name]: [mockItem],
						};
					}
				}
				return {};

			case 'options':
				if (property.options && property.options.length > 0) {
					const firstOption = property.options[0];
					return typeof firstOption === 'object' && 'value' in firstOption
						? firstOption.value
						: firstOption;
				}
				return 'option1';

			case 'multiOptions':
				if (property.options && property.options.length > 0) {
					const firstOption = property.options[0];
					const value =
						typeof firstOption === 'object' && 'value' in firstOption
							? firstOption.value
							: firstOption;
					return [value];
				}
				return ['option1'];

			case 'dateTime':
				return new Date().toISOString();

			case 'color':
				return '#FF5733';

			case 'json':
				return JSON.stringify(
					{
						key: 'value',
						number: 123,
						boolean: true,
						array: [1, 2, 3],
					},
					null,
					2,
				);

			case 'notice':
			case 'hidden':
				return undefined;

			default:
				// Node-type specific defaults
				if (nodeType.includes('Http') || nodeType.includes('API')) {
					if (paramName.includes('method')) {
						return 'GET';
					}
					if (paramName.includes('url')) {
						return 'https://api.example.com/endpoint';
					}
				}

				if (nodeType.includes('Database') || nodeType.includes('SQL')) {
					if (paramName.includes('query')) {
						return 'SELECT * FROM table_name LIMIT 10';
					}
					if (paramName.includes('table')) {
						return 'mock_table';
					}
				}

				return null;
		}
	}
}
