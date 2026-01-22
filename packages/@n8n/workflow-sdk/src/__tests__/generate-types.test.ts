/**
 * Tests for generate-types.ts
 *
 * Following TDD: These tests are written BEFORE the implementation.
 * Run with: pnpm test generate-types.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// We'll import these functions once implemented
// For now, we define the expected interfaces and test structure

// =============================================================================
// Type Definitions (Expected interfaces from the implementation)
// =============================================================================

interface NodeProperty {
	name: string;
	displayName: string;
	type: string;
	description?: string;
	hint?: string;
	default?: unknown;
	required?: boolean;
	options?: Array<{
		name: string;
		value?: string | number | boolean;
		description?: string;
		displayName?: string;
		values?: NodeProperty[];
	}>;
	displayOptions?: {
		show?: Record<string, unknown[]>;
		hide?: Record<string, unknown[]>;
	};
	typeOptions?: Record<string, unknown>;
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
	inputs: string[] | Array<{ type: string; displayName?: string }>;
	outputs: string[] | Array<{ type: string; displayName?: string }>;
	subtitle?: string;
	usableAsTool?: boolean;
	hidden?: boolean;
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
	let generateTypes: typeof import('../generate-types/generate-types');

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
			expect(result).toBe('string | Expression<string>');
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

		it('should map resourceLocator type', () => {
			const prop: NodeProperty = {
				name: 'channel',
				displayName: 'Channel',
				type: 'resourceLocator',
				default: {},
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('ResourceLocatorValue');
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

		it('should map collection type to Record<string, unknown>', () => {
			const prop: NodeProperty = {
				name: 'options',
				displayName: 'Options',
				type: 'collection',
				default: {},
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('Record<string, unknown>');
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

			// Should contain individual config types
			expect(result).toContain('GmailMessageSendConfig');
			expect(result).toContain('GmailMessageGetConfig');
			expect(result).toContain('GmailLabelCreateConfig');

			// Should contain discriminator fields
			expect(result).toContain("resource: 'message'");
			expect(result).toContain("operation: 'send'");

			// Should NOT contain a union params type (removed - individual node types use configs directly)
			expect(result).not.toContain('GmailV21Params');
		});

		it('should generate simple interface for HTTP Request (no discriminators)', () => {
			const result = generateTypes.generateDiscriminatedUnion(mockHttpRequestNode);

			// Should NOT have discriminated unions
			expect(result).not.toContain('HttpRequestMessageSendConfig');

			// Should have a single config interface (not Params)
			expect(result).toContain('HttpRequestV42Config');
			expect(result).toContain('interface');
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

			// Should have imports
			expect(result).toContain('import type { Expression');

			// Should have discriminated union types (with version suffix to avoid duplicates)
			expect(result).toContain('GmailV21MessageSendConfig');
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
			expect(result).toBe('string | Expression<string>');
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

				// Should re-export types for discriminator files (all on one line)
				expect(content).toContain('export type { Expression, CredentialReference, NodeConfig }');
			});

			it('should generate _shared.ts without credentials for node without them', () => {
				const content = generateTypes.generateSharedFile(mockAggregateNode, 1);

				// Should NOT have credentials section with real credentials
				expect(content).not.toContain('AggregateV1Credentials');

				// Should have base type
				expect(content).toContain('AggregateV1NodeBase');
			});

			it('should include helper types when needed', () => {
				// Create a node with resourceLocator
				const nodeWithLocator: NodeTypeDescription = {
					...mockFreshserviceNode,
					properties: [
						...mockFreshserviceNode.properties,
						{
							displayName: 'Channel',
							name: 'channel',
							type: 'resourceLocator',
							default: {},
						},
					],
				};

				const content = generateTypes.generateSharedFile(nodeWithLocator, 1);
				expect(content).toContain('ResourceLocatorValue');
			});
		});

		describe('generateDiscriminatorFile', () => {
			it('should generate operation file for resource/operation combo', () => {
				const combo = { resource: 'ticket', operation: 'get' };
				const props = generateTypes.getPropertiesForCombination(mockFreshserviceNode, combo);

				const content = generateTypes.generateDiscriminatorFile(
					mockFreshserviceNode,
					1,
					combo,
					props,
					undefined,
					'./_shared',
				);

				// Should have header with discriminator info
				expect(content).toContain('Discriminator: resource=ticket, operation=get');

				// Should import from _shared
				expect(content).toContain("from './_shared'");
				expect(content).toContain('FreshserviceV1NodeBase');

				// Should have config type with discriminators
				expect(content).toContain('FreshserviceV1TicketGetConfig');
				expect(content).toContain("resource: 'ticket'");
				expect(content).toContain("operation: 'get'");

				// Should have node type
				expect(content).toContain('FreshserviceV1TicketGetNode');
				expect(content).toContain('FreshserviceV1NodeBase &');
			});

			it('should generate mode file for single discriminator', () => {
				const combo = { mode: 'runOnceForAllItems' };
				const props = generateTypes.getPropertiesForCombination(mockCodeNode, combo);

				const content = generateTypes.generateDiscriminatorFile(
					mockCodeNode,
					2,
					combo,
					props,
					undefined,
					'./_shared',
				);

				// Should have config type
				expect(content).toContain('CodeV2RunOnceForAllItemsConfig');
				expect(content).toContain("mode: 'runOnceForAllItems'");

				// Should have node type
				expect(content).toContain('CodeV2RunOnceForAllItemsNode');
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
					'./_shared',
				);

				// Should have output type
				expect(content).toContain('FreshserviceV1TicketGetOutput');
				expect(content).toContain('id?:');
				expect(content).toContain('subject?:');

				// Node type should reference output
				expect(content).toContain('output?: FreshserviceV1TicketGetOutput');
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
			it('should generate version index for resource/operation pattern', () => {
				const combinations = generateTypes.extractDiscriminatorCombinations(mockFreshserviceNode);
				const tree = generateTypes.buildDiscriminatorTree(combinations);
				const content = generateTypes.generateSplitVersionIndexFile(mockFreshserviceNode, 1, tree);

				// Should re-export shared
				expect(content).toContain("export * from './_shared'");

				// Should re-export resource directories
				expect(content).toContain("export * from './resource_ticket'");
				expect(content).toContain("export * from './resource_agent'");

				// Should have combined node type
				expect(content).toContain('FreshserviceV1Node');
				expect(content).toContain('FreshserviceV1TicketNode');
				expect(content).toContain('FreshserviceV1AgentNode');
			});

			it('should generate version index for single discriminator pattern', () => {
				const combinations = generateTypes.extractDiscriminatorCombinations(mockCodeNode);
				const tree = generateTypes.buildDiscriminatorTree(combinations);
				const content = generateTypes.generateSplitVersionIndexFile(mockCodeNode, 2, tree);

				// Should re-export shared
				expect(content).toContain("export * from './_shared'");

				// Should re-export mode files
				expect(content).toContain("export * from './mode_run_once_for_all_items'");
				expect(content).toContain("export * from './mode_run_once_for_each_item'");

				// Should have combined node type
				expect(content).toContain('CodeV2Node');
			});
		});
	});
});
