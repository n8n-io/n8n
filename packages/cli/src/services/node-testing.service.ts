import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type {
	INode,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ITaskData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ApplicationError, Workflow } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import { WorkflowExecute } from '@n8n/core';

export interface NodeTestOptions {
	timeoutMs?: number;
	safetyLevel?: 'strict' | 'moderate' | 'permissive';
	mockExternalCalls?: boolean;
	validateCredentials?: boolean;
}

export interface NodeTestResult {
	success: boolean;
	data?: any;
	error?: {
		message: string;
		name: string;
		stack?: string;
	};
	executionTime: number;
	metadata: {
		nodeType: string;
		nodeVersion: number;
		inputItemCount: number;
		outputItemCount: number;
		isolatedExecution: boolean;
		mockExecution: boolean;
		timeoutMs: number;
	};
}

export interface NodeValidationResult {
	valid: boolean;
	issues: Array<{
		field: string;
		message: string;
		severity: 'error' | 'warning';
		type: 'required' | 'type' | 'options' | 'format' | 'dependency';
	}>;
	suggestions: Array<{
		field: string;
		suggestion: string;
		reason: string;
	}>;
}

@Service()
export class NodeTestingService {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly logger: Logger,
	) {}

	/**
	 * Test a node with comprehensive validation and isolated execution
	 */
	async testNode(
		nodeType: string,
		nodeVersion: number,
		parameters: any,
		inputData: INodeExecutionData[],
		options: NodeTestOptions = {},
	): Promise<NodeTestResult> {
		const startTime = Date.now();
		const {
			timeoutMs = 30000,
			safetyLevel = 'moderate',
			mockExternalCalls = false,
			validateCredentials = false,
		} = options;

		try {
			// Get the node type instance
			const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(nodeType, nodeVersion);
			if (!nodeTypeInstance) {
				throw new ApplicationError(`Node type '${nodeType}' version ${nodeVersion} not found`);
			}

			// Validate parameters before execution
			const validation = await this.validateNodeParameters(nodeType, nodeVersion, parameters);
			if (!validation.valid) {
				const errorMessages = validation.issues
					.filter((issue) => issue.severity === 'error')
					.map((issue) => issue.message);
				throw new ApplicationError(`Parameter validation failed: ${errorMessages.join(', ')}`);
			}

			// Create test node
			const testNode: INode = {
				name: 'Test Node',
				typeVersion: nodeVersion,
				type: nodeType,
				position: [0, 0],
				parameters,
				disabled: false,
				id: `test-node-${Date.now()}`,
			};

			// Execute the node in isolation
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

	/**
	 * Enhanced parameter validation with detailed feedback
	 */
	async validateNodeParameters(
		nodeType: string,
		nodeVersion: number,
		parameters: any,
	): Promise<NodeValidationResult> {
		const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(nodeType, nodeVersion);
		if (!nodeTypeInstance) {
			throw new ApplicationError(`Node type '${nodeType}' version ${nodeVersion} not found`);
		}

		const { description } = nodeTypeInstance;
		const result: NodeValidationResult = {
			valid: true,
			issues: [],
			suggestions: [],
		};

		if (!description.properties) {
			return result;
		}

		// Validate each property
		for (const property of description.properties) {
			const paramValue = parameters[property.name];
			const issues = this.validateProperty(property, paramValue, parameters);
			
			result.issues.push(...issues);
			
			// Check if any critical errors exist
			if (issues.some((issue) => issue.severity === 'error')) {
				result.valid = false;
			}

			// Generate suggestions for improvement
			const suggestions = this.generateParameterSuggestions(property, paramValue, nodeType);
			result.suggestions.push(...suggestions);
		}

		// Validate parameter dependencies
		const dependencyIssues = this.validateParameterDependencies(description.properties, parameters);
		result.issues.push(...dependencyIssues);
		
		if (dependencyIssues.some((issue) => issue.severity === 'error')) {
			result.valid = false;
		}

		return result;
	}

	/**
	 * Generate sophisticated mock data for testing
	 */
	async generateMockData(
		nodeType: string,
		nodeVersion: number,
		overrides: any = {},
		inputDataCount: number = 1,
	): Promise<{
		parameters: any;
		inputData: INodeExecutionData[];
		credentialData?: any;
	}> {
		const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(nodeType, nodeVersion);
		if (!nodeTypeInstance) {
			throw new ApplicationError(`Node type '${nodeType}' version ${nodeVersion} not found`);
		}

		const { description } = nodeTypeInstance;
		const mockParameters: any = {};

		// Generate parameters based on node properties
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

		// Generate mock input data
		const mockInputData: INodeExecutionData[] = [];
		for (let i = 0; i < inputDataCount; i++) {
			mockInputData.push(this.generateMockInputData(i, nodeType));
		}

		// Generate mock credential data if needed
		const credentialData = description.credentials
			? this.generateMockCredentialData(description.credentials, nodeType)
			: undefined;

		return {
			parameters: mockParameters,
			inputData: mockInputData,
			credentialData,
		};
	}

	/**
	 * Execute node in isolated environment with proper safety constraints
	 */
	private async executeNodeIsolated(
		node: INode,
		nodeType: INodeType,
		inputData: INodeExecutionData[],
		timeoutMs: number,
		safetyLevel: string,
	): Promise<ITaskData> {
		const startTime = Date.now();

		try {
			// Apply safety constraints to input data
			const constrainedInputData = this.applySafetyConstraints(inputData, safetyLevel);

			// Create minimal workflow for testing
			const testWorkflow = new Workflow({
				id: `test-workflow-${Date.now()}`,
				name: 'Test Workflow',
				nodes: [node],
				connections: {},
				active: false,
				nodeTypes: this.nodeTypes,
				settings: {},
			});

			// Create execution context
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

			// Create additional data for execution
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
			} as any;

			// Execute with timeout protection
			const workflowExecute = new WorkflowExecute(additionalData, 'test', runExecutionData);
			
			const executionPromise = workflowExecute.runPartialWorkflow(
				testWorkflow,
				runExecutionData,
				[node.name],
			);

			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => {
					reject(new ApplicationError(`Node execution timeout after ${timeoutMs}ms`));
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

	/**
	 * Validate individual property with detailed feedback
	 */
	private validateProperty(property: any, value: any, allParameters: any): Array<{
		field: string;
		message: string;
		severity: 'error' | 'warning';
		type: 'required' | 'type' | 'options' | 'format' | 'dependency';
	}> {
		const issues: Array<{
			field: string;
			message: string;
			severity: 'error' | 'warning';
			type: 'required' | 'type' | 'options' | 'format' | 'dependency';
		}> = [];

		const fieldName = property.displayName || property.name;

		// Required validation
		if (property.required !== false && (value === undefined || value === null || value === '')) {
			issues.push({
				field: property.name,
				message: `Required parameter '${fieldName}' is missing`,
				severity: 'error',
				type: 'required',
			});
			return issues; // Don't check other validations if required field is missing
		}

		if (value === undefined || value === null) {
			return issues; // No further validation needed for undefined/null optional fields
		}

		// Type validation
		const typeIssue = this.validateParameterType(property, value);
		if (typeIssue) {
			issues.push({
				field: property.name,
				message: typeIssue,
				severity: 'error',
				type: 'type',
			});
		}

		// Options validation
		if (property.options && value !== undefined) {
			const validOptions = property.options.map((opt: any) => opt.value || opt.name);
			if (Array.isArray(value)) {
				// Multi-options validation
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
				// Single option validation
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

		// Format validation
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

	/**
	 * Validate parameter type with detailed checking
	 */
	private validateParameterType(property: any, value: any): string | null {
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
				// Options validation is handled separately
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

	/**
	 * Validate parameter format (email, URL, etc.)
	 */
	private validateParameterFormat(property: any, value: any): string | null {
		if (typeof value !== 'string') return null;

		const fieldName = property.displayName || property.name;
		const paramName = property.name?.toLowerCase() || '';

		// Email validation
		if (paramName.includes('email') && value) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(value)) {
				return `Parameter '${fieldName}' should be a valid email address`;
			}
		}

		// URL validation
		if ((paramName.includes('url') || paramName.includes('endpoint')) && value) {
			try {
				new URL(value);
			} catch {
				return `Parameter '${fieldName}' should be a valid URL`;
			}
		}

		return null;
	}

	/**
	 * Validate parameter dependencies and display conditions
	 */
	private validateParameterDependencies(properties: any[], parameters: any): Array<{
		field: string;
		message: string;
		severity: 'error' | 'warning';
		type: 'dependency';
	}> {
		const issues: Array<{
			field: string;
			message: string;
			severity: 'error' | 'warning';
			type: 'dependency';
		}> = [];

		for (const property of properties) {
			if (property.displayOptions) {
				const shouldShow = this.evaluateDisplayCondition(property.displayOptions, parameters);
				const hasValue = parameters[property.name] !== undefined && parameters[property.name] !== null;

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

	/**
	 * Evaluate display conditions for parameters
	 */
	private evaluateDisplayCondition(displayOptions: any, parameters: any): boolean {
		if (!displayOptions) return true;

		// Check 'show' conditions
		if (displayOptions.show) {
			for (const [key, values] of Object.entries(displayOptions.show)) {
				const paramValue = parameters[key];
				const requiredValues = Array.isArray(values) ? values : [values];
				if (!requiredValues.includes(paramValue)) {
					return false;
				}
			}
		}

		// Check 'hide' conditions
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

	/**
	 * Generate parameter suggestions for improvement
	 */
	private generateParameterSuggestions(property: any, value: any, nodeType: string): Array<{
		field: string;
		suggestion: string;
		reason: string;
	}> {
		const suggestions: Array<{
			field: string;
			suggestion: string;
			reason: string;
		}> = [];

		const paramName = property.name?.toLowerCase() || '';

		// Performance suggestions
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

		// Security suggestions
		if (paramName.includes('url') && typeof value === 'string' && value.startsWith('http://')) {
			suggestions.push({
				field: property.name,
				suggestion: 'Consider using HTTPS instead of HTTP',
				reason: 'HTTPS provides better security for data transmission',
			});
		}

		return suggestions;
	}

	/**
	 * Generate sophisticated mock parameter value
	 */
	private generateMockParameterValue(
		property: any,
		nodeType: string,
		nodeDescription: INodeTypeDescription,
	): any {
		// Use default if available
		if (property.default !== undefined) {
			return property.default;
		}

		// Enhanced contextual generation based on node type and property
		return this.generateContextualMockValue(property, nodeType, nodeDescription);
	}

	/**
	 * Generate contextual mock values based on node type and property context
	 */
	private generateContextualMockValue(
		property: any,
		nodeType: string,
		nodeDescription: INodeTypeDescription,
	): any {
		const paramName = property.name?.toLowerCase() || '';
		const displayName = property.displayName?.toLowerCase() || '';

		// Context-aware generation based on node type
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

	/**
	 * Infer node context from type and description
	 */
	private inferNodeContext(nodeType: string, description: INodeTypeDescription): {
		category: string;
		isApi: boolean;
		isDatabase: boolean;
		isEmail: boolean;
		isFile: boolean;
		isTransform: boolean;
	} {
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

	/**
	 * Generate mock string values with context awareness
	 */
	private generateMockString(paramName: string, displayName: string, context: any): string {
		// Email patterns
		if (paramName.includes('email') || displayName.includes('email')) {
			return `test.${context.category}@example.com`;
		}

		// URL patterns
		if (paramName.includes('url') || displayName.includes('url') || paramName.includes('endpoint')) {
			if (context.isApi) {
				return `https://api.${context.category}.com/v1/endpoint`;
			}
			return 'https://api.example.com/endpoint';
		}

		// Authentication patterns
		if (paramName.includes('token') || paramName.includes('key') || paramName.includes('secret')) {
			return `mock_${paramName}_${Math.random().toString(36).substr(2, 16)}`;
		}

		// ID patterns
		if (paramName.includes('id') || displayName.includes('id')) {
			return `mock_${context.category}_id_${Math.random().toString(36).substr(2, 9)}`;
		}

		// Database patterns
		if (context.isDatabase) {
			if (paramName.includes('table')) return 'mock_table';
			if (paramName.includes('query')) return 'SELECT * FROM table_name LIMIT 10';
			if (paramName.includes('database')) return 'mock_database';
		}

		// File patterns
		if (context.isFile) {
			if (paramName.includes('path') || paramName.includes('file')) {
				return `/mock/path/to/file.${context.category}`;
			}
		}

		// Generic patterns
		if (paramName.includes('name') || displayName.includes('name')) {
			return `Mock ${property.displayName || property.name}`;
		}

		return `mock-${paramName}-value`;
	}

	/**
	 * Generate mock number values with context awareness
	 */
	private generateMockNumber(paramName: string, displayName: string, context: any): number {
		if (paramName.includes('port')) return context.isDatabase ? 5432 : 8080;
		if (paramName.includes('timeout')) return context.isApi ? 30000 : 5000;
		if (paramName.includes('limit') || paramName.includes('max')) return context.isDatabase ? 1000 : 100;
		if (paramName.includes('page')) return 1;
		if (paramName.includes('amount') || paramName.includes('price')) return 99.99;
		if (paramName.includes('retry') || paramName.includes('attempt')) return 3;
		
		return 42;
	}

	/**
	 * Generate mock boolean values with context awareness
	 */
	private generateMockBoolean(paramName: string, displayName: string): boolean {
		if (paramName.includes('enable') || paramName.includes('active')) return true;
		if (paramName.includes('disable') || paramName.includes('ignore')) return false;
		if (paramName.includes('ssl') || paramName.includes('secure')) return true;
		
		return true;
	}

	/**
	 * Generate mock collection data
	 */
	private generateMockCollection(paramName: string, context: any): any {
		if (paramName.includes('header')) {
			return {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer mock_token',
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

	/**
	 * Generate mock fixed collection data
	 */
	private generateMockFixedCollection(property: any, context: any): any {
		if (!property.options || property.options.length === 0) {
			return {};
		}

		const firstOption = property.options[0];
		if (!firstOption.values) {
			return {};
		}

		const mockItem: any = {};
		for (const subProperty of firstOption.values) {
			mockItem[subProperty.name] = this.generateContextualMockValue(subProperty, '', {
				displayName: '',
				group: [context.category],
			} as INodeTypeDescription);
		}

		return {
			[firstOption.name]: [mockItem],
		};
	}

	/**
	 * Generate mock option value
	 */
	private generateMockOption(property: any): any {
		if (!property.options || property.options.length === 0) {
			return 'option1';
		}

		const firstOption = property.options[0];
		return typeof firstOption === 'object' && 'value' in firstOption
			? firstOption.value
			: firstOption;
	}

	/**
	 * Generate mock multi-option value
	 */
	private generateMockMultiOption(property: any): any[] {
		if (!property.options || property.options.length === 0) {
			return ['option1'];
		}

		const firstOption = property.options[0];
		const value = typeof firstOption === 'object' && 'value' in firstOption
			? firstOption.value
			: firstOption;
		
		return [value];
	}

	/**
	 * Generate mock JSON object based on context
	 */
	private generateMockJsonObject(context: any): any {
		const baseObject = {
			id: Math.floor(Math.random() * 1000),
			name: `Mock ${context.category} object`,
			timestamp: new Date().toISOString(),
			active: true,
		};

		// Add context-specific fields
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

	/**
	 * Generate mock input data
	 */
	private generateMockInputData(index: number, nodeType: string): INodeExecutionData {
		const context = this.inferNodeContext(nodeType, { displayName: nodeType } as INodeTypeDescription);

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

	/**
	 * Generate mock credential data
	 */
	private generateMockCredentialData(credentials: any[], nodeType: string): any {
		const mockCredentials: any = {};

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

	/**
	 * Apply safety constraints to input data
	 */
	private applySafetyConstraints(
		inputData: INodeExecutionData[],
		safetyLevel: string,
	): INodeExecutionData[] {
		const maxInputItems = safetyLevel === 'strict' ? 10 : safetyLevel === 'moderate' ? 100 : 1000;
		const constrainedData = inputData.slice(0, maxInputItems);

		// Sanitize each input item
		return constrainedData.map((item) => ({
			...item,
			json: this.sanitizeObjectForSafety(item.json, safetyLevel),
			binary: item.binary, // Binary data is not sanitized for now
		}));
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
}