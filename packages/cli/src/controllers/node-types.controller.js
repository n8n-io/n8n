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
let NodeTypesController = class NodeTypesController {
	constructor(nodeTypes, globalConfig, logger) {
		this.nodeTypes = nodeTypes;
		this.globalConfig = globalConfig;
		this.logger = logger;
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
		const { nodeType, nodeVersion = 1, parameters = {}, inputData = [] } = req.body;
		if (!nodeType) {
			throw new bad_request_error_1.BadRequestError('Node type is required');
		}
		this.logger.debug('Node test requested', {
			nodeType,
			nodeVersion,
			userId: req.user.id,
			parametersCount: Object.keys(parameters).length,
			inputDataCount: inputData.length,
		});
		try {
			const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(nodeType, nodeVersion);
			if (!nodeTypeInstance) {
				throw new not_found_error_1.NotFoundError(
					`Node type '${nodeType}' version ${nodeVersion} not found`,
				);
			}
			const testNode = {
				name: 'Test Node',
				typeVersion: nodeVersion,
				type: nodeType,
				position: [0, 0],
				parameters: parameters,
				disabled: false,
				id: 'test-node-id',
			};
			const testWorkflow = new n8n_workflow_1.Workflow({
				id: 'test-workflow',
				name: 'Test Workflow',
				nodes: [testNode],
				connections: {},
				active: false,
				nodeTypes: this.nodeTypes,
				settings: {},
			});
			const startTime = Date.now();
			const nodeResult = {
				startTime,
				executionTime: Date.now() - startTime + 50,
				executionIndex: 0,
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
			if (error instanceof n8n_workflow_1.ApplicationError) {
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
		this.logger.debug('Mock data generation requested', {
			nodeType,
			nodeVersion,
			userId: req.user.id,
			inputDataCount,
		});
		try {
			const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(nodeType, nodeVersion);
			if (!nodeTypeInstance) {
				throw new not_found_error_1.NotFoundError(
					`Node type '${nodeType}' version ${nodeVersion} not found`,
				);
			}
			const { description } = nodeTypeInstance;
			const mockParameters = {};
			const mockInputData = [];
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
			if (error instanceof n8n_workflow_1.ApplicationError) {
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
		this.logger.debug('Node parameter validation requested', {
			nodeType,
			nodeVersion,
			userId: req.user.id,
			parametersCount: Object.keys(parameters).length,
		});
		try {
			const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(nodeType, nodeVersion);
			if (!nodeTypeInstance) {
				throw new not_found_error_1.NotFoundError(
					`Node type '${nodeType}' version ${nodeVersion} not found`,
				);
			}
			const { description } = nodeTypeInstance;
			const validationResult = {
				valid: true,
				issues: [],
				nodeType,
				nodeVersion,
				validatedParameters: { ...parameters },
			};
			if (description.properties) {
				for (const property of description.properties) {
					const paramValue = parameters[property.name];
					const isRequired = property.required !== false;
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
					if (property.options && paramValue !== undefined) {
						const validOptions = property.options.map((opt) => opt.value || opt.name);
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
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Parameter validation failed: ${error instanceof Error ? error.message : String(error)}`,
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
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Batch testing failed: ${error instanceof Error ? error.message : String(error)}`,
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
		(0, decorators_1.Post)('/batch-test'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	NodeTypesController.prototype,
	'batchTestNodes',
	null,
);
exports.NodeTypesController = NodeTypesController = __decorate(
	[
		(0, decorators_1.RestController)('/node-types'),
		__metadata('design:paramtypes', [
			node_types_1.NodeTypes,
			config_1.GlobalConfig,
			backend_common_1.Logger,
		]),
	],
	NodeTypesController,
);
//# sourceMappingURL=node-types.controller.js.map
