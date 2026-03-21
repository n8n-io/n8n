/**
 * Tests for generate-types.ts
 *
 * Following TDD: These tests are written BEFORE the implementation.
 * Run with: pnpm test generate-types.test.ts
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type * as GenerateTypesModule from '../generate-types/generate-types';

// We'll import these functions once implemented
// For now, we define the expected interfaces and test structure

// =============================================================================
// Type Definitions (Expected interfaces from the implementation)
// =============================================================================

interface ParameterBuilderHint {
	message: string;
	placeholderSupported?: boolean;
}

interface NestedOption {
	name: string;
	value?: string | number | boolean;
	description?: string;
	displayName?: string;
	builderHint?: ParameterBuilderHint;
	values?: NodeProperty[];
	type?: string;
	default?: unknown;
	// Nested options can themselves have options (e.g., options type inside a collection)
	options?: NestedOption[];
}

interface NodeProperty {
	name: string;
	displayName: string;
	type: string;
	description?: string;
	hint?: string;
	builderHint?: ParameterBuilderHint;
	default?: unknown;
	required?: boolean;
	placeholder?: string;
	options?: NestedOption[];
	displayOptions?: {
		show?: Record<string, unknown[]>;
		hide?: Record<string, unknown[]>;
	};
	typeOptions?: Record<string, unknown>;
	noDataExpression?: boolean;
	modes?: Array<{
		name: string;
		displayName?: string;
		type?: string;
	}>;
}

interface NodeTypeDescription {
	name: string;
	displayName: string;
	description?: string;
	group: string[];
	version: number | number[];
	defaultVersion?: number;
	properties: NodeProperty[];
	credentials?: Array<{ name: string; required?: boolean }>;
	inputs: string[] | Array<{ type: string; displayName?: string; required?: boolean }>;
	outputs: string[] | Array<{ type: string; displayName?: string }>;
	subtitle?: string;
	usableAsTool?: boolean;
	hidden?: boolean;
	schemaPath?: string;
	builderHint?: {
		inputs?: Record<
			string,
			{
				required?: boolean;
				displayOptions?: {
					show?: Record<string, unknown[]>;
					hide?: Record<string, unknown[]>;
				};
			}
		>;
	};
}

// =============================================================================
// Mock Data for Testing
// =============================================================================

const mockHttpRequestNode: NodeTypeDescription = {
	name: 'n8n-nodes-base.httpRequest',
	displayName: 'HTTP Request',
	description: 'Makes HTTP requests and returns the response data',
	group: ['transform'],
	version: [3, 4, 4.1, 4.2],
	defaultVersion: 4.2,
	inputs: ['main'],
	outputs: ['main'],
	credentials: [{ name: 'httpBasicAuth' }, { name: 'httpDigestAuth' }, { name: 'httpHeaderAuth' }],
	properties: [
		{
			displayName: 'Method',
			name: 'method',
			type: 'options',
			options: [
				{ name: 'DELETE', value: 'DELETE' },
				{ name: 'GET', value: 'GET' },
				{ name: 'HEAD', value: 'HEAD' },
				{ name: 'OPTIONS', value: 'OPTIONS' },
				{ name: 'PATCH', value: 'PATCH' },
				{ name: 'POST', value: 'POST' },
				{ name: 'PUT', value: 'PUT' },
			],
			default: 'GET',
			description: 'The HTTP method to use',
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			required: true,
			default: '',
			description: 'The URL to make the request to',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{ name: 'None', value: 'none' },
				{ name: 'Predefined Credential Type', value: 'predefinedCredentialType' },
				{ name: 'Generic Credential Type', value: 'genericCredentialType' },
			],
			default: 'none',
		},
		{
			displayName: 'Send Query Parameters',
			name: 'sendQuery',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Timeout',
			name: 'timeout',
			type: 'number',
			default: 10000,
			description: 'Time in ms to wait for a response',
		},
	],
};

const mockGmailNode: NodeTypeDescription = {
	name: 'n8n-nodes-base.gmail',
	displayName: 'Gmail',
	description: 'Send and receive emails using Gmail',
	group: ['transform'],
	version: [2, 2.1],
	defaultVersion: 2.1,
	inputs: ['main'],
	outputs: ['main'],
	credentials: [{ name: 'gmailOAuth2', required: true }],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			options: [
				{ name: 'Draft', value: 'draft' },
				{ name: 'Label', value: 'label' },
				{ name: 'Message', value: 'message' },
				{ name: 'Thread', value: 'thread' },
			],
			default: 'message',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			displayOptions: { show: { resource: ['message'] } },
			options: [
				{ name: 'Delete', value: 'delete', description: 'Delete a message' },
				{ name: 'Get', value: 'get', description: 'Get a message' },
				{ name: 'Get Many', value: 'getAll', description: 'Get many messages' },
				{ name: 'Reply', value: 'reply', description: 'Reply to a message' },
				{ name: 'Send', value: 'send', description: 'Send an email' },
			],
			default: 'send',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			displayOptions: { show: { resource: ['label'] } },
			options: [
				{ name: 'Create', value: 'create', description: 'Create a label' },
				{ name: 'Delete', value: 'delete', description: 'Delete a label' },
				{ name: 'Get', value: 'get', description: 'Get a label' },
				{ name: 'Get Many', value: 'getAll', description: 'Get many labels' },
			],
			default: 'create',
		},
		{
			displayName: 'To',
			name: 'to',
			type: 'string',
			required: true,
			default: '',
			description: 'Email recipient',
			displayOptions: { show: { resource: ['message'], operation: ['send', 'reply'] } },
		},
		{
			displayName: 'Subject',
			name: 'subject',
			type: 'string',
			required: true,
			default: '',
			description: 'Email subject',
			displayOptions: { show: { resource: ['message'], operation: ['send'] } },
		},
		{
			displayName: 'Message',
			name: 'message',
			type: 'string',
			required: true,
			default: '',
			description: 'Email body (HTML or plain text)',
			displayOptions: { show: { resource: ['message'], operation: ['send', 'reply'] } },
		},
		{
			displayName: 'Message ID',
			name: 'messageId',
			type: 'string',
			required: true,
			default: '',
			description: 'The ID of the message',
			displayOptions: { show: { resource: ['message'], operation: ['get', 'delete', 'reply'] } },
		},
		{
			displayName: 'Label Name',
			name: 'labelName',
			type: 'string',
			required: true,
			default: '',
			description: 'Name of the label to create',
			displayOptions: { show: { resource: ['label'], operation: ['create'] } },
		},
		{
			displayName: 'Label ID',
			name: 'labelId',
			type: 'string',
			required: true,
			default: '',
			description: 'ID of the label',
			displayOptions: { show: { resource: ['label'], operation: ['get', 'delete'] } },
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			displayOptions: { show: { resource: ['message'], operation: ['send'] } },
			options: [
				{
					displayName: 'Append Attribution',
					name: 'appendAttribution',
					type: 'boolean',
					default: true,
					description: 'Whether to append n8n attribution to the email',
				},
				{
					displayName: 'CC',
					name: 'ccList',
					type: 'string',
					default: '',
					description: 'Comma-separated list of CC recipients',
				},
				{
					displayName: 'BCC',
					name: 'bccList',
					type: 'string',
					default: '',
					description: 'Comma-separated list of BCC recipients',
				},
			],
		},
	],
};

const mockTriggerNode: NodeTypeDescription = {
	name: 'n8n-nodes-base.scheduleTrigger',
	displayName: 'Schedule Trigger',
	description: 'Triggers the workflow on a schedule',
	group: ['trigger'],
	version: [1, 1.1, 1.2],
	inputs: [],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Trigger Times',
			name: 'rule',
			type: 'fixedCollection',
			default: {},
			options: [
				{
					displayName: 'Trigger Times',
					name: 'interval',
					values: [
						{
							displayName: 'Mode',
							name: 'mode',
							type: 'options',
							options: [
								{ name: 'Every Minute', value: 'everyMinute' },
								{ name: 'Every Hour', value: 'everyHour' },
								{ name: 'Every Day', value: 'everyDay' },
								{ name: 'Every Week', value: 'everyWeek' },
								{ name: 'Every Month', value: 'everyMonth' },
								{ name: 'Custom', value: 'custom' },
							],
							default: 'everyDay',
						},
						{
							displayName: 'Hour',
							name: 'hour',
							type: 'number',
							default: 0,
							displayOptions: { show: { mode: ['everyDay', 'everyWeek', 'everyMonth'] } },
						},
					],
				},
			],
		},
	],
};

// =============================================================================
// Test Suite
// =============================================================================

describe('generate-types', () => {
	// Import the module - will fail until implemented
	let generateTypes: typeof GenerateTypesModule;

	beforeAll(async () => {
		// Dynamic import to handle module not existing yet
		try {
			generateTypes = await import('../generate-types/generate-types');
		} catch {
			// Module doesn't export functions yet - tests will fail as expected in TDD
		}
	});

	// =========================================================================
	// Property Type Mapping Tests
	// =========================================================================

	describe('mapPropertyType', () => {
		it('should map string type with Expression wrapper', () => {
			const prop: NodeProperty = { name: 'url', displayName: 'URL', type: 'string', default: '' };
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('string | Expression<string> | PlaceholderValue');
		});

		it('should map number type with Expression wrapper', () => {
			const prop: NodeProperty = {
				name: 'timeout',
				displayName: 'Timeout',
				type: 'number',
				default: 10000,
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('number | Expression<number>');
		});

		it('should map boolean type with Expression wrapper', () => {
			const prop: NodeProperty = {
				name: 'enabled',
				displayName: 'Enabled',
				type: 'boolean',
				default: false,
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('boolean | Expression<boolean>');
		});

		it('should map options type to union of literal values', () => {
			const prop: NodeProperty = {
				name: 'method',
				displayName: 'Method',
				type: 'options',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
					{ name: 'PUT', value: 'PUT' },
				],
				default: 'GET',
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe("'GET' | 'POST' | 'PUT' | Expression<string>");
		});

		it('should map multiOptions type to array of union values', () => {
			const prop: NodeProperty = {
				name: 'tags',
				displayName: 'Tags',
				type: 'multiOptions',
				options: [
					{ name: 'Important', value: 'important' },
					{ name: 'Urgent', value: 'urgent' },
					{ name: 'Low', value: 'low' },
				],
				default: [],
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe("Array<'important' | 'urgent' | 'low'>");
		});

		it('should map json type to IDataObject | string | Expression', () => {
			const prop: NodeProperty = {
				name: 'body',
				displayName: 'Body',
				type: 'json',
				default: '{}',
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('IDataObject | string | Expression<string>');
		});

		it('should map resourceLocator type without modes to generic type', () => {
			const prop: NodeProperty = {
				name: 'channel',
				displayName: 'Channel',
				type: 'resourceLocator',
				default: {},
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('{ __rl: true; mode: string; value: string; cachedResultName?: string }');
		});

		it('should map resourceLocator type with specific modes', () => {
			const prop: NodeProperty = {
				name: 'documentId',
				displayName: 'Document',
				type: 'resourceLocator',
				default: {},
				modes: [
					{ name: 'list', displayName: 'From List' },
					{ name: 'url', displayName: 'By URL' },
					{ name: 'id', displayName: 'By ID' },
				],
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe(
				"{ __rl: true; mode: 'list' | 'url' | 'id'; value: string; cachedResultName?: string }",
			);
		});

		it('should map filter type', () => {
			const prop: NodeProperty = {
				name: 'filters',
				displayName: 'Filters',
				type: 'filter',
				default: {},
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('FilterValue');
		});

		it('should map assignmentCollection type', () => {
			const prop: NodeProperty = {
				name: 'assignments',
				displayName: 'Values to Set',
				type: 'assignmentCollection',
				default: {},
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('AssignmentCollectionValue');
		});

		it('should map resourceLocator with modes and loadOptionsDependsOn', () => {
			const prop: NodeProperty = {
				name: 'sheetName',
				displayName: 'Sheet',
				type: 'resourceLocator',
				default: {},
				typeOptions: {
					loadOptionsDependsOn: ['documentId.value'],
				},
				modes: [{ name: 'list' }, { name: 'url' }, { name: 'id' }, { name: 'name' }],
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe(
				"{ __rl: true; mode: 'list' | 'url' | 'id' | 'name'; value: string; cachedResultName?: string }",
			);
		});

		it('should map resourceLocator with loadOptionsDependsOn but no modes', () => {
			const prop: NodeProperty = {
				name: 'sheetName',
				displayName: 'Sheet',
				type: 'resourceLocator',
				default: {},
				typeOptions: {
					loadOptionsDependsOn: ['documentId.value'],
				},
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('{ __rl: true; mode: string; value: string; cachedResultName?: string }');
		});

		it('should map filter type with loadOptionsDependsOn', () => {
			const prop: NodeProperty = {
				name: 'filters',
				displayName: 'Filters',
				type: 'filter',
				default: {},
				typeOptions: {
					loadOptionsDependsOn: ['resource'],
				},
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('FilterValue');
		});

		it('should map assignmentCollection type with loadOptionsDependsOn', () => {
			const prop: NodeProperty = {
				name: 'assignments',
				displayName: 'Values to Set',
				type: 'assignmentCollection',
				default: {},
				typeOptions: {
					loadOptionsDependsOn: ['table'],
				},
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('AssignmentCollectionValue');
		});

		it('should map fixedCollection type to proper nested interface', () => {
			const prop: NodeProperty = {
				name: 'queryParameters',
				displayName: 'Query Parameters',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Parameters',
						name: 'parameters',
						values: [
							{ displayName: 'Name', name: 'name', type: 'string', default: '' },
							{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						],
					},
				],
			};
			const result = generateTypes.mapPropertyType(prop);
			// fixedCollection should generate nested structure
			expect(result).toContain('parameters?:');
			expect(result).toContain('name?:');
			expect(result).toContain('value?:');
		});

		it('should map fixedCollection with multipleValues to array type', () => {
			const prop: NodeProperty = {
				name: 'rule',
				displayName: 'Trigger Rules',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				options: [
					{
						displayName: 'Trigger Interval',
						name: 'interval',
						values: [
							{
								displayName: 'Trigger Interval',
								name: 'field',
								type: 'options',
								options: [
									{ name: 'Seconds', value: 'seconds' },
									{ name: 'Minutes', value: 'minutes' },
									{ name: 'Hours', value: 'hours' },
								],
								default: 'minutes',
							},
							{
								displayName: 'Seconds Between Triggers',
								name: 'secondsInterval',
								type: 'number',
								default: 30,
							},
						],
					},
				],
			};
			const result = generateTypes.mapPropertyType(prop);
			// Should have interval as array since multipleValues is true
			expect(result).toContain('interval?:');
			expect(result).toContain('Array<');
			expect(result).toContain('field?:');
			expect(result).toContain("'seconds'");
			expect(result).toContain("'minutes'");
			expect(result).toContain('secondsInterval?:');
		});

		it('should map collection type without options to Record<string, unknown>', () => {
			const prop: NodeProperty = {
				name: 'options',
				displayName: 'Options',
				type: 'collection',
				default: {},
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('Record<string, unknown>');
		});

		it('should map collection type with nested options to proper nested interface', () => {
			const prop: NodeProperty = {
				name: 'options',
				displayName: 'Options',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'System Message',
						name: 'systemMessage',
						type: 'string',
						default: 'You are a helpful assistant',
						description: 'The message that will be sent to the agent',
					},
					{
						displayName: 'Max Iterations',
						name: 'maxIterations',
						type: 'number',
						default: 10,
						description: 'Maximum number of iterations',
					},
					{
						displayName: 'Return Intermediate Steps',
						name: 'returnIntermediateSteps',
						type: 'boolean',
						default: false,
						description: 'Whether to return intermediate steps',
					},
				],
			};
			const result = generateTypes.mapPropertyType(prop);
			// Should generate nested structure with proper types
			expect(result).toContain('systemMessage?:');
			expect(result).toContain('string | Expression<string> | PlaceholderValue');
			expect(result).toContain('maxIterations?:');
			expect(result).toContain('number | Expression<number>');
			expect(result).toContain('returnIntermediateSteps?:');
			expect(result).toContain('boolean | Expression<boolean>');
		});

		it('should handle options with dynamic loading', () => {
			const prop: NodeProperty = {
				name: 'project',
				displayName: 'Project',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getProjects' },
				default: '',
			};
			const result = generateTypes.mapPropertyType(prop);
			// Dynamic options should fall back to string
			expect(result).toBe('string | Expression<string>');
		});

		it('should include builderHint in nested fixedCollection properties', () => {
			const prop: NodeProperty = {
				name: 'rule',
				displayName: 'Trigger Rules',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				options: [
					{
						displayName: 'Trigger Interval',
						name: 'interval',
						values: [
							{
								displayName: 'Trigger Interval',
								name: 'field',
								type: 'options',
								description: 'Select the interval type',
								builderHint: {
									message: 'You can add multiple intervals to trigger at different times.',
								},
								options: [
									{ name: 'Seconds', value: 'seconds' },
									{ name: 'Minutes', value: 'minutes' },
								],
								default: 'minutes',
							},
						],
					},
				],
			};
			const result = generateTypes.mapPropertyType(prop);
			// Should include @builderHint in the JSDoc for nested property
			expect(result).toContain('@builderHint');
			expect(result).toContain('You can add multiple intervals');
		});

		it('should include builderHint on fixedCollection group level in generated type', () => {
			const prop: NodeProperty = {
				name: 'rule',
				displayName: 'Trigger Rules',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				options: [
					{
						name: 'interval',
						displayName: 'Trigger Interval',
						builderHint: {
							message: 'You can add multiple intervals to trigger at different times.',
						},
						values: [
							{
								name: 'field',
								displayName: 'Field',
								type: 'string',
								default: 'days',
							},
						],
					},
				],
			};
			const result = generateTypes.mapPropertyType(prop);
			// Should include @builderHint in the JSDoc for the group (not just nested property)
			expect(result).toContain('@builderHint You can add multiple intervals');
		});

		// PlaceholderValue tests - string type should include PlaceholderValue, other types should not
		it('should NOT include PlaceholderValue in options type', () => {
			const prop: NodeProperty = {
				name: 'method',
				displayName: 'Method',
				type: 'options',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
				],
				default: 'GET',
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe("'GET' | 'POST' | Expression<string>");
			expect(result).not.toContain('PlaceholderValue');
		});

		it('should NOT include PlaceholderValue in json type', () => {
			const prop: NodeProperty = {
				name: 'body',
				displayName: 'Body',
				type: 'json',
				default: '{}',
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('IDataObject | string | Expression<string>');
			expect(result).not.toContain('PlaceholderValue');
		});

		it('should NOT include PlaceholderValue in dateTime type', () => {
			const prop: NodeProperty = {
				name: 'startDate',
				displayName: 'Start Date',
				type: 'dateTime',
				default: '',
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('string | Expression<string>');
			expect(result).not.toContain('PlaceholderValue');
		});

		it('should NOT include PlaceholderValue in color type', () => {
			const prop: NodeProperty = {
				name: 'backgroundColor',
				displayName: 'Background Color',
				type: 'color',
				default: '#ffffff',
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('string | Expression<string>');
			expect(result).not.toContain('PlaceholderValue');
		});

		it('should NOT include PlaceholderValue in resourceLocator type', () => {
			const prop: NodeProperty = {
				name: 'channel',
				displayName: 'Channel',
				type: 'resourceLocator',
				default: {},
				modes: [{ name: 'list' }, { name: 'id' }],
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toContain('__rl: true');
			expect(result).not.toContain('PlaceholderValue');
		});

		describe('noDataExpression', () => {
			it('should return string without Expression wrapper when noDataExpression is true', () => {
				const prop: NodeProperty = {
					name: 'resource',
					displayName: 'Resource',
					type: 'string',
					default: '',
					noDataExpression: true,
				};
				const result = generateTypes.mapPropertyType(prop);
				expect(result).toBe('string');
				expect(result).not.toContain('Expression');
				expect(result).not.toContain('PlaceholderValue');
			});

			it('should return number without Expression wrapper when noDataExpression is true', () => {
				const prop: NodeProperty = {
					name: 'limit',
					displayName: 'Limit',
					type: 'number',
					default: 10,
					noDataExpression: true,
				};
				const result = generateTypes.mapPropertyType(prop);
				expect(result).toBe('number');
				expect(result).not.toContain('Expression');
			});

			it('should return boolean without Expression wrapper when noDataExpression is true', () => {
				const prop: NodeProperty = {
					name: 'enabled',
					displayName: 'Enabled',
					type: 'boolean',
					default: false,
					noDataExpression: true,
				};
				const result = generateTypes.mapPropertyType(prop);
				expect(result).toBe('boolean');
				expect(result).not.toContain('Expression');
			});

			it('should return options literals without Expression wrapper when noDataExpression is true', () => {
				const prop: NodeProperty = {
					name: 'resource',
					displayName: 'Resource',
					type: 'options',
					options: [
						{ name: 'Contact', value: 'contact' },
						{ name: 'Deal', value: 'deal' },
					],
					default: 'contact',
					noDataExpression: true,
				};
				const result = generateTypes.mapPropertyType(prop);
				expect(result).toBe("'contact' | 'deal'");
				expect(result).not.toContain('Expression');
			});

			it('should return json type without Expression wrapper when noDataExpression is true', () => {
				const prop: NodeProperty = {
					name: 'data',
					displayName: 'Data',
					type: 'json',
					default: '',
					noDataExpression: true,
				};
				const result = generateTypes.mapPropertyType(prop);
				expect(result).toBe('IDataObject | string');
				expect(result).not.toContain('Expression');
			});

			it('should return dateTime without Expression wrapper when noDataExpression is true', () => {
				const prop: NodeProperty = {
					name: 'date',
					displayName: 'Date',
					type: 'dateTime',
					default: '',
					noDataExpression: true,
				};
				const result = generateTypes.mapPropertyType(prop);
				expect(result).toBe('string');
				expect(result).not.toContain('Expression');
			});

			it('should return color without Expression wrapper when noDataExpression is true', () => {
				const prop: NodeProperty = {
					name: 'color',
					displayName: 'Color',
					type: 'color',
					default: '#000000',
					noDataExpression: true,
				};
				const result = generateTypes.mapPropertyType(prop);
				expect(result).toBe('string');
				expect(result).not.toContain('Expression');
			});

			it('should return dynamic options without Expression wrapper when noDataExpression is true', () => {
				const prop: NodeProperty = {
					name: 'field',
					displayName: 'Field',
					type: 'options',
					default: '',
					noDataExpression: true,
					typeOptions: { loadOptionsMethod: 'getFields' },
				};
				const result = generateTypes.mapPropertyType(prop);
				expect(result).toBe('string');
				expect(result).not.toContain('Expression');
			});

			it('should not affect multiOptions (already has no Expression wrapper)', () => {
				const prop: NodeProperty = {
					name: 'tags',
					displayName: 'Tags',
					type: 'multiOptions',
					options: [
						{ name: 'A', value: 'a' },
						{ name: 'B', value: 'b' },
					],
					default: [],
					noDataExpression: true,
				};
				const result = generateTypes.mapPropertyType(prop);
				expect(result).toBe("Array<'a' | 'b'>");
			});

			it('should still include Expression wrapper when noDataExpression is false', () => {
				const prop: NodeProperty = {
					name: 'url',
					displayName: 'URL',
					type: 'string',
					default: '',
					noDataExpression: false,
				};
				const result = generateTypes.mapPropertyType(prop);
				expect(result).toContain('Expression');
			});

			it('should still include Expression wrapper when noDataExpression is undefined', () => {
				const prop: NodeProperty = {
					name: 'url',
					displayName: 'URL',
					type: 'string',
					default: '',
				};
				const result = generateTypes.mapPropertyType(prop);
				expect(result).toContain('Expression');
			});
		});
	});

	// =========================================================================
	// Discriminated Union Generation Tests
	// =========================================================================

	describe('extractDiscriminatorCombinations', () => {
		it('should extract resource/operation combinations from Gmail node', () => {
			const combinations = generateTypes.extractDiscriminatorCombinations(mockGmailNode);

			// Gmail has message and label resources with multiple operations each
			expect(combinations).toContainEqual({ resource: 'message', operation: 'send' });
			expect(combinations).toContainEqual({ resource: 'message', operation: 'get' });
			expect(combinations).toContainEqual({ resource: 'message', operation: 'delete' });
			expect(combinations).toContainEqual({ resource: 'message', operation: 'reply' });
			expect(combinations).toContainEqual({ resource: 'message', operation: 'getAll' });
			expect(combinations).toContainEqual({ resource: 'label', operation: 'create' });
			expect(combinations).toContainEqual({ resource: 'label', operation: 'get' });
			expect(combinations).toContainEqual({ resource: 'label', operation: 'delete' });
			expect(combinations).toContainEqual({ resource: 'label', operation: 'getAll' });
		});

		it('should return empty array for nodes without discriminators', () => {
			const combinations = generateTypes.extractDiscriminatorCombinations(mockHttpRequestNode);
			expect(combinations).toEqual([]);
		});

		it('should NOT split by authentication - treat as regular property', () => {
			// HTTP Request has authentication field but should NOT be split by it
			const nodeWithAuth: NodeTypeDescription = {
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				group: ['transform'],
				version: 4.3,
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Authentication',
						name: 'authentication',
						type: 'options',
						options: [
							{ name: 'None', value: 'none' },
							{ name: 'Predefined Credential Type', value: 'predefinedCredentialType' },
							{ name: 'Generic Credential Type', value: 'genericCredentialType' },
						],
						default: 'none',
					},
					{
						displayName: 'Credential Type',
						name: 'credentialType',
						type: 'options',
						options: [{ name: 'Basic Auth', value: 'httpBasicAuth' }],
						default: 'httpBasicAuth',
						displayOptions: { show: { authentication: ['predefinedCredentialType'] } },
					},
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						required: true,
						default: '',
					},
				],
			};

			const combinations = generateTypes.extractDiscriminatorCombinations(nodeWithAuth);
			// Should NOT create combinations based on authentication
			expect(combinations).toEqual([]);
		});

		it('should NOT split by promptType - treat as regular property', () => {
			const nodeWithPromptType: NodeTypeDescription = {
				name: '@n8n/n8n-nodes-langchain.agent',
				displayName: 'AI Agent',
				group: ['transform'],
				version: 3.1,
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Prompt Type',
						name: 'promptType',
						type: 'options',
						options: [
							{ name: 'Auto', value: 'auto' },
							{ name: 'Define', value: 'define' },
						],
						default: 'auto',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						required: true,
						default: '',
						displayOptions: { show: { promptType: ['define'] } },
					},
				],
			};

			const combinations = generateTypes.extractDiscriminatorCombinations(nodeWithPromptType);
			// Should NOT create combinations based on promptType
			expect(combinations).toEqual([]);
		});

		it('should NOT split by agent - treat as regular property', () => {
			const nodeWithAgent: NodeTypeDescription = {
				name: '@n8n/n8n-nodes-langchain.agent',
				displayName: 'AI Agent',
				group: ['transform'],
				version: 1.5,
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Agent',
						name: 'agent',
						type: 'options',
						options: [
							{ name: 'Conversational Agent', value: 'conversationalAgent' },
							{ name: 'Tools Agent', value: 'toolsAgent' },
						],
						default: 'conversationalAgent',
					},
					{
						displayName: 'Max Iterations',
						name: 'maxIterations',
						type: 'number',
						default: 10,
						displayOptions: { show: { agent: ['toolsAgent'] } },
					},
				],
			};

			const combinations = generateTypes.extractDiscriminatorCombinations(nodeWithAgent);
			// Should NOT create combinations based on agent
			expect(combinations).toEqual([]);
		});

		it('should still split by mode - mode benefits from splitting', () => {
			const nodeWithMode: NodeTypeDescription = {
				name: 'n8n-nodes-base.code',
				displayName: 'Code',
				group: ['transform'],
				version: 2,
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						options: [
							{ name: 'Run Once for All Items', value: 'runOnceForAllItems' },
							{ name: 'Run Once for Each Item', value: 'runOnceForEachItem' },
						],
						default: 'runOnceForAllItems',
					},
					{
						displayName: 'JavaScript Code',
						name: 'jsCode',
						type: 'string',
						default: '',
						displayOptions: { show: { mode: ['runOnceForAllItems', 'runOnceForEachItem'] } },
					},
				],
			};

			const combinations = generateTypes.extractDiscriminatorCombinations(nodeWithMode);
			// Mode SHOULD create combinations
			expect(combinations).toContainEqual({ mode: 'runOnceForAllItems' });
			expect(combinations).toContainEqual({ mode: 'runOnceForEachItem' });
		});

		it('should NOT split by mode when mode has non-version displayOptions', () => {
			// This simulates ChatTrigger where mode has displayOptions: { show: { public: [true] } }
			// When mode is conditionally shown, splitting by mode creates incorrect combinations
			const nodeWithConditionalMode: NodeTypeDescription = {
				name: 'n8n-nodes-langchain.chatTrigger',
				displayName: 'Chat Trigger',
				group: ['trigger'],
				version: 1,
				inputs: [],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						options: [
							{ name: 'Hosted Chat', value: 'hostedChat' },
							{ name: 'Webhook', value: 'webhook' },
						],
						default: 'hostedChat',
						// This is the key difference - mode has displayOptions
						displayOptions: { show: { public: [true] } },
					},
					{
						displayName: 'Some Property',
						name: 'someProperty',
						type: 'string',
						default: '',
						displayOptions: { show: { mode: ['hostedChat'] } },
					},
				],
			};

			const combinations = generateTypes.extractDiscriminatorCombinations(nodeWithConditionalMode);
			// Should NOT create combinations based on mode when mode has displayOptions
			expect(combinations).toEqual([]);
		});

		it('should still split by mode when mode only has @version displayOptions', () => {
			// Version-only displayOptions are fine - version filtering is handled separately
			const nodeWithVersionOnlyMode: NodeTypeDescription = {
				name: 'test.node',
				displayName: 'Test',
				group: ['transform'],
				version: 2,
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						options: [
							{ name: 'Option A', value: 'optionA' },
							{ name: 'Option B', value: 'optionB' },
						],
						default: 'optionA',
						// Only @version in displayOptions - this should be allowed
						displayOptions: { show: { '@version': [{ _cnd: { gte: 2 } }] } },
					},
					{
						displayName: 'Some Property',
						name: 'someProperty',
						type: 'string',
						default: '',
						displayOptions: { show: { mode: ['optionA'] } },
					},
				],
			};

			const combinations = generateTypes.extractDiscriminatorCombinations(nodeWithVersionOnlyMode);
			// Should still split by mode - version displayOptions are allowed
			expect(combinations).toContainEqual({ mode: 'optionA' });
			expect(combinations).toContainEqual({ mode: 'optionB' });
		});
	});

	describe('getPropertiesForCombination', () => {
		it('should return properties applicable to message/send combination', () => {
			const props = generateTypes.getPropertiesForCombination(mockGmailNode, {
				resource: 'message',
				operation: 'send',
			});

			const propNames = props.map((p) => p.name);
			expect(propNames).toContain('to');
			expect(propNames).toContain('subject');
			expect(propNames).toContain('message');
			expect(propNames).toContain('options');
			// Should NOT contain properties for other operations
			expect(propNames).not.toContain('messageId');
			expect(propNames).not.toContain('labelName');
			expect(propNames).not.toContain('labelId');
		});

		it('should return properties applicable to label/create combination', () => {
			const props = generateTypes.getPropertiesForCombination(mockGmailNode, {
				resource: 'label',
				operation: 'create',
			});

			const propNames = props.map((p) => p.name);
			expect(propNames).toContain('labelName');
			// Should NOT contain message properties
			expect(propNames).not.toContain('to');
			expect(propNames).not.toContain('subject');
			expect(propNames).not.toContain('message');
		});
	});

	describe('generateDiscriminatedUnion', () => {
		it('should generate discriminated union types for Gmail node', () => {
			const result = generateTypes.generateDiscriminatedUnion(mockGmailNode);

			// Should contain individual params types
			expect(result).toContain('GmailMessageSendParams');
			expect(result).toContain('GmailMessageGetParams');
			expect(result).toContain('GmailLabelCreateParams');

			// Should contain discriminator fields
			expect(result).toContain("resource: 'message'");
			expect(result).toContain("operation: 'send'");

			// Should NOT contain a union params type (removed - individual node types use configs directly)
			expect(result).not.toContain('GmailV21Params');
		});

		it('should generate simple interface for HTTP Request (no discriminators)', () => {
			const result = generateTypes.generateDiscriminatedUnion(mockHttpRequestNode);

			// Should NOT have discriminated unions
			expect(result).not.toContain('HttpRequestMessageSendParams');

			// Should have a single params interface
			expect(result).toContain('HttpRequestV42Params');

			// Should include authentication as a regular property (not split by it)
			expect(result).toContain('authentication?:');
			expect(result).toContain("'none'");
			expect(result).toContain("'predefinedCredentialType'");
			expect(result).toContain("'genericCredentialType'");
			expect(result).toContain('interface');
		});

		it('should include promptType as a regular property in Agent node config', () => {
			const agentNode: NodeTypeDescription = {
				name: '@n8n/n8n-nodes-langchain.agent',
				displayName: 'AI Agent',
				group: ['transform'],
				version: 3.1,
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Prompt Type',
						name: 'promptType',
						type: 'options',
						options: [
							{ name: 'Auto', value: 'auto' },
							{ name: 'Define', value: 'define' },
						],
						default: 'auto',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Options',
						name: 'options',
						type: 'collection',
						default: {},
						options: [
							{
								displayName: 'System Message',
								name: 'systemMessage',
								type: 'string',
								default: 'You are a helpful assistant',
							},
						],
					},
				],
			};

			const result = generateTypes.generateDiscriminatedUnion(agentNode);

			// Should have a single params interface (not split by promptType)
			expect(result).toContain('LcAgentV31Params');

			// Should include promptType as a regular property with union type
			expect(result).toContain('promptType?:');
			expect(result).toContain("'auto'");
			expect(result).toContain("'define'");

			// Should include options with nested structure (not Record<string, unknown>)
			expect(result).toContain('options?:');
			expect(result).toContain('systemMessage?:');
		});

		it('should merge duplicate collection properties with different options', () => {
			// This test covers the ChatTrigger scenario where multiple 'options' collections
			// with different displayOptions contain different nested options
			const nodeWithDuplicateOptions: NodeTypeDescription = {
				name: 'n8n-nodes-base.chatTrigger',
				displayName: 'Chat Trigger',
				group: ['trigger'],
				version: 1.4,
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Public',
						name: 'public',
						type: 'boolean',
						default: false,
					},
					// First options collection - only for public: false
					{
						displayName: 'Options',
						name: 'options',
						type: 'collection',
						default: {},
						displayOptions: {
							show: { public: [false] },
						},
						options: [
							{
								displayName: 'Allow File Uploads',
								name: 'allowFileUploads',
								type: 'boolean',
								default: false,
							},
							{
								displayName: 'Response Mode',
								name: 'responseMode',
								type: 'options',
								default: 'lastNode',
								options: [
									{ name: 'Last Node', value: 'lastNode' },
									{ name: 'Response Node', value: 'responseNode' },
								],
							},
						],
					},
					// Second options collection - for public: true, contains loadPreviousSession
					{
						displayName: 'Options',
						name: 'options',
						type: 'collection',
						default: {},
						displayOptions: {
							show: { public: [true] },
						},
						options: [
							{
								displayName: 'Load Previous Session',
								name: 'loadPreviousSession',
								type: 'options',
								default: 'notSupported',
								options: [
									{ name: 'Not Supported', value: 'notSupported' },
									{ name: 'From Memory', value: 'memory' },
								],
							},
							{
								displayName: 'Input Placeholder',
								name: 'inputPlaceholder',
								type: 'string',
								default: 'Type your message...',
							},
						],
					},
				],
			};

			const result = generateTypes.generateDiscriminatedUnion(nodeWithDuplicateOptions);

			// Should have options property
			expect(result).toContain('options?:');

			// Should include options from FIRST collection
			expect(result).toContain('allowFileUploads?:');
			expect(result).toContain('responseMode?:');

			// Should ALSO include options from SECOND collection (the merged ones)
			expect(result).toContain('loadPreviousSession?:');
			expect(result).toContain('inputPlaceholder?:');
		});
	});

	// =========================================================================
	// JSDoc Generation Tests
	// =========================================================================

	describe('generatePropertyJSDoc', () => {
		it('should generate JSDoc with description', () => {
			const prop: NodeProperty = {
				name: 'url',
				displayName: 'URL',
				type: 'string',
				description: 'The URL to make the request to',
				default: '',
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			expect(result).toContain('The URL to make the request to');
		});

		it('should include @default annotation', () => {
			const prop: NodeProperty = {
				name: 'timeout',
				displayName: 'Timeout',
				type: 'number',
				description: 'Request timeout',
				default: 10000,
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			expect(result).toContain('@default 10000');
		});

		it('should skip @default annotation for multi-line string defaults', () => {
			const multiLineCSS = `:root {
  /* Colors */
  --chat--color--primary: #e74266;
  --chat--color--secondary: #20b69e;
}`;
			const prop: NodeProperty = {
				name: 'customCss',
				displayName: 'Custom CSS',
				type: 'string',
				description: 'Override default styling',
				default: multiLineCSS,
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			// Should NOT include @default for multi-line strings (they break JSDoc)
			expect(result).not.toContain('@default');
			// But should still have valid JSDoc structure
			expect(result).toContain('/**');
			expect(result).toContain('*/');
			expect(result).toContain('Override default styling');
		});

		it('should include @default for single-line string defaults', () => {
			const prop: NodeProperty = {
				name: 'greeting',
				displayName: 'Greeting',
				type: 'string',
				description: 'Default greeting message',
				default: 'Hello, World!',
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			expect(result).toContain('@default Hello, World!');
		});

		it('should handle undefined description', () => {
			const prop: NodeProperty = {
				name: 'field',
				displayName: 'Field',
				type: 'string',
				default: '',
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			// Should use displayName as fallback or return minimal JSDoc
			expect(result).toBeTruthy();
		});

		it('should escape special characters in JSDoc', () => {
			const prop: NodeProperty = {
				name: 'filter',
				displayName: 'Filter',
				type: 'string',
				description: 'Filter with <html> & special "chars"',
				default: '',
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			// Should escape HTML characters
			expect(result).toContain('&lt;html&gt;');
			// Should have valid JSDoc structure
			expect(result).toContain('/**');
			expect(result).toContain('*/');
		});

		it('should include hint in JSDoc when provided', () => {
			const prop: NodeProperty = {
				name: 'limit',
				displayName: 'Limit',
				type: 'number',
				description: 'Max number of results to return',
				hint: 'If empty, all the records will be returned',
				default: 50,
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			// Should include hint with @hint tag
			expect(result).toContain('@hint If empty, all the records will be returned');
		});

		it('should escape HTML in hint text', () => {
			const prop: NodeProperty = {
				name: 'schema',
				displayName: 'Schema',
				type: 'string',
				description: 'Output schema',
				hint: 'Generate one at <a href="https://example.com">Example</a>',
				default: '',
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			// Should escape HTML in hint
			expect(result).toContain('@hint');
			expect(result).toContain('&lt;a href=');
		});

		it('should include displayOptions.show in JSDoc when provided', () => {
			const prop: NodeProperty = {
				name: 'jsCode',
				displayName: 'JavaScript Code',
				type: 'string',
				description: 'JavaScript code to execute',
				default: '',
				displayOptions: {
					show: {
						language: ['javaScript'],
						mode: ['runOnceForAllItems'],
					},
				},
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			// Should include @displayOptions.show tag with conditions
			expect(result).toContain('@displayOptions.show');
			expect(result).toContain('language: ["javaScript"]');
			expect(result).toContain('mode: ["runOnceForAllItems"]');
		});

		it('should include displayOptions.hide in JSDoc when provided', () => {
			const prop: NodeProperty = {
				name: 'advancedField',
				displayName: 'Advanced Field',
				type: 'string',
				description: 'An advanced field',
				default: '',
				displayOptions: {
					hide: {
						mode: ['simple'],
					},
				},
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			// Should include @displayOptions.hide tag with conditions
			expect(result).toContain('@displayOptions.hide');
			expect(result).toContain('mode: ["simple"]');
		});

		it('should include both show and hide displayOptions when both provided', () => {
			const prop: NodeProperty = {
				name: 'complexField',
				displayName: 'Complex Field',
				type: 'string',
				description: 'A complex conditional field',
				default: '',
				displayOptions: {
					show: {
						resource: ['contact', 'deal'],
					},
					hide: {
						operation: ['delete'],
					},
				},
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			expect(result).toContain('@displayOptions.show');
			expect(result).toContain('resource: ["contact", "deal"]');
			expect(result).toContain('@displayOptions.hide');
			expect(result).toContain('operation: ["delete"]');
		});

		it('should include builderHint in JSDoc when provided', () => {
			const prop: NodeProperty = {
				name: 'interval',
				displayName: 'Trigger Interval',
				type: 'fixedCollection',
				description: 'Configure when the workflow triggers',
				builderHint: {
					message:
						'You can add multiple intervals to trigger at different times. Use Custom (Cron) for more specific scheduling patterns.',
				},
				default: {},
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			// Should include builderHint with @builderHint tag
			expect(result).toContain('@builderHint You can add multiple intervals');
			expect(result).toContain('Use Custom (Cron) for more specific scheduling patterns.');
		});

		it('should escape HTML in builderHint text', () => {
			const prop: NodeProperty = {
				name: 'customCode',
				displayName: 'Custom Code',
				type: 'string',
				description: 'Custom code to execute',
				builderHint: {
					message: 'See <a href="https://docs.example.com">documentation</a> for examples',
				},
				default: '',
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			// Should escape HTML in builderHint
			expect(result).toContain('@builderHint');
			expect(result).toContain('&lt;a href=');
		});
	});

	describe('generateNodeJSDoc', () => {
		it('should generate node-level JSDoc with description', () => {
			const result = generateTypes.generateNodeJSDoc(mockGmailNode);
			expect(result).toContain('Gmail');
			expect(result).toContain('Send and receive emails using Gmail');
		});

		it('should include Node Types label', () => {
			const result = generateTypes.generateNodeJSDoc(mockGmailNode);
			expect(result).toContain('Node Types');
		});
	});

	// =========================================================================
	// Version Handling Tests
	// =========================================================================

	describe('propertyAppliesToVersion', () => {
		it('should return true when property has no displayOptions', () => {
			const prop: NodeProperty = {
				name: 'text',
				displayName: 'Text',
				type: 'string',
				default: '',
			};
			expect(generateTypes.propertyAppliesToVersion(prop, 3.1)).toBe(true);
		});

		it('should return true when property has simple version array and version is included', () => {
			const prop: NodeProperty = {
				name: 'text',
				displayName: 'Text',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						'@version': [3, 3.1],
					},
				},
			};
			expect(generateTypes.propertyAppliesToVersion(prop, 3.1)).toBe(true);
		});

		it('should return false when property has simple version array and version is not included', () => {
			const prop: NodeProperty = {
				name: 'text',
				displayName: 'Text',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						'@version': [3],
					},
				},
			};
			expect(generateTypes.propertyAppliesToVersion(prop, 3.1)).toBe(false);
		});

		it('should handle gte (greater than or equal) version condition', () => {
			const prop: NodeProperty = {
				name: 'promptType',
				displayName: 'Prompt Type',
				type: 'options',
				default: 'auto',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 3.1 } }],
					},
				},
			};
			// Version 3.1 should match gte 3.1
			expect(generateTypes.propertyAppliesToVersion(prop, 3.1)).toBe(true);
			// Version 3.2 should match gte 3.1
			expect(generateTypes.propertyAppliesToVersion(prop, 3.2)).toBe(true);
			// Version 3 should NOT match gte 3.1
			expect(generateTypes.propertyAppliesToVersion(prop, 3)).toBe(false);
		});

		it('should handle lt (less than) version condition', () => {
			const prop: NodeProperty = {
				name: 'promptType',
				displayName: 'Prompt Type',
				type: 'options',
				default: 'auto',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lt: 3.1 } }],
					},
				},
			};
			// Version 3 should match lt 3.1
			expect(generateTypes.propertyAppliesToVersion(prop, 3)).toBe(true);
			// Version 2.5 should match lt 3.1
			expect(generateTypes.propertyAppliesToVersion(prop, 2.5)).toBe(true);
			// Version 3.1 should NOT match lt 3.1
			expect(generateTypes.propertyAppliesToVersion(prop, 3.1)).toBe(false);
			// Version 3.2 should NOT match lt 3.1
			expect(generateTypes.propertyAppliesToVersion(prop, 3.2)).toBe(false);
		});

		it('should handle gt (greater than) version condition', () => {
			const prop: NodeProperty = {
				name: 'newFeature',
				displayName: 'New Feature',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gt: 2 } }],
					},
				},
			};
			expect(generateTypes.propertyAppliesToVersion(prop, 2.1)).toBe(true);
			expect(generateTypes.propertyAppliesToVersion(prop, 3)).toBe(true);
			expect(generateTypes.propertyAppliesToVersion(prop, 2)).toBe(false);
			expect(generateTypes.propertyAppliesToVersion(prop, 1.9)).toBe(false);
		});

		it('should handle lte (less than or equal) version condition', () => {
			const prop: NodeProperty = {
				name: 'legacyFeature',
				displayName: 'Legacy Feature',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lte: 2 } }],
					},
				},
			};
			expect(generateTypes.propertyAppliesToVersion(prop, 2)).toBe(true);
			expect(generateTypes.propertyAppliesToVersion(prop, 1.9)).toBe(true);
			expect(generateTypes.propertyAppliesToVersion(prop, 2.1)).toBe(false);
			expect(generateTypes.propertyAppliesToVersion(prop, 3)).toBe(false);
		});
	});

	describe('groupVersionsByProperties', () => {
		it('should group versions with identical properties', () => {
			// Mock nodes with same properties at different versions
			const nodes: NodeTypeDescription[] = [
				{ ...mockHttpRequestNode, version: 4.1, properties: mockHttpRequestNode.properties },
				{ ...mockHttpRequestNode, version: 4.2, properties: mockHttpRequestNode.properties },
				{
					...mockHttpRequestNode,
					version: 3,
					properties: mockHttpRequestNode.properties.slice(0, 3),
				},
			];

			const groups = generateTypes.groupVersionsByProperties(nodes);

			// Versions 4.1 and 4.2 should be grouped together
			expect(groups.length).toBe(2);
			const v4Group = groups.find((g) => g.versions.includes(4.2));
			expect(v4Group?.versions).toContain(4.1);
			expect(v4Group?.versions).toContain(4.2);
		});
	});

	describe('getHighestVersion', () => {
		it('should return highest version from array', () => {
			expect(generateTypes.getHighestVersion([1, 2, 2.1, 3])).toBe(3);
		});

		it('should handle single version', () => {
			expect(generateTypes.getHighestVersion(1)).toBe(1);
		});

		it('should handle decimal versions', () => {
			expect(generateTypes.getHighestVersion([4, 4.1, 4.2, 4.3])).toBe(4.3);
		});
	});

	describe('versionToTypeName', () => {
		it('should convert version number to valid identifier', () => {
			expect(generateTypes.versionToTypeName(4.2)).toBe('V42');
			expect(generateTypes.versionToTypeName(1)).toBe('V1');
			expect(generateTypes.versionToTypeName(2.1)).toBe('V21');
		});
	});

	// =========================================================================
	// File Generation Tests
	// =========================================================================

	describe('nodeNameToFileName', () => {
		it('should convert node name to valid file name', () => {
			expect(generateTypes.nodeNameToFileName('n8n-nodes-base.httpRequest')).toBe('httpRequest');
			expect(generateTypes.nodeNameToFileName('n8n-nodes-base.gmail')).toBe('gmail');
			expect(generateTypes.nodeNameToFileName('@n8n/n8n-nodes-langchain.lmChatOpenAi')).toBe(
				'lmChatOpenAi',
			);
		});
	});

	describe('getPackageName', () => {
		it('should extract package name from node type', () => {
			expect(generateTypes.getPackageName('n8n-nodes-base.httpRequest')).toBe('n8n-nodes-base');
			expect(generateTypes.getPackageName('@n8n/n8n-nodes-langchain.agent')).toBe(
				'n8n-nodes-langchain',
			);
		});
	});

	describe('generateNodeTypeFile', () => {
		it('should generate complete type file for Gmail node', () => {
			const result = generateTypes.generateNodeTypeFile(mockGmailNode);

			// Should have header with description
			expect(result).toContain('Gmail');
			expect(result).toContain('Send and receive emails using Gmail');

			// Should NOT have imports (simplified output for LLM)
			expect(result).not.toMatch(/^import type/m);

			// Should have discriminated union types (with version suffix to avoid duplicates)
			expect(result).toContain('GmailV21MessageSendParams');
			expect(result).toContain('GmailV21Params');

			// Should have credentials type
			expect(result).toContain('GmailV21Credentials');
			expect(result).toContain('gmailOAuth2');

			// Should have node type
			expect(result).toContain('GmailNode');
			expect(result).toContain("type: 'n8n-nodes-base.gmail'");
		});

		it('should generate type file for HTTP Request (no discriminators)', () => {
			const result = generateTypes.generateNodeTypeFile(mockHttpRequestNode);

			// Should have simple interface
			expect(result).toContain('HttpRequestV42Params');
			expect(result).toContain('interface');

			// Should have method options
			expect(result).toContain("'GET'");
			expect(result).toContain("'POST'");
		});

		it('should mark trigger nodes correctly', () => {
			const result = generateTypes.generateNodeTypeFile(mockTriggerNode);

			// Should indicate it's a trigger
			expect(result).toContain('isTrigger: true');
		});
	});

	describe('generateIndexFile', () => {
		it('should generate re-exports for all nodes', () => {
			const nodes = [mockHttpRequestNode, mockGmailNode];
			const result = generateTypes.generateIndexFile(nodes);

			// Should re-export all nodes
			expect(result).toContain("export * from './nodes/n8n-nodes-base/httpRequest'");
			expect(result).toContain("export * from './nodes/n8n-nodes-base/gmail'");

			// Should have header
			expect(result).toContain('Generated Node Types');
			expect(result).toContain('Do not edit manually');

			// Should have AllNodeTypes union
			expect(result).toContain('AllNodeTypes');
			expect(result).toContain('HttpRequestNode');
			expect(result).toContain('GmailNode');
		});
	});

	// =========================================================================
	// Integration Tests
	// =========================================================================

	describe('loadNodeTypes', () => {
		const nodesPath = path.resolve(__dirname, '../../../nodes-base/dist/types/nodes.json');
		const hasNodesJson = fs.existsSync(nodesPath);

		it('should load nodes from nodes.json file', async () => {
			if (!hasNodesJson) {
				// Skip test if nodes.json doesn't exist
				expect(true).toBe(true);
				return;
			}

			// Pass package name to prefix node names
			const nodes = await generateTypes.loadNodeTypes(nodesPath, 'n8n-nodes-base');

			expect(Array.isArray(nodes)).toBe(true);
			expect(nodes.length).toBeGreaterThan(100); // Should have 400+ nodes

			// Should have HTTP Request node (with package prefix added)
			const httpNode = nodes.find((n) => n.name === 'n8n-nodes-base.httpRequest');
			expect(httpNode).toBeDefined();
			expect(httpNode?.displayName).toBe('HTTP Request');
		});
	});

	describe('full generation', () => {
		const outputDir = path.resolve(__dirname, '../types/generated');
		const nodesPath = path.resolve(__dirname, '../../../nodes-base/dist/types/nodes.json');
		const hasNodesJson = fs.existsSync(nodesPath);

		it('should generate valid TypeScript files', async () => {
			if (!hasNodesJson) {
				// Skip test if nodes.json doesn't exist
				expect(true).toBe(true);
				return;
			}

			// Run the generator
			await generateTypes.generateTypes();

			// Check that index.ts was created
			const indexPath = path.join(outputDir, 'index.ts');
			expect(fs.existsSync(indexPath)).toBe(true);

			// Check that some node files were created
			const httpRequestPath = path.join(outputDir, 'nodes/n8n-nodes-base/httpRequest.ts');
			expect(fs.existsSync(httpRequestPath)).toBe(true);

			const gmailPath = path.join(outputDir, 'nodes/n8n-nodes-base/gmail.ts');
			expect(fs.existsSync(gmailPath)).toBe(true);
		});

		it('should skip hidden nodes', async () => {
			if (!hasNodesJson) {
				// Skip test if nodes.json doesn't exist
				expect(true).toBe(true);
				return;
			}

			await generateTypes.generateTypes();

			// Hidden nodes should not have generated files
			// (would need to check actual hidden nodes from the JSON)
		});
	});

	// =========================================================================
	// credentialsSelect Type Handling Tests
	// =========================================================================

	describe('credentialsSelect type handling', () => {
		it('should map credentialsSelect type to string | Expression<string>', () => {
			const prop: NodeProperty = {
				name: 'nodeCredentialType',
				displayName: 'Credential Type',
				type: 'credentialsSelect',
				default: '',
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('string | Expression<string>');
		});

		it('should map genericAuthType credentialsSelect to union of known values', () => {
			const prop: NodeProperty = {
				name: 'genericAuthType',
				displayName: 'Generic Auth Type',
				type: 'credentialsSelect',
				default: '',
			};
			const result = generateTypes.mapPropertyType(prop);
			// Should contain all known generic auth types
			expect(result).toContain("'httpBasicAuth'");
			expect(result).toContain("'httpBearerAuth'");
			expect(result).toContain("'httpDigestAuth'");
			expect(result).toContain("'httpHeaderAuth'");
			expect(result).toContain("'httpQueryAuth'");
			expect(result).toContain("'httpCustomAuth'");
			expect(result).toContain("'oAuth1Api'");
			expect(result).toContain("'oAuth2Api'");
			expect(result).toContain('Expression<string>');
		});

		it('should NOT skip credentialsSelect properties in type generation', () => {
			// Mock HTTP Request node with credentialsSelect fields
			const nodeWithCredentialsSelect: NodeTypeDescription = {
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Makes HTTP requests',
				group: ['transform'],
				version: 4.3,
				inputs: ['main'],
				outputs: ['main'],
				credentials: [{ name: 'httpSslAuth' }],
				properties: [
					{
						displayName: 'Authentication',
						name: 'authentication',
						type: 'options',
						options: [
							{ name: 'None', value: 'none' },
							{ name: 'Predefined Credential Type', value: 'predefinedCredentialType' },
							{ name: 'Generic Credential Type', value: 'genericCredentialType' },
						],
						default: 'none',
					},
					{
						displayName: 'Credential Type',
						name: 'nodeCredentialType',
						type: 'credentialsSelect',
						default: '',
						displayOptions: { show: { authentication: ['predefinedCredentialType'] } },
					},
					{
						displayName: 'Generic Auth Type',
						name: 'genericAuthType',
						type: 'credentialsSelect',
						default: '',
						displayOptions: { show: { authentication: ['genericCredentialType'] } },
					},
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						required: true,
						default: '',
					},
				],
			};

			const result = generateTypes.generateDiscriminatedUnion(nodeWithCredentialsSelect);

			// nodeCredentialType should be included as a property
			expect(result).toContain('nodeCredentialType');

			// genericAuthType should be included with its union type
			expect(result).toContain('genericAuthType');
		});

		it('should include generic auth credentials in credentials interface when genericAuthType is present', () => {
			const nodeWithGenericAuth: NodeTypeDescription = {
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Makes HTTP requests',
				group: ['transform'],
				version: 4.3,
				inputs: ['main'],
				outputs: ['main'],
				credentials: [{ name: 'httpSslAuth' }],
				properties: [
					{
						displayName: 'Generic Auth Type',
						name: 'genericAuthType',
						type: 'credentialsSelect',
						default: '',
					},
				],
			};

			const result = generateTypes.generateNodeTypeFile(nodeWithGenericAuth);

			// Credentials interface should include generic auth types
			expect(result).toContain('HttpRequestV43Credentials');
			expect(result).toContain('httpSslAuth');
			expect(result).toContain('httpBasicAuth');
			expect(result).toContain('httpBearerAuth');
			expect(result).toContain('httpDigestAuth');
			expect(result).toContain('httpHeaderAuth');
			expect(result).toContain('httpQueryAuth');
			expect(result).toContain('httpCustomAuth');
			expect(result).toContain('oAuth1Api');
			expect(result).toContain('oAuth2Api');

			// Should include JSDoc comment explaining the genericAuthType relationship
			expect(result).toContain(
				"Generic auth credentials - set the 'genericAuthType' config parameter to select which one to use",
			);
		});

		it('should NOT include generic auth credentials when genericAuthType is absent', () => {
			const nodeWithoutGenericAuth: NodeTypeDescription = {
				name: 'n8n-nodes-base.slack',
				displayName: 'Slack',
				description: 'Send messages to Slack',
				group: ['transform'],
				version: 2,
				inputs: ['main'],
				outputs: ['main'],
				credentials: [{ name: 'slackApi', required: true }],
				properties: [
					{
						displayName: 'Channel',
						name: 'channel',
						type: 'string',
						required: true,
						default: '',
					},
				],
			};

			const result = generateTypes.generateNodeTypeFile(nodeWithoutGenericAuth);

			// Should have slackApi credential
			expect(result).toContain('slackApi');

			// Should NOT have generic auth credentials
			expect(result).not.toContain('httpBasicAuth');
			expect(result).not.toContain('httpBearerAuth');
			expect(result).not.toContain('oAuth1Api');
		});

		it('should handle credentialsSelect in nested collection types', () => {
			const prop: NodeProperty = {
				name: 'options',
				displayName: 'Options',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Credential Type',
						name: 'credentialType',
						type: 'credentialsSelect',
						default: '',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						default: 5000,
					},
				],
			};
			const result = generateTypes.mapPropertyType(prop);
			// credentialsSelect should be mapped to string, not skipped
			expect(result).toContain('credentialType');
			expect(result).toContain('string | Expression<string>');
			expect(result).toContain('timeout');
		});

		it('should handle credentialsSelect in fixedCollection types', () => {
			const prop: NodeProperty = {
				name: 'authConfig',
				displayName: 'Auth Config',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Auth',
						name: 'auth',
						values: [
							{
								displayName: 'Credential Type',
								name: 'credentialType',
								type: 'credentialsSelect',
								default: '',
							},
						],
					},
				],
			};
			const result = generateTypes.mapPropertyType(prop);
			// credentialsSelect should be mapped to string, not skipped
			expect(result).toContain('credentialType');
			expect(result).toContain('string | Expression<string>');
		});

		it('should generate JSDoc with displayOptions.show even without description', () => {
			const prop: NodeProperty = {
				name: 'genericAuthType',
				displayName: 'Generic Auth Type',
				type: 'credentialsSelect',
				default: '',
				displayOptions: {
					show: {
						authentication: ['genericCredentialType'],
					},
				},
			};
			const result = generateTypes.generatePropertyLine(prop, true);

			// Should have JSDoc comment with displayOptions.show
			expect(result).toContain('/**');
			expect(result).toContain('@displayOptions.show');
			expect(result).toContain('authentication: ["genericCredentialType"]');
		});

		it('should include displayOptions.show in generated Config for credentialsSelect properties', () => {
			const nodeWithCredentialsSelect: NodeTypeDescription = {
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Makes HTTP requests',
				group: ['transform'],
				version: 4.3,
				inputs: ['main'],
				outputs: ['main'],
				credentials: [{ name: 'httpSslAuth' }],
				properties: [
					{
						displayName: 'Authentication',
						name: 'authentication',
						type: 'options',
						options: [
							{ name: 'None', value: 'none' },
							{ name: 'Generic Credential Type', value: 'genericCredentialType' },
						],
						default: 'none',
					},
					{
						displayName: 'Generic Auth Type',
						name: 'genericAuthType',
						type: 'credentialsSelect',
						default: '',
						displayOptions: {
							show: {
								authentication: ['genericCredentialType'],
							},
						},
					},
				],
			};

			const result = generateTypes.generateDiscriminatedUnion(nodeWithCredentialsSelect);

			// genericAuthType should have displayOptions.show in JSDoc
			expect(result).toContain('@displayOptions.show');
			expect(result).toContain('authentication: ["genericCredentialType"]');
		});
	});

	// =========================================================================
	// Edge Case Tests
	// =========================================================================

	describe('edge cases', () => {
		it('should handle node with version as single number', () => {
			const node: NodeTypeDescription = {
				...mockHttpRequestNode,
				version: 1, // Single number, not array
			};
			const result = generateTypes.generateNodeTypeFile(node);
			expect(result).toContain('V1Params');
		});

		it('should handle null defaults', () => {
			const prop: NodeProperty = {
				name: 'optional',
				displayName: 'Optional',
				type: 'string',
				default: null,
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('string | Expression<string> | PlaceholderValue');
		});

		it('should handle options with numeric values', () => {
			const prop: NodeProperty = {
				name: 'priority',
				displayName: 'Priority',
				type: 'options',
				options: [
					{ name: 'Low', value: 1 },
					{ name: 'Medium', value: 2 },
					{ name: 'High', value: 3 },
				],
				default: 1,
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('1 | 2 | 3 | Expression<number>');
		});

		it('should handle options with boolean values', () => {
			const prop: NodeProperty = {
				name: 'flag',
				displayName: 'Flag',
				type: 'options',
				options: [
					{ name: 'Yes', value: true },
					{ name: 'No', value: false },
				],
				default: true,
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('true | false | Expression<boolean>');
		});

		it('should handle AI connection types in inputs/outputs', () => {
			const aiNode: NodeTypeDescription = {
				name: '@n8n/n8n-nodes-langchain.agent',
				displayName: 'AI Agent',
				description: 'AI Agent node',
				group: ['transform'],
				version: 1,
				inputs: [
					{ type: 'main' },
					{ type: 'ai_languageModel', displayName: 'Model' },
					{ type: 'ai_memory', displayName: 'Memory' },
					{ type: 'ai_tool', displayName: 'Tool' },
				],
				outputs: ['main'],
				properties: [],
			};
			const result = generateTypes.generateNodeTypeFile(aiNode);
			// Should handle AI inputs correctly
			expect(result).toBeDefined();
		});

		it('should escape property names that are reserved words', () => {
			const prop: NodeProperty = {
				name: 'default',
				displayName: 'Default',
				type: 'string',
				default: '',
			};
			// Property name 'default' is a reserved word
			const result = generateTypes.generatePropertyLine(prop, false);
			expect(result).toContain("'default'"); // Should be quoted
		});
	});

	// =========================================================================
	// Subnode Union Type Generation Tests
	// =========================================================================

	describe('subnode union type generation', () => {
		// Mock AI subnode definitions
		const mockLanguageModelNode: NodeTypeDescription = {
			name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			displayName: 'OpenAI Chat Model',
			description: 'Interact with OpenAI chat models',
			group: ['transform'],
			version: [1, 1.1, 1.2],
			inputs: ['main'],
			outputs: ['ai_languageModel'],
			properties: [
				{
					name: 'model',
					displayName: 'Model',
					type: 'options',
					options: [
						{ name: 'GPT-4', value: 'gpt-4' },
						{ name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
					],
					default: 'gpt-4',
				},
			],
		};

		const mockAnthropicModelNode: NodeTypeDescription = {
			name: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
			displayName: 'Anthropic Chat Model',
			description: 'Interact with Anthropic Claude models',
			group: ['transform'],
			version: 1,
			inputs: ['main'],
			outputs: ['ai_languageModel'],
			properties: [],
		};

		const mockToolCodeNode: NodeTypeDescription = {
			name: '@n8n/n8n-nodes-langchain.toolCode',
			displayName: 'Code Tool',
			description: 'Execute code as a tool',
			group: ['transform'],
			version: [1, 1.1],
			inputs: ['main'],
			outputs: ['ai_tool'],
			properties: [
				{
					name: 'code',
					displayName: 'Code',
					type: 'string',
					default: '',
				},
			],
		};

		const mockCalculatorToolNode: NodeTypeDescription = {
			name: '@n8n/n8n-nodes-langchain.toolCalculator',
			displayName: 'Calculator Tool',
			description: 'Perform calculations',
			group: ['transform'],
			version: 1,
			inputs: ['main'],
			outputs: ['ai_tool'],
			properties: [],
		};

		const mockMemoryNode: NodeTypeDescription = {
			name: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			displayName: 'Window Buffer Memory',
			description: 'Store conversation history in a buffer',
			group: ['transform'],
			version: [1, 1.1, 1.2],
			inputs: ['main'],
			outputs: ['ai_memory'],
			properties: [
				{
					name: 'contextWindowLength',
					displayName: 'Context Window Length',
					type: 'number',
					default: 5,
				},
			],
		};

		const mockEmbeddingNode: NodeTypeDescription = {
			name: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
			displayName: 'OpenAI Embeddings',
			description: 'Generate embeddings using OpenAI',
			group: ['transform'],
			version: 1,
			inputs: ['main'],
			outputs: ['ai_embedding'],
			properties: [],
		};

		const mockVectorStoreNode: NodeTypeDescription = {
			name: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
			displayName: 'Pinecone Vector Store',
			description: 'Store vectors in Pinecone',
			group: ['transform'],
			version: 1,
			inputs: [{ type: 'main' }, { type: 'ai_embedding', displayName: 'Embedding' }],
			outputs: ['ai_vectorStore'],
			properties: [],
		};

		const mockOutputParserNode: NodeTypeDescription = {
			name: '@n8n/n8n-nodes-langchain.outputParserStructured',
			displayName: 'Structured Output Parser',
			description: 'Parse structured output',
			group: ['transform'],
			version: 1,
			inputs: ['main'],
			outputs: ['ai_outputParser'],
			properties: [],
		};

		const mockRetrieverNode: NodeTypeDescription = {
			name: '@n8n/n8n-nodes-langchain.retrieverVectorStore',
			displayName: 'Vector Store Retriever',
			description: 'Retrieve from vector store',
			group: ['transform'],
			version: 1,
			inputs: [{ type: 'main' }, { type: 'ai_vectorStore' }],
			outputs: ['ai_retriever'],
			properties: [],
		};

		const mockDocumentLoaderNode: NodeTypeDescription = {
			name: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
			displayName: 'Default Data Loader',
			description: 'Load documents',
			group: ['transform'],
			version: 1,
			inputs: ['main'],
			outputs: ['ai_document'],
			properties: [],
		};

		const mockTextSplitterNode: NodeTypeDescription = {
			name: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter',
			displayName: 'Recursive Character Text Splitter',
			description: 'Split text recursively',
			group: ['transform'],
			version: 1,
			inputs: ['main'],
			outputs: ['ai_textSplitter'],
			properties: [],
		};

		// Regular node (not a subnode) for comparison
		const mockAgentNode: NodeTypeDescription = {
			name: '@n8n/n8n-nodes-langchain.agent',
			displayName: 'AI Agent',
			description: 'AI Agent that uses tools',
			group: ['transform'],
			version: [1, 1.5, 1.7],
			inputs: [
				{ type: 'main' },
				{ type: 'ai_languageModel', displayName: 'Model' },
				{ type: 'ai_memory', displayName: 'Memory' },
				{ type: 'ai_tool', displayName: 'Tool' },
			],
			outputs: ['main'],
			properties: [],
		};

		describe('extractOutputTypes', () => {
			it('should extract ai_languageModel output from OpenAI model node', () => {
				const outputs = generateTypes.extractOutputTypes(mockLanguageModelNode);
				expect(outputs).toContain('ai_languageModel');
			});

			it('should extract ai_tool output from tool node', () => {
				const outputs = generateTypes.extractOutputTypes(mockToolCodeNode);
				expect(outputs).toContain('ai_tool');
			});

			it('should extract ai_memory output from memory node', () => {
				const outputs = generateTypes.extractOutputTypes(mockMemoryNode);
				expect(outputs).toContain('ai_memory');
			});

			it('should extract main output from agent node (not a subnode)', () => {
				const outputs = generateTypes.extractOutputTypes(mockAgentNode);
				expect(outputs).toContain('main');
				expect(outputs).not.toContain('ai_languageModel');
			});

			it('should handle complex output format with objects', () => {
				const nodeWithObjectOutputs: NodeTypeDescription = {
					...mockLanguageModelNode,
					outputs: [{ type: 'ai_languageModel', displayName: 'Model' }],
				};
				const outputs = generateTypes.extractOutputTypes(nodeWithObjectOutputs);
				expect(outputs).toContain('ai_languageModel');
			});
		});

		describe('groupNodesByOutputType', () => {
			it('should group nodes by their AI output types', () => {
				const nodes = [
					mockLanguageModelNode,
					mockAnthropicModelNode,
					mockToolCodeNode,
					mockCalculatorToolNode,
					mockMemoryNode,
					mockAgentNode,
				];

				const grouped = generateTypes.groupNodesByOutputType(nodes);

				// Language model nodes grouped together
				expect(grouped.ai_languageModel).toContain('@n8n/n8n-nodes-langchain.lmChatOpenAi');
				expect(grouped.ai_languageModel).toContain('@n8n/n8n-nodes-langchain.lmChatAnthropic');
				expect(grouped.ai_languageModel?.length).toBe(2);

				// Tool nodes grouped together
				expect(grouped.ai_tool).toContain('@n8n/n8n-nodes-langchain.toolCode');
				expect(grouped.ai_tool).toContain('@n8n/n8n-nodes-langchain.toolCalculator');
				expect(grouped.ai_tool?.length).toBe(2);

				// Memory nodes
				expect(grouped.ai_memory).toContain('@n8n/n8n-nodes-langchain.memoryBufferWindow');
				expect(grouped.ai_memory?.length).toBe(1);

				// Main output nodes NOT included in AI subnode groups
				expect(grouped.main).toContain('@n8n/n8n-nodes-langchain.agent');
			});

			it('should handle all AI subnode output types', () => {
				const nodes = [
					mockLanguageModelNode,
					mockMemoryNode,
					mockToolCodeNode,
					mockOutputParserNode,
					mockEmbeddingNode,
					mockVectorStoreNode,
					mockRetrieverNode,
					mockDocumentLoaderNode,
					mockTextSplitterNode,
				];

				const grouped = generateTypes.groupNodesByOutputType(nodes);

				expect(grouped.ai_languageModel).toBeDefined();
				expect(grouped.ai_memory).toBeDefined();
				expect(grouped.ai_tool).toBeDefined();
				expect(grouped.ai_outputParser).toBeDefined();
				expect(grouped.ai_embedding).toBeDefined();
				expect(grouped.ai_vectorStore).toBeDefined();
				expect(grouped.ai_retriever).toBeDefined();
				expect(grouped.ai_document).toBeDefined();
				expect(grouped.ai_textSplitter).toBeDefined();
			});
		});

		describe('generateSubnodeUnionTypes', () => {
			it('should generate ValidLanguageModelType union', () => {
				const nodes = [mockLanguageModelNode, mockAnthropicModelNode, mockAgentNode];
				const code = generateTypes.generateSubnodeUnionTypes(nodes);

				expect(code).toContain('export type ValidLanguageModelType =');
				expect(code).toContain("'@n8n/n8n-nodes-langchain.lmChatOpenAi'");
				expect(code).toContain("'@n8n/n8n-nodes-langchain.lmChatAnthropic'");
				// Should NOT include agent (it outputs 'main', not 'ai_languageModel')
				expect(code).not.toContain("'@n8n/n8n-nodes-langchain.agent'");
			});

			it('should generate ValidToolType union', () => {
				const nodes = [mockToolCodeNode, mockCalculatorToolNode, mockAgentNode];
				const code = generateTypes.generateSubnodeUnionTypes(nodes);

				expect(code).toContain('export type ValidToolType =');
				expect(code).toContain("'@n8n/n8n-nodes-langchain.toolCode'");
				expect(code).toContain("'@n8n/n8n-nodes-langchain.toolCalculator'");
			});

			it('should generate all subnode union types', () => {
				const nodes = [
					mockLanguageModelNode,
					mockAnthropicModelNode,
					mockMemoryNode,
					mockToolCodeNode,
					mockCalculatorToolNode,
					mockOutputParserNode,
					mockEmbeddingNode,
					mockVectorStoreNode,
					mockRetrieverNode,
					mockDocumentLoaderNode,
					mockTextSplitterNode,
				];
				const code = generateTypes.generateSubnodeUnionTypes(nodes);

				// All union types should be generated
				expect(code).toContain('export type ValidLanguageModelType =');
				expect(code).toContain('export type ValidMemoryType =');
				expect(code).toContain('export type ValidToolType =');
				expect(code).toContain('export type ValidOutputParserType =');
				expect(code).toContain('export type ValidEmbeddingType =');
				expect(code).toContain('export type ValidVectorStoreType =');
				expect(code).toContain('export type ValidRetrieverType =');
				expect(code).toContain('export type ValidDocumentLoaderType =');
				expect(code).toContain('export type ValidTextSplitterType =');
			});

			it('should include JSDoc comments for union types', () => {
				const nodes = [mockLanguageModelNode, mockToolCodeNode];
				const code = generateTypes.generateSubnodeUnionTypes(nodes);

				// Should have documentation
				expect(code).toContain('/**');
				expect(code).toContain('languageModel()');
				expect(code).toContain('tool()');
			});

			it('should handle empty categories gracefully', () => {
				const nodes = [mockLanguageModelNode]; // Only language model
				const code = generateTypes.generateSubnodeUnionTypes(nodes);

				// Language model should be present
				expect(code).toContain('export type ValidLanguageModelType =');

				// Empty categories should have 'never' type
				expect(code).toContain('export type ValidToolType = never');
				expect(code).toContain('export type ValidMemoryType = never');
			});
		});

		describe('generateNodeTypeFile with @subnodeType JSDoc', () => {
			it('should add @subnodeType JSDoc tag for language model nodes', () => {
				const result = generateTypes.generateNodeTypeFile(mockLanguageModelNode);

				expect(result).toContain('@subnodeType ai_languageModel');
			});

			it('should add @subnodeType JSDoc tag for tool nodes', () => {
				const result = generateTypes.generateNodeTypeFile(mockToolCodeNode);

				expect(result).toContain('@subnodeType ai_tool');
			});

			it('should add @subnodeType JSDoc tag for memory nodes', () => {
				const result = generateTypes.generateNodeTypeFile(mockMemoryNode);

				expect(result).toContain('@subnodeType ai_memory');
			});

			it('should NOT add @subnodeType for nodes with main output', () => {
				const result = generateTypes.generateNodeTypeFile(mockAgentNode);

				expect(result).not.toContain('@subnodeType');
			});

			it('should add @subnodeType for all AI subnode categories', () => {
				const resultEmbedding = generateTypes.generateNodeTypeFile(mockEmbeddingNode);
				expect(resultEmbedding).toContain('@subnodeType ai_embedding');

				const resultVectorStore = generateTypes.generateNodeTypeFile(mockVectorStoreNode);
				expect(resultVectorStore).toContain('@subnodeType ai_vectorStore');

				const resultRetriever = generateTypes.generateNodeTypeFile(mockRetrieverNode);
				expect(resultRetriever).toContain('@subnodeType ai_retriever');

				const resultDocument = generateTypes.generateNodeTypeFile(mockDocumentLoaderNode);
				expect(resultDocument).toContain('@subnodeType ai_document');

				const resultTextSplitter = generateTypes.generateNodeTypeFile(mockTextSplitterNode);
				expect(resultTextSplitter).toContain('@subnodeType ai_textSplitter');

				const resultOutputParser = generateTypes.generateNodeTypeFile(mockOutputParserNode);
				expect(resultOutputParser).toContain('@subnodeType ai_outputParser');
			});
		});

		describe('generateSubnodesFile', () => {
			it('should generate complete subnodes.ts file', () => {
				const nodes = [
					mockLanguageModelNode,
					mockAnthropicModelNode,
					mockToolCodeNode,
					mockMemoryNode,
				];

				const code = generateTypes.generateSubnodesFile(nodes);

				// Should have file header
				expect(code).toContain('Generated Subnode Union Types');
				expect(code).toContain('Do not edit manually');

				// Should have all union types
				expect(code).toContain('ValidLanguageModelType');
				expect(code).toContain('ValidToolType');
				expect(code).toContain('ValidMemoryType');
			});
		});
	});

	// =========================================================================
	// Discriminator Split Type Generation Tests
	// =========================================================================

	describe('discriminator split type generation', () => {
		// Mock node with resource/operation pattern (like Freshservice)
		const mockFreshserviceNode: NodeTypeDescription = {
			name: 'n8n-nodes-base.freshservice',
			displayName: 'Freshservice',
			description: 'Consume Freshservice API',
			group: ['transform'],
			version: 1,
			inputs: ['main'],
			outputs: ['main'],
			credentials: [{ name: 'freshserviceApi', required: true }],
			properties: [
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					options: [
						{ name: 'Ticket', value: 'ticket' },
						{ name: 'Agent', value: 'agent' },
					],
					default: 'ticket',
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					displayOptions: { show: { resource: ['ticket'] } },
					options: [
						{ name: 'Get', value: 'get', description: 'Get a ticket' },
						{ name: 'Create', value: 'create', description: 'Create a ticket' },
						{ name: 'Delete', value: 'delete', description: 'Delete a ticket' },
					],
					default: 'get',
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					displayOptions: { show: { resource: ['agent'] } },
					options: [
						{ name: 'Get', value: 'get', description: 'Get an agent' },
						{ name: 'Create', value: 'create', description: 'Create an agent' },
					],
					default: 'get',
				},
				{
					displayName: 'Ticket ID',
					name: 'ticketId',
					type: 'string',
					required: true,
					default: '',
					displayOptions: { show: { resource: ['ticket'], operation: ['get', 'delete'] } },
				},
				{
					displayName: 'Subject',
					name: 'subject',
					type: 'string',
					required: true,
					default: '',
					displayOptions: { show: { resource: ['ticket'], operation: ['create'] } },
				},
				{
					displayName: 'Agent ID',
					name: 'agentId',
					type: 'string',
					required: true,
					default: '',
					displayOptions: { show: { resource: ['agent'], operation: ['get'] } },
				},
			],
		};

		// Mock node with mode discriminator (like Code node)
		const mockCodeNode: NodeTypeDescription = {
			name: 'n8n-nodes-base.code',
			displayName: 'Code',
			description: 'Run custom JavaScript code',
			group: ['transform'],
			version: 2,
			inputs: ['main'],
			outputs: ['main'],
			properties: [
				{
					displayName: 'Mode',
					name: 'mode',
					type: 'options',
					options: [
						{ name: 'Run Once for All Items', value: 'runOnceForAllItems' },
						{ name: 'Run Once for Each Item', value: 'runOnceForEachItem' },
					],
					default: 'runOnceForAllItems',
				},
				{
					displayName: 'JavaScript Code',
					name: 'jsCode',
					type: 'string',
					default: '',
					displayOptions: { show: { mode: ['runOnceForAllItems', 'runOnceForEachItem'] } },
				},
				{
					displayName: 'Items Per Batch',
					name: 'itemsPerBatch',
					type: 'number',
					default: 100,
					displayOptions: { show: { mode: ['runOnceForAllItems'] } },
				},
			],
		};

		// Mock node without discriminators (like Aggregate)
		const mockAggregateNode: NodeTypeDescription = {
			name: 'n8n-nodes-base.aggregate',
			displayName: 'Aggregate',
			description: 'Aggregate items into a single item',
			group: ['transform'],
			version: 1,
			inputs: ['main'],
			outputs: ['main'],
			properties: [
				{
					displayName: 'Field Name',
					name: 'fieldName',
					type: 'string',
					default: 'data',
				},
			],
		};

		describe('toSnakeCase', () => {
			it('should convert camelCase to snake_case', () => {
				// Note: toSnakeCase may not be exported, test through buildDiscriminatorPath
				const combo = { mode: 'runOnceForAllItems' };
				const path = generateTypes.buildDiscriminatorPath(combo);
				expect(path).toBe('mode_run_once_for_all_items');
			});

			it('should convert simple strings to lowercase', () => {
				const combo = { resource: 'ticket' };
				const path = generateTypes.buildDiscriminatorPath(combo);
				expect(path).toContain('ticket');
			});

			it('should handle PascalCase values', () => {
				const combo = { mode: 'RunOnceForEachItem' };
				const path = generateTypes.buildDiscriminatorPath(combo);
				expect(path).toBe('mode_run_once_for_each_item');
			});
		});

		describe('buildDiscriminatorPath', () => {
			it('should build nested path for resource/operation combo', () => {
				const combo = { resource: 'ticket', operation: 'get' };
				const path = generateTypes.buildDiscriminatorPath(combo);
				expect(path).toBe('resource_ticket/operation_get');
			});

			it('should build flat path for single discriminator (mode)', () => {
				const combo = { mode: 'runOnceForAllItems' };
				const path = generateTypes.buildDiscriminatorPath(combo);
				expect(path).toBe('mode_run_once_for_all_items');
			});

			it('should handle authentication discriminator', () => {
				const combo = { authentication: 'oauth2' };
				const path = generateTypes.buildDiscriminatorPath(combo);
				expect(path).toBe('authentication_oauth2');
			});

			it('should convert camelCase values to snake_case', () => {
				const combo = { resource: 'agentGroup', operation: 'getAll' };
				const path = generateTypes.buildDiscriminatorPath(combo);
				expect(path).toBe('resource_agent_group/operation_get_all');
			});
		});

		describe('hasDiscriminatorPattern', () => {
			it('should return true for nodes with resource/operation pattern', () => {
				const result = generateTypes.hasDiscriminatorPattern(mockFreshserviceNode);
				expect(result).toBe(true);
			});

			it('should return true for nodes with mode discriminator', () => {
				const result = generateTypes.hasDiscriminatorPattern(mockCodeNode);
				expect(result).toBe(true);
			});

			it('should return false for nodes without discriminators', () => {
				const result = generateTypes.hasDiscriminatorPattern(mockAggregateNode);
				expect(result).toBe(false);
			});

			it('should return false for nodes without discriminators (HTTP Request)', () => {
				const result = generateTypes.hasDiscriminatorPattern(mockHttpRequestNode);
				expect(result).toBe(false);
			});
		});

		describe('generateSharedFile', () => {
			it('should generate _shared.ts with credentials for resource/operation node', () => {
				const content = generateTypes.generateSharedFile(mockFreshserviceNode, 1);

				// Should have header
				expect(content).toContain('Freshservice Node - Version 1 - Shared Types');

				// Should have credentials
				expect(content).toContain('FreshserviceV1Credentials');
				expect(content).toContain('freshserviceApi');

				// Should have base type
				expect(content).toContain('FreshserviceV1NodeBase');
				expect(content).toContain("type: 'n8n-nodes-base.freshservice'");
				expect(content).toContain('version: 1');

				// Should NOT have imports or re-exports (simplified output for LLM)
				expect(content).not.toMatch(/^import type/m);
				expect(content).not.toMatch(/^export type \{.*\} from/m);
			});

			it('should generate _shared.ts without credentials for node without them', () => {
				const content = generateTypes.generateSharedFile(mockAggregateNode, 1);

				// Should NOT have credentials section with real credentials
				expect(content).not.toContain('AggregateV1Credentials');

				// Should have base type
				expect(content).toContain('AggregateV1NodeBase');
			});

			it('should include helper types when needed', () => {
				// Create a node with filter type (resourceLocator no longer uses helper types)
				const nodeWithFilter: NodeTypeDescription = {
					...mockFreshserviceNode,
					properties: [
						...mockFreshserviceNode.properties,
						{
							displayName: 'Filter',
							name: 'filter',
							type: 'filter',
							default: {},
						},
					],
				};

				const content = generateTypes.generateSharedFile(nodeWithFilter, 1);
				expect(content).toContain('FilterValue');
			});
		});

		describe('generateDiscriminatorFile', () => {
			it('should generate self-contained operation file for resource/operation combo', () => {
				const combo = { resource: 'ticket', operation: 'get' };
				const props = generateTypes.getPropertiesForCombination(mockFreshserviceNode, combo);

				// New signature: importDepth instead of sharedImportPath
				const content = generateTypes.generateDiscriminatorFile(
					mockFreshserviceNode,
					1,
					combo,
					props,
					undefined,
					6, // import depth for nested files (v1/resource_ticket/operation_get.ts)
				);

				// Should have header with discriminator info
				expect(content).toContain('Discriminator: resource=ticket, operation=get');

				// Should NOT have imports (simplified output for LLM)
				expect(content).not.toMatch(/^import type/m);
				expect(content).not.toContain("from '../_shared'");
				expect(content).not.toContain("from './_shared'");

				// Should have params type with discriminators
				expect(content).toContain('FreshserviceV1TicketGetParams');
				expect(content).toContain("resource: 'ticket'");
				expect(content).toContain("operation: 'get'");

				// Should have node type with inlined fields (not extending NodeBase)
				expect(content).toContain('FreshserviceV1TicketGetNode');
				expect(content).toContain("type: 'n8n-nodes-base.freshservice'");
				expect(content).toContain('version: 1');
				expect(content).not.toContain('FreshserviceV1NodeBase');
			});

			it('should generate self-contained mode file for single discriminator', () => {
				const combo = { mode: 'runOnceForAllItems' };
				const props = generateTypes.getPropertiesForCombination(mockCodeNode, combo);

				// New signature: importDepth instead of sharedImportPath
				const content = generateTypes.generateDiscriminatorFile(
					mockCodeNode,
					2,
					combo,
					props,
					undefined,
					5, // import depth for flat files (v2/mode_run_once_for_all_items.ts)
				);

				// Should NOT have imports (simplified output for LLM)
				expect(content).not.toMatch(/^import type/m);
				expect(content).not.toContain("from './_shared'");

				// Should have params type
				expect(content).toContain('CodeV2RunOnceForAllItemsParams');
				expect(content).toContain("mode: 'runOnceForAllItems'");

				// Should have node type with inlined fields
				expect(content).toContain('CodeV2RunOnceForAllItemsNode');
				expect(content).toContain("type: 'n8n-nodes-base.code'");
				expect(content).toContain('version: 2');
				expect(content).not.toContain('CodeV2NodeBase');
			});

			it('should include output type when schema is provided', () => {
				const combo = { resource: 'ticket', operation: 'get' };
				const props = generateTypes.getPropertiesForCombination(mockFreshserviceNode, combo);
				const schema = {
					type: 'object',
					properties: {
						id: { type: 'number' },
						subject: { type: 'string' },
					},
				};

				const content = generateTypes.generateDiscriminatorFile(
					mockFreshserviceNode,
					1,
					combo,
					props,
					schema,
					6,
				);

				// Should have output type
				expect(content).toContain('FreshserviceV1TicketGetOutput');
				expect(content).toContain('id?:');
				expect(content).toContain('subject?:');

				// Node type should reference output wrapped in Items
				expect(content).toContain('output?: Items<FreshserviceV1TicketGetOutput>');
			});

			it('should inline credentials interface when node has credentials', () => {
				const combo = { resource: 'ticket', operation: 'get' };
				const props = generateTypes.getPropertiesForCombination(mockFreshserviceNode, combo);

				const content = generateTypes.generateDiscriminatorFile(
					mockFreshserviceNode,
					1,
					combo,
					props,
					undefined,
					6,
				);

				// Should have inline credentials interface
				expect(content).toContain('interface Credentials');
				// freshserviceApi is marked as required: true in the mock, so no ? mark
				expect(content).toContain('freshserviceApi: CredentialReference');

				// Node type should reference credentials (credentials field itself is always optional)
				expect(content).toContain('credentials?: Credentials');
			});

			it('should inline helper types when properties need them', () => {
				// Create a mock node with assignmentCollection property
				const mockNodeWithAssignment: NodeTypeDescription = {
					name: 'n8n-nodes-base.set',
					displayName: 'Set',
					group: ['transform'],
					version: 3,
					inputs: ['main'],
					outputs: ['main'],
					properties: [
						{
							displayName: 'Mode',
							name: 'mode',
							type: 'options',
							options: [{ name: 'Manual', value: 'manual' }],
							default: 'manual',
						},
						{
							displayName: 'Fields',
							name: 'assignments',
							type: 'assignmentCollection',
							default: {},
							displayOptions: { show: { mode: ['manual'] } },
						},
					],
				};

				const combo = { mode: 'manual' };
				const props = generateTypes.getPropertiesForCombination(mockNodeWithAssignment, combo);

				const content = generateTypes.generateDiscriminatorFile(
					mockNodeWithAssignment,
					3,
					combo,
					props,
					undefined,
					5,
				);

				// Should have inline helper type definition
				expect(content).toContain('type AssignmentCollectionValue');
				expect(content).toContain('assignments: Array<');
			});

			it('should include SubnodeConfig for AI nodes with required embeddings', () => {
				// Create a mock vector store node with required ai_embedding input using builderHint
				const mockVectorStoreNodeWithEmbedding: NodeTypeDescription = {
					name: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
					displayName: 'Simple Vector Store',
					group: ['transform'],
					version: 1.3,
					builderHint: {
						inputs: {
							ai_embedding: { required: true },
						},
					},
					inputs: [{ type: 'ai_embedding', required: true }],
					outputs: [{ type: 'ai_tool' }],
					properties: [
						{
							displayName: 'Mode',
							name: 'mode',
							type: 'options',
							options: [
								{ name: 'Retrieve As Tool', value: 'retrieve-as-tool' },
								{ name: 'Insert', value: 'insert' },
							],
							default: 'retrieve-as-tool',
						},
						{
							displayName: 'Description',
							name: 'toolDescription',
							type: 'string',
							default: '',
							displayOptions: { show: { mode: ['retrieve-as-tool'] } },
						},
					],
				};

				const combo = { mode: 'retrieve-as-tool' };
				const props = generateTypes.getPropertiesForCombination(
					mockVectorStoreNodeWithEmbedding,
					combo,
				);

				const content = generateTypes.generateDiscriminatorFile(
					mockVectorStoreNodeWithEmbedding,
					1.3,
					combo,
					props,
					undefined,
					5,
				);

				// Should have SubnodeConfig section
				expect(content).toContain('SubnodeConfig');

				// Should import EmbeddingInstance from base
				expect(content).toContain('EmbeddingInstance');

				// Should have embedding field as required (no ?)
				expect(content).toContain('embedding: EmbeddingInstance');
				expect(content).not.toContain('embedding?:');

				// Node type should have subnodes field
				expect(content).toContain('subnodes:');
			});

			it('should include SubnodeConfig with optional subnodes when not required', () => {
				// Create a mock node with builderHint specifying required/optional status
				const mockNodeWithOptionalTool: NodeTypeDescription = {
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					group: ['transform'],
					version: 3.1,
					builderHint: {
						inputs: {
							ai_languageModel: { required: true },
							ai_tool: { required: false },
						},
					},
					inputs: [
						{ type: 'ai_languageModel', required: true },
						{ type: 'ai_tool' }, // optional - no required field
					],
					outputs: ['main'],
					properties: [
						{
							displayName: 'Mode',
							name: 'mode',
							type: 'options',
							options: [{ name: 'Chat', value: 'chat' }],
							default: 'chat',
						},
					],
				};

				const combo = { mode: 'chat' };
				const props = generateTypes.getPropertiesForCombination(mockNodeWithOptionalTool, combo);

				const content = generateTypes.generateDiscriminatorFile(
					mockNodeWithOptionalTool,
					3.1,
					combo,
					props,
					undefined,
					5,
				);

				// Should have SubnodeConfig
				expect(content).toContain('SubnodeConfig');

				// model is required - no ?
				expect(content).toContain('model: LanguageModelInstance');
				expect(content).not.toContain('model?:');

				// tools is optional - has ?
				expect(content).toContain('tools?: ToolInstance[]');
			});

			it('should use builderHint.inputs for mode-specific subnode filtering', () => {
				// Create a mock vector store node with builderHint specifying mode-specific subnodes
				const mockVectorStoreWithBuilderHint: NodeTypeDescription = {
					name: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
					displayName: 'Simple Vector Store',
					group: ['transform'],
					version: 1.3,
					builderHint: {
						inputs: {
							ai_embedding: { required: true },
							ai_reranker: {
								required: false,
								displayOptions: {
									show: {
										useReranker: [true],
									},
								},
							},
							ai_document: {
								required: true,
								displayOptions: {
									show: {
										mode: ['insert'],
									},
								},
							},
						},
					},
					inputs: '={{ ... }}' as unknown as string[],
					outputs: [{ type: 'ai_tool' }],
					properties: [
						{
							displayName: 'Mode',
							name: 'mode',
							type: 'options',
							options: [
								{ name: 'Retrieve As Tool', value: 'retrieve-as-tool' },
								{ name: 'Insert', value: 'insert' },
							],
							default: 'retrieve-as-tool',
						},
						{
							displayName: 'Use Reranker',
							name: 'useReranker',
							type: 'boolean',
							default: false,
						},
					],
				};

				// Test for retrieve-as-tool mode - should NOT include ai_document
				const retrieveCombo = { mode: 'retrieve-as-tool' };
				const retrieveProps = generateTypes.getPropertiesForCombination(
					mockVectorStoreWithBuilderHint,
					retrieveCombo,
				);

				const retrieveContent = generateTypes.generateDiscriminatorFile(
					mockVectorStoreWithBuilderHint,
					1.3,
					retrieveCombo,
					retrieveProps,
					undefined,
					5,
				);

				// Should have embedding (required)
				expect(retrieveContent).toContain('embedding: EmbeddingInstance');
				// Should have reranker with displayOptions JSDoc (optional)
				expect(retrieveContent).toContain('@displayOptions.show { useReranker: [true] }');
				expect(retrieveContent).toContain('reranker?: RerankerInstance');
				// Should NOT have documentLoader (mode !== 'insert')
				expect(retrieveContent).not.toContain('documentLoader');

				// Test for insert mode - should include ai_document
				const insertCombo = { mode: 'insert' };
				const insertProps = generateTypes.getPropertiesForCombination(
					mockVectorStoreWithBuilderHint,
					insertCombo,
				);

				const insertContent = generateTypes.generateDiscriminatorFile(
					mockVectorStoreWithBuilderHint,
					1.3,
					insertCombo,
					insertProps,
					undefined,
					5,
				);

				// Should have embedding
				expect(insertContent).toContain('embedding: EmbeddingInstance');
				// Should have reranker with displayOptions
				expect(insertContent).toContain('reranker?: RerankerInstance');
				// Should have documentLoader (mode === 'insert')
				expect(insertContent).toContain('documentLoader: DocumentLoaderInstance');
			});
		});

		describe('buildDiscriminatorTree', () => {
			it('should build tree for resource/operation pattern', () => {
				const combinations = generateTypes.extractDiscriminatorCombinations(mockFreshserviceNode);
				const tree = generateTypes.buildDiscriminatorTree(combinations);

				expect(tree.type).toBe('resource_operation');
				expect(tree.resources).toBeDefined();
				expect(tree.resources?.get('ticket')).toContain('get');
				expect(tree.resources?.get('ticket')).toContain('create');
				expect(tree.resources?.get('ticket')).toContain('delete');
				expect(tree.resources?.get('agent')).toContain('get');
				expect(tree.resources?.get('agent')).toContain('create');
			});

			it('should build tree for single discriminator pattern', () => {
				const combinations = generateTypes.extractDiscriminatorCombinations(mockCodeNode);
				const tree = generateTypes.buildDiscriminatorTree(combinations);

				expect(tree.type).toBe('single');
				expect(tree.discriminatorName).toBe('mode');
				expect(tree.discriminatorValues).toContain('runOnceForAllItems');
				expect(tree.discriminatorValues).toContain('runOnceForEachItem');
			});
		});

		describe('generateResourceIndexFile', () => {
			it('should generate index for a resource directory', () => {
				const content = generateTypes.generateResourceIndexFile(mockFreshserviceNode, 1, 'ticket', [
					'get',
					'create',
					'delete',
				]);

				// Should re-export operations
				expect(content).toContain("export * from './operation_get'");
				expect(content).toContain("export * from './operation_create'");
				expect(content).toContain("export * from './operation_delete'");

				// Should import node types for union
				expect(content).toContain('FreshserviceV1TicketGetNode');
				expect(content).toContain('FreshserviceV1TicketCreateNode');
				expect(content).toContain('FreshserviceV1TicketDeleteNode');

				// Should have combined resource node type
				expect(content).toContain('FreshserviceV1TicketNode');
			});
		});

		describe('generateSplitVersionIndexFile', () => {
			it('should generate version index for resource/operation pattern without _shared re-export', () => {
				const combinations = generateTypes.extractDiscriminatorCombinations(mockFreshserviceNode);
				const tree = generateTypes.buildDiscriminatorTree(combinations);
				const content = generateTypes.generateSplitVersionIndexFile(mockFreshserviceNode, 1, tree);

				// Should NOT re-export from _shared (removed)
				expect(content).not.toContain("export * from './_shared'");

				// Should re-export resource directories
				expect(content).toContain("export * from './resource_ticket'");
				expect(content).toContain("export * from './resource_agent'");

				// Should have combined node type
				expect(content).toContain('FreshserviceV1Node');
				expect(content).toContain('FreshserviceV1TicketNode');
				expect(content).toContain('FreshserviceV1AgentNode');
			});

			it('should generate version index for single discriminator pattern without _shared re-export', () => {
				const combinations = generateTypes.extractDiscriminatorCombinations(mockCodeNode);
				const tree = generateTypes.buildDiscriminatorTree(combinations);
				const content = generateTypes.generateSplitVersionIndexFile(mockCodeNode, 2, tree);

				// Should NOT re-export from _shared (removed)
				expect(content).not.toContain("export * from './_shared'");

				// Should re-export mode files
				expect(content).toContain("export * from './mode_run_once_for_all_items'");
				expect(content).toContain("export * from './mode_run_once_for_each_item'");

				// Should have combined node type
				expect(content).toContain('CodeV2Node');
			});
		});

		describe('planSplitVersionFiles', () => {
			it('should plan correct file structure for resource/operation node without _shared.ts', () => {
				const plan = generateTypes.planSplitVersionFiles(mockFreshserviceNode, 1);

				// Should NOT have _shared.ts (removed)
				expect(plan.has('_shared.ts')).toBe(false);

				// Should have version index without _shared re-export
				expect(plan.has('index.ts')).toBe(true);
				expect(plan.get('index.ts')).not.toContain("export * from './_shared'");

				// Should have resource directories with index files
				expect(plan.has('resource_ticket/index.ts')).toBe(true);
				expect(plan.has('resource_agent/index.ts')).toBe(true);

				// Should have operation files
				expect(plan.has('resource_ticket/operation_get.ts')).toBe(true);
				expect(plan.has('resource_ticket/operation_create.ts')).toBe(true);
				expect(plan.has('resource_ticket/operation_delete.ts')).toBe(true);
				expect(plan.has('resource_agent/operation_get.ts')).toBe(true);
				expect(plan.has('resource_agent/operation_create.ts')).toBe(true);

				// Operation files should have correct content
				const ticketGetContent = plan.get('resource_ticket/operation_get.ts');
				expect(ticketGetContent).toContain("resource: 'ticket'");
				expect(ticketGetContent).toContain("operation: 'get'");
				expect(ticketGetContent).toContain('FreshserviceV1TicketGetParams');
				expect(ticketGetContent).toContain('FreshserviceV1TicketGetNode');
			});

			it('should plan correct file structure for single discriminator node (mode) without _shared.ts', () => {
				const plan = generateTypes.planSplitVersionFiles(mockCodeNode, 2);

				// Should NOT have _shared.ts (removed)
				expect(plan.has('_shared.ts')).toBe(false);

				// Should have version index without _shared re-export
				expect(plan.has('index.ts')).toBe(true);
				expect(plan.get('index.ts')).not.toContain("export * from './_shared'");

				// Should have mode files (flat, not nested)
				expect(plan.has('mode_run_once_for_all_items.ts')).toBe(true);
				expect(plan.has('mode_run_once_for_each_item.ts')).toBe(true);

				// Mode files should have correct content
				const allItemsContent = plan.get('mode_run_once_for_all_items.ts');
				expect(allItemsContent).toContain("mode: 'runOnceForAllItems'");
				expect(allItemsContent).toContain('CodeV2RunOnceForAllItemsParams');
				expect(allItemsContent).toContain('CodeV2RunOnceForAllItemsNode');

				// Should NOT have nested resource directories
				expect([...plan.keys()].some((k) => k.startsWith('resource_'))).toBe(false);
			});

			it('should generate self-contained discriminator files without imports (simplified for LLM)', () => {
				const plan = generateTypes.planSplitVersionFiles(mockFreshserviceNode, 1);

				// Operation files should NOT have imports (simplified output for LLM)
				const ticketGetContent = plan.get('resource_ticket/operation_get.ts');
				expect(ticketGetContent).not.toMatch(/^import type/m);
				expect(ticketGetContent).not.toContain("from '../_shared'");

				// Mode files should NOT have imports (simplified output for LLM)
				const codePlan = generateTypes.planSplitVersionFiles(mockCodeNode, 2);
				const modeContent = codePlan.get('mode_run_once_for_all_items.ts');
				expect(modeContent).not.toMatch(/^import type/m);
				expect(modeContent).not.toContain("from './_shared'");
			});

			it('should inline node type fields instead of using NodeBase', () => {
				const plan = generateTypes.planSplitVersionFiles(mockFreshserviceNode, 1);

				// Operation files should have inline node type
				const ticketGetContent = plan.get('resource_ticket/operation_get.ts');
				expect(ticketGetContent).toContain("type: 'n8n-nodes-base.freshservice'");
				expect(ticketGetContent).toContain('version: 1');
				expect(ticketGetContent).not.toContain('FreshserviceV1NodeBase');
			});

			it('should generate schema files alongside type files for resource/operation pattern', () => {
				const plan = generateTypes.planSplitVersionFiles(mockFreshserviceNode, 1);

				// Should have schema files alongside type files (.schema.js - CommonJS JavaScript)
				expect(plan.has('resource_ticket/operation_get.schema.js')).toBe(true);
				expect(plan.has('resource_ticket/operation_create.schema.js')).toBe(true);
				expect(plan.has('resource_ticket/operation_delete.schema.js')).toBe(true);
				expect(plan.has('resource_agent/operation_get.schema.js')).toBe(true);
				expect(plan.has('resource_agent/operation_create.schema.js')).toBe(true);

				// Should have resource schema index files
				expect(plan.has('resource_ticket/index.schema.js')).toBe(true);
				expect(plan.has('resource_agent/index.schema.js')).toBe(true);

				// Should have version schema index file
				expect(plan.has('index.schema.js')).toBe(true);

				// Operation schema files should export factory function that receives helpers as parameters
				const ticketGetSchemaContent = plan.get('resource_ticket/operation_get.schema.js');
				// Helpers come from parameters, not require()
				expect(ticketGetSchemaContent).toContain(
					'module.exports = function getSchema({ parameters, z,',
				);
				expect(ticketGetSchemaContent).not.toContain("require('zod')");
				expect(ticketGetSchemaContent).not.toContain('base.schema');
				expect(ticketGetSchemaContent).toContain("resource: z.literal('ticket')");
				expect(ticketGetSchemaContent).toContain("operation: z.literal('get')");
			});

			it('should generate schema files alongside type files for single discriminator (mode)', () => {
				const plan = generateTypes.planSplitVersionFiles(mockCodeNode, 2);

				// Should have schema files (.schema.js - CommonJS JavaScript)
				expect(plan.has('mode_run_once_for_all_items.schema.js')).toBe(true);
				expect(plan.has('mode_run_once_for_each_item.schema.js')).toBe(true);

				// Should have version schema index file
				expect(plan.has('index.schema.js')).toBe(true);

				// Mode schema files should export factory function that receives helpers as parameters
				const modeSchemaContent = plan.get('mode_run_once_for_all_items.schema.js');
				// Helpers come from parameters, not require()
				expect(modeSchemaContent).toContain('module.exports = function getSchema({ parameters, z,');
				expect(modeSchemaContent).not.toContain("require('zod')");
				expect(modeSchemaContent).not.toContain('base.schema');
				expect(modeSchemaContent).toContain("mode: z.literal('runOnceForAllItems')");
			});

			it('should generate schema index files with factory functions', () => {
				const plan = generateTypes.planSplitVersionFiles(mockFreshserviceNode, 1);

				// Resource index.schema.js should require operation factories and export factory via module.exports
				const resourceSchemaIndex = plan.get('resource_ticket/index.schema.js');
				expect(resourceSchemaIndex).toContain(
					"const getCreateSchema = require('./operation_create.schema')",
				);
				expect(resourceSchemaIndex).toContain(
					"const getGetSchema = require('./operation_get.schema')",
				);
				expect(resourceSchemaIndex).toContain('module.exports = function getSchema');

				// Version index.schema.js should require resource factories and export factory via module.exports
				const versionSchemaIndex = plan.get('index.schema.js');
				expect(versionSchemaIndex).toContain(
					"const getTicketSchema = require('./resource_ticket/index.schema')",
				);
				expect(versionSchemaIndex).toContain(
					"const getAgentSchema = require('./resource_agent/index.schema')",
				);
				expect(versionSchemaIndex).toContain('module.exports = function getSchema');
			});
		});
	});

	// =========================================================================
	// Narrowed Subnode Config Generation Tests
	// =========================================================================

	describe('narrowed subnode config generation', () => {
		describe('extractAIInputTypes', () => {
			it('should extract AI input types from static array inputs', () => {
				const mockAgentNode: NodeTypeDescription = {
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					description: 'AI Agent node',
					group: ['transform'],
					version: 3.1,
					inputs: [
						{ type: 'main' },
						{ type: 'ai_languageModel', displayName: 'Model' },
						{ type: 'ai_memory', displayName: 'Memory' },
						{ type: 'ai_tool', displayName: 'Tool' },
						{ type: 'ai_outputParser', displayName: 'Output Parser' },
					],
					outputs: ['main'],
					properties: [],
				};
				const result = generateTypes.extractAIInputTypes(mockAgentNode);
				const types = result.map((r) => r.type);
				expect(types).toContain('ai_languageModel');
				expect(types).toContain('ai_memory');
				expect(types).toContain('ai_tool');
				expect(types).toContain('ai_outputParser');
				expect(types).not.toContain('main');
				expect(types).not.toContain('ai_vectorStore');
			});

			it('should extract AI input types from dynamic expression inputs', () => {
				const mockAgentWithExpressionInputs: NodeTypeDescription = {
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					description: 'AI Agent node',
					group: ['transform'],
					version: 3.1,
					inputs: `={{
						let specialInputs = [
							{ type: "ai_languageModel" },
							{ type: "ai_memory" },
							{ type: "ai_tool" },
						];
						return specialInputs;
					}}` as unknown as string[],
					outputs: ['main'],
					properties: [],
				};
				const result = generateTypes.extractAIInputTypes(mockAgentWithExpressionInputs);
				const types = result.map((r) => r.type);
				expect(types).toContain('ai_languageModel');
				expect(types).toContain('ai_memory');
				expect(types).toContain('ai_tool');
				expect(types).not.toContain('ai_vectorStore');
			});

			it('should return empty array for nodes with no AI inputs', () => {
				const mockHttpNode: NodeTypeDescription = {
					name: 'n8n-nodes-base.httpRequest',
					displayName: 'HTTP Request',
					description: 'Makes HTTP requests',
					group: ['transform'],
					version: 4.2,
					inputs: ['main'],
					outputs: ['main'],
					properties: [],
				};
				const result = generateTypes.extractAIInputTypes(mockHttpNode);
				expect(result).toEqual([]);
			});

			it('should deduplicate AI input types', () => {
				const mockNodeWithDuplicates: NodeTypeDescription = {
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					description: 'AI Agent node',
					group: ['transform'],
					version: 3.1,
					inputs: [
						{ type: 'ai_languageModel', displayName: 'Chat Model' },
						{ type: 'ai_languageModel', displayName: 'Fallback Model' },
						{ type: 'ai_tool' },
					],
					outputs: ['main'],
					properties: [],
				};
				const result = generateTypes.extractAIInputTypes(mockNodeWithDuplicates);
				expect(result.filter((r) => r.type === 'ai_languageModel').length).toBe(1);
			});

			it('should handle string array inputs format', () => {
				const mockNodeWithStringInputs: NodeTypeDescription = {
					name: 'n8n-nodes-base.set',
					displayName: 'Set',
					description: 'Set values',
					group: ['transform'],
					version: 3,
					inputs: ['main'],
					outputs: ['main'],
					properties: [],
				};
				const result = generateTypes.extractAIInputTypes(mockNodeWithStringInputs);
				expect(result).toEqual([]);
			});

			it('should extract required status from AI inputs', () => {
				const mockAgentNode: NodeTypeDescription = {
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					description: 'AI Agent node',
					group: ['transform'],
					version: 3.1,
					inputs: [
						{ type: 'ai_languageModel', required: true },
						{ type: 'ai_memory' }, // required: undefined = optional
						{ type: 'ai_tool' },
					],
					outputs: ['main'],
					properties: [],
				};
				const result = generateTypes.extractAIInputTypes(mockAgentNode);
				expect(result).toContainEqual({ type: 'ai_languageModel', required: true });
				expect(result).toContainEqual({ type: 'ai_memory', required: false });
				expect(result).toContainEqual({ type: 'ai_tool', required: false });
			});

			it('should mark type as required if ANY input of that type is required', () => {
				const mockNodeWithDuplicates: NodeTypeDescription = {
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					description: 'AI Agent node',
					group: ['transform'],
					version: 3.1,
					inputs: [
						{ type: 'ai_languageModel', displayName: 'Chat Model', required: true },
						{ type: 'ai_languageModel', displayName: 'Fallback Model' }, // not required
						{ type: 'ai_tool' },
					],
					outputs: ['main'],
					properties: [],
				};
				const result = generateTypes.extractAIInputTypes(mockNodeWithDuplicates);
				const modelInput = result.find((r) => r.type === 'ai_languageModel');
				expect(modelInput?.required).toBe(true);
			});
		});

		describe('extractAIInputTypesFromBuilderHint', () => {
			it('should extract inputs from builderHint when present', () => {
				const mockNode: NodeTypeDescription = {
					name: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
					displayName: 'Simple Vector Store',
					group: ['transform'],
					version: 1.3,
					builderHint: {
						inputs: {
							ai_embedding: { required: true },
							ai_reranker: {
								required: false,
								displayOptions: {
									show: {
										useReranker: [true],
									},
								},
							},
							ai_document: {
								required: true,
								displayOptions: {
									show: {
										mode: ['insert'],
									},
								},
							},
						},
					},
					inputs: '={{ ... }}' as unknown as string[],
					outputs: ['main'],
					properties: [],
				};

				// For retrieve-as-tool mode - ai_document should be excluded
				const result = generateTypes.extractAIInputTypesFromBuilderHint(mockNode, {
					mode: 'retrieve-as-tool',
				});

				expect(result).toContainEqual({ type: 'ai_embedding', required: true });
				expect(result).toContainEqual({
					type: 'ai_reranker',
					required: false,
					displayOptions: {
						show: {
							useReranker: [true],
						},
					},
				});
				// ai_document should NOT be included (mode !== 'insert')
				expect(result.find((r) => r.type === 'ai_document')).toBeUndefined();
			});

			it('should include ai_document for insert mode', () => {
				const mockNode: NodeTypeDescription = {
					name: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
					displayName: 'Simple Vector Store',
					group: ['transform'],
					version: 1.3,
					builderHint: {
						inputs: {
							ai_embedding: { required: true },
							ai_document: {
								required: true,
								displayOptions: {
									show: {
										mode: ['insert'],
									},
								},
							},
						},
					},
					inputs: '={{ ... }}' as unknown as string[],
					outputs: ['main'],
					properties: [],
				};

				const result = generateTypes.extractAIInputTypesFromBuilderHint(mockNode, {
					mode: 'insert',
				});

				expect(result.find((r) => r.type === 'ai_document')).toBeDefined();
				expect(result.find((r) => r.type === 'ai_document')?.required).toBe(true);
			});

			it('should fall back to extractAIInputTypes when no builderHint and mark all as optional', () => {
				const mockNode: NodeTypeDescription = {
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					group: ['transform'],
					version: 3.1,
					inputs: [{ type: 'ai_embedding', required: true }], // Even if marked required in inputs
					outputs: ['main'],
					properties: [],
				};

				const result = generateTypes.extractAIInputTypesFromBuilderHint(mockNode);
				// Should be optional in fallback, regardless of inputs definition
				expect(result).toContainEqual({ type: 'ai_embedding', required: false });
			});

			it('should strip discriminator displayOptions and keep non-discriminator ones', () => {
				const mockNode: NodeTypeDescription = {
					name: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
					displayName: 'Simple Vector Store',
					group: ['transform'],
					version: 1.3,
					builderHint: {
						inputs: {
							ai_reranker: {
								required: false,
								displayOptions: {
									show: {
										mode: ['retrieve-as-tool', 'load'], // discriminator - should be stripped
										useReranker: [true], // non-discriminator - should be kept
									},
								},
							},
						},
					},
					inputs: '={{ ... }}' as unknown as string[],
					outputs: ['main'],
					properties: [],
				};

				const result = generateTypes.extractAIInputTypesFromBuilderHint(mockNode, {
					mode: 'retrieve-as-tool',
				});

				const reranker = result.find((r) => r.type === 'ai_reranker');
				expect(reranker).toBeDefined();
				// Should only have non-discriminator displayOptions
				expect(reranker?.displayOptions).toEqual({
					show: {
						useReranker: [true],
					},
				});
				// Mode should NOT be in the displayOptions (it was used for filtering)
				expect(reranker?.displayOptions?.show?.mode).toBeUndefined();
			});
		});

		describe('generateNarrowedSubnodeConfig', () => {
			it('should generate narrowed config with only accepted subnodes', () => {
				const aiInputTypes = [
					{ type: 'ai_languageModel', required: false },
					{ type: 'ai_memory', required: false },
					{ type: 'ai_tool', required: false },
					{ type: 'ai_outputParser', required: false },
				];
				const result = generateTypes.generateNarrowedSubnodeConfig(aiInputTypes, 'LcAgent', 'V31');

				expect(result).toContain('export interface LcAgentV31SubnodeConfig');
				expect(result).toContain('model?:');
				expect(result).toContain('memory?:');
				expect(result).toContain('tools?:');
				expect(result).toContain('outputParser?:');
				expect(result).not.toContain('vectorStore');
				expect(result).not.toContain('embedding');
				expect(result).not.toContain('retriever');
			});

			it('should return null for nodes with no AI inputs', () => {
				const result = generateTypes.generateNarrowedSubnodeConfig([], 'Http', 'V42');
				expect(result).toBeNull();
			});

			it('should include correct instance types', () => {
				const aiInputTypes = [
					{ type: 'ai_languageModel', required: false },
					{ type: 'ai_tool', required: false },
				];
				const result = generateTypes.generateNarrowedSubnodeConfig(aiInputTypes, 'LcAgent', 'V31');

				expect(result).toContain('LanguageModelInstance');
				expect(result).toContain('ToolInstance');
			});

			it('should handle array vs single instance correctly', () => {
				const aiInputTypes = [
					{ type: 'ai_languageModel', required: false },
					{ type: 'ai_memory', required: false },
					{ type: 'ai_tool', required: false },
				];
				const result = generateTypes.generateNarrowedSubnodeConfig(aiInputTypes, 'LcAgent', 'V31');

				// model can be single or array
				expect(result).toContain('model?: LanguageModelInstance | LanguageModelInstance[]');
				// memory is single
				expect(result).toContain('memory?: MemoryInstance');
				// tools is array
				expect(result).toContain('tools?: ToolInstance[]');
			});

			it('should generate non-optional field for required subnodes', () => {
				const aiInputTypes = [
					{ type: 'ai_languageModel', required: true },
					{ type: 'ai_memory', required: false },
				];
				const result = generateTypes.generateNarrowedSubnodeConfig(aiInputTypes, 'LcAgent', 'V31');

				// model is required - no ?
				expect(result).toContain('model: LanguageModelInstance');
				expect(result).not.toContain('model?:');
				// memory is optional - has ?
				expect(result).toContain('memory?: MemoryInstance');
			});

			it('should generate optional field when required is false', () => {
				const aiInputTypes = [
					{ type: 'ai_languageModel', required: false },
					{ type: 'ai_tool', required: false },
				];
				const result = generateTypes.generateNarrowedSubnodeConfig(aiInputTypes, 'LcAgent', 'V31');

				expect(result).toContain('model?: LanguageModelInstance');
				expect(result).toContain('tools?: ToolInstance[]');
			});

			it('should add JSDoc comment for non-discriminator displayOptions', () => {
				const aiInputTypes = [
					{ type: 'ai_embedding', required: true },
					{
						type: 'ai_reranker',
						required: false,
						displayOptions: {
							show: {
								useReranker: [true],
							},
						},
					},
				];
				const result = generateTypes.generateNarrowedSubnodeConfig(
					aiInputTypes,
					'LcVectorStore',
					'V13',
				);

				expect(result).toContain('embedding: EmbeddingInstance');
				expect(result).toContain('@displayOptions.show { useReranker: [true] }');
				expect(result).toContain('reranker?: RerankerInstance');
			});
		});

		describe('generateSingleVersionTypeFile with narrowed subnodes', () => {
			it('should generate narrowed subnode config for AI nodes', () => {
				const mockAgentNode: NodeTypeDescription = {
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					description: 'AI Agent node',
					group: ['transform'],
					version: 3.1,
					inputs: [
						{ type: 'main' },
						{ type: 'ai_languageModel', displayName: 'Model' },
						{ type: 'ai_memory', displayName: 'Memory' },
						{ type: 'ai_tool', displayName: 'Tool' },
						{ type: 'ai_outputParser', displayName: 'Output Parser' },
					],
					outputs: ['main'],
					properties: [],
				};

				const result = generateTypes.generateSingleVersionTypeFile(mockAgentNode, 3.1);

				// Should have narrowed subnode config
				expect(result).toContain('LcAgentV31SubnodeConfig');
				expect(result).toContain('model?:');
				expect(result).toContain('memory?:');
				expect(result).toContain('tools?:');
				expect(result).toContain('outputParser?:');

				// Should NOT have vectorStore, embedding, retriever
				expect(result).not.toContain('vectorStore?:');
				expect(result).not.toContain('embedding?:');
				expect(result).not.toContain('retriever?:');
			});

			it('should not generate narrowed subnode config for non-AI nodes', () => {
				const mockHttpNode: NodeTypeDescription = {
					name: 'n8n-nodes-base.httpRequest',
					displayName: 'HTTP Request',
					description: 'Makes HTTP requests',
					group: ['transform'],
					version: 4.2,
					inputs: ['main'],
					outputs: ['main'],
					properties: [],
				};

				const result = generateTypes.generateSingleVersionTypeFile(mockHttpNode, 4.2);

				// Should NOT have SubnodeConfig
				expect(result).not.toContain('SubnodeConfig');
			});

			it('should use subnode instance types when AI inputs exist (no imports in simplified output)', () => {
				const mockAgentNode: NodeTypeDescription = {
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					description: 'AI Agent node',
					group: ['transform'],
					version: 3.1,
					inputs: [
						{ type: 'main' },
						{ type: 'ai_languageModel', displayName: 'Model' },
						{ type: 'ai_tool', displayName: 'Tool' },
					],
					outputs: ['main'],
					properties: [],
				};

				const result = generateTypes.generateSingleVersionTypeFile(mockAgentNode, 3.1);

				// Should NOT have imports (simplified output for LLM)
				expect(result).not.toMatch(/^import type/m);
				// But should still use the instance types in the type definitions
				expect(result).toContain('LanguageModelInstance');
				expect(result).toContain('ToolInstance');
			});

			it('should generate non-optional fields for required AI inputs', () => {
				const mockAgentNode: NodeTypeDescription = {
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					description: 'AI Agent node',
					group: ['transform'],
					version: 3.1,
					builderHint: {
						inputs: {
							ai_languageModel: { required: true },
							ai_memory: { required: false },
							ai_tool: { required: false },
						},
					},
					inputs: [
						{ type: 'main' },
						{ type: 'ai_languageModel', displayName: 'Model', required: true },
						{ type: 'ai_memory', displayName: 'Memory' },
						{ type: 'ai_tool', displayName: 'Tool' },
					],
					outputs: ['main'],
					properties: [],
				};

				const result = generateTypes.generateSingleVersionTypeFile(mockAgentNode, 3.1);

				// model should be non-optional (required: true)
				expect(result).toContain('model: LanguageModelInstance');
				expect(result).not.toContain('model?:');
				// memory should be optional (no required field)
				expect(result).toContain('memory?: MemoryInstance');
				// tools should be optional (no required field)
				expect(result).toContain('tools?: ToolInstance[]');
			});
		});
	});

	describe('generated type files should be simplified (no imports, no section dividers)', () => {
		describe('generateDiscriminatorFile', () => {
			it('should NOT contain import type statements', () => {
				const content = generateTypes.generateDiscriminatorFile(
					mockGmailNode,
					2,
					{ resource: 'message', operation: 'send' },
					mockGmailNode.properties.filter((p) =>
						p.displayOptions?.show?.resource?.includes('message'),
					),
				);

				expect(content).not.toMatch(/^import type/m);
			});

			it('should NOT contain section dividers', () => {
				const content = generateTypes.generateDiscriminatorFile(
					mockGmailNode,
					2,
					{ resource: 'message', operation: 'send' },
					mockGmailNode.properties.filter((p) =>
						p.displayOptions?.show?.resource?.includes('message'),
					),
				);

				expect(content).not.toMatch(/^\/\/ =+$/m);
				expect(content).not.toMatch(/^\/\/ Credentials$/m);
				expect(content).not.toMatch(/^\/\/ Config$/m);
				expect(content).not.toMatch(/^\/\/ Node Type$/m);
			});

			it('should still contain valid type definitions', () => {
				const content = generateTypes.generateDiscriminatorFile(
					mockGmailNode,
					2,
					{ resource: 'message', operation: 'send' },
					mockGmailNode.properties.filter((p) =>
						p.displayOptions?.show?.resource?.includes('message'),
					),
				);

				expect(content).toContain('interface Credentials');
				expect(content).toContain('export type');
			});
		});

		describe('generateSharedFile', () => {
			it('should NOT contain import type statements', () => {
				const content = generateTypes.generateSharedFile(mockGmailNode, 2);

				expect(content).not.toMatch(/^import type/m);
			});

			it('should NOT contain section dividers', () => {
				const content = generateTypes.generateSharedFile(mockGmailNode, 2);

				expect(content).not.toMatch(/^\/\/ =+$/m);
				expect(content).not.toMatch(/^\/\/ Credentials$/m);
				expect(content).not.toMatch(/^\/\/ Base Node Type$/m);
			});

			it('should NOT contain re-export statements', () => {
				const content = generateTypes.generateSharedFile(mockGmailNode, 2);

				expect(content).not.toMatch(/^export type \{.*\} from/m);
			});

			it('should still contain valid type definitions', () => {
				const content = generateTypes.generateSharedFile(mockGmailNode, 2);

				expect(content).toContain('export interface');
			});
		});

		describe('generateSingleVersionTypeFile', () => {
			it('should NOT contain import type statements', () => {
				const content = generateTypes.generateSingleVersionTypeFile(mockGmailNode, 2);

				expect(content).not.toMatch(/^import type/m);
			});

			it('should NOT contain section dividers', () => {
				const content = generateTypes.generateSingleVersionTypeFile(mockGmailNode, 2);

				expect(content).not.toMatch(/^\/\/ =+$/m);
				expect(content).not.toMatch(/^\/\/ Parameters$/m);
				expect(content).not.toMatch(/^\/\/ Credentials$/m);
				expect(content).not.toMatch(/^\/\/ Node Types$/m);
			});

			it('should still contain valid type definitions', () => {
				const content = generateTypes.generateSingleVersionTypeFile(mockGmailNode, 2);

				expect(content).toContain('export type');
				expect(content).toContain('export interface');
			});
		});

		describe('generateNodeTypeFile', () => {
			it('should NOT contain import type statements', () => {
				const content = generateTypes.generateNodeTypeFile(mockGmailNode);

				expect(content).not.toMatch(/^import type/m);
			});

			it('should NOT contain section dividers', () => {
				const content = generateTypes.generateNodeTypeFile(mockGmailNode);

				expect(content).not.toMatch(/^\/\/ =+$/m);
				expect(content).not.toMatch(/^\/\/ Parameters$/m);
				expect(content).not.toMatch(/^\/\/ Credentials$/m);
				expect(content).not.toMatch(/^\/\/ Node Types$/m);
			});

			it('should still contain valid type definitions', () => {
				const content = generateTypes.generateNodeTypeFile(mockGmailNode);

				expect(content).toContain('export type');
				expect(content).toContain('export interface');
			});
		});
	});

	describe('discoverSchemasForNode', () => {
		// Use real filesystem with temp directories under NODES_BASE_DIST
		const NODES_BASE_DIST = path.resolve(__dirname, '../../../../nodes-base/dist/nodes');

		function createTestSchemaDir(nodeName: string, version: string, files: Record<string, string>) {
			const schemaDir = path.join(NODES_BASE_DIST, nodeName, '__schema__', version);
			fs.mkdirSync(schemaDir, { recursive: true });
			for (const [filePath, content] of Object.entries(files)) {
				const fullPath = path.join(schemaDir, filePath);
				fs.mkdirSync(path.dirname(fullPath), { recursive: true });
				fs.writeFileSync(fullPath, content);
			}
			return path.join(NODES_BASE_DIST, nodeName);
		}

		function cleanupTestDir(nodeName: string) {
			const dir = path.join(NODES_BASE_DIST, nodeName);
			fs.rmSync(dir, { recursive: true, force: true });
		}

		it('discovers JSON files directly in the version directory (no resource/operation)', () => {
			const nodeName = '__TestWebhookRootJson__';
			const mockSchema = {
				type: 'object',
				properties: {
					body: { type: 'object' },
					webhookUrl: { type: 'string' },
				},
				version: 1,
			};

			try {
				createTestSchemaDir(nodeName, 'v2.0.0', {
					'output.json': JSON.stringify(mockSchema),
				});

				const result = generateTypes.discoverSchemasForNode(
					`n8n-nodes-base.${nodeName}`,
					2,
					nodeName,
				);

				expect(result).toHaveLength(1);
				expect(result[0]).toEqual({
					resource: '',
					operation: 'output',
					schema: mockSchema,
				});
			} finally {
				cleanupTestDir(nodeName);
			}
		});

		it('discovers both root-level JSON files and resource subdirectories', () => {
			const nodeName = '__TestMixedNodeBoth__';
			const rootSchema = { type: 'object', properties: { id: { type: 'string' } } };
			const resourceSchema = { type: 'object', properties: { name: { type: 'string' } } };

			try {
				createTestSchemaDir(nodeName, 'v1.0.0', {
					'output.json': JSON.stringify(rootSchema),
					'contact/get.json': JSON.stringify(resourceSchema),
				});

				const result = generateTypes.discoverSchemasForNode(
					`n8n-nodes-base.${nodeName}`,
					1,
					nodeName,
				);

				expect(result).toHaveLength(2);

				const rootEntry = result.find((s) => s.resource === '');
				const resourceEntry = result.find((s) => s.resource === 'contact');

				expect(rootEntry).toEqual({
					resource: '',
					operation: 'output',
					schema: rootSchema,
				});
				expect(resourceEntry).toEqual({
					resource: 'contact',
					operation: 'get',
					schema: resourceSchema,
				});
			} finally {
				cleanupTestDir(nodeName);
			}
		});

		it('skips invalid JSON files at the root level', () => {
			const nodeName = '__TestInvalidRootJson__';

			try {
				createTestSchemaDir(nodeName, 'v1.0.0', {
					'broken.json': 'not valid json {{{',
				});

				const result = generateTypes.discoverSchemasForNode(
					`n8n-nodes-base.${nodeName}`,
					1,
					nodeName,
				);

				expect(result).toHaveLength(0);
			} finally {
				cleanupTestDir(nodeName);
			}
		});
	});

	describe('generateSingleVersionTypeFile with root-level output schema', () => {
		const NODES_BASE_DIST = path.resolve(__dirname, '../../../../nodes-base/dist/nodes');

		function createTestSchemaDir(nodeName: string, version: string, files: Record<string, string>) {
			const schemaDir = path.join(NODES_BASE_DIST, nodeName, '__schema__', version);
			fs.mkdirSync(schemaDir, { recursive: true });
			for (const [filePath, content] of Object.entries(files)) {
				const fullPath = path.join(schemaDir, filePath);
				fs.mkdirSync(path.dirname(fullPath), { recursive: true });
				fs.writeFileSync(fullPath, content);
			}
		}

		function cleanupTestDir(nodeName: string) {
			const dir = path.join(NODES_BASE_DIST, nodeName);
			fs.rmSync(dir, { recursive: true, force: true });
		}

		it('produces an output type for a node without resource/operation discriminators', () => {
			const nodeName = '__TestWebhookOutput__';
			const mockSchema = {
				type: 'object',
				properties: {
					body: { type: 'object' },
					webhookUrl: { type: 'string' },
				},
			};

			const mockWebhookNode: NodeTypeDescription = {
				name: `n8n-nodes-base.${nodeName}`,
				displayName: 'Test Webhook',
				description: 'Test webhook node',
				group: ['trigger'],
				version: 2,
				inputs: [],
				outputs: ['main'],
				schemaPath: nodeName,
				properties: [
					{
						displayName: 'HTTP Method',
						name: 'httpMethod',
						type: 'options',
						options: [
							{ name: 'GET', value: 'GET' },
							{ name: 'POST', value: 'POST' },
						],
						default: 'GET',
					},
				],
			};

			try {
				createTestSchemaDir(nodeName, 'v2.0.0', {
					'output.json': JSON.stringify(mockSchema),
				});

				const content = generateTypes.generateSingleVersionTypeFile(mockWebhookNode, 2);

				// Should contain an Output type derived from the schema
				expect(content).toContain('Output');
				expect(content).toMatch(/export type \w+Output\b/);
				// Should contain the schema properties
				expect(content).toContain('body');
				expect(content).toContain('webhookUrl');
			} finally {
				cleanupTestDir(nodeName);
			}
		});
	});
});

// =============================================================================
// orchestrateGeneration Tests
// =============================================================================

describe('orchestrateGeneration', () => {
	const outputDir = path.join(os.tmpdir(), `n8n-test-orchestrate-${Date.now()}`);
	let mod: typeof GenerateTypesModule;

	beforeAll(async () => {
		mod = await import('../generate-types/generate-types');
	});

	afterAll(async () => {
		await fs.promises.rm(outputDir, { recursive: true, force: true });
	});

	it('should generate .ts type files and .schema.js schema files for each node version', async () => {
		const nodes: NodeTypeDescription[] = [
			{
				name: 'n8n-nodes-base.testNode',
				displayName: 'Test Node',
				description: 'A test node',
				group: ['transform'],
				version: 1,
				properties: [
					{
						name: 'operation',
						displayName: 'Operation',
						type: 'string',
						default: 'get',
					},
				] as NodeProperty[],
				inputs: ['main'],
				outputs: ['main'],
			},
		];

		const result = await mod.orchestrateGeneration({ nodes, outputDir });
		expect(result.nodeCount).toBe(1);

		// Verify .ts file exists
		const tsFile = path.join(outputDir, 'nodes', 'n8n-nodes-base', 'testNode', 'v1.ts');
		expect(fs.existsSync(tsFile)).toBe(true);

		// Verify .schema.js file exists alongside each .ts
		const schemaFile = path.join(outputDir, 'nodes', 'n8n-nodes-base', 'testNode', 'v1.schema.js');
		expect(fs.existsSync(schemaFile)).toBe(true);

		// Verify index.ts generated
		const indexFile = path.join(outputDir, 'nodes', 'n8n-nodes-base', 'testNode', 'index.ts');
		expect(fs.existsSync(indexFile)).toBe(true);
	});

	it('should skip hidden nodes', async () => {
		const hiddenOutputDir = path.join(outputDir, 'hidden-test');

		const nodes: NodeTypeDescription[] = [
			{
				name: 'n8n-nodes-base.hiddenNode',
				displayName: 'Hidden Node',
				group: ['transform'],
				version: 1,
				properties: [] as NodeProperty[],
				inputs: ['main'],
				outputs: ['main'],
				hidden: true,
			},
		];

		const result = await mod.orchestrateGeneration({ nodes, outputDir: hiddenOutputDir });
		expect(result.nodeCount).toBe(0);
	});

	it('should generate root index.ts with all node exports', async () => {
		const indexOutputDir = path.join(outputDir, 'index-test');

		const nodes: NodeTypeDescription[] = [
			{
				name: 'n8n-nodes-base.nodeA',
				displayName: 'Node A',
				group: ['transform'],
				version: 1,
				properties: [] as NodeProperty[],
				inputs: ['main'],
				outputs: ['main'],
			},
			{
				name: 'n8n-nodes-base.nodeB',
				displayName: 'Node B',
				group: ['output'],
				version: [1, 2],
				properties: [] as NodeProperty[],
				inputs: ['main'],
				outputs: ['main'],
			},
		];

		await mod.orchestrateGeneration({ nodes, outputDir: indexOutputDir });

		const indexFile = path.join(indexOutputDir, 'index.ts');
		expect(fs.existsSync(indexFile)).toBe(true);

		const content = fs.readFileSync(indexFile, 'utf-8');
		expect(content).toContain('nodeA');
		expect(content).toContain('nodeB');
	});
});
