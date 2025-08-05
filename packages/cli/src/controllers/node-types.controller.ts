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
import { NodeTestingService } from '@/services/node-testing.service';

@RestController('/node-types')
export class NodeTypesController {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly nodeTestingService: NodeTestingService,
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
				timeoutMs?: number;
				safetyLevel?: 'strict' | 'moderate' | 'permissive';
				mockExternalCalls?: boolean;
				validateCredentials?: boolean;
			}
		>,
	) {
		const { 
			nodeType, 
			nodeVersion = 1, 
			parameters = {}, 
			inputData = [],
			timeoutMs = 30000,
			safetyLevel = 'moderate',
			mockExternalCalls = false,
			validateCredentials = false,
		} = req.body;

		if (!nodeType) {
			throw new BadRequestError('Node type is required');
		}

		this.logger.debug('Enhanced node test requested', {
			nodeType,
			nodeVersion,
			userId: req.user.id,
			parametersCount: Object.keys(parameters).length,
			inputDataCount: inputData.length,
			safetyLevel,
			timeoutMs,
		});

		try {
			// Use the enhanced NodeTestingService for comprehensive testing
			const result = await this.nodeTestingService.testNode(
				nodeType,
				nodeVersion,
				parameters,
				inputData,
				{
					timeoutMs,
					safetyLevel,
					mockExternalCalls,
					validateCredentials,
				}
			);

			this.logger.debug('Enhanced node test completed', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				success: result.success,
				executionTime: result.executionTime,
				outputItemCount: result.metadata.outputItemCount,
			});

			return {
				success: result.success,
				nodeType,
				nodeVersion,
				parameters,
				result: {
					data: result.data,
					executionTime: result.executionTime,
					error: result.error,
				},
				metadata: {
					...result.metadata,
					executedAt: new Date(),
					executedBy: req.user.id,
					enhancedTesting: true,
				},
			};
		} catch (error) {
			this.logger.error('Enhanced node test failed', {
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

		this.logger.debug('Enhanced mock data generation requested', {
			nodeType,
			nodeVersion,
			userId: req.user.id,
			inputDataCount,
			overridesCount: Object.keys(parameterOverrides).length,
		});

		try {
			// Use the enhanced NodeTestingService for sophisticated mock data generation
			const mockDataResult = await this.nodeTestingService.generateMockData(
				nodeType,
				nodeVersion,
				parameterOverrides,
				inputDataCount
			);

			this.logger.debug('Enhanced mock data generation completed', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				parametersGenerated: Object.keys(mockDataResult.parameters).length,
				inputItemsGenerated: mockDataResult.inputData.length,
				hasCredentialData: !!mockDataResult.credentialData,
			});

			return {
				success: true,
				nodeType,
				nodeVersion,
				mockData: {
					parameters: mockDataResult.parameters,
					inputData: mockDataResult.inputData,
					credentialData: mockDataResult.credentialData,
				},
				metadata: {
					generatedAt: new Date(),
					generatedBy: req.user.id,
					parameterCount: Object.keys(mockDataResult.parameters).length,
					inputDataCount: mockDataResult.inputData.length,
					contextualGeneration: true,
					enhancedMockData: true,
				},
			};
		} catch (error) {
			this.logger.error('Enhanced mock data generation failed', {
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

		this.logger.debug('Enhanced node parameter validation requested', {
			nodeType,
			nodeVersion,
			userId: req.user.id,
			parametersCount: Object.keys(parameters).length,
		});

		try {
			// Use the enhanced NodeTestingService for comprehensive parameter validation
			const validationResult = await this.nodeTestingService.validateNodeParameters(
				nodeType,
				nodeVersion,
				parameters
			);

			this.logger.debug('Enhanced node parameter validation completed', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				valid: validationResult.valid,
				issuesCount: validationResult.issues.length,
				suggestionsCount: validationResult.suggestions.length,
			});

			return {
				...validationResult,
				nodeType,
				nodeVersion,
				validatedParameters: { ...parameters },
				metadata: {
					validatedAt: new Date(),
					validatedBy: req.user.id,
					enhancedValidation: true,
					hasSuggestions: validationResult.suggestions.length > 0,
				},
			};
		} catch (error) {
			this.logger.error('Enhanced node parameter validation failed', {
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
			// Use the NodeTestingService for safe testing with enhanced safety constraints
			const result = await this.nodeTestingService.testNode(
				nodeType,
				nodeVersion,
				parameters,
				inputData,
				{
					timeoutMs: effectiveTimeout,
					safetyLevel,
					mockExternalCalls: true, // Enable mocking for safety
					validateCredentials: false, // Skip credential validation for safety
				}
			);

			this.logger.debug('Safe node test completed', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				success: result.success,
				executionTime: result.executionTime,
				safetyLevel,
			});

			return {
				success: result.success,
				nodeType,
				nodeVersion,
				parameters,
				result: {
					data: result.data,
					executionTime: result.executionTime,
					error: result.error,
				},
				metadata: {
					...result.metadata,
					executedAt: new Date(),
					executedBy: req.user.id,
					safetyLevel,
					timeoutMs: effectiveTimeout,
					enhancedSafeTesting: true,
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

}
