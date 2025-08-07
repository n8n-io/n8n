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
Object.defineProperty(exports, '__esModule', { value: true });
exports.NodeTestingService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const node_types_1 = require('@/node-types');
const n8n_core_1 = require('n8n-core');
let NodeTestingService = class NodeTestingService {
	constructor(nodeTypes, logger) {
		this.nodeTypes = nodeTypes;
		this.logger = logger;
	}
	async testNode(nodeType, nodeVersion, parameters, inputData, options = {}) {
		const startTime = Date.now();
		const {
			timeoutMs = 30000,
			safetyLevel = 'moderate',
			mockExternalCalls = false,
			validateCredentials = false,
		} = options;
		try {
			const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(nodeType, nodeVersion);
			if (!nodeTypeInstance) {
				throw new n8n_workflow_1.ApplicationError(
					`Node type '${nodeType}' version ${nodeVersion} not found`,
				);
			}
			const validation = await this.validateNodeParameters(nodeType, nodeVersion, parameters);
			if (!validation.valid) {
				const errorMessages = validation.issues
					.filter((issue) => issue.severity === 'error')
					.map((issue) => issue.message);
				throw new n8n_workflow_1.ApplicationError(
					`Parameter validation failed: ${errorMessages.join(', ')}`,
				);
			}
			const testNode = {
				name: 'Test Node',
				typeVersion: nodeVersion,
				type: nodeType,
				position: [0, 0],
				parameters,
				disabled: false,
				id: `test-node-${Date.now()}`,
			};
			const executionResult = await this.executeNodeIsolated(
				testNode,
				nodeTypeInstance,
				inputData,
				timeoutMs,
				safetyLevel,
			);
			return {
				success: !executionResult.error,
				data: executionResult.data,
				error: executionResult.error,
				executionTime: Date.now() - startTime,
				metadata: {
					nodeType,
					nodeVersion,
					inputItemCount: inputData.length,
					outputItemCount: executionResult.data?.main?.[0]?.length || 0,
					isolatedExecution: true,
					mockExecution: mockExternalCalls,
					timeoutMs,
				},
			};
		} catch (error) {
			this.logger.error('Node test failed', {
				nodeType,
				nodeVersion,
				error: error instanceof Error ? error.message : String(error),
			});
			return {
				success: false,
				error: {
					message: error instanceof Error ? error.message : String(error),
					name: error instanceof Error ? error.name : 'NodeTestError',
					stack: error instanceof Error ? error.stack : undefined,
				},
				executionTime: Date.now() - startTime,
				metadata: {
					nodeType,
					nodeVersion,
					inputItemCount: inputData.length,
					outputItemCount: 0,
					isolatedExecution: true,
					mockExecution: mockExternalCalls,
					timeoutMs,
				},
			};
		}
	}
	async validateNodeParameters(nodeType, nodeVersion, parameters) {
		const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(nodeType, nodeVersion);
		if (!nodeTypeInstance) {
			throw new n8n_workflow_1.ApplicationError(
				`Node type '${nodeType}' version ${nodeVersion} not found`,
			);
		}
		const { description } = nodeTypeInstance;
		const result = {
			valid: true,
			issues: [],
			suggestions: [],
		};
		if (!description.properties) {
			return result;
		}
		for (const property of description.properties) {
			const paramValue = parameters[property.name];
			const issues = this.validateProperty(property, paramValue, parameters);
			result.issues.push(...issues);
			if (issues.some((issue) => issue.severity === 'error')) {
				result.valid = false;
			}
			const suggestions = this.generateParameterSuggestions(property, paramValue, nodeType);
			result.suggestions.push(...suggestions);
		}
		const dependencyIssues = this.validateParameterDependencies(description.properties, parameters);
		result.issues.push(...dependencyIssues);
		if (dependencyIssues.some((issue) => issue.severity === 'error')) {
			result.valid = false;
		}
		return result;
	}
	async generateMockData(nodeType, nodeVersion, overrides = {}, inputDataCount = 1) {
		const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(nodeType, nodeVersion);
		if (!nodeTypeInstance) {
			throw new n8n_workflow_1.ApplicationError(
				`Node type '${nodeType}' version ${nodeVersion} not found`,
			);
		}
		const { description } = nodeTypeInstance;
		const mockParameters = {};
		if (description.properties) {
			for (const property of description.properties) {
				if (overrides[property.name] !== undefined) {
					mockParameters[property.name] = overrides[property.name];
					continue;
				}
				mockParameters[property.name] = this.generateMockParameterValue(
					property,
					nodeType,
					description,
				);
			}
		}
		const mockInputData = [];
		for (let i = 0; i < inputDataCount; i++) {
			mockInputData.push(this.generateMockInputData(i, nodeType));
		}
		const credentialData = description.credentials
			? this.generateMockCredentialData(description.credentials, nodeType)
			: undefined;
		return {
			parameters: mockParameters,
			inputData: mockInputData,
			credentialData,
		};
	}
	async executeNodeIsolated(node, nodeType, inputData, timeoutMs, safetyLevel) {
		const startTime = Date.now();
		try {
			const constrainedInputData = this.applySafetyConstraints(inputData, safetyLevel);
			const testWorkflow = new n8n_workflow_1.Workflow({
				id: `test-workflow-${Date.now()}`,
				name: 'Test Workflow',
				nodes: [node],
				connections: {},
				active: false,
				nodeTypes: this.nodeTypes,
				settings: {},
			});
			const runExecutionData = {
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
								main: [constrainedInputData],
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
			const additionalData = {
				restApiUrl: 'http://localhost:5678/rest',
				instanceBaseUrl: 'http://localhost:5678',
				formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
				webhookBaseUrl: 'http://localhost:5678/webhook',
				webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
				webhookTestBaseUrl: 'http://localhost:5678/webhook-test',
				currentNodeParameters: node.parameters,
				executionTimeoutTimestamp: Date.now() + timeoutMs,
				userId: 'test-user',
				variables: {},
			};
			const workflowExecute = new n8n_core_1.WorkflowExecute(
				additionalData,
				'test',
				runExecutionData,
			);
			const executionPromise = workflowExecute.runPartialWorkflow(testWorkflow, runExecutionData, [
				node.name,
			]);
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => {
					reject(
						new n8n_workflow_1.ApplicationError(`Node execution timeout after ${timeoutMs}ms`),
					);
				}, timeoutMs);
			});
			const result = await Promise.race([executionPromise, timeoutPromise]);
			const nodeResult = result.runData[node.name]?.[0];
			if (!nodeResult) {
				return {
					startTime,
					executionTime: Date.now() - startTime,
					executionIndex: 0,
					data: { main: [[]] },
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
			return {
				startTime,
				executionTime: Date.now() - startTime,
				executionIndex: 0,
				data: { main: [[]] },
				source: [],
				error: {
					message: error instanceof Error ? error.message : String(error),
					name: error instanceof Error ? error.name : 'NodeTestError',
					stack: error instanceof Error ? error.stack : undefined,
				},
			};
		}
	}
	validateProperty(property, value, allParameters) {
		const issues = [];
		const fieldName = property.displayName || property.name;
		if (property.required !== false && (value === undefined || value === null || value === '')) {
			issues.push({
				field: property.name,
				message: `Required parameter '${fieldName}' is missing`,
				severity: 'error',
				type: 'required',
			});
			return issues;
		}
		if (value === undefined || value === null) {
			return issues;
		}
		const typeIssue = this.validateParameterType(property, value);
		if (typeIssue) {
			issues.push({
				field: property.name,
				message: typeIssue,
				severity: 'error',
				type: 'type',
			});
		}
		if (property.options && value !== undefined) {
			const validOptions = property.options.map((opt) => opt.value || opt.name);
			if (Array.isArray(value)) {
				const invalidOptions = value.filter((v) => !validOptions.includes(v));
				if (invalidOptions.length > 0) {
					issues.push({
						field: property.name,
						message: `Invalid options for '${fieldName}': ${invalidOptions.join(', ')}. Valid options: ${validOptions.join(', ')}`,
						severity: 'error',
						type: 'options',
					});
				}
			} else {
				if (!validOptions.includes(value)) {
					issues.push({
						field: property.name,
						message: `Invalid value for '${fieldName}': '${value}'. Valid options: ${validOptions.join(', ')}`,
						severity: 'error',
						type: 'options',
					});
				}
			}
		}
		const formatIssue = this.validateParameterFormat(property, value);
		if (formatIssue) {
			issues.push({
				field: property.name,
				message: formatIssue,
				severity: 'warning',
				type: 'format',
			});
		}
		return issues;
	}
	validateParameterType(property, value) {
		const fieldName = property.displayName || property.name;
		const expectedType = property.type;
		const actualType = typeof value;
		switch (expectedType) {
			case 'number':
				if (actualType !== 'number' || isNaN(Number(value))) {
					return `Parameter '${fieldName}' should be a valid number, got ${actualType}`;
				}
				break;
			case 'boolean':
				if (actualType !== 'boolean') {
					return `Parameter '${fieldName}' should be a boolean, got ${actualType}`;
				}
				break;
			case 'string':
				if (actualType !== 'string') {
					return `Parameter '${fieldName}' should be a string, got ${actualType}`;
				}
				break;
			case 'collection':
			case 'fixedCollection':
				if (actualType !== 'object' || Array.isArray(value)) {
					return `Parameter '${fieldName}' should be an object, got ${actualType}`;
				}
				break;
			case 'options':
			case 'multiOptions':
				break;
			case 'json':
				if (typeof value === 'string') {
					try {
						JSON.parse(value);
					} catch {
						return `Parameter '${fieldName}' should be valid JSON`;
					}
				}
				break;
		}
		return null;
	}
	validateParameterFormat(property, value) {
		if (typeof value !== 'string') return null;
		const fieldName = property.displayName || property.name;
		const paramName = property.name?.toLowerCase() || '';
		if (paramName.includes('email') && value) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(value)) {
				return `Parameter '${fieldName}' should be a valid email address`;
			}
		}
		if ((paramName.includes('url') || paramName.includes('endpoint')) && value) {
			try {
				new URL(value);
			} catch {
				return `Parameter '${fieldName}' should be a valid URL`;
			}
		}
		return null;
	}
	validateParameterDependencies(properties, parameters) {
		const issues = [];
		for (const property of properties) {
			if (property.displayOptions) {
				const shouldShow = this.evaluateDisplayCondition(property.displayOptions, parameters);
				const hasValue =
					parameters[property.name] !== undefined && parameters[property.name] !== null;
				if (!shouldShow && hasValue) {
					issues.push({
						field: property.name,
						message: `Parameter '${property.displayName || property.name}' should not be set based on current conditions`,
						severity: 'warning',
						type: 'dependency',
					});
				}
				if (shouldShow && property.required !== false && !hasValue) {
					issues.push({
						field: property.name,
						message: `Parameter '${property.displayName || property.name}' is required based on current conditions`,
						severity: 'error',
						type: 'dependency',
					});
				}
			}
		}
		return issues;
	}
	evaluateDisplayCondition(displayOptions, parameters) {
		if (!displayOptions) return true;
		if (displayOptions.show) {
			for (const [key, values] of Object.entries(displayOptions.show)) {
				const paramValue = parameters[key];
				const requiredValues = Array.isArray(values) ? values : [values];
				if (!requiredValues.includes(paramValue)) {
					return false;
				}
			}
		}
		if (displayOptions.hide) {
			for (const [key, values] of Object.entries(displayOptions.hide)) {
				const paramValue = parameters[key];
				const hiddenValues = Array.isArray(values) ? values : [values];
				if (hiddenValues.includes(paramValue)) {
					return false;
				}
			}
		}
		return true;
	}
	generateParameterSuggestions(property, value, nodeType) {
		const suggestions = [];
		const paramName = property.name?.toLowerCase() || '';
		if (property.type === 'number' && typeof value === 'number') {
			if (paramName.includes('limit') && value > 1000) {
				suggestions.push({
					field: property.name,
					suggestion: 'Consider reducing the limit to improve performance',
					reason: 'Large limits can cause memory issues and slow response times',
				});
			}
			if (paramName.includes('timeout') && value < 5000) {
				suggestions.push({
					field: property.name,
					suggestion: 'Consider increasing timeout for external API calls',
					reason: 'Short timeouts may cause premature failures',
				});
			}
		}
		if (paramName.includes('url') && typeof value === 'string' && value.startsWith('http://')) {
			suggestions.push({
				field: property.name,
				suggestion: 'Consider using HTTPS instead of HTTP',
				reason: 'HTTPS provides better security for data transmission',
			});
		}
		return suggestions;
	}
	generateMockParameterValue(property, nodeType, nodeDescription) {
		if (property.default !== undefined) {
			return property.default;
		}
		return this.generateContextualMockValue(property, nodeType, nodeDescription);
	}
	generateContextualMockValue(property, nodeType, nodeDescription) {
		const paramName = property.name?.toLowerCase() || '';
		const displayName = property.displayName?.toLowerCase() || '';
		const nodeContext = this.inferNodeContext(nodeType, nodeDescription);
		switch (property.type) {
			case 'string':
				return this.generateMockString(paramName, displayName, nodeContext);
			case 'number':
				return this.generateMockNumber(paramName, displayName, nodeContext);
			case 'boolean':
				return this.generateMockBoolean(paramName, displayName);
			case 'collection':
				return this.generateMockCollection(paramName, nodeContext);
			case 'fixedCollection':
				return this.generateMockFixedCollection(property, nodeContext);
			case 'options':
				return this.generateMockOption(property);
			case 'multiOptions':
				return this.generateMockMultiOption(property);
			case 'dateTime':
				return new Date().toISOString();
			case 'json':
				return JSON.stringify(this.generateMockJsonObject(nodeContext), null, 2);
			default:
				return null;
		}
	}
	inferNodeContext(nodeType, description) {
		const name = nodeType.toLowerCase();
		const displayName = description.displayName?.toLowerCase() || '';
		return {
			category: description.group?.[0] || 'unknown',
			isApi: name.includes('api') || name.includes('http') || displayName.includes('api'),
			isDatabase: name.includes('sql') || name.includes('db') || name.includes('database'),
			isEmail: name.includes('email') || name.includes('mail'),
			isFile: name.includes('file') || name.includes('ftp') || name.includes('s3'),
			isTransform: description.group?.includes('transform') || false,
		};
	}
	generateMockString(paramName, displayName, context) {
		if (paramName.includes('email') || displayName.includes('email')) {
			return `test.${context.category}@example.com`;
		}
		if (
			paramName.includes('url') ||
			displayName.includes('url') ||
			paramName.includes('endpoint')
		) {
			if (context.isApi) {
				return `https://api.${context.category}.com/v1/endpoint`;
			}
			return 'https://api.example.com/endpoint';
		}
		if (paramName.includes('token') || paramName.includes('key') || paramName.includes('secret')) {
			return `mock_${paramName}_${Math.random().toString(36).substr(2, 16)}`;
		}
		if (paramName.includes('id') || displayName.includes('id')) {
			return `mock_${context.category}_id_${Math.random().toString(36).substr(2, 9)}`;
		}
		if (context.isDatabase) {
			if (paramName.includes('table')) return 'mock_table';
			if (paramName.includes('query')) return 'SELECT * FROM table_name LIMIT 10';
			if (paramName.includes('database')) return 'mock_database';
		}
		if (context.isFile) {
			if (paramName.includes('path') || paramName.includes('file')) {
				return `/mock/path/to/file.${context.category}`;
			}
		}
		if (paramName.includes('name') || displayName.includes('name')) {
			return `Mock ${property.displayName || property.name}`;
		}
		return `mock-${paramName}-value`;
	}
	generateMockNumber(paramName, displayName, context) {
		if (paramName.includes('port')) return context.isDatabase ? 5432 : 8080;
		if (paramName.includes('timeout')) return context.isApi ? 30000 : 5000;
		if (paramName.includes('limit') || paramName.includes('max'))
			return context.isDatabase ? 1000 : 100;
		if (paramName.includes('page')) return 1;
		if (paramName.includes('amount') || paramName.includes('price')) return 99.99;
		if (paramName.includes('retry') || paramName.includes('attempt')) return 3;
		return 42;
	}
	generateMockBoolean(paramName, displayName) {
		if (paramName.includes('enable') || paramName.includes('active')) return true;
		if (paramName.includes('disable') || paramName.includes('ignore')) return false;
		if (paramName.includes('ssl') || paramName.includes('secure')) return true;
		return true;
	}
	generateMockCollection(paramName, context) {
		if (paramName.includes('header')) {
			return {
				'Content-Type': 'application/json',
				Authorization: 'Bearer mock_token',
				'X-API-Key': 'mock_api_key',
			};
		}
		if (paramName.includes('param') || paramName.includes('query')) {
			return {
				page: 1,
				limit: context.isDatabase ? 1000 : 100,
				search: 'mock query',
			};
		}
		return {};
	}
	generateMockFixedCollection(property, context) {
		if (!property.options || property.options.length === 0) {
			return {};
		}
		const firstOption = property.options[0];
		if (!firstOption.values) {
			return {};
		}
		const mockItem = {};
		for (const subProperty of firstOption.values) {
			mockItem[subProperty.name] = this.generateContextualMockValue(subProperty, '', {
				displayName: '',
				group: [context.category],
			});
		}
		return {
			[firstOption.name]: [mockItem],
		};
	}
	generateMockOption(property) {
		if (!property.options || property.options.length === 0) {
			return 'option1';
		}
		const firstOption = property.options[0];
		return typeof firstOption === 'object' && 'value' in firstOption
			? firstOption.value
			: firstOption;
	}
	generateMockMultiOption(property) {
		if (!property.options || property.options.length === 0) {
			return ['option1'];
		}
		const firstOption = property.options[0];
		const value =
			typeof firstOption === 'object' && 'value' in firstOption ? firstOption.value : firstOption;
		return [value];
	}
	generateMockJsonObject(context) {
		const baseObject = {
			id: Math.floor(Math.random() * 1000),
			name: `Mock ${context.category} object`,
			timestamp: new Date().toISOString(),
			active: true,
		};
		if (context.isApi) {
			return {
				...baseObject,
				endpoint: '/api/v1/resource',
				method: 'GET',
				status: 200,
			};
		}
		if (context.isDatabase) {
			return {
				...baseObject,
				table: 'mock_table',
				query: 'SELECT * FROM table_name',
				rows: 10,
			};
		}
		return baseObject;
	}
	generateMockInputData(index, nodeType) {
		const context = this.inferNodeContext(nodeType, {
			displayName: nodeType,
		});
		return {
			json: {
				id: index + 1,
				name: `Mock Item ${index + 1}`,
				value: `mock-value-${index + 1}`,
				timestamp: new Date().toISOString(),
				data: this.generateMockJsonObject(context),
				index,
			},
		};
	}
	generateMockCredentialData(credentials, nodeType) {
		const mockCredentials = {};
		for (const credential of credentials) {
			const credType = credential.name;
			if (credType.includes('oauth') || credType.includes('OAuth')) {
				mockCredentials[credType] = {
					clientId: 'mock_client_id',
					clientSecret: 'mock_client_secret',
					accessToken: 'mock_access_token',
					refreshToken: 'mock_refresh_token',
				};
			} else if (credType.includes('api') || credType.includes('Api')) {
				mockCredentials[credType] = {
					apiKey: 'mock_api_key',
					endpoint: 'https://api.example.com',
				};
			} else if (credType.includes('basic') || credType.includes('Basic')) {
				mockCredentials[credType] = {
					username: 'mock_user',
					password: 'mock_password',
				};
			} else {
				mockCredentials[credType] = {
					token: 'mock_token',
				};
			}
		}
		return mockCredentials;
	}
	applySafetyConstraints(inputData, safetyLevel) {
		const maxInputItems = safetyLevel === 'strict' ? 10 : safetyLevel === 'moderate' ? 100 : 1000;
		const constrainedData = inputData.slice(0, maxInputItems);
		return constrainedData.map((item) => ({
			...item,
			json: this.sanitizeObjectForSafety(item.json, safetyLevel),
			binary: item.binary,
		}));
	}
	sanitizeObjectForSafety(obj, safetyLevel) {
		if (!obj || typeof obj !== 'object') {
			return obj;
		}
		const maxDepth = safetyLevel === 'strict' ? 3 : safetyLevel === 'moderate' ? 5 : 10;
		const maxKeys = safetyLevel === 'strict' ? 50 : safetyLevel === 'moderate' ? 200 : 1000;
		const sanitize = (value, depth) => {
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
					const result = {};
					keys.slice(0, maxKeys).forEach((key) => {
						result[key] = sanitize(value[key], depth + 1);
					});
					result._truncated = `${keys.length - maxKeys} keys removed for safety`;
					return result;
				}
				const result = {};
				keys.forEach((key) => {
					result[key] = sanitize(value[key], depth + 1);
				});
				return result;
			}
			if (typeof value === 'string' && value.length > 10000) {
				return value.substring(0, 10000) + '... [truncated for safety]';
			}
			return value;
		};
		return sanitize(obj, 0);
	}
};
exports.NodeTestingService = NodeTestingService;
exports.NodeTestingService = NodeTestingService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [node_types_1.NodeTypes, backend_common_1.Logger]),
	],
	NodeTestingService,
);
//# sourceMappingURL=node-testing.service.js.map
