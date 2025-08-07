'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.NodeTypesController = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const decorators_1 = require('@n8n/decorators');
const promises_1 = require('fs/promises');
const get_1 = __importDefault(require('lodash/get'));
const n8n_workflow_1 = require('n8n-workflow');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const node_types_1 = require('@/node-types');
const node_testing_service_1 = require('@/services/node-testing.service');
const ai_helpers_service_1 = require('@/services/ai-helpers.service');
let NodeTypesController = class NodeTypesController {
	constructor(nodeTypes, globalConfig, logger, nodeTestingService, aiHelpersService) {
		this.nodeTypes = nodeTypes;
		this.globalConfig = globalConfig;
		this.logger = logger;
		this.nodeTestingService = nodeTestingService;
		this.aiHelpersService = aiHelpersService;
	}
	async getNodeInfo(req) {
		const nodeInfos = (0, get_1.default)(req, 'body.nodeInfos', []);
		const defaultLocale = this.globalConfig.defaultLocale;
		if (defaultLocale === 'en') {
			return nodeInfos.reduce((acc, { name, version }) => {
				const { description } = this.nodeTypes.getByNameAndVersion(name, version);
				acc.push(description);
				return acc;
			}, []);
		}
		const populateTranslation = async (name, version, nodeTypes) => {
			const { description, sourcePath } = this.nodeTypes.getWithSourcePath(name, version);
			const translationPath = await this.nodeTypes.getNodeTranslationPath({
				nodeSourcePath: sourcePath,
				longNodeType: description.name,
				locale: defaultLocale,
			});
			try {
				const translation = await (0, promises_1.readFile)(translationPath, 'utf8');
				description.translation = JSON.parse(translation);
			} catch {}
			nodeTypes.push(description);
		};
		const nodeTypes = [];
		const promises = nodeInfos.map(
			async ({ name, version }) => await populateTranslation(name, version, nodeTypes),
		);
		await Promise.all(promises);
		return nodeTypes;
	}
	async testNode(req) {
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
			throw new bad_request_error_1.BadRequestError('Node type is required');
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
				},
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
			if (
				error instanceof n8n_workflow_1.ApplicationError ||
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof not_found_error_1.NotFoundError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Node test failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async generateMockData(req) {
		const { nodeType, nodeVersion = 1, parameterOverrides = {}, inputDataCount = 1 } = req.body;
		if (!nodeType) {
			throw new bad_request_error_1.BadRequestError('Node type is required');
		}
		this.logger.debug('Enhanced mock data generation requested', {
			nodeType,
			nodeVersion,
			userId: req.user.id,
			inputDataCount,
			overridesCount: Object.keys(parameterOverrides).length,
		});
		try {
			const mockDataResult = await this.nodeTestingService.generateMockData(
				nodeType,
				nodeVersion,
				parameterOverrides,
				inputDataCount,
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
			if (
				error instanceof n8n_workflow_1.ApplicationError ||
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof not_found_error_1.NotFoundError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Mock data generation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async validateNodeParameters(req) {
		const { nodeType, nodeVersion = 1, parameters } = req.body;
		if (!nodeType) {
			throw new bad_request_error_1.BadRequestError('Node type is required');
		}
		if (!parameters || typeof parameters !== 'object') {
			throw new bad_request_error_1.BadRequestError('Parameters object is required');
		}
		this.logger.debug('Enhanced node parameter validation requested', {
			nodeType,
			nodeVersion,
			userId: req.user.id,
			parametersCount: Object.keys(parameters).length,
		});
		try {
			const validationResult = await this.nodeTestingService.validateNodeParameters(
				nodeType,
				nodeVersion,
				parameters,
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
			if (
				error instanceof n8n_workflow_1.ApplicationError ||
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof not_found_error_1.NotFoundError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Parameter validation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async testNodeSafe(req) {
		const {
			nodeType,
			nodeVersion = 1,
			parameters = {},
			inputData = [],
			safetyLevel = 'moderate',
			timeoutMs = 30000,
		} = req.body;
		if (!nodeType) {
			throw new bad_request_error_1.BadRequestError('Node type is required');
		}
		const maxTimeout =
			safetyLevel === 'strict' ? 10000 : safetyLevel === 'moderate' ? 30000 : 60000;
		const effectiveTimeout = Math.min(timeoutMs, maxTimeout);
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
			throw new bad_request_error_1.BadRequestError(
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
			const result = await this.nodeTestingService.testNode(
				nodeType,
				nodeVersion,
				parameters,
				inputData,
				{
					timeoutMs: effectiveTimeout,
					safetyLevel,
					mockExternalCalls: true,
					validateCredentials: false,
				},
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
			if (
				error instanceof n8n_workflow_1.ApplicationError ||
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof not_found_error_1.NotFoundError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Safe node test failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async batchTestNodes(req) {
		const { tests, parallel = false, continueOnError = true } = req.body;
		if (!tests || !Array.isArray(tests) || tests.length === 0) {
			throw new bad_request_error_1.BadRequestError(
				'Tests array is required and must not be empty',
			);
		}
		if (tests.length > 10) {
			throw new bad_request_error_1.BadRequestError('Maximum 10 tests allowed per batch');
		}
		this.logger.debug('Batch node testing requested', {
			testsCount: tests.length,
			userId: req.user.id,
			parallel,
			continueOnError,
		});
		const results = [];
		const executeTest = async (test, index) => {
			const startTime = Date.now();
			try {
				const testReq = {
					...req,
					body: {
						nodeType: test.nodeType,
						nodeVersion: test.nodeVersion || 1,
						parameters: test.parameters || {},
						inputData: test.inputData || [],
					},
				};
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
				for (let i = 0; i < tests.length; i++) {
					const result = await executeTest(tests[i], i);
					results.push(result);
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
			if (
				error instanceof n8n_workflow_1.ApplicationError ||
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof not_found_error_1.NotFoundError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Batch testing failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async autoMapParameters(req) {
		const { sourceNodeId, targetNodeId, workflowData } = req.body;
		if (!sourceNodeId || !targetNodeId || !workflowData?.nodes) {
			throw new bad_request_error_1.BadRequestError(
				'sourceNodeId, targetNodeId, and workflow data are required',
			);
		}
		this.logger.debug('AI parameter mapping requested', {
			userId: req.user.id,
			sourceNodeId,
			targetNodeId,
		});
		try {
			const mapping = await this.aiHelpersService.mapParameters(
				sourceNodeId,
				targetNodeId,
				workflowData,
				req.user,
			);
			return {
				success: true,
				mapping,
				metadata: {
					sourceNodeId,
					targetNodeId,
					mappedAt: new Date().toISOString(),
				},
			};
		} catch (error) {
			this.logger.error('Failed to generate parameter mapping', {
				userId: req.user.id,
				sourceNodeId,
				targetNodeId,
				error: error instanceof Error ? error.message : String(error),
			});
			if (
				error instanceof n8n_workflow_1.ApplicationError ||
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof not_found_error_1.NotFoundError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Parameter mapping failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
};
exports.NodeTypesController = NodeTypesController;
__decorate(
	[
		(0, decorators_1.Post)('/'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	NodeTypesController.prototype,
	'getNodeInfo',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/test'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	NodeTypesController.prototype,
	'testNode',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/generate-mock-data'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	NodeTypesController.prototype,
	'generateMockData',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/validate-parameters'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	NodeTypesController.prototype,
	'validateNodeParameters',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/test-safe'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	NodeTypesController.prototype,
	'testNodeSafe',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/batch-test'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	NodeTypesController.prototype,
	'batchTestNodes',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/auto-map-parameters'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	NodeTypesController.prototype,
	'autoMapParameters',
	null,
);
exports.NodeTypesController = NodeTypesController = __decorate(
	[
		(0, decorators_1.RestController)('/node-types'),
		__metadata('design:paramtypes', [
			node_types_1.NodeTypes,
			config_1.GlobalConfig,
			backend_common_1.Logger,
			node_testing_service_1.NodeTestingService,
			ai_helpers_service_1.AiHelpersService,
		]),
	],
	NodeTypesController,
);
//# sourceMappingURL=node-types.controller.js.map
